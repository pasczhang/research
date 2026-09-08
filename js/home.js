(function () {
  const Q = window.IRQuotes;
  const Store = window.IRStore;
  const nodes = {};

  Q.HOME_INDICES.forEach(function (item) {
    nodes[item.id] = document.querySelector('[data-index="' + item.id + '"]');
  });

  function sentimentText(quotes) {
    const valid = quotes.filter(Boolean);
    if (!valid.length) return { title: "情绪未知", desc: "指数行情暂不可用，无法判断市场强弱。" };
    const up = valid.filter(function (q) {
      return q.percent > 0.15;
    }).length;
    const down = valid.filter(function (q) {
      return q.percent < -0.15;
    }).length;
    const avg =
      valid.reduce(function (s, q) {
        return s + (Number(q.percent) || 0);
      }, 0) / valid.length;
    if (up >= 2 && avg > 0) {
      return { title: "偏暖", desc: "主要基准指数多数上涨，风险偏好相对积极，仍需留意分化。" };
    }
    if (down >= 2 && avg < 0) {
      return { title: "偏冷", desc: "主要基准指数多数下跌，建议降低操作频率，先看回撤纪律。" };
    }
    return { title: "震荡", desc: "跨市场涨跌互现，方向不清晰，更适合跟踪持仓而非追涨杀跌。" };
  }

  function setOverview(quotes) {
    const list = Store.getWatchlist();
    const countEl = document.querySelector("[data-stat-count]");
    const pnlEl = document.querySelector("[data-stat-pnl]");
    const moodEl = document.querySelector("[data-stat-mood]");
    const moodDesc = document.querySelector("[data-stat-mood-desc]");
    const holdEl = document.querySelector("[data-stat-hold]");

    if (countEl) countEl.textContent = String(list.length);
    if (holdEl) {
      const holds = list.filter(function (i) {
        return i.group === "hold";
      }).length;
      holdEl.textContent = holds + " 只持仓 / " + (list.length - holds) + " 只关注";
    }

    const mood = sentimentText(quotes);
    if (moodEl) moodEl.textContent = mood.title;
    if (moodDesc) moodDesc.textContent = mood.desc;
    if (moodEl) {
      moodEl.classList.remove("up", "down", "flat");
      moodEl.classList.add(mood.title === "偏暖" ? "up" : mood.title === "偏冷" ? "down" : "flat");
    }

    if (!pnlEl) return;
    // 今日盈亏在拿到自选股报价后再写入
  }

  async function loadPnl() {
    const pnlEl = document.querySelector("[data-stat-pnl]");
    const pnlHint = document.querySelector("[data-stat-pnl-hint]");
    const list = Store.getWatchlist().filter(function (i) {
      return i.group === "hold";
    });
    if (!list.length) {
      if (pnlEl) pnlEl.textContent = "--";
      if (pnlHint) pnlHint.textContent = "暂无持仓，添加持仓后将按涨跌额×数量估算";
      return;
    }
    let quotes = [];
    try {
      quotes = await Q.getQuotes(list);
    } catch (err) {
      quotes = [];
    }
    let total = 0;
    let usedShares = false;
    let ok = 0;
    for (let i = 0; i < list.length; i++) {
      const q = quotes[i];
      if (!q) continue;
      ok += 1;
      if (list[i].shares) {
        total += q.change * list[i].shares;
        usedShares = true;
      } else {
        total += q.change;
      }
    }
    if (!ok) {
      if (pnlEl) pnlEl.textContent = "--";
      if (pnlHint) pnlHint.textContent = "持仓报价获取失败，请稍后刷新";
      return;
    }
    const tone = Q.changeClass(total);
    if (pnlEl) {
      pnlEl.textContent = (total > 0 ? "+" : "") + Q.formatNumber(total, 2);
      pnlEl.className = "stat-value " + tone;
    }
    if (pnlHint) {
      pnlHint.textContent = usedShares
        ? "按持仓数量 × 当日涨跌额估算，未计交易成本"
        : "未填写数量，按每股涨跌额加总，仅作方向参考";
    }
  }

  async function refresh() {
    try {
      const quotes = await Q.getQuotes(Q.HOME_INDICES);
      const degraded = quotes.some(function (q) {
        return q && q.stale;
      });
      Q.HOME_INDICES.forEach(function (item, i) {
        const quote = quotes[i];
        if (quote && nodes[item.id]) {
          nodes[item.id].classList.toggle("is-stale", !!quote.stale);
          Q.renderCard(nodes[item.id], quote);
        } else if (nodes[item.id]) {
          Q.renderCardError(nodes[item.id], item.name);
        }
      });
      setOverview(quotes);
      await loadPnl();
      window.IRApp.setUpdated();
      window.IRApp.setLive(!degraded);
      window.IRApp.setBanner(
        degraded ? "部分行情来自本地缓存，可能不是最新价格。网络恢复后将自动切换为实时数据。" : "",
        "warn"
      );
    } catch (err) {
      Q.HOME_INDICES.forEach(function (item) {
        if (nodes[item.id]) Q.renderCardError(nodes[item.id], item.name);
      });
      setOverview([]);
      window.IRApp.setLive(false);
      window.IRApp.setBanner("暂时无法连接行情接口（腾讯/新浪/东方财富），请检查网络后点击刷新。", "error");
      if (window.event && window.event.type === "ir:refresh") {
        window.IRApp.toast("行情刷新失败", "error");
      }
    }
  }

  const ms = (Store.getSettings && Store.getSettings().autoRefreshMs) || 20000;
  window.IRApp.startAutoRefresh(refresh, ms);
})();
