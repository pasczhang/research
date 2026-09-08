/**
 * 全站壳层：时钟、刷新按钮、状态点、Toast、移动端导航、页面进入动画。
 * 页面脚本监听 window 上的 "ir:refresh" 事件即可接入统一刷新。
 */
(function () {
  const clock = document.querySelector("[data-clock]");
  const stamp = document.querySelector("[data-updated]");
  const banner = document.querySelector("[data-banner]");

  function pad(n) {
    return String(n).padStart(2, "0");
  }

  function nowText() {
    const now = new Date();
    return (
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
      pad(now.getSeconds())
    );
  }

  function tick() {
    if (clock) clock.textContent = nowText();
  }

  function toast(message, type) {
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      el.setAttribute("role", "status");
      document.body.appendChild(el);
    }
    el.className = "toast show " + (type || "info");
    el.textContent = message;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () {
      el.classList.remove("show");
    }, 3200);
  }

  function setBanner(message, type) {
    if (!banner) return;
    if (!message) {
      banner.hidden = true;
      banner.textContent = "";
      return;
    }
    banner.hidden = false;
    banner.className = "banner " + (type || "info");
    banner.textContent = message;
  }

  function bindRefresh() {
    document.querySelectorAll("[data-refresh]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        btn.disabled = true;
        btn.classList.add("is-busy");
        window.dispatchEvent(new CustomEvent("ir:refresh", { detail: { manual: true } }));
        setTimeout(function () {
          btn.disabled = false;
          btn.classList.remove("is-busy");
        }, 800);
      });
    });
  }

  function bindNav() {
    const toggle = document.querySelector("[data-nav-toggle]");
    const nav = document.querySelector("header nav");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", function () {
      nav.classList.toggle("open");
      toggle.setAttribute("aria-expanded", nav.classList.contains("open") ? "true" : "false");
    });
  }

  /**
   * 启动自动刷新；切到后台标签页时暂停，避免无意义请求。
   */
  function startAutoRefresh(fn, ms) {
    let timer = null;
    function run() {
      if (document.visibilityState === "hidden") return;
      fn();
    }
    function reset() {
      if (timer) clearInterval(timer);
      timer = setInterval(run, ms || 20000);
    }
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") run();
    });
    window.addEventListener("ir:refresh", run);
    run();
    reset();
    return { run: run, reset: reset };
  }

  document.body.classList.add("page-ready");
  bindRefresh();
  bindNav();
  tick();
  setInterval(tick, 1000);

  window.IRApp = {
    setUpdated: function (text) {
      if (!stamp) return;
      stamp.textContent = text || "更新于 " + pad(new Date().getHours()) + ":" + pad(new Date().getMinutes()) + ":" + pad(new Date().getSeconds());
    },
    setLive: function (ok) {
      const dot = document.querySelector(".status-dot");
      if (dot) dot.classList.toggle("live", !!ok);
    },
    toast: toast,
    setBanner: setBanner,
    startAutoRefresh: startAutoRefresh
  };
})();
