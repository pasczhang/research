/**
 * 研究报告模板：点击卡片查看完整分析框架。内容仅为研究提纲，不构成投资建议。
 */
(function () {
  const TEMPLATES = [
    {
      id: "moutai",
      tag: "估值",
      title: "茅台估值分析",
      summary: "从品牌溢价、渠道库存、吨价与 PE Band 出发，搭建白酒龙头的估值框架。",
      sections: [
        {
          h: "1. 生意本质",
          p: "先确认现金流来源：高端宴席与礼品需求、直营与批价价差、系列酒贡献。把「品牌」翻译成可跟踪的价格带与动销指标，而不是口号。"
        },
        {
          h: "2. 量价拆解",
          p: "跟踪批价、拆箱率、渠道库存月数、直营占比。量的弹性通常小于价；若批价走弱而报表收入仍强，优先怀疑渠道压货。"
        },
        {
          h: "3. 估值锚",
          p: "用过去 10 年 PE 分位（例如 20/50/80 分位）画估值带；同时用 DCF 做对照：假设吨价增速、销量增速、费用率与永续增速，看当前市值隐含的增长是否过高。"
        },
        {
          h: "4. 风险清单",
          p: "消费降级、反腐与商务需求、税费与会计政策、系列酒稀释品牌。每条风险写触发信号（例如批价连续 N 周下跌）。"
        },
        {
          h: "5. 决策记录",
          p: "给出自己的安全边际：例如「PE 低于 10 年 30 分位且批价稳定」才加仓。把假设写进笔记，避免事后合理化。"
        }
      ]
    },
    {
      id: "catl",
      tag: "技术面",
      title: "宁德时代技术面分析",
      summary: "用趋势、量能、相对强弱与关键价位，观察成长股的交易结构，而不是预测短期涨跌。",
      sections: [
        {
          h: "1. 级别与趋势",
          p: "先定周期：周线判断主趋势，日线做执行。标记 20/60/120 日均线多空排列，以及最近一次放量突破或破位的位置。"
        },
        {
          h: "2. 量价结构",
          p: "上涨是否有量、回调是否缩量。若价格新高而成交量递减，记为潜在背离，需要基本面订单数据来确认或证伪。"
        },
        {
          h: "3. 相对强弱",
          p: "相对沪深300或新能源指数做比率图。个股强于板块，说明资金仍在龙头；弱于板块则可能是估值消化或份额担忧。"
        },
        {
          h: "4. 关键位",
          p: "列出前高、跳空缺口、密集交易区。技术面只提供「失效条件」：跌破某价位则减少交易频率，而不是自动清仓口号。"
        },
        {
          h: "5. 与基本面交叉验证",
          p: "把装机量、毛利率、海外订单与图表对照。技术面恶化而基本面仍强，更可能是估值回归；两者同向下，权重应提高。"
        }
      ]
    },
    {
      id: "macro",
      tag: "宏观",
      title: "三市场流动性对照",
      summary: "比较 A 股、港股、美股基准的波动节奏，判断风险偏好是同步扩散还是区域分化。",
      sections: [
        { h: "1. 价格对照", p: "并排观察沪深300、恒生指数、标普500 近 30 日走势。同涨同跌偏全球风险偏好；背离则看汇率、利率与产业政策。" },
        { h: "2. 利率与美元", p: "美债实际利率与美元指数上行时，成长股与港股科技往往更敏感。把利率方向写成「顺风/逆风」而不是点位预测。" },
        { h: "3. 成交与北向", p: "A 股成交额、北向资金只作情绪温度计。连续缩量下跌与放量下跌含义不同，需分开记录。" },
        { h: "4. 结论模板", p: "输出一句话制度：例如「全球风险偏好回暖，但 A 股相对落后，优先观察是否补涨而非追海外映射。」" }
      ]
    },
    {
      id: "risk",
      tag: "仓位",
      title: "回撤纪律检查清单",
      summary: "用最大回撤、持仓集中度和现金比例，定期复核组合是否偏离预设风险预算。",
      sections: [
        { h: "1. 回撤预算", p: "预先写下可承受的组合回撤（例如 12%）。触及预算只触发「减杠杆/暂停加仓」，具体卖什么按个股逻辑而非情绪。" },
        { h: "2. 集中度", p: "单一标的、单一行业上限。茅台或宁德这类高权重股要用「若跌 20% 组合会怎样」做压力测试。" },
        { h: "3. 现金与再平衡", p: "现金不是空仓羞耻，而是期权。记录上次再平衡日期，避免每天微调。" },
        { h: "4. 检查频率", p: "建议每周一次对照本清单，行情剧烈时改为每日看预算，而不是每日看新闻。" }
      ]
    }
  ];

  const grid = document.querySelector("[data-research-grid]");
  const drawer = document.querySelector("[data-drawer]");
  const drawerBody = document.querySelector("[data-drawer-body]");

  function renderGrid() {
    grid.innerHTML = TEMPLATES.map(function (t) {
      return (
        '<article class="report" data-open="' +
        t.id +
        '">' +
        '<span class="tag">' +
        t.tag +
        "</span>" +
        "<h3>" +
        t.title +
        "</h3>" +
        "<p>" +
        t.summary +
        "</p>" +
        '<span class="report-cta">查看框架</span>' +
        "</article>"
      );
    }).join("");
  }

  function openTemplate(id) {
    const t = TEMPLATES.find(function (x) {
      return x.id === id;
    });
    if (!t || !drawer) return;
    drawerBody.innerHTML =
      "<h2>" +
      t.title +
      "</h2>" +
      t.sections
        .map(function (s) {
          return "<h3>" + s.h + "</h3><p>" + s.p + "</p>";
        })
        .join("") +
      '<p class="disclaimer">以上为研究提纲，不构成任何投资建议。</p>';
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
  }

  function closeDrawer() {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
  }

  renderGrid();
  grid.addEventListener("click", function (event) {
    const card = event.target.closest("[data-open]");
    if (card) openTemplate(card.getAttribute("data-open"));
  });
  drawer.addEventListener("click", function (event) {
    if (event.target.matches("[data-close], .drawer-backdrop")) closeDrawer();
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") closeDrawer();
  });
})();
