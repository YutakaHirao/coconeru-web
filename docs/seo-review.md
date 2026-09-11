# リニューアル後のSEO確認（2026-09-11）

## 今回の対応

- 日本語のトップ、Head Spa、メニュー、会員プラン、予約、アクセスの検索タイトル・説明・OGPを現行サービスに合わせて更新。
- 日本語メニューと英語メニュー、Moveと新しい英語Moveページをhreflangで相互に対応付け。既存のトップ・予約・アクセス・天気の日英対応は維持。
- 英語のMove専用ページ `/en/move/` を追加。実際のサービス、通常・VIP料金、2店舗の違い、住所、予約先を掲載。
- 英語の「毎日営業」を不定休の案内へ修正。会員の水素水洗浄追加料金なし・90分の追加3,500円も英語メニューに記載。
- 日本語・英語メニューの構造化データに残っていた旧料金を修正。旧40分コースの案内を現行の60分・90分と休息20分に更新。
- サイトマップの実際に内容を変更したページの更新日を修正し、英語Moveを追加。
- ページごとに異なっていたCSS更新番号を統一。CSS・JavaScriptは再検証するキャッシュ設定に変更。
- AI向けの補助テキストに英語ページのリンクを追加し、営業案内を修正。llms.txt自体による検索順位改善は保証されない。

## 検索意図と担当ページ

検索ボリュームの調査結果ではなく、実際のサービスと立地に基づく設計です。

| 検索の例 | 主なページ |
| --- | --- |
| 横須賀 ヘッドスパ、横須賀中央 ヘッドスパ | `/`, `/headspa/` |
| 横須賀 フェイシャル、ヘッドスパ 料金、ボディケア | `/menu/` |
| 横須賀中央 会員制 ヘッドスパ、Start Pass | `/pass/` |
| 横須賀 ピラティス、横須賀中央 マシンピラティス、パーソナルトレーニング | `/move/`, `/move/menu/` |
| CoconeRu アクセス、横須賀中央 若松町、大滝町 | `/access/` |
| head spa Yokosuka, facial Yokosuka, massage Yokosuka | `/en/`, `/en/massage/` |
| reformer Pilates Yokosuka, private Pilates Yokosuka, personal training Yokosuka | `/en/move/` |
| CoconeRu directions, Yokosuka-chuo Station, Yokosuka Naval Base | `/en/access/` |

同じ地域名を不自然に繰り返すページや、実際には営業していない地域の専用ページは作成していません。

## 確認結果

- 公開サイトの `www.coconeru.com/` は `coconeru.com/` へ301転送。
- `move.coconeru.com/` は `coconeru.com/move/` へ301転送。
- 存在しないURLは404応答。正規URLは `https://coconeru.com/` に統一。
- 静的検証: サイトマップ25ページのタイトル、description、H1、canonical、hreflang、JSON-LD、内部リンク、参照画像等を確認。
- 表示検証: 日本語トップ・メニュー・会員プラン、英語トップ・メニュー・Move・アクセス・予約を幅390/820/1440pxで確認。
- Google検索順位、検索流入、実機のCore Web Vitals、Googleのインデックス状況は、このローカル検証では判定していません。
- Squareの予約確定や決済は行っていません。

## 公開後に行うこと

1. Cloudflareのデプロイ成功後、英語Moveと変更したページが公開されていることを確認。
2. Google Search Consoleで `https://coconeru.com/sitemap.xml` を送信・再確認。トップ、メニュー、Move、英語MoveをURL検査。
3. Search Consoleの検索パフォーマンスで、日本語・英語のクエリ別、ページ別の表示回数・クリック数・CTRを記録。変更前後を同じ期間で比較。
4. Googleビジネスプロフィールの各店舗の名称・住所・営業時間・不定休日・予約URLをサイトに合わせる。臨時休業は特別営業時間に反映。
5. Search Consoleのページ登録・404・リダイレクト状況から、今回未確認のSquarespace旧URLが見つかったら、対応する現行ページへ個別に301転送。

## 運用上の確認が残る情報

- FAQの「キャンセル料なし」と会員プランの「当日キャンセルは1回利用扱い」は、どの予約区分に適用するかを運営側で確定してから統一する必要があります。今回、利用条件は推測で変更していません。
- 英語アクセスに既存のWomble Gateからの所要時間・道順が残っています。経路やゲート運用の変更がないか、店舗での実地確認が必要です。
- Search Console・Googleビジネスプロフィールの管理画面の設定は変更していません。

## 次回更新時の確認

Python 3.9以降で、リポジトリ内の `python scripts/check_seo.py` を実行します。外部ライブラリは不要です。

チェックは構文・リンクの整合性を検証するものであり、Googleでの順位やリッチリザルト表示を保証するものではありません。

## 参考資料

- [Google: 多言語ページの対応付け](https://developers.google.com/search/docs/specialty/international/localized-versions)
- [Google: 検索タイトル](https://developers.google.com/search/docs/appearance/title-link)
- [Google: ローカルビジネスの構造化データ](https://developers.google.com/search/docs/appearance/structured-data/local-business)
- [Google: サイト移転とURL変更](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes)
- [Google: ローカル検索の順位](https://support.google.com/business/answer/7091?hl=ja)
