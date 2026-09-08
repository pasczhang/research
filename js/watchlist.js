(function () {
  const Q = window.IRQuotes;
  const Store = window.IRStore;
  const tbody = document.querySelector("[data-watchlist]");
  const form = document.querySelector("[data-watch-form]");
  const input = document.querySelector("[data-code]");
  const groupSelect = document.querySelector("[data-group]");
  const filterBar = document.querySelector("[data-filter]");
  const emptyHint = "暂无自选股，请在上方添加。支持 600519、00700、AAPL。";

  let filter = "all";

  function load() {
    return Store.getWatchlist();
  }

  function save(list) {
    Store.saveWatchlist(list);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  function pnlRatio(price, cost) {
    if (!Number.isFinite(price) || !Number.isFinite(cost) || !cost) return null;
    return ((price - cost) / cost) * 100;
  }

  function visibleList(list) {
    if (filter === "all") return list;
    return list.filter(function (item) {
      return item.group === filter;
    });
  }

  function rowHtml(item, q) {
    const tone = q ? Q.changeClass(q.percent) : "flat";
    const ratio = q ? pnlRatio(q.price, item.cost) : null;
    const ratioTone = ratio == null ? "flat" : Q.changeClass(ratio);
    const groupLabel = item.group === "hold" ? "持仓" : "关注";
    return (
      "<tr data-symbol=\"" +
      escapeHtml(item.symbol) +
      "\">" +
      '<td data-label="名称">' +
      escapeHtml((q && q.name) || item.name) +
      ' <span class="mini-tag">' +
      groupLabel +
      "</span></td>" +
      '<td data-label="代码">' +
      escapeHtml((q && q.code) || item.symbol.replace(/^(sh|sz|hk|us)/i, "")) +
      "</td>" +
      '<td class="num ' +
      tone +
      '" data-label="最新">' +
      (q ? Q.formatNumber(q.price, 2) : "--") +
      "</td>" +
      '<td class="num ' +
      tone +
      '" data-label="涨跌幅">' +
      (q ? Q.signed(q.percent, 2) + "%" : "--") +
      "</td>" +
      '<td class="num" data-label="成本价"><input class="cell-input" data-cost inputmode="decimal" value="' +
      (item.cost == null ? "" : item.cost) +
      '" placeholder="—"></td>' +
      '<td class="num" data-label="数量"><input class="cell-input" data-shares inputmode="numeric" value="' +
      (item.shares == null ? "" : item.shares) +
      '" placeholder="—"></td>' +
      '<td class="num ' +
      ratioTone +
      '" data-label="盈亏比例">' +
      (ratio == null ? "--" : Q.signed(ratio, 2) + "%") +
      "</td>" +
      '<td class="num actions" data-label="操作">' +
      '<button type="button" class="ghost" data-toggle-group>' +
      (item.group === "hold" ? "改关注" : "改持仓") +
      "</button>" +
      '<button type="button" class="ghost danger" data-remove>移除</button>' +
      "</td></tr>"
    );
  }

  async function render() {
    const list = load();
    const rows = visibleList(list);
    if (!rows.length) {
      tbody.innerHTML = '<tr><td colspan="8" class="empty">' + (list.length ? "当前分组没有标的。" : emptyHint) + "</td></tr>";
      return;
    }

    const html = [];
    let live = true;
    let stale = false;
    let quotes = [];
    try {
      quotes = await Q.getQuotes(rows);
    } catch (err) {
      quotes = rows.map(function () { return null; });
      live = false;
    }
    for (let i = 0; i < rows.length; i++) {
      const item = rows[i];
      const q = quotes[i];
      if (q) {
        item.name = q.name || item.name;
        if (q.stale) stale = true;
        html.push(rowHtml(item, q));
      } else {
        live = false;
        html.push(rowHtml(item, null));
      }
    }
    save(list);
    tbody.innerHTML = html.join("");
    window.IRApp.setUpdated();
    window.IRApp.setLive(live && !stale);
    window.IRApp.setBanner(
      stale
        ? "部分自选股使用了缓存报价，可能不是最新价。"
        : live
          ? ""
          : "部分或全部报价获取失败，已显示本地名称，请稍后刷新。",
      live && stale ? "warn" : live ? "" : "error"
    );
  }

  function findItem(symbol) {
    return load().find(function (item) {
      return item.symbol === symbol;
    });
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const parsed = Q.parseSymbol(input.value);
    if (!parsed) {
      window.IRApp.toast("请输入 6 位 A 股、5 位港股或美股代码", "error");
      return;
    }
    const list = load();
    if (list.some(function (item) {
      return item.symbol === parsed.symbol;
    })) {
      window.IRApp.toast("该标的已在自选列表中", "info");
      input.value = "";
      return;
    }
    parsed.group = groupSelect && groupSelect.value === "hold" ? "hold" : "watch";
    parsed.cost = null;
    parsed.shares = null;
    list.push(parsed);
    save(list);
    input.value = "";
    window.IRApp.toast("已添加 " + parsed.symbol, "ok");
    await render();
  });

  tbody.addEventListener("click", function (event) {
    const tr = event.target.closest("tr[data-symbol]");
    if (!tr) return;
    const symbol = tr.getAttribute("data-symbol");
    if (event.target.closest("[data-remove]")) {
      save(
        load().filter(function (item) {
          return item.symbol !== symbol;
        })
      );
      render();
      return;
    }
    if (event.target.closest("[data-toggle-group]")) {
      const list = load();
      list.forEach(function (item) {
        if (item.symbol === symbol) item.group = item.group === "hold" ? "watch" : "hold";
      });
      save(list);
      render();
    }
  });

  tbody.addEventListener("change", function (event) {
    const tr = event.target.closest("tr[data-symbol]");
    if (!tr) return;
    const symbol = tr.getAttribute("data-symbol");
    const list = load();
    const item = list.find(function (row) {
      return row.symbol === symbol;
    });
    if (!item) return;
    if (event.target.hasAttribute("data-cost")) {
      const v = event.target.value.trim();
      item.cost = v === "" ? null : Number(v);
      if (item.cost != null && !Number.isFinite(item.cost)) item.cost = null;
    }
    if (event.target.hasAttribute("data-shares")) {
      const v = event.target.value.trim();
      item.shares = v === "" ? null : Number(v);
      if (item.shares != null && !Number.isFinite(item.shares)) item.shares = null;
    }
    save(list);
    const priceText = tr.querySelector('[data-label="最新"]');
    const ratioTd = tr.querySelector('[data-label="盈亏比例"]');
    if (priceText && ratioTd) {
      const price = Number(String(priceText.textContent).replace(/,/g, ""));
      const ratio = pnlRatio(price, item.cost);
      const tone = ratio == null ? "flat" : Q.changeClass(ratio);
      ratioTd.className = "num " + tone;
      ratioTd.textContent = ratio == null ? "--" : Q.signed(ratio, 2) + "%";
    }
  });

  if (filterBar) {
    filterBar.addEventListener("click", function (event) {
      const btn = event.target.closest("[data-filter-value]");
      if (!btn) return;
      filter = btn.getAttribute("data-filter-value");
      filterBar.querySelectorAll("[data-filter-value]").forEach(function (el) {
        el.classList.toggle("active", el === btn);
      });
      render();
    });
  }

  function download(filename, text, mime) {
    const blob = new Blob([text], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function csvEscape(v) {
    const s = v == null ? "" : String(v);
    if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  document.querySelectorAll("[data-export]").forEach(function (btn) {
    btn.addEventListener("click", async function () {
      const list = load();
      const type = btn.getAttribute("data-export");
      const enriched = [];
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        let q = null;
        try {
          q = await Q.getStock(item);
        } catch (err) {}
        const ratio = q ? pnlRatio(q.price, item.cost) : null;
        enriched.push({
          name: (q && q.name) || item.name,
          symbol: item.symbol,
          group: item.group === "hold" ? "持仓" : "关注",
          price: q ? q.price : null,
          percent: q ? q.percent : null,
          cost: item.cost,
          shares: item.shares,
          pnlRatio: ratio
        });
      }
      const day = new Date().toISOString().slice(0, 10);
      if (type === "json") {
        download("watchlist-" + day + ".json", JSON.stringify(enriched, null, 2), "application/json");
      } else {
        const header = ["名称", "代码", "分组", "最新价", "涨跌幅%", "成本价", "数量", "盈亏比例%"];
        const lines = [header.join(",")].concat(
          enriched.map(function (row) {
            return [
              csvEscape(row.name),
              csvEscape(row.symbol),
              csvEscape(row.group),
              row.price,
              row.percent,
              row.cost,
              row.shares,
              row.pnlRatio
            ].join(",");
          })
        );
        download("watchlist-" + day + ".csv", "\ufeff" + lines.join("\n"), "text/csv;charset=utf-8");
      }
      window.IRApp.toast("已导出 " + type.toUpperCase(), "ok");
    });
  });

  const ms = Store.getSettings().autoRefreshMs || 20000;
  window.IRApp.startAutoRefresh(render, ms);
})();
