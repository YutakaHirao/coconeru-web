/* 横須賀の天気・気圧ページ用ウィジェット（日本語/英語 両対応）
   データ: Open-Meteo (https://open-meteo.com/) — APIキー不要・無料・CORS対応
   30分間ローカルキャッシュし、取得失敗時はメッセージを表示する。
   表示言語は <html lang> で自動判定（"en" なら英語）。 */
(function () {
  "use strict";

  var LAT = 35.2787; // 横須賀中央付近
  var LON = 139.6736;
  var CACHE_KEY = "coconeru-weather-v1";
  var CACHE_MINUTES = 30;
  var EN = document.documentElement.lang === "en";

  var API =
    "https://api.open-meteo.com/v1/forecast" +
    "?latitude=" + LAT + "&longitude=" + LON +
    "&current=temperature_2m,weather_code,relative_humidity_2m,pressure_msl" +
    "&hourly=pressure_msl,precipitation_probability,weather_code" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    "&timezone=Asia%2FTokyo&forecast_days=7";

  var T = EN
    ? {
        levels: ["Stable", "Mild caution", "Caution", "Alert"],
        messages: [
          "Barometric pressure is stable — a comfortable day with little weather-related strain.",
          "Pressure is drifting slowly downward. Sensitive people may feel a slightly heavy head. Stay hydrated and breathe deeply.",
          "A pressure drop is expected within 24 hours. If you are prone to weather-related headaches or stiff shoulders, plan for extra rest.",
          "A sharp pressure drop is coming. Headaches, dizziness, and fatigue are more likely — keep your schedule light and put rest first."
        ],
        care:
          '<p class="weather-care">On low-pressure days, a dry head spa can help loosen a heavy head and stiff neck and shoulders. ' +
          '<a href="../index.html#headspa">About our dry head spa</a></p>',
        pressureTitle: "Pressure forecast",
        pressureSub: "next 24 hours",
        weekTitle: "7-day forecast",
        weekAria: "7-day forecast",
        humidity: "Humidity",
        pressure: "Pressure",
        updated: "Updated",
        updatedSuffix: "",
        today: "Today",
        tomorrow: "Tmrw",
        weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        now: "Now",
        lowLabel: "Low",
        highLabel: "High",
        chartAria: function (current, min) {
          return "Barometric pressure over the next 24 hours. Now " + current + " hPa, low " + min + " hPa.";
        },
        minAt: function (p, hour) {
          return T.lowLabel + " " + p + " hPa (" + (hour === null ? "now" : hourLabel(hour)) + ")";
        },
        error: "Weather data is temporarily unavailable. Please try again later."
      }
    : {
        levels: ["良好", "やや注意", "注意", "警戒"],
        messages: [
          "気圧は安定しています。体調の波が出にくい、穏やかに過ごしやすい一日です。",
          "気圧はゆるやかに低下傾向。敏感な方は軽い頭重感が出ることも。水分補給と深呼吸を意識して。",
          "低気圧の影響が出やすい時間帯があります。頭が重い・首肩がこわばる方は、早めのケアとこまめな休憩を。",
          "気圧が大きく低下します。頭痛やめまい、強いだるさが出やすい一日。予定は控えめに、休息を最優先に。"
        ],
        care:
          '<p class="weather-care">低気圧で頭が重い日は、ヘッドスパで頭・首肩をゆるめて過ごすのもおすすめです。' +
          '<a href="../headspa/index.html">ドライヘッドスパについて</a></p>',
        pressureTitle: "気圧予報",
        pressureSub: "今後24時間",
        weekTitle: "週間予報",
        weekAria: "週間予報",
        humidity: "湿度",
        pressure: "気圧",
        updated: "更新",
        updatedSuffix: "",
        today: "今日",
        tomorrow: "明日",
        weekdays: ["日", "月", "火", "水", "木", "金", "土"],
        now: "現在",
        lowLabel: "最低",
        highLabel: "最高",
        chartAria: function (current, min) {
          return "今後24時間の気圧の推移。現在" + current + "ヘクトパスカル、最低" + min + "ヘクトパスカル";
        },
        minAt: function (p, hour) {
          return "最低 " + p + "hPa（" + (hour === null ? "現在" : hourLabel(hour)) + "）";
        },
        error: "ただいま天気情報を取得できませんでした。時間をおいて再度お試しください。"
      };

  function hourLabel(h) {
    if (!EN) return h + "時";
    if (h === 0) return "12AM";
    if (h < 12) return h + "AM";
    if (h === 12) return "12PM";
    return (h - 12) + "PM";
  }

  /* WMO weather code → 表示 [絵文字, 日本語, 英語] */
  function describeWeather(code) {
    var wx;
    if (code === 0) wx = ["☀️", "快晴", "Clear"];
    else if (code === 1) wx = ["🌤️", "晴れ", "Sunny"];
    else if (code === 2) wx = ["⛅", "晴れ時々くもり", "Partly cloudy"];
    else if (code === 3) wx = ["☁️", "くもり", "Cloudy"];
    else if (code === 45 || code === 48) wx = ["🌫️", "霧", "Fog"];
    else if (code >= 51 && code <= 57) wx = ["🌦️", "霧雨", "Drizzle"];
    else if (code >= 61 && code <= 67) wx = ["🌧️", "雨", "Rain"];
    else if (code >= 71 && code <= 77) wx = ["🌨️", "雪", "Snow"];
    else if (code >= 80 && code <= 82) wx = ["🌦️", "にわか雨", "Showers"];
    else if (code === 85 || code === 86) wx = ["🌨️", "にわか雪", "Snow showers"];
    else if (code >= 95) wx = ["⛈️", "雷雨", "Thunderstorm"];
    else wx = ["☁️", "くもり", "Cloudy"];
    return { icon: wx[0], label: EN ? wx[2] : wx[1] };
  }

  /* 今後24時間の海面気圧から「気圧予報」レベルを判定
     目安: 6時間で約3hPa以上／24時間で約6hPa以上の低下や、
     1005hPaを下回る低圧では頭痛・だるさなどの症状が出やすいとされる */
  function assessPressure(pressures) {
    var current = pressures[0];
    var min = current;
    var maxDrop6h = 0;
    for (var i = 0; i < pressures.length; i++) {
      if (pressures[i] < min) min = pressures[i];
      if (i + 6 < pressures.length) {
        var drop = pressures[i] - pressures[i + 6];
        if (drop > maxDrop6h) maxDrop6h = drop;
      }
    }
    var totalDrop = current - min;

    var level = 0;
    if (totalDrop >= 10 || maxDrop6h >= 5 || min < 998) level = 3;
    else if (totalDrop >= 6 || maxDrop6h >= 3 || min < 1005) level = 2;
    else if (totalDrop >= 3 || min < 1010) level = 1;

    return { level: level, name: T.levels[level], message: T.messages[level] };
  }

  /* 今後24時間の気圧チャート(SVG)。times/pressures は同じ長さの配列。
     width は描画先の実ピクセル幅（文字が伸縮で潰れないよう実寸で描く） */
  function pressureChart(times, pressures, width) {
    var w = Math.max(280, Math.round(width) || 640);
    var h = 190;
    var padL = 12;
    var padR = 12;
    var padT = 18;
    var padB = 30;
    var innerW = w - padL - padR;
    var innerH = h - padT - padB;

    var min = Math.min.apply(null, pressures);
    var max = Math.max.apply(null, pressures);
    var range = Math.max(max - min, 3); // 変化が小さい日も線が潰れないように
    var mid = (max + min) / 2;
    var lo = mid - range / 2 - 0.5;
    var hi = mid + range / 2 + 0.5;

    function x(i) {
      return padL + (i / (pressures.length - 1)) * innerW;
    }
    function y(p) {
      return padT + (1 - (p - lo) / (hi - lo)) * innerH;
    }

    var linePts = [];
    var minIdx = 0;
    for (var i = 0; i < pressures.length; i++) {
      linePts.push(x(i).toFixed(1) + "," + y(pressures[i]).toFixed(1));
      if (pressures[i] < pressures[minIdx]) minIdx = i;
    }
    var areaPts =
      padL + "," + (padT + innerH) + " " + linePts.join(" ") + " " + (padL + innerW) + "," + (padT + innerH);

    // 6時間ごとの時刻目盛り
    var ticks = "";
    for (var t = 0; t < pressures.length; t += 6) {
      var hour = parseInt(times[t].slice(11, 13), 10);
      var label = t === 0 ? T.now : hourLabel(hour);
      ticks +=
        '<line x1="' + x(t).toFixed(1) + '" y1="' + padT + '" x2="' + x(t).toFixed(1) + '" y2="' + (padT + innerH) + '" class="weather-chart__grid"/>' +
        '<text x="' + x(t).toFixed(1) + '" y="' + (h - 8) + '" text-anchor="middle" class="weather-chart__tick">' + label + "</text>";
    }

    // 最低気圧のマーカー
    var minLabelAnchor = minIdx > pressures.length * 0.75 ? "end" : minIdx < pressures.length * 0.25 ? "start" : "middle";
    var minHour = minIdx === 0 ? null : parseInt(times[minIdx].slice(11, 13), 10);
    var marker =
      '<circle cx="' + x(minIdx).toFixed(1) + '" cy="' + y(pressures[minIdx]).toFixed(1) + '" r="4" class="weather-chart__dot"/>' +
      '<text x="' + x(minIdx).toFixed(1) + '" y="' + (y(pressures[minIdx]) - 9).toFixed(1) + '" text-anchor="' + minLabelAnchor + '" class="weather-chart__minlabel">' +
      T.minAt(Math.round(pressures[minIdx]), minHour) + "</text>";

    return (
      '<svg class="weather-chart" viewBox="0 0 ' + w + " " + h + '" role="img" ' +
      'aria-label="' + T.chartAria(Math.round(pressures[0]), Math.round(min)) + '">' +
      '<polygon points="' + areaPts + '" class="weather-chart__area"/>' +
      ticks +
      '<polyline fill="none" points="' + linePts.join(" ") + '" class="weather-chart__line"/>' +
      marker +
      "</svg>" +
      '<div class="weather-chart__scale"><span>' + T.highLabel + " " + Math.round(max) + " hPa</span><span>" + T.lowLabel + " " + Math.round(min) + " hPa</span></div>"
    );
  }

  function dayLabel(dateStr, index) {
    if (index === 0) return T.today;
    if (index === 1) return T.tomorrow;
    var d = new Date(dateStr + "T00:00:00+09:00");
    return T.weekdays[d.getDay()];
  }

  function dayDate(dateStr) {
    return parseInt(dateStr.slice(5, 7), 10) + "/" + parseInt(dateStr.slice(8, 10), 10);
  }

  function render(root, data) {
    var current = data.current;
    var now = describeWeather(current.weather_code);

    // 現在時刻以降の気圧24時間分
    var startIdx = data.hourly.time.indexOf(current.time.slice(0, 14) + "00");
    if (startIdx < 0) startIdx = 0;
    var pressures = data.hourly.pressure_msl.slice(startIdx, startIdx + 25);
    var times = data.hourly.time.slice(startIdx, startIdx + 25);
    var assessment = assessPressure(pressures);

    var daysHtml = "";
    for (var i = 0; i < data.daily.time.length; i++) {
      var wx = describeWeather(data.daily.weather_code[i]);
      daysHtml +=
        '<div class="weather-day" role="listitem">' +
        '<span class="weather-day__label">' + dayLabel(data.daily.time[i], i) + '<small>' + dayDate(data.daily.time[i]) + "</small></span>" +
        '<span class="weather-day__icon" aria-hidden="true">' + wx.icon + "</span>" +
        '<span class="weather-day__desc">' + wx.label + "</span>" +
        '<span class="weather-day__temp">' + Math.round(data.daily.temperature_2m_max[i]) + "°<small>/" + Math.round(data.daily.temperature_2m_min[i]) + "°</small></span>" +
        '<span class="weather-day__rain">☂ ' + data.daily.precipitation_probability_max[i] + "%</span>" +
        "</div>";
    }

    var careHtml = assessment.level >= 2 ? T.care : "";
    var updated = current.time.slice(11, 16);

    root.innerHTML =
      '<div class="weather-panel weather-panel--level' + assessment.level + '">' +
      '<div class="weather-now">' +
      '<span class="weather-now__icon" aria-hidden="true">' + now.icon + "</span>" +
      '<div class="weather-now__main">' +
      '<span class="weather-now__temp">' + Math.round(current.temperature_2m) + "<small>°C</small></span>" +
      '<span class="weather-now__desc">' + now.label + "</span>" +
      "</div>" +
      '<dl class="weather-now__meta">' +
      "<div><dt>" + T.humidity + "</dt><dd>" + current.relative_humidity_2m + "%</dd></div>" +
      "<div><dt>" + T.pressure + "</dt><dd>" + Math.round(current.pressure_msl) + " hPa</dd></div>" +
      "<div><dt>" + T.updated + "</dt><dd>" + updated + T.updatedSuffix + "</dd></div>" +
      "</dl>" +
      "</div>" +
      '<div class="weather-pressure">' +
      '<div class="weather-pressure__head">' +
      '<h3 class="weather-pressure__title">' + T.pressureTitle + "<small>" + T.pressureSub + "</small></h3>" +
      '<span class="weather-badge weather-badge--level' + assessment.level + '">' + assessment.name + "</span>" +
      "</div>" +
      '<div class="weather-chart-box"></div>' +
      '<p class="weather-pressure__message">' + assessment.message + "</p>" +
      careHtml +
      "</div>" +
      "</div>" +
      '<div class="weather-week">' +
      '<h3 class="weather-week__title">' + T.weekTitle + "</h3>" +
      '<div class="weather-days" role="list" aria-label="' + T.weekAria + '">' + daysHtml + "</div>" +
      "</div>";

    // グラフは実際の表示幅で描画する（伸縮による文字の潰れを防ぐ）
    var box = root.querySelector(".weather-chart-box");
    if (box) {
      var drawChart = function () {
        box.innerHTML = pressureChart(times, pressures, box.clientWidth);
      };
      drawChart();
      var resizeTimer;
      window.addEventListener("resize", function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(drawChart, 200);
      });
    }
  }

  function renderError(root) {
    root.innerHTML = '<p class="weather-error">' + T.error + "</p>";
  }

  function loadCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      var cached = JSON.parse(raw);
      if (Date.now() - cached.at > CACHE_MINUTES * 60 * 1000) return null;
      if (!cached.data || !cached.data.daily || cached.data.daily.time.length < 7) return null;
      return cached.data;
    } catch (e) {
      return null;
    }
  }

  function saveCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), data: data }));
    } catch (e) {}
  }

  function init() {
    var root = document.getElementById("weather-widget");
    if (!root) return;

    var cached = loadCache();
    if (cached) {
      render(root, cached);
      return;
    }

    fetch(API)
      .then(function (res) {
        if (!res.ok) throw new Error("weather api " + res.status);
        return res.json();
      })
      .then(function (data) {
        saveCache(data);
        render(root, data);
      })
      .catch(function () {
        renderError(root);
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
