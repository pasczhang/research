(function () {
  const KEY = "ir-watchlist";
  const Q = window.IRQuotes;
  const tbody = document.querySelector("[data-watchlist]");
  const form = document.querySelector("[data-watch-form]");
  const input = document.querySelector("[data-code]");

  const DEFAULTS = [
    { secid: "1.600519", name: "贵州茅台" },
    { secid: "0.000858", name: "五粮液" },
    { secid: "0.300750", name: "宁德时代" }
  ];

  function load() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "null");
      if (Array.isArray(saved) && saved.length) return saved;
    } catch (err) {}
    return DEFAULTS.slice();
  }

  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function toSecid(code) {
    const raw = String(code || "").trim().toLowerCase();
    if (/^1\.\d{6}$/.test(raw) || /^0\.\d{6}$/.test(raw)) return raw;
    const digits = raw.replace(/^(sh|sz)/, "");
    if (/^6\d{5}$/.test(digits)) return "1." + digits;
    if (/^[03]\d{5}$/.test(digits)) return "0." + digits;
    return "";
  }

  async function render() {
    const list = load();
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">暂无自选股，请在上方添加。</td></tr>';
      return;
    }
    const rows = [];
    for (const item of list) {
      try {
        const q = await Q.getStock(item.secid);
        item.name = q.name;
        const tone = Q.changeClass(q.percent);
        rows.push(
          "<tr>" +
            "<td>" +
            q.name +
            "</td>" +
            "<td>" +
            q.code +
            "</td>" +
            '<td class="num ' +
            tone +
            '">' +
            Q.formatNumber(q.price, 2) +
            "</td>" +
            '<td class="num ' +
            tone +
            '">' +
            Q.signed(q.percent, 2) +
            "%</td>" +
            '<td class="num"><button class="ghost" data-remove="' +
            item.secid +
            '">移除</button></td>' +
            "</tr>"
        );
      } catch (err) {
        rows.push(
          "<tr><td>" +
            (item.name || item.secid) +
            "</td><td>" +
            item.secid +
            '</td><td colspan="2">暂无报价</td><td class="num"><button class="ghost" data-remove="' +
            item.secid +
            '">移除</button></td></tr>'
        );
      }
    }
    save(list);
    tbody.innerHTML = rows.join("");
    window.IRApp.setUpdated();
    window.IRApp.setLive(true);
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    const secid = toSecid(input.value);
    if (!secid) {
      alert("请输入 6 位 A 股代码，例如 600519 或 300750");
      return;
    }
    const list = load();
    if (list.some((item) => item.secid === secid)) {
      input.value = "";
      return;
    }
    list.push({ secid: secid, name: secid });
    save(list);
    input.value = "";
    await render();
  });

  tbody.addEventListener("click", function (event) {
    const btn = event.target.closest("[data-remove]");
    if (!btn) return;
    const secid = btn.getAttribute("data-remove");
    save(load().filter((item) => item.secid !== secid));
    render();
  });

  render();
  setInterval(render, 20000);
})();
