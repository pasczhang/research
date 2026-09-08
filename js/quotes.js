/**
 * 行情服务：浏览器端通过 <script> 加载腾讯/新浪接口，避免 CORS 限制。
 * 顺序：腾讯财经 → 新浪财经 → 东方财富 fetch → LocalStorage 缓存降级。
 */
(function (global) {
  const HOME_INDICES = [
    { id: "csi300", name: "沪深300", market: "A股", tencent: "sh000300", sina: "s_sh000300", sinaFull: "sh000300", em: "1.000300" },
    { id: "hsi", name: "恒生指数", market: "港股", tencent: "hkHSI", sina: "int_hangseng", sinaFull: "rt_hkHSI", em: "100.HSI" },
    { id: "spx", name: "标普500", market: "美股", tencent: "usINX", sina: "int_sp500", sinaFull: "gb_$inx", em: "100.SPX" }
  ];

  const BOARD_INDICES = [
    { id: "sse", name: "上证指数", market: "A股", tencent: "sh000001", sina: "s_sh000001", sinaFull: "sh000001", em: "1.000001" },
    { id: "szse", name: "深证成指", market: "A股", tencent: "sz399001", sina: "s_sz399001", sinaFull: "sz399001", em: "0.399001" },
    { id: "cyb", name: "创业板指", market: "A股", tencent: "sz399006", sina: "s_sz399006", sinaFull: "sz399006", em: "0.399006" },
    HOME_INDICES[0],
    { id: "hstech", name: "恒生科技", market: "港股", tencent: "hkHSTECH", sina: "rt_hkHSTECH", sinaFull: "rt_hkHSTECH", em: "124.HSTECH" },
    HOME_INDICES[1],
    HOME_INDICES[2],
    { id: "ndx", name: "纳斯达克", market: "美股", tencent: "usIXIC", sina: "int_nasdaq", sinaFull: "gb_ixic", em: "100.NDX" },
    { id: "dji", name: "道琼斯", market: "美股", tencent: "usDJI", sina: "int_dji", sinaFull: "gb_dji", em: "100.DJIA" }
  ];

  let scriptSeq = 0;
  let lock = Promise.resolve();

  function withLock(task) {
    const run = lock.then(task, task);
    lock = run.then(function () {}, function () {});
    return run;
  }

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
    const nums = (values || []).filter(function (v) {
      return Number.isFinite(v);
    });
    if (nums.length < 2) return "";
    const min = Math.min.apply(null, nums);
    const max = Math.max.apply(null, nums);
    const span = max - min || 1;
    return nums
      .map(function (v, i) {
        const x = (i / (nums.length - 1)) * width;
        const y = height - ((v - min) / span) * (height - 4) - 2;
        return (i === 0 ? "M" : "L") + x.toFixed(2) + " " + y.toFixed(2);
      })
      .join(" ");
  }

  function loadScript(src, charset) {
    return new Promise(function (resolve, reject) {
      const s = document.createElement("script");
      s.charset = charset || "gbk";
      s.src = src;
      const timer = setTimeout(function () {
        cleanup();
        reject(new Error("timeout"));
      }, 8000);
      function cleanup() {
        clearTimeout(timer);
        s.onload = s.onerror = null;
        if (s.parentNode) s.parentNode.removeChild(s);
      }
      s.onload = function () {
        cleanup();
        resolve();
      };
      s.onerror = function () {
        cleanup();
        reject(new Error("script"));
      };
      document.head.appendChild(s);
    });
  }

  function num(v) {
    const n = Number(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : NaN;
  }

  function parseTencentBody(raw, item) {
    if (!raw) return null;
    const parts = String(raw).split("~");
    const price = num(parts[3]);
    const prev = num(parts[4]);
    if (!Number.isFinite(price) || price <= 0) return null;
    const change = Number.isFinite(prev) ? price - prev : num(parts[31]);
    const percent = Number.isFinite(prev) && prev ? (change / prev) * 100 : num(parts[32]);
    return {
      id: item.id,
      name: item.name || parts[1] || item.symbol,
      code: item.code || parts[2] || "",
      symbol: item.tencent || item.symbol,
      market: item.market || "",
      price: price,
      prevClose: Number.isFinite(prev) ? prev : price - change,
      change: change,
      percent: percent,
      high: num(parts[33]),
      low: num(parts[34]),
      source: "tencent"
    };
  }

  function parseSinaBrief(raw, item) {
    const parts = String(raw || "").split(",");
    const price = num(parts[1]);
    if (!Number.isFinite(price) || price <= 0) return null;
    const change = num(parts[2]);
    const percent = num(parts[3]);
    return {
      id: item.id,
      name: item.name || parts[0] || item.symbol,
      code: item.code || "",
      symbol: item.sinaFull || item.symbol,
      market: item.market || "",
      price: price,
      prevClose: price - change,
      change: change,
      percent: percent,
      source: "sina"
    };
  }

  function parseSinaFull(raw, item) {
    const parts = String(raw || "").split(",");
    // A 股：名称,今开,昨收,最新,最高,最低
    const price = num(parts[3]);
    const prev = num(parts[2]);
    if (Number.isFinite(price) && price > 0 && Number.isFinite(prev)) {
      const change = price - prev;
      return {
        id: item.id,
        name: item.name || parts[0],
        code: item.code || "",
        symbol: item.symbol,
        market: item.market || "",
        price: price,
        prevClose: prev,
        change: change,
        percent: prev ? (change / prev) * 100 : 0,
        high: num(parts[4]),
        low: num(parts[5]),
        source: "sina"
      };
    }
    // 国际指数 int_*：名称,最新,涨跌幅,涨跌额
    const intlPrice = num(parts[1]);
    if (Number.isFinite(intlPrice) && intlPrice > 0) {
      const percent = num(parts[2]);
      const change = num(parts[3]);
      return {
        id: item.id,
        name: item.name || parts[0],
        code: item.code || "",
        symbol: item.symbol,
        market: item.market || "",
        price: intlPrice,
        prevClose: intlPrice - change,
        change: change,
        percent: percent,
        source: "sina"
      };
    }
    return null;
  }

  async function fetchTencent(items) {
    const codes = items.map(function (item) {
      return item.tencent || item.symbol;
    });
    // 腾讯会为每个代码写入 window['v_sh000001'] 这类全局变量
    await loadScript("https://qt.gtimg.cn/q=" + encodeURIComponent(codes.join(",")) + "&t=" + Date.now(), "gbk");
    return items.map(function (item) {
      const key = "v_" + (item.tencent || item.symbol);
      const parsed = parseTencentBody(global[key], item);
      return parsed;
    });
  }

  async function fetchSina(items) {
    const codes = items.map(function (item) {
      return item.sina || item.sinaFull || item.symbol;
    });
    await loadScript(
      "https://hq.sinajs.cn/rn=" + Date.now() + "&list=" + encodeURIComponent(codes.join(",")),
      "gbk"
    );
    return items.map(function (item) {
      const briefKey = "hq_str_" + (item.sina || item.symbol);
      const fullKey = "hq_str_" + (item.sinaFull || item.symbol);
      return parseSinaBrief(global[briefKey], item) || parseSinaFull(global[fullKey], item) || parseSinaFull(global[briefKey], item);
    });
  }

  async function fetchEastmoney(items) {
    const secids = items
      .map(function (item) {
        return item.em || item.secid;
      })
      .filter(Boolean)
      .join(",");
    if (!secids) throw new Error("no em ids");
    const url =
      "https://push2.eastmoney.com/api/qt/ulist.np/get?fltt=2&invt=2&fields=f2,f3,f4,f12,f14&secids=" +
      encodeURIComponent(secids);
    const res = await fetch(url);
    if (!res.ok) throw new Error("http " + res.status);
    const json = await res.json();
    const rows = (json.data && json.data.diff) || [];
    const byCode = {};
    rows.forEach(function (row) {
      byCode[String(row.f12).toUpperCase()] = row;
    });
    return items.map(function (item) {
      const code = String((item.em || item.secid || "").split(".")[1] || "").toUpperCase();
      const row = byCode[code];
      if (!row || row.f2 == null || row.f2 === "-") return null;
      const price = Number(row.f2);
      const change = Number(row.f4);
      const percent = Number(row.f3);
      return {
        id: item.id,
        name: item.name || row.f14,
        code: String(row.f12),
        symbol: item.symbol || item.tencent,
        market: item.market || "",
        price: price,
        prevClose: price - change,
        change: change,
        percent: percent,
        source: "eastmoney"
      };
    });
  }

  function cacheQuotes(quotes) {
    if (!global.IRStore) return;
    const map = global.IRStore.getQuoteCache();
    quotes.forEach(function (q) {
      if (!q || !q.price) return;
      const key = q.symbol || q.id;
      map[key] = Object.assign({}, q, { cachedAt: Date.now() });
      if (q.id) map[q.id] = map[key];
    });
    global.IRStore.saveQuoteCache(map);
  }

  function fromCache(item) {
    if (!global.IRStore) return null;
    const map = global.IRStore.getQuoteCache();
    const hit = map[item.symbol] || map[item.tencent] || map[item.id] || map[item.secid];
    if (!hit) return null;
    return Object.assign({}, hit, { stale: true, name: item.name || hit.name, market: item.market || hit.market });
  }

  async function getQuotes(items) {
    return withLock(async function () {
      const results = items.map(function () {
        return null;
      });
      const sources = [fetchTencent, fetchSina, fetchEastmoney];
      let lastError = null;
      for (let s = 0; s < sources.length; s++) {
        const pending = [];
        items.forEach(function (item, i) {
          if (!results[i]) pending.push({ item: item, i: i });
        });
        if (!pending.length) break;
        try {
          const rows = await sources[s](pending.map(function (p) {
            return p.item;
          }));
          pending.forEach(function (p, j) {
            if (rows[j]) results[p.i] = rows[j];
          });
        } catch (err) {
          lastError = err;
        }
      }
      const filled = results.map(function (q, i) {
        return q || fromCache(items[i]) || null;
      });
      cacheQuotes(filled.filter(Boolean));
      if (filled.some(Boolean)) return filled;
      throw lastError || new Error("行情接口暂不可用");
    });
  }

  async function getStock(symbolOrItem) {
    const item =
      typeof symbolOrItem === "string"
        ? { symbol: symbolOrItem, tencent: symbolOrItem, sina: symbolOrItem, sinaFull: symbolOrItem }
        : symbolOrItem;
    item.tencent = item.tencent || item.symbol;
    item.sina = item.sina || item.symbol;
    item.sinaFull = item.sinaFull || item.symbol;
    const rows = await getQuotes([item]);
    const q = rows[0];
    if (!q) throw new Error("empty");
    return q;
  }

  /**
   * 近 30 个交易日收盘价。腾讯 K 线接口以 _var 回调形式加载，规避 CORS。
   */
  async function getKline(item) {
    return withLock(async function () {
      const code = item.tencent || item.symbol;
      const varName = "ir_kline_" + ++scriptSeq;
      let url;
      if (item.market === "港股" || /^hk/i.test(code)) {
        url =
          "https://web.ifzq.gtimg.cn/appstock/app/hkfqkline/get?param=" +
          encodeURIComponent(code) +
          ",day,,,30,qfq&_var=" +
          varName;
      } else if (item.market === "美股" || /^us/i.test(code)) {
        url =
          "https://web.ifzq.gtimg.cn/appstock/app/usfqkline/get?param=" +
          encodeURIComponent(code) +
          ",day,,,30,qfq&_var=" +
          varName;
      } else {
        url =
          "https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=" +
          encodeURIComponent(code) +
          ",day,,,30,qfq&_var=" +
          varName;
      }
      try {
        await loadScript(url + "&t=" + Date.now(), "utf-8");
        const payload = global[varName];
        try {
          delete global[varName];
        } catch (e) {}
        const node = payload && payload.data && payload.data[code];
        const series = (node && (node.qfqday || node.day || node.hfqday)) || [];
        return series
          .map(function (row) {
            return { date: row[0], close: num(row[2]) };
          })
          .filter(function (p) {
            return p.date && Number.isFinite(p.close);
          });
      } catch (err) {
        return fetchEastmoneyKline(item);
      }
    });
  }

  async function fetchEastmoneyKline(item) {
    if (!item.em) return [];
    const url =
      "https://push2his.eastmoney.com/api/qt/stock/kline/get?fields1=f1,f2,f3,f4,f5,f6&fields2=f51,f52,f53,f54,f55,f56,f57,f58&klt=101&fqt=1&lmt=30&end=20500101&secid=" +
      encodeURIComponent(item.em);
    const res = await fetch(url);
    if (!res.ok) throw new Error("kline http");
    const json = await res.json();
    const lines = (json.data && json.data.klines) || [];
    return lines.map(function (line) {
      const p = String(line).split(",");
      return { date: p[0], close: num(p[2]) };
    }).filter(function (p) {
      return p.date && Number.isFinite(p.close);
    });
  }

  function renderCard(target, quote) {
    const tone = changeClass(quote.change !== 0 ? quote.change : quote.percent);
    const path = sparkPath(quote.spark, 280, 42);
    const stroke = tone === "up" ? "#f07167" : tone === "down" ? "#3dd68c" : "#8b9bb4";
    const stale = quote.stale ? '<span class="pill warn">缓存</span>' : "";
    target.innerHTML =
      '<div class="card-head">' +
      '<div class="card-name">' +
      quote.name +
      "</div>" +
      '<div class="market-tag">' +
      quote.market +
      stale +
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
      '<div class="card-foot">' +
      (quote.stale ? "当前为上次成功缓存，非实时行情" : "公开行情 · 约 20 秒自动刷新") +
      "</div>";
  }

  function renderCardError(target, name) {
    target.innerHTML =
      '<div class="card-head"><div class="card-name">' +
      name +
      '</div></div><div class="price flat">--</div><div class="card-foot">暂时无法获取行情，请稍后刷新</div>';
  }

  /** 把用户输入（600519 / sh600519 / 00700 / AAPL）转成内部标的 */
  function parseSymbol(input) {
    const raw = String(input || "").trim().toLowerCase();
    if (!raw) return null;
    if (/^(sh|sz)\d{6}$/.test(raw)) {
      const prefix = raw.slice(0, 2);
      const code = raw.slice(2);
      return {
        symbol: raw,
        tencent: raw,
        sina: raw,
        sinaFull: raw,
        em: prefix === "sh" ? "1." + code : "0." + code,
        name: raw,
        market: "A股"
      };
    }
    const digits = raw.replace(/^(sh|sz)/, "");
    if (/^6\d{5}$/.test(digits)) {
      return { symbol: "sh" + digits, tencent: "sh" + digits, sina: "sh" + digits, sinaFull: "sh" + digits, em: "1." + digits, name: digits, market: "A股" };
    }
    if (/^[03]\d{5}$/.test(digits)) {
      return { symbol: "sz" + digits, tencent: "sz" + digits, sina: "sz" + digits, sinaFull: "sz" + digits, em: "0." + digits, name: digits, market: "A股" };
    }
    if (/^\d{5}$/.test(raw)) {
      return { symbol: "hk" + raw, tencent: "hk" + raw, sina: "rt_hk" + raw, sinaFull: "rt_hk" + raw, name: raw, market: "港股" };
    }
    if (/^[a-z]{1,5}$/.test(raw)) {
      return { symbol: "us" + raw.toUpperCase(), tencent: "us" + raw, sina: "gb_" + raw, sinaFull: "gb_" + raw, name: raw.toUpperCase(), market: "美股" };
    }
    return null;
  }

  global.IRQuotes = {
    HOME_INDICES: HOME_INDICES,
    BOARD_INDICES: BOARD_INDICES,
    getQuotes: getQuotes,
    getStock: getStock,
    getKline: getKline,
    renderCard: renderCard,
    renderCardError: renderCardError,
    formatNumber: formatNumber,
    signed: signed,
    changeClass: changeClass,
    sparkPath: sparkPath,
    parseSymbol: parseSymbol
  };
})(window);
