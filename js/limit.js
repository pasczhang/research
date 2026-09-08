(function () {
  const Q = window.IRQuotes;
  const CACHE_KEY = "ir-zt-snapshot";
  const tbody = document.querySelector("[data-limit-table]");

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function readCache() {
    try {
      return JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    } catch (err) {
      return null;
    }
  }

  function writeCache(data) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (err) {}
  }

  function fillStats(data) {
    const dateEl = document.querySelector("[data-stat-date]");
    const ztEl = document.querySelector("[data-stat-zt]");
    const dtEl = document.querySelector("[data-stat-dt]");
    const maxEl = document.querySelector("[data-stat-max]");
    const firstEl = document.querySelector("[data-stat-first]");
    if (dateEl) dateEl.textContent = data.dateText || "--";
    if (ztEl) ztEl.textContent = String(data.ztCount);
    if (dtEl) dtEl.textContent = String(data.dtCount);
    if (maxEl) maxEl.textContent = data.maxBoard ? data.maxBoard + " 板" : "--";
    if (firstEl) firstEl.textContent = String(data.firstCount);
  }

  function rowHtml(row, index) {
    const tone = Q.changeClass(row.percent);
    const boardClass = row.boards >= 3 ? "hot" : row.boards >= 2 ? "mid" : "first";
    return (
      "<tr>" +
      '<td data-label="序号">' +
      (index + 1) +
      "</td>" +
      '<td data-label="名称">' +
      escapeHtml(row.name) +
      "</td>" +
      '<td data-label="代码">' +
      escapeHtml(row.code) +
      "</td>" +
      '<td class="num ' +
      tone +
      '" data-label="收盘价">' +
      Q.formatNumber(row.price, 2) +
      "</td>" +
      '<td class="num ' +
      tone +
      '" data-label="涨幅">' +
      Q.signed(row.percent, 2) +
      "%</td>" +
      '<td class="num" data-label="成交额(亿)">' +
      Q.formatAmount(row.amount) +
      "</td>" +
      '<td data-label="板型"><span class="board-badge ' +
      boardClass +
      '">' +
      escapeHtml(row.boardLabel) +
      "</span></td>" +
      '<td data-label="核心题材"><span class="theme-tag">' +
      escapeHtml(row.theme || "--") +
      "</span></td>" +
      '<td class="reason" data-label="涨停原因">' +
      escapeHtml(row.reason) +
      "</td>" +
      "</tr>"
    );
  }

  function render(data) {
    fillStats(data);
    if (!data.rows || !data.rows.length) {
      tbody.innerHTML = '<tr><td colspan="9" class="empty">该交易日暂无涨停记录。</td></tr>';
      return;
    }
    tbody.innerHTML = data.rows.map(rowHtml).join("");
  }

  async function refresh() {
    try {
      const data = await Q.getLimitSnapshot();
      writeCache(Object.assign({}, data, { cachedAt: Date.now() }));
      render(data);
      window.IRApp.setUpdated("收盘数据 " + data.dateText);
      window.IRApp.setLive(true);
      window.IRApp.setBanner(
        "展示 " + data.dateText + " 全部 " + data.ztCount + " 只涨停股。核心题材取自当日涨幅靠前的概念板块成分（例如农业股可能对应粮食概念），不是新闻标题编造。",
        "info"
      );
    } catch (err) {
      const cached = readCache();
      if (cached && cached.rows) {
        cached.stale = true;
        render(cached);
        window.IRApp.setLive(false);
        window.IRApp.setBanner("实时涨停池暂不可用，已显示上次成功缓存（" + (cached.dateText || "") + "）。", "warn");
      } else {
        tbody.innerHTML = '<tr><td colspan="9" class="empty">暂时无法获取涨停池，请稍后刷新。接口来自东方财富公开行情。</td></tr>';
        window.IRApp.setLive(false);
        window.IRApp.setBanner("涨停池请求失败，请检查网络后点击刷新。", "error");
      }
    }
  }

  window.IRApp.startAutoRefresh(refresh, 60000);
})();
