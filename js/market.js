(function () {
  const Q = window.IRQuotes;
  const tbody = document.querySelector("[data-board]");

  function row(quote) {
    const tone = Q.changeClass(quote.percent);
    return (
      "<tr>" +
      "<td>" +
      quote.name +
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

  async function refresh() {
    try {
      const quotes = await Q.getQuotes(Q.BOARD_INDICES);
      tbody.innerHTML = quotes.map(row).join("");
      quotes.slice(0, 3).forEach((quote) => {
        const card = document.querySelector('[data-index="' + quote.id + '"]');
        if (card) Q.renderCard(card, quote);
      });
      window.IRApp.setUpdated();
      window.IRApp.setLive(true);
    } catch (err) {
      tbody.innerHTML = '<tr><td colspan="5" class="empty">暂时无法获取行情</td></tr>';
      window.IRApp.setLive(false);
    }
  }

  refresh();
  setInterval(refresh, 15000);
})();
