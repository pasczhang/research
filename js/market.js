(function () {
  const Q = window.IRQuotes;
  const tbody = document.querySelector("[data-board]");
  const chartsRoot = document.querySelector("[data-charts]");
  const chartPool = {};

  function row(quote) {
    if (!quote) {
      return '<tr><td colspan="5" class="empty">该指数暂无报价</td></tr>';
    }
    const tone = Q.changeClass(quote.percent);
    return (
      "<tr>" +
      "<td>" +
      quote.name +
      (quote.stale ? ' <span class="mini-tag">缓存</span>' : "") +
      "</td>" +
      "<td>" +
      quote.market +
      "</td>" +
      '<td class="num ' +
      tone +
      '">' +
      Q.formatNumber(quote.price, 2) +
      "</td>" +
      '<td class="num ' +
      tone +
      '">' +
      Q.signed(quote.change, 2) +
      "</td>" +
      '<td class="num ' +
      tone +
      '">' +
      Q.signed(quote.percent, 2) +
      "%</td>" +
      "</tr>"
    );
  }

  function ensureChart(id, title) {
    if (chartPool[id] || typeof echarts === "undefined") return chartPool[id];
    const box = document.createElement("article");
    box.className = "chart-card";
    box.innerHTML = "<h3>" + title + "</h3><div class=\"chart\" id=\"chart-" + id + "\"></div>";
    chartsRoot.appendChild(box);
    chartPool[id] = echarts.init(document.getElementById("chart-" + id), null, { renderer: "canvas" });
    return chartPool[id];
  }

  function paintChart(id, title, points, percent) {
    const chart = ensureChart(id, title);
    if (!chart) return;
    const tone = percent > 0 ? "#f07167" : percent < 0 ? "#3dd68c" : "#d4b45a";
    chart.setOption({
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "#152036",
        borderColor: "#2a3c5a",
        textStyle: { color: "#e8eef7" }
      },
      grid: { left: 48, right: 16, top: 24, bottom: 28 },
      xAxis: {
        type: "category",
        data: points.map(function (p) {
          return p.date.slice(5);
        }),
        axisLine: { lineStyle: { color: "#2a3c5a" } },
        axisLabel: { color: "#8b9bb4", fontSize: 11 }
      },
      yAxis: {
        type: "value",
        scale: true,
        splitLine: { lineStyle: { color: "#1c2a42" } },
        axisLabel: { color: "#8b9bb4", fontSize: 11 }
      },
      series: [
        {
          name: title,
          type: "line",
          smooth: true,
          showSymbol: false,
          data: points.map(function (p) {
            return p.close;
          }),
          lineStyle: { color: tone, width: 2 },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: tone + "55" },
              { offset: 1, color: tone + "05" }
            ])
          }
        }
      ]
    });
  }

  async function loadCharts(quotes) {
    if (!chartsRoot || typeof echarts === "undefined") return;
    const targets = Q.BOARD_INDICES.filter(function (item) {
      return ["csi300", "hsi", "spx", "sse", "ndx"].indexOf(item.id) !== -1;
    });
    for (let i = 0; i < targets.length; i++) {
      const item = targets[i];
      try {
        const points = await Q.getKline(item);
        if (points.length) {
          const q = quotes.find(function (row) {
            return row && row.id === item.id;
          });
          paintChart(item.id, item.name + " · 近30日", points, q ? q.percent : 0);
        }
      } catch (err) {}
    }
  }

  async function refresh() {
    try {
      const quotes = await Q.getQuotes(Q.BOARD_INDICES);
      tbody.innerHTML = quotes
        .map(function (q, i) {
          if (q) return row(q);
          const meta = Q.BOARD_INDICES[i];
          return (
            "<tr><td>" +
            meta.name +
            "</td><td>" +
            meta.market +
            '</td><td colspan="3" class="empty">暂无报价</td></tr>'
          );
        })
        .join("");
      const featured = ["csi300", "hsi", "spx"];
      featured.forEach(function (id) {
        const quote = quotes.find(function (q) {
          return q && q.id === id;
        });
        const card = document.querySelector('[data-index="' + id + '"]');
        if (!card) return;
        if (quote) Q.renderCard(card, quote);
        else {
          const meta = Q.BOARD_INDICES.find(function (x) {
            return x.id === id;
          });
          Q.renderCardError(card, meta.name);
        }
      });
      const degraded = quotes.some(function (q) {
        return q && q.stale;
      });
      const missing = quotes.filter(function (q) {
        return !q;
      }).length;
      window.IRApp.setUpdated();
      window.IRApp.setLive(!degraded && !missing);
      if (missing === quotes.length) {
        window.IRApp.setBanner("指数行情全部失败，请稍后刷新。", "error");
      } else if (degraded || missing) {
        window.IRApp.setBanner("部分指数使用缓存或暂缺，已尽量展示可用数据。", "warn");
      } else {
        window.IRApp.setBanner("");
      }
      await loadCharts(quotes.filter(Boolean));
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">暂时无法获取行情，请检查网络后点击刷新。若刚刚打开页面，也可稍等自动重试。</td></tr>';
      window.IRApp.setLive(false);
      window.IRApp.setBanner("行情接口请求失败，已停止更新表格。", "error");
    }
  }

  window.addEventListener("resize", function () {
    Object.keys(chartPool).forEach(function (id) {
      chartPool[id].resize();
    });
  });

  const ms = (window.IRStore && window.IRStore.getSettings().autoRefreshMs) || 20000;
  window.IRApp.startAutoRefresh(refresh, ms);
})();
