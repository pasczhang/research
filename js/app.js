(function () {
  const clock = document.querySelector("[data-clock]");
  const stamp = document.querySelector("[data-updated]");

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function tick() {
    if (!clock) return;
    const now = new Date();
    clock.textContent =
      now.getFullYear() +
      "-" +
      pad(now.getMonth() + 1) +
      "-" +
      pad(now.getDate()) +
      " " +
      pad(now.getHours()) +
      ":" +
      pad(now.getMinutes()) +
      ":" +
      pad(now.getSeconds());
  }

  window.IRApp = {
    setUpdated: function () {
      if (!stamp) return;
      const now = new Date();
      stamp.textContent = "更新于 " + pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
    },
    setLive: function (ok) {
      const dot = document.querySelector(".status-dot");
      if (dot) dot.classList.toggle("live", !!ok);
    }
  };

  tick();
  setInterval(tick, 1000);
})();
