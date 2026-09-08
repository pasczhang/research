(function () {
  const Q = window.IRQuotes;
  const nodes = {};

  Q.HOME_INDICES.forEach((item) => {
    nodes[item.id] = document.querySelector('[data-index="' + item.id + '"]');
  });

  async function refresh() {
    try {
      const quotes = await Q.getQuotes(Q.HOME_INDICES);
      quotes.forEach((quote) => {
        if (nodes[quote.id]) Q.renderCard(nodes[quote.id], quote);
      });
      window.IRApp.setUpdated();
      window.IRApp.setLive(true);
    } catch (err) {
      Q.HOME_INDICES.forEach((item) => {
        if (nodes[item.id]) Q.renderCardError(nodes[item.id], item.name);
      });
      window.IRApp.setLive(false);
    }
  }

  refresh();
  setInterval(refresh, 15000);
})();
