(function (global) {
  const HOME_INDICES = [
    { id: "csi300", name: "沪深300", market: "CN", secid: "1.000300" },
    { id: "hsi", name: "恒生指数", market: "HK", secid: "100.HSI" },
    { id: "spx", name: "标普500", market: "US", secid: "100.SPX" }
  ];

  const BOARD_INDICES = [
    ...HOME_INDICES,
    { id: "sse", name: "上证指数", market: "CN", secid: "1.000001" },
    { id: "szse", name: "深证成指", market: "CN", secid: "0.399001" },
    { id: "ndx", name: "纳斯达克", market: "US", secid: "100.NDX" }
  ];

  const QUOTE_URL = "https://push2.eastmoney.com/api/qt/ulist.np/get";
  const TREND_URL = "https://push2.eastmoney.com/api/qt/stock/trends2/get";

  function formatNumber(value, digits) {
    if (value == null || Number.isNaN(Number(value))) return "--";
    return Number(value).toLocaleString("zh-CN", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    });
  }

  function changeClass(value) {
    if (value > 0) return "up";
    if (value < 0) return "down";
    return "flat";
  }

  function signed(value, digits) {
    if (value == null || Number.isNaN(Number(value))) return "--";
    const abs = formatNumber(Math.abs(value), digits);
    if (value > 0) return "+" + abs;
    if (value < 0) return "-" + abs;
    return formatNumber(0, digits);
  }

  function sparkPath(values, width, height) {
    const nums = (values || []).filter((v) => Number.isFinite(v));
    if (nums.length < 2) return "";
    const min = Math.min.apply(null, nums);
    const max = Math.max.apply(null, nums);
    const span = max - min || 1;
    return nums
      .map((v, i) => {
        const x = (i / (nums.length - 1)) * width;
        const y = height - ((v - min) / span) * (height - 4) - 2;
        return (i === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2);
      })
      .join(" ");
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error("http " + res.status);
    return res.json();
  }

  async function fetchSpark(secid) {
    try {
      const url =
        TREND_URL +
        "?secid=" +
        encodeURIComponent(secid) +
        "&ndays=1&iscr=0&fields1=f1,f2,f3,f4,f5,f6,f7,f8,f9,f10,f11,f12,f13&fields2=f51,f52,f53,f54,f55";
      const json = await fetchJson(url);
      const trends = (json.data && json.data.trends) || [];
      return trends
        .map((line) => parseFloat(String(line).split(",")[4] || String(line).split(",")[1]))
        .filter((v) => Number.isFinite(v));
    } catch (err) {
      return [];
    }
  }

  async function getQuotes(items) {
    const secids = items.map((item) => item.secid).join(",");
    const url =
      QUOTE_URL +
      "?fltt=2&invt=2&fields=f2,f3,f4,f12,f13,f14&secids=" +
      encodeURIComponent(secids);
    const json = await fetchJson(url);
    const rows = (json.data && json.data.diff) || [];
    const byCode = {};
    rows.forEach((row) => {
      byCode[String(row.f12).toUpperCase()] = row;
    });

    const quotes = await Promise.all(
      items.map(async (item) => {
        const code = item.secid.split(".")[1].toUpperCase();
        const row = byCode[code];
        if (!row || row.f2 == null || row.f2 === "-") {
          throw new Error("missing " + item.id);
        }
        const spark = await fetchSpark(item.secid);
        const price = Number(row.f2);
        const change = Number(row.f4);
        let percent = Number(row.f3);
        if ((!Number.isFinite(percent) || percent === 0) && Number.isFinite(change) && Number.isFinite(price)) {
          const prev = price - change;
          if (prev) percent = (change / prev) * 100;
        }
        return {
          id: item.id,
          name: item.name,
          market: item.market,
          price: price,
          change: change,
          percent: percent,
          spark: spark
        };
      })
    );
    return quotes;
  }

  async function getStock(secid) {
    const url =
      QUOTE_URL +
      "?fltt=2&invt=2&fields=f2,f3,f4,f12,f14&secids=" +
      encodeURIComponent(secid);
    const json = await fetchJson(url);
    const row = json.data && json.data.diff && json.data.diff[0];
    if (!row || row.f2 == null || row.f2 === "-") throw new Error("empty");
    return {
      code: String(row.f12),
      name: row.f14,
      price: Number(row.f2),
      change: Number(row.f4),
      percent: Number(row.f3)
    };
  }

  function renderCard(target, quote) {
    const tone = changeClass(quote.change !== 0 ? quote.change : quote.percent);
    const path = sparkPath(quote.spark, 280, 42);
    const stroke = tone === "up" ? "#c62828" : tone === "down" ? "#1b7a46" : "#5d6d82";
    target.innerHTML =
      '<div class="card-head">' +
      '<div class="card-name">' +
      quote.name +
      "</div>" +
      '<div class="market-tag">' +
      quote.market +
      "</div>" +
      "</div>" +
      '<div class="price ' +
      tone +
      '">' +
      formatNumber(quote.price, 2) +
      "</div>" +
      '<div class="change ' +
      tone +
      '">' +
      "<span>" +
      signed(quote.change, 2) +
      "</span>" +
      "<span>" +
      signed(quote.percent, 2) +
      "%</span>" +
      "</div>" +
      '<div class="spark">' +
      (path
        ? '<svg viewBox="0 0 280 42" preserveAspectRatio="none"><path d="' +
          path +
          '" fill="none" stroke="' +
          stroke +
          '" stroke-width="2"/></svg>'
        : "") +
      "</div>" +
      '<div class="card-foot">公开行情 · 约 15 秒自动刷新</div>';
  }

  function renderCardError(target, name) {
    target.innerHTML =
      '<div class="card-head"><div class="card-name">' +
      name +
      '</div></div><div class="price flat">--</div><div class="card-foot">暂时无法获取行情，请稍后刷新</div>';
  }

  global.IRQuotes = {
    HOME_INDICES,
    BOARD_INDICES,
    getQuotes,
    getStock,
    renderCard,
    renderCardError,
    formatNumber,
    signed,
    changeClass
  };
})(window);
