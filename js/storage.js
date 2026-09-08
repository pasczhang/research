/**
 * 本地数据适配层。
 * 当前使用 LocalStorage；日后迁到后端时，只需改写 getWatchlist / saveWatchlist，
 * 保持返回结构不变即可，页面脚本不必重写。
 *
 * 自选股记录结构：
 * {
 *   symbol: "sh600519",   // 腾讯/新浪行情代码
 *   secid: "1.600519",    // 东方财富 secid（兼容旧数据、备用接口）
 *   name: "贵州茅台",
 *   group: "hold" | "watch",  // 持仓 | 关注
 *   cost: number | null,      // 成本价
 *   shares: number | null     // 持仓数量，用于估算盈亏
 * }
 */
(function (global) {
  const KEY = "ir-watchlist-v2";
  const LEGACY_KEY = "ir-watchlist";
  const QUOTE_CACHE_KEY = "ir-quote-cache";
  const SETTINGS_KEY = "ir-settings";

  const DEFAULTS = [
    { symbol: "sh600519", secid: "1.600519", name: "贵州茅台", group: "hold", cost: 1680, shares: 100 },
    { symbol: "sz000858", secid: "0.000858", name: "五粮液", group: "hold", cost: 128, shares: 200 },
    { symbol: "sz300750", secid: "0.300750", name: "宁德时代", group: "watch", cost: null, shares: null }
  ];

  function parseJson(raw, fallback) {
    try {
      return JSON.parse(raw);
    } catch (err) {
      return fallback;
    }
  }

  function migrateLegacy(list) {
    if (!Array.isArray(list)) return [];
    return list.map(function (item) {
      if (item.symbol) {
        return {
          symbol: item.symbol,
          secid: item.secid || "",
          name: item.name || item.symbol,
          group: item.group === "hold" ? "hold" : "watch",
          cost: item.cost == null || item.cost === "" ? null : Number(item.cost),
          shares: item.shares == null || item.shares === "" ? null : Number(item.shares)
        };
      }
      const secid = String(item.secid || "");
      const parts = secid.split(".");
      const market = parts[0];
      const code = parts[1] || "";
      const symbol = market === "1" ? "sh" + code : "sz" + code;
      return {
        symbol: symbol,
        secid: secid,
        name: item.name || code,
        group: "watch",
        cost: null,
        shares: null
      };
    });
  }

  function getWatchlist() {
    const current = parseJson(localStorage.getItem(KEY) || "null", null);
    if (Array.isArray(current)) return migrateLegacy(current);

    const legacy = parseJson(localStorage.getItem(LEGACY_KEY) || "null", null);
    if (Array.isArray(legacy) && legacy.length) {
      const migrated = migrateLegacy(legacy);
      saveWatchlist(migrated);
      return migrated;
    }
    return DEFAULTS.map(function (item) {
      return Object.assign({}, item);
    });
  }

  function saveWatchlist(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function getQuoteCache() {
    return parseJson(localStorage.getItem(QUOTE_CACHE_KEY) || "{}", {});
  }

  function saveQuoteCache(map) {
    localStorage.setItem(QUOTE_CACHE_KEY, JSON.stringify(map));
  }

  function getSettings() {
    return Object.assign(
      { autoRefreshMs: 20000 },
      parseJson(localStorage.getItem(SETTINGS_KEY) || "{}", {})
    );
  }

  global.IRStore = {
    getWatchlist: getWatchlist,
    saveWatchlist: saveWatchlist,
    getQuoteCache: getQuoteCache,
    saveQuoteCache: saveQuoteCache,
    getSettings: getSettings,
    DEFAULTS: DEFAULTS
  };
})(window);
