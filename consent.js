// Ad measurement with consent (Ben, Nov 11: "fix" on the ads plan doc). Plainline runs Google and Meta ads; their
// tags show which ads lead to a booked walkthrough. Rules:
// - Nothing loads while both ids below are empty (the default until the ad accounts exist).
// - Nothing loads before the visitor taps "Allow". "No thanks" is as easy as "Allow" and is kept.
// - A browser that sends Global Privacy Control counts as "No thanks" and sees no banner.
// - Only one event is sent besides the page view: a tap on the booking link. Never form fields, chat text or emails.
// The privacy policy ("Ad measurement") describes this; change both together.
(function () {
  const TAGS = {
    google: "", // Google Ads tag id, "AW-" and digits
    meta: "", // Meta Pixel id, digits only
  };
  const KEY = "pl_ads_consent";
  const google = /^AW-\d{6,14}$/.test(TAGS.google) ? TAGS.google : "";
  const meta = /^\d{10,20}$/.test(TAGS.meta) ? TAGS.meta : "";
  const store = {
    get() { try { return localStorage.getItem(KEY); } catch { return null; } },
    set(v) { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch {} },
  };
  const gpc = navigator.globalPrivacyControl === true;
  let loaded = false;

  function add(src) {
    const s = document.createElement("script");
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  function load() {
    if (loaded || gpc) return;
    loaded = true;
    if (google) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag("js", new Date());
      window.gtag("config", google);
      add("https://www.googletagmanager.com/gtag/js?id=" + google);
    }
    if (meta) {
      const q = [];
      const fbq = function () { fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : q.push(arguments); };
      fbq.queue = q; fbq.push = fbq; fbq.loaded = true; fbq.version = "2.0";
      window.fbq = window._fbq = fbq;
      fbq("init", meta);
      fbq("track", "PageView");
      add("https://connect.facebook.net/en_US/fbevents.js");
    }
    document.addEventListener("click", (e) => {
      const a = e.target.closest && e.target.closest('a[href^="https://calendar.app.google/"]');
      if (!a) return;
      if (window.gtag && google) window.gtag("event", "book_walkthrough_click");
      if (window.fbq && meta) window.fbq("track", "Lead");
    });
  }

  function banner() {
    if (document.getElementById("pl-consent")) return;
    const box = document.createElement("div");
    box.id = "pl-consent";
    box.setAttribute("role", "region");
    box.setAttribute("aria-label", "Ad measurement choice");
    box.style.cssText = "position:fixed;left:12px;right:12px;bottom:12px;z-index:50;max-width:520px;margin:0 auto;padding:14px 16px;border-radius:14px;background:#12222b;color:#e2ebee;font:14px/1.5 system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.25)";
    box.innerHTML = '<p style="margin:0 0 10px">May ' + [google && "Google", meta && "Meta"].filter(Boolean).join(" and ") + ' measure which of our ads brought you here? It sets their cookies. <a href="/privacy#ads" style="color:#7fd3d6">Details</a></p>' +
      '<button type="button" data-v="no">No thanks</button> <button type="button" data-v="yes">Allow</button>';
    for (const b of box.querySelectorAll("button")) {
      b.style.cssText = "font:600 14px system-ui,sans-serif;padding:8px 16px;border-radius:999px;border:1px solid #7fd3d6;cursor:pointer;margin-right:6px;" +
        (b.dataset.v === "yes" ? "background:#7fd3d6;color:#12222b" : "background:transparent;color:#e2ebee");
      b.addEventListener("click", () => {
        store.set(b.dataset.v);
        box.remove();
        if (b.dataset.v === "yes") load();
      });
    }
    document.body.appendChild(box);
  }

  // The privacy page's "Change your choice" button calls this.
  window.plAdsChoice = function () {
    if (!google && !meta) return "off";
    if (gpc) return "gpc";
    store.set(null);
    if (loaded) { location.reload(); return "reset"; }
    banner();
    return "asked";
  };

  if (!google && !meta) return;
  const choice = store.get();
  if (gpc || choice === "no") return;
  if (choice === "yes") return load();
  if (document.body) banner(); else document.addEventListener("DOMContentLoaded", banner);
})();
