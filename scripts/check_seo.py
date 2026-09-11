"""Check static SEO metadata, language pairs and local assets without dependencies."""

import datetime
import json
from collections import Counter
from functools import lru_cache
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
ORIGIN = "https://coconeru.com/"
NS = {"s": "http://www.sitemaps.org/schemas/sitemap/0.9"}


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__(convert_charrefs=True)
        self.lang = ""
        self.meta = {}
        self.canonicals = []
        self.alternates = {}
        self.title = ""
        self.h1 = 0
        self.ids = set()
        self.links = []
        self.assets = []
        self.schemas = []
        self.in_title = False
        self.in_json = False
        self.json_text = ""
        self.feed(html)

    def handle_starttag(self, tag, attributes):
        a = dict(attributes)
        if a.get("id"):
            self.ids.add(a["id"])
        if tag == "html":
            self.lang = a.get("lang", "")
        elif tag == "title":
            self.in_title = True
        elif tag == "h1":
            self.h1 += 1
        elif tag == "meta":
            self.meta[a.get("name", a.get("property", ""))] = a.get("content", "")
        elif tag == "a" and a.get("href"):
            self.links.append(a["href"])
        elif tag == "link":
            if a.get("rel") == "canonical":
                self.canonicals.append(a.get("href"))
            if a.get("rel") == "alternate" and a.get("hreflang"):
                self.alternates[a["hreflang"]] = a.get("href")
            if a.get("rel") in ("stylesheet", "icon") and a.get("href"):
                self.assets.append(a["href"])
        elif tag == "img" and a.get("src"):
            self.assets.append(a["src"])
        elif tag == "script":
            if a.get("src"):
                self.assets.append(a["src"])
            self.in_json = a.get("type") == "application/ld+json"
            self.json_text = ""

    def handle_data(self, text):
        if self.in_title:
            self.title += text
        if self.in_json:
            self.json_text += text

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag == "script" and self.in_json:
            self.schemas.append(json.loads(self.json_text))
            self.in_json = False


@lru_cache(maxsize=None)
def local_file(url):
    parsed = urlsplit(url)
    if parsed.scheme not in ("https", "http") or parsed.netloc != "coconeru.com":
        return None
    relative = unquote(parsed.path).lstrip("/")
    target = (ROOT / relative).resolve()
    if not target.is_relative_to(ROOT.resolve()):
        raise ValueError(f"Path escapes site root: {url}")
    if target.is_dir():
        target /= "index.html"
    return target


def check():
    failures = []
    documents = {}
    entries = ET.parse(ROOT / "sitemap.xml").findall("s:url", NS)
    urls = [entry.findtext("s:loc", namespaces=NS) for entry in entries]
    for url, count in Counter(urls).items():
        if count != 1:
            failures.append(f"Duplicate sitemap URL: {url}")
    for entry, url in zip(entries, urls):
        file = local_file(url)
        if not file or not file.is_file():
            failures.append(f"Missing sitemap page: {url}")
            continue
        try:
            page = Page(file.read_text(encoding="utf-8-sig"))
            documents[url] = page
        except (ValueError, json.JSONDecodeError) as error:
            failures.append(f"Invalid HTML/JSON-LD: {url}: {error}")
            continue
        if page.canonicals != [url]:
            failures.append(f"Canonical does not match sitemap: {url}")
        if not page.title.strip() or not page.meta.get("description") or page.h1 != 1:
            failures.append(f"Missing title/description or H1 count != 1: {url}")
        if "noindex" in page.meta.get("robots", "").lower():
            failures.append(f"Noindex page in sitemap: {url}")
        if page.lang != ("en" if urlsplit(url).path.startswith("/en/") else "ja"):
            failures.append(f"Unexpected document language: {url}")
        date = entry.findtext("s:lastmod", namespaces=NS)
        if date and datetime.date.fromisoformat(date) > datetime.date.today():
            failures.append(f"Future sitemap date: {url}")
        for asset in page.assets + [page.meta.get("og:image", "")]:
            if not asset:
                continue
            target = local_file(urljoin(url, asset))
            if target and not target.is_file():
                failures.append(f"Missing asset: {url}: {asset}")
        for link in page.links:
            resolved = urljoin(url, link)
            target = local_file(resolved)
            if not target or urlsplit(resolved).path.startswith(("/go/", "/api/")):
                continue
            if not target.is_file():
                failures.append(f"Missing local link: {url}: {link}")
    for url, page in documents.items():
        if page.alternates and page.alternates.get(page.lang) != url:
            failures.append(f"Missing self hreflang: {url}")
        for lang, target_url in page.alternates.items():
            target = documents.get(target_url)
            if not target or target.alternates != page.alternates:
                failures.append(f"Hreflang pair mismatch: {url}: {lang}")
        for link in page.links:
            resolved = urljoin(url, link)
            parts = urlsplit(resolved)
            canonical = parts._replace(fragment="", query="").geturl().replace("/index.html", "/")
            target = documents.get(canonical)
            if target and parts.fragment and unquote(parts.fragment) not in target.ids:
                failures.append(f"Missing anchor: {url}: {link}")
    for title, count in Counter(p.title for p in documents.values()).items():
        if count > 1:
            failures.append(f"Duplicate title: {title}")
    for failure in failures:
        print("FAIL:", failure)
    if failures:
        raise SystemExit(1)
    print(f"PASS: {len(documents)} sitemap pages; titles, canonical URLs, hreflang, JSON-LD, links and assets.")


if __name__ == "__main__":
    check()
