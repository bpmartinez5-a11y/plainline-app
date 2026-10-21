/* Plainline Studio engine.
   One site profile (JSON, written by /api/studio-profile from a scan of the business's current site)
   becomes two pages: the new public website and the owner's dashboard. The page code is fixed and
   reviewed once; only the profile changes per client. Baseline layout: a photo-led portfolio with
   one page per sport or service, plus the owner dashboard.
   Works in the browser (window.StudioEngine) and in Node (require) for tests. No dependencies. */
(function (root) {
  "use strict";

  /* ---------- Looks (from Ben's reference reels) and type voices ---------- */
  const LOOKS = {
    studio:    { name: "Studio",     light: { bg: "#EDEFF1", surface: "#FFFFFF", ink: "#111418", muted: "#5B636D", line: "#CDD2D8", chalk: "#F7F8F9" }, dark: { bg: "#0E1013", surface: "#171A1F", ink: "#ECEEF0", muted: "#9AA3AD", line: "#2A2F36", chalk: "#1C2026" }, grid: false },
    grid:      { name: "Grid Light", light: { bg: "#EEF1EF", surface: "#FFFFFF", ink: "#16201D", muted: "#5F6E69", line: "#D3DBD8", chalk: "#F4F7F5" }, dark: { bg: "#0F1513", surface: "#161E1B", ink: "#E7EEEB", muted: "#93A39D", line: "#2A3531", chalk: "#1A2320" }, grid: true },
    backstage: { name: "Backstage",  light: { bg: "#0B100F", surface: "#121A18", ink: "#E9F2EF", muted: "#8FA29B", line: "#24302C", chalk: "#17201E" }, dark: { bg: "#0B100F", surface: "#121A18", ink: "#E9F2EF", muted: "#8FA29B", line: "#24302C", chalk: "#17201E" }, grid: true, darkOnly: true }
  };
  const VOICES = {
    bold:  { display: "Big Shoulders Display", dw: "800;900", body: "Archivo", bw: "400;500;600;700", upper: true,  fallback: '"Arial Narrow",Impact,sans-serif' },
    clean: { display: "Schibsted Grotesk",    dw: "700;800", body: "Figtree", bw: "400;500;600;700", upper: false, fallback: '"Avenir Next","Segoe UI",sans-serif' },
    warm:  { display: "Young Serif",          dw: "400",     body: "Instrument Sans", bw: "400;500;600;700", upper: false, fallback: 'Georgia,"Times New Roman",serif' }
  };
  const has = (o, k) => typeof k === "string" && Object.prototype.hasOwnProperty.call(o, k);
  const RESERVED = ["home", "about", "pricing", "book", "owner", "site", "collection"];
  const DEFAULT_ACCENT = { studio: "#C8202B", grid: "#0D8A72", backstage: "#E2A23B" };

  /* ---------- Sanitizing: the profile comes from a model reading a stranger's website ---------- */
  const str = (v, max = 300) => (typeof v === "string" || typeof v === "number") ? String(v).replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";
  const arr = (v, max) => Array.isArray(v) ? v.slice(0, max) : [];
  const url = v => { const s = str(v, 2000); try { const u = new URL(s); return /^https?:$/.test(u.protocol) ? u.href : ""; } catch { return ""; } };
  const slug = (v, fallback) => str(v, 60).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || fallback;
  const photo = p => { if (typeof p === "string") p = { src: p }; const src = url(p && p.src); return src ? { src, alt: str(p.alt, 140) } : null; };
  const photos = (v, max) => arr(v, max * 2).map(photo).filter(Boolean).slice(0, max);
  const uniqIds = list => { const seen = new Set(); list.forEach((x, i) => { let id = x.id || "item-" + (i + 1), n = 2; while (seen.has(id)) id = x.id + "-" + n++; seen.add(id); x.id = id; }); return list; };

  function hexToRgb(h) { const m = /^#?([0-9a-f]{6})$/i.exec(h || ""); if (!m) return null; const n = parseInt(m[1], 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  const toHex = c => "#" + c.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, "0")).join("").toUpperCase();
  function lum(c) { return c.map(v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }).reduce((s, v, i) => s + v * [.2126, .7152, .0722][i], 0); }
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
  // Shift the accent until text on it and it on the page both read (WCAG AA for large text and UI).
  function fitAccent(hex, bg, wantLight) {
    let c = hexToRgb(hex) || hexToRgb("#C8202B"); const b = hexToRgb(bg);
    for (let i = 0; i < 40 && contrast(c, b) < 3.2; i++) c = c.map(v => wantLight ? v + (255 - v) * .08 : v * .92);
    return toHex(c);
  }

  function sanitize(input) {
    const p = input && typeof input === "object" ? input : {};
    const biz = p.business || {};
    const look = has(LOOKS, p.look) ? p.look : "studio";
    const voice = has(VOICES, p.voice) ? p.voice : "bold";
    const out = {
      version: 1, look, voice,
      accent: /^#[0-9a-f]{6}$/i.test(p.accent || "") ? p.accent.toUpperCase() : DEFAULT_ACCENT[look],
      business: {
        name: str(biz.name, 80) || "ADD: business name",
        kind: str(biz.kind, 80), city: str(biz.city, 60), region: str(biz.region, 40),
        domain: str(biz.domain, 120).replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase(),
        tagline: str(biz.tagline, 120),
        socials: arr(biz.socials, 8).map(s => ({ label: str(s && s.label, 30), url: url(s && s.url) })).filter(s => s.label && s.url)
      },
      hero: {
        eyebrow: str(p.hero && p.hero.eyebrow, 90),
        lines: arr(p.hero && p.hero.lines, 3).map(l => str(l, 40)).filter(Boolean),
        highlight: str(p.hero && p.hero.highlight, 40),
        lede: str(p.hero && p.hero.lede, 320),
        cta: str(p.hero && p.hero.cta, 30) || "Get in touch",
        photos: photos(p.hero && p.hero.photos, 3)
      },
      collections: uniqIds(arr(p.collections, 3).map((c, ci) => ({
        id: slug(c && (c.id || c.title), "section-" + (ci + 1)),
        title: str(c && c.title, 40), blurb: str(c && c.blurb, 200), hidden: !!(c && c.hidden),
        items: uniqIds(arr(c && c.items, 12).map((it, ii) => ({
          id: slug(it && (it.id || it.title), "item-" + (ii + 1)),
          title: str(it && it.title, 40), kicker: str(it && it.kicker, 40), line: str(it && it.line, 160),
          photos: photos(it && it.photos, 12)
        })).filter(it => it.title))
      })).filter(c => c.title && c.items.length).map(c => (RESERVED.includes(c.id) ? Object.assign(c, { id: c.id + "-work" }) : c))),
      recent: { title: str(p.recent && p.recent.title, 40) || "Recent work", photos: photos(p.recent && p.recent.photos, 12) },
      proof: { title: str(p.proof && p.proof.title, 40) || "Worked with", items: arr(p.proof && p.proof.items, 10).map(x => str(x, 50)).filter(Boolean) },
      about: {
        title: str(p.about && p.about.title, 50) || "About",
        photo: photo(p.about && p.about.photo),
        paragraphs: arr(p.about && p.about.paragraphs, 4).map(x => str(x, 900)).filter(Boolean),
        why: arr(p.about && p.about.why, 3).map(w => ({ title: str(w && w.title, 40), text: str(w && w.text, 200) })).filter(w => w.title && w.text),
        timeline: arr(p.about && p.about.timeline, 10).map(t => ({ when: str(t && t.when, 14), text: str(t && t.text, 200) })).filter(t => t.when && t.text),
        signoff: str(p.about && p.about.signoff, 40)
      },
      pricing: {
        intro: str(p.pricing && p.pricing.intro, 200),
        lanes: uniqIds(arr(p.pricing && p.pricing.lanes, 4).map((l, i) => ({
          id: slug(l && (l.id || l.name), "lane-" + (i + 1)), name: str(l && l.name, 30), who: str(l && l.who, 60),
          startingAt: str(l && l.startingAt, 20), items: arr(l && l.items, 6).map(x => str(x, 80)).filter(Boolean)
        })).filter(l => l.name)),
        note: str(p.pricing && p.pricing.note, 240)
      },
      contact: {
        phone: str(p.contact && p.contact.phone, 30).replace(/[^0-9+()\-. ]/g, ""),
        address: str(p.contact && p.contact.address, 160),
        hours: arr(p.contact && p.contact.hours, 8).map(x => str(x, 60)).filter(Boolean),
        serviceArea: str(p.contact && p.contact.serviceArea, 160)
      },
      booking: {
        title: str(p.booking && p.booking.title, 30) || "Book",
        intro: str(p.booking && p.booking.intro, 240),
        steps: arr(p.booking && p.booking.steps, 5).map(x => str(x, 120)).filter(Boolean),
        types: uniqIds(arr(p.booking && p.booking.types, 4).map((t, i) => ({
          id: slug(t && (t.id || t.label), "type-" + (i + 1)), label: str(t && t.label, 40),
          fields: arr(t && t.fields, 4).map((f, fi) => ({
            id: slug(f && (f.id || f.label), "f" + fi), label: str(f && f.label, 50),
            kind: ["text", "number", "date", "select"].includes(f && f.kind) ? f.kind : "text",
            options: arr(f && f.options, 8).map(o => str(o, 40)).filter(Boolean)
          })).filter(f => f.label).reduce((acc, f) => { let id = f.id, n = 2; while (acc.some(x => x.id === id)) id = f.id + "-" + n++; acc.push(Object.assign(f, { id })); return acc; }, [])
        })).filter(t => t.label)),
        minors: !!(p.booking && p.booking.minors)
      },
      owner: {
        jobWord: str(p.owner && p.owner.jobWord, 20).toLowerCase() || "job",
        stages: (arr(p.owner && p.owner.stages, 8).map(x => str(x, 16)).filter(Boolean).length >= 3 ? arr(p.owner.stages, 8).map(x => str(x, 16)).filter(Boolean) : ["New", "Quoted", "Booked", "Done", "Paid"])
      },
      todos: arr(p.todos, 20).map(x => str(x, 160)).filter(Boolean),
      // Section switches Ben can flip in the Studio. Missing means shown.
      show: ["recent", "proof", "about", "pricing", "visit"].reduce((o, k) => (o[k] = !(p.show && p.show[k] === false), o), {}),
      // Questions the planner wants Ben to answer. Never rendered on the client's pages.
      questions: uniqIds(arr(p.questions, 4).map((q, i) => ({ id: slug(q && (q.id || q.question), "q" + (i + 1)), question: str(q && q.question, 200), options: arr(q && q.options, 4).map(o => str(o, 60)).filter(Boolean) })).filter(q => q.question))
    };
    if (!out.hero.lines.length) out.hero.lines = [out.business.name];
    if (!out.booking.types.length) out.booking.types = [{ id: "general", label: "General question", fields: [] }];
    if (!out.booking.steps.length) out.booking.steps = ["Send the form with your details.", "We reply with availability.", "We confirm and get it on the calendar."];
    const L = LOOKS[look];
    out._tokens = {
      accentLight: fitAccent(out.accent, L.light.bg, L.darkOnly),
      accentDark: fitAccent(out.accent, L.dark.bg, true)
    };
    out._slug = slug(out.business.domain || out.business.name, "site");
    return out;
  }

  /* ---------- Shared bits ---------- */
  const fontLink = v => `https://fonts.googleapis.com/css2?family=${encodeURIComponent(v.display).replace(/%20/g, "+")}:wght@${v.dw}&family=${encodeURIComponent(v.body).replace(/%20/g, "+")}:wght@${v.bw}&family=IBM+Plex+Mono:wght@400;500&display=swap`;
  const escHtml = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const embed = o => JSON.stringify(o).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
  function tokens(p) {
    const L = LOOKS[p.look], V = VOICES[p.voice], t = p._tokens;
    const set = (c, accent) => `--bg:${c.bg};--surface:${c.surface};--ink:${c.ink};--muted:${c.muted};--line:${c.line};--chalk:${c.chalk};--accent:${accent};--accent-ink:${contrast(hexToRgb(accent), [255, 255, 255]) >= 4.5 ? "#FFFFFF" : "#111418"};--hi:color-mix(in srgb,${accent} 22%,${c.surface})`;
    const light = L.darkOnly ? set(L.dark, t.accentDark) + ";color-scheme:dark" : set(L.light, t.accentLight);
    const dark = set(L.dark, t.accentDark) + ";color-scheme:dark";
    return `:root{${light};--display:"${V.display}",${V.fallback};--body:"${V.body}",system-ui,-apple-system,"Segoe UI",sans-serif;--mono:"IBM Plex Mono",ui-monospace,Menlo,monospace;--up:${V.upper ? "uppercase" : "none"};--track:${V.upper ? ".01em" : "-.02em"};--gut:max(16px,env(safe-area-inset-left,0px));--gutr:max(16px,env(safe-area-inset-right,0px))${L.darkOnly ? "" : ";color-scheme:light"}}
${L.darkOnly ? "" : `@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){${dark}}}
:root[data-theme="dark"]{${dark}}`}
${L.grid ? `body{background-image:linear-gradient(color-mix(in srgb,var(--line) 55%,transparent) 1px,transparent 1px),linear-gradient(90deg,color-mix(in srgb,var(--line) 55%,transparent) 1px,transparent 1px);background-size:28px 28px}` : ""}`;
  }
  function head(p, title, extra) {
    const V = VOICES[p.voice];
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escHtml(title)}</title>
${extra || ""}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${fontLink(V)}">
<style>
${tokens(p)}
${BASE_CSS}`;
  }

  const BASE_CSS = `*{box-sizing:border-box}
html{scroll-behavior:smooth;overflow-x:clip}
body{margin:0;background-color:var(--bg);color:var(--ink);font:400 16px/1.55 var(--body);-webkit-font-smoothing:antialiased;overflow-x:clip}
img{max-width:100%;display:block}
a{color:inherit}
button,input,select,textarea{font:inherit;color:inherit}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px}
[hidden]{display:none!important}
.wrap{max-width:1240px;margin:0 auto;padding-left:var(--gut);padding-right:var(--gutr)}
.mono{font-family:var(--mono);font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.todo{background:#FFE58A;color:#3A2A00;padding:0 .25em;border-radius:3px;font-style:normal}
body::before{content:"";position:fixed;inset:0 0 auto;height:env(safe-area-inset-top,0px);background:var(--bg);z-index:30}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
`;

  /* =====================================================================
     PUBLIC WEBSITE
     ===================================================================== */
  const SITE_CSS = `
.concept{font:500 11px/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase;text-align:center;padding:8px var(--gutr) 8px var(--gut);background:var(--ink);color:var(--bg)}
header.top{position:sticky;top:env(safe-area-inset-top,0px);z-index:20;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.bar{display:flex;align-items:center;gap:14px;padding-block:12px}
.brand{font:900 24px/1 var(--display);letter-spacing:var(--track);text-transform:var(--up);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
.brand span{color:var(--accent)}
nav.main{display:flex;gap:4px;margin-left:auto;flex-wrap:wrap}
nav.main a{font:600 13px/1 var(--body);text-transform:uppercase;letter-spacing:.08em;text-decoration:none;padding:10px 12px;border-radius:999px;color:var(--muted)}
nav.main a[aria-current="page"]{color:var(--ink);background:var(--chalk)}
nav.main a.cta{background:var(--accent);color:var(--accent-ink)}
.iconbtn{border:1px solid var(--line);background:var(--surface);border-radius:999px;height:38px;min-width:38px;padding:0 12px;cursor:pointer;font-size:12px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;flex:none}
.menu-btn{display:none}
@media (max-width:860px){nav.main{display:none;position:absolute;left:0;right:0;top:100%;background:var(--bg);border-bottom:1px solid var(--line);flex-direction:column;padding:8px var(--gutr) 16px var(--gut)}nav.main.open{display:flex}nav.main a{padding:14px 12px;font-size:15px}.menu-btn{display:inline-block;margin-left:auto}}
@media (max-width:480px){.bar{gap:6px}.brand{font-size:20px}#themeBtn{display:none}}
@media (max-width:380px){.brand{font-size:17px}}
main{perspective:1600px}
.page{transform-origin:50% 0;animation:swing .55s cubic-bezier(.2,.7,.2,1) both}
@keyframes swing{from{opacity:.001;transform:rotateX(7deg) translateY(28px)}to{opacity:1;transform:none}}
:root{--r:18px;--soft:0 2px 6px rgb(0 0 0 / .05),0 24px 60px -26px rgb(0 0 0 / .38)}
.hero{display:grid;grid-template-columns:1.05fr 1fr;gap:40px;align-items:center;padding-block:48px 24px}
.hero h1{font:900 clamp(52px,10vw,140px)/.88 var(--display);text-transform:var(--up);letter-spacing:var(--track);margin:0;text-wrap:balance}
.hero .lede{font-size:19px;max-width:36ch;margin:22px 0 26px}
.mark{background:linear-gradient(var(--hi),var(--hi)) no-repeat 0 92%/var(--sweep,100%) 58%;padding:0 .08em;transition:background-size .9s cubic-bezier(.2,.8,.2,1)}
.hero h1 .mark{color:var(--accent)}
.tagline{font:800 18px/1.1 var(--display);text-transform:var(--up);letter-spacing:.1em;margin:16px 0 0}
.btns{display:flex;gap:10px;flex-wrap:wrap}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:46px;padding:12px 20px;border-radius:999px;font-weight:600;text-decoration:none;border:1px solid var(--ink);cursor:pointer;background:transparent}
.btn.solid{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.deck{position:relative;height:clamp(340px,46vw,540px);perspective:1200px;transform-style:preserve-3d}
.deck figure{position:absolute;margin:0;inset:8% 12%;border-radius:var(--r);overflow:hidden;box-shadow:var(--soft);transform-style:preserve-3d;will-change:transform;background:var(--chalk)}
.deck img,.panel img,.tile img{width:100%;height:100%;object-fit:cover}
.deck figcaption{position:absolute;left:10px;bottom:10px;background:var(--bg);padding:4px 8px;border-radius:4px}
@media (max-width:860px){.hero{grid-template-columns:1fr;padding-top:18px;gap:8px}.deck{height:320px;order:-1}.deck figure{inset:4% 16%}}
.art{position:absolute;inset:0;display:grid;place-items:center;background:radial-gradient(circle at 30% 25%,color-mix(in srgb,var(--accent) 35%,var(--surface)),var(--chalk) 70%);color:var(--ink);font:900 clamp(40px,9vw,90px)/.9 var(--display);text-transform:var(--up);text-align:center;padding:16px;overflow:hidden}
.art span{opacity:.9}.panel .art span,.tile .art span{font-size:min(60vw,240px);opacity:.14;transform:translateY(-12%)}
.art::after{content:"";position:absolute;inset:0;background:repeating-linear-gradient(135deg,transparent 0 18px,color-mix(in srgb,var(--accent) 12%,transparent) 18px 19px)}
.sec{padding-block:52px}
.sec-head{display:flex;align-items:end;justify-content:space-between;gap:16px;flex-wrap:wrap;border-bottom:2px solid var(--ink);padding-bottom:10px;margin-bottom:22px}
.sec-head h2{font:900 clamp(40px,7vw,80px)/.92 var(--display);text-transform:var(--up);letter-spacing:var(--track);margin:0}
.sec-head p{margin:0;max-width:48ch;color:var(--muted)}
.deckwrap{margin-inline:calc(-1 * var(--gut))}
.swipe{display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;padding:18px max(16px,calc(50% - 230px)) 26px;perspective:1400px;scrollbar-width:none;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain}
.swipe::-webkit-scrollbar{display:none}
.panel{flex:0 0 min(460px,82%);scroll-snap-align:center;position:relative;display:block;aspect-ratio:4/5;border-radius:var(--r);overflow:hidden;text-decoration:none;color:#fff;background:var(--chalk);box-shadow:var(--soft);transform-style:preserve-3d;will-change:transform}
.panel .cap,.tile .cap{position:absolute;inset:auto 0 0;padding:70px 18px 18px;background:linear-gradient(to top,rgb(0 0 0 / .8),transparent);display:grid;gap:4px;color:#fff;z-index:1}
.panel .cap b,.tile .cap b{font:900 clamp(34px,7vw,54px)/.9 var(--display);text-transform:var(--up);letter-spacing:var(--track)}
.panel .cap small,.tile .cap small{font:500 11px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;opacity:.85}
.panel .cap span{font-size:14px;opacity:.9}
.deckbar{display:flex;align-items:center;gap:10px;justify-content:center}
.pdots{display:flex;gap:6px}
.pdots button{width:8px;height:8px;padding:0;border:0;border-radius:50%;background:var(--line);cursor:pointer;transition:width .2s}
.pdots button[aria-current="true"]{background:var(--accent);width:22px;border-radius:5px}
.arrow{width:42px;height:42px;border-radius:50%;border:1px solid var(--line);background:var(--surface);cursor:pointer;font-size:17px;display:grid;place-items:center}
.arrow:disabled{opacity:.35;cursor:default}
@media (max-width:640px){.arrow{display:none}}
.roster{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}
.tile{position:relative;display:block;text-decoration:none;border-radius:var(--r);overflow:hidden;aspect-ratio:4/5;background:var(--chalk);box-shadow:var(--soft)}
.subtabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;margin-bottom:22px;scrollbar-width:thin}
.subtabs a{flex:none;text-decoration:none;font:700 15px/1 var(--display);text-transform:var(--up);letter-spacing:.04em;padding:12px 16px;border:1px solid var(--line);border-radius:999px;background:var(--surface)}
.subtabs a[aria-current="true"]{background:var(--ink);color:var(--bg);border-color:var(--ink)}
.gal-hero{display:grid;grid-template-columns:2fr 1fr;gap:24px;align-items:end;margin-bottom:24px}
.gal-hero h3{font:900 clamp(48px,10vw,120px)/.86 var(--display);text-transform:var(--up);letter-spacing:var(--track);margin:0}
.gal-hero .meta{display:grid;gap:12px}
.share{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.share code{font:500 12px/1.3 var(--mono);background:var(--chalk);padding:8px 10px;border-radius:6px;word-break:break-all}
@media (max-width:760px){.gal-hero{grid-template-columns:1fr}}
.masonry{columns:3 280px;column-gap:12px}
.masonry figure{break-inside:avoid;margin:0 0 12px;border-radius:var(--r);overflow:hidden;background:var(--chalk);cursor:zoom-in}
.masonry img{width:100%;height:auto}
.note{background:var(--chalk);border-radius:12px;padding:14px 16px;margin-top:16px;color:var(--muted)}
.lb{position:fixed;inset:0;z-index:50;background:rgb(8 9 11 / .94);display:grid;place-items:center;padding:calc(20px + env(safe-area-inset-top,0px)) var(--gutr) calc(20px + env(safe-area-inset-bottom,0px)) var(--gut)}
.lb img{max-height:86vh;width:auto;max-width:100%;border-radius:6px}
.lb button{position:absolute;top:calc(14px + env(safe-area-inset-top,0px));right:calc(14px + env(safe-area-inset-right,0px));background:#fff;color:#111;border:0;border-radius:999px;padding:10px 16px;font-weight:600;cursor:pointer}
.about{display:grid;grid-template-columns:.9fr 1.1fr;gap:40px;align-items:start}
.about .portrait{border-radius:var(--r);overflow:hidden;transform:rotate(-1.5deg);box-shadow:var(--soft)}
.about h3{font:900 clamp(44px,7vw,64px)/.9 var(--display);text-transform:var(--up);letter-spacing:var(--track);margin:0 0 16px}
.about p{max-width:62ch}
.why{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:28px 0}
.why div{background:var(--surface);border-radius:var(--r);padding:16px;box-shadow:var(--soft)}
.why b{display:block;font:800 21px/1.05 var(--display);text-transform:var(--up);margin-bottom:6px}
.timeline{list-style:none;margin:28px 0 0;padding:0;border-left:2px solid var(--ink)}
.timeline li{display:grid;grid-template-columns:76px 1fr;gap:12px;padding:10px 0 10px 16px;position:relative}
.timeline li::before{content:"";position:absolute;left:-6px;top:17px;width:10px;height:10px;border-radius:50%;background:var(--accent)}
.timeline time{font:800 21px/1 var(--display)}
.sign{font:800 30px/1 var(--display);text-transform:var(--up);color:var(--accent);margin-top:18px}
@media (max-width:860px){.about{grid-template-columns:1fr}}
.lanes{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.lane{background:var(--surface);border-radius:var(--r);padding:22px;display:flex;flex-direction:column;gap:12px;box-shadow:var(--soft)}
.lane h3{font:900 32px/.95 var(--display);text-transform:var(--up);margin:0}
.price{font:800 38px/1 var(--display)}
.price small{font:500 12px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);display:block;margin-bottom:6px}
.lane ul{margin:0;padding-left:18px}
.lane .btn{margin-top:auto}
.facts{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:18px}
.facts div{background:var(--surface);border-radius:var(--r);padding:14px 16px;box-shadow:var(--soft)}
.facts b{display:block;font:800 18px/1.1 var(--display);text-transform:var(--up);margin-bottom:6px}
.book{display:grid;grid-template-columns:1fr 1.2fr;gap:36px;align-items:start}
.steps{list-style:none;padding:0;margin:20px 0;display:grid;gap:10px;counter-reset:s}
.steps li{counter-increment:s;display:grid;grid-template-columns:36px 1fr;gap:10px;align-items:start}
.steps li::before{content:counter(s);font:900 28px/1 var(--display);color:var(--accent)}
form.card{background:var(--surface);border-radius:var(--r);padding:22px;display:grid;gap:14px;box-shadow:var(--soft)}
.seg{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.seg label{border:1px solid var(--line);border-radius:10px;padding:12px;cursor:pointer;font-weight:600;display:flex;gap:8px;align-items:center;min-height:46px}
.seg input{accent-color:var(--accent)}
.seg label:has(input:checked){border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}
.row{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.field{display:grid;gap:6px;min-width:0}
.field label{font-weight:600;font-size:14px}
.field input,.field select,.field textarea{width:100%;border:1px solid var(--line);background:var(--bg);border-radius:10px;padding:12px;font-size:16px;min-height:46px}
.field textarea{min-height:110px;resize:vertical}
.check{display:flex;gap:10px;align-items:flex-start;font-size:14px;color:var(--muted)}
.ok{background:var(--chalk);border-radius:10px;padding:18px}
@media (max-width:860px){.book{grid-template-columns:1fr}.row{grid-template-columns:1fr}}
.strip{display:flex;gap:10px;flex-wrap:wrap}
.strip span{font:800 17px/1 var(--display);text-transform:var(--up);letter-spacing:.05em;padding:10px 14px;border:1px solid var(--line);border-radius:6px}
footer{border-top:2px solid var(--ink);margin-top:40px;padding-block:28px calc(28px + env(safe-area-inset-bottom,0px))}
.foot{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:center}
.foot>div{min-width:0;max-width:100%}.foot .brand{white-space:normal;overflow-wrap:anywhere}
.socials{display:flex;gap:14px;flex-wrap:wrap}
.socials a{font-weight:600}
.mbook{display:none}
@media (max-width:860px){.mbook{display:flex;position:fixed;left:var(--gut);right:var(--gutr);bottom:calc(12px + env(safe-area-inset-bottom,0px));z-index:30;box-shadow:var(--soft)}footer{padding-bottom:calc(90px + env(safe-area-inset-bottom,0px))}}
`;

  // Runs inside the generated website. Must not use anything from this file's scope.
  function siteRuntime() {
    const P = window.__PROFILE__, OPT = window.__OPTIONS__ || {};
    const KEY = "pl:" + P._slug + ":edits";
    const store = { get() { try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch (e) { return {}; } } };
    let edits = store.get();
    const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const safeSrc = s => /^https?:\/\//i.test(s) || /^data:image\/(jpeg|png|webp);base64,/i.test(s) ? s : "";
    // Ask common site builders for a phone-sized copy instead of the multi-megabyte original.
    const sized = (s, w) => { try { const u = new URL(s);
      if (u.hostname === "static.wixstatic.com") { const m = u.pathname.match(/^\/media\/([^/]+)$/); if (m) return `${u.origin}/media/${m[1]}/v1/fit/w_${w},h_${w},q_82/${m[1]}`; }
      if (/squarespace-cdn\.com$/.test(u.hostname) && !u.searchParams.has("format")) { u.searchParams.set("format", (w <= 500 ? 500 : w <= 1000 ? 1000 : 1500) + "w"); return u.href; }
      return s; } catch (e) { return s; } };
    // Text: owner edits win, then the profile. "ADD: ..." means Ben still has to fill it in.
    const tx = (id, fallback) => { const v = edits["txt:" + id] != null ? edits["txt:" + id] : fallback; return /^ADD:/i.test(v || "") ? `<mark class="todo">${esc(v)}</mark>` : esc(v); };
    const img = (key, ph, w, alt) => { const e = edits["img:" + key]; const src = safeSrc(e || (ph && ph.src && sized(ph.src, w || 1200)) || ""); return src ? `<img src="${esc(src)}"${!e && ph && ph.src ? ` data-full="${esc(sized(ph.src, 2400))}"` : ""} alt="${esc(alt || (ph && ph.alt) || "")}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ""; };
    const say = v => /^ADD:/i.test(v || "") ? `<mark class="todo">${esc(v)}</mark>` : esc(v);
    const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
    const art = label => `<div class="art" aria-hidden="true"><span>${esc(label)}</span></div>`;
    const extra = path => (edits["gal:" + path] || []).map(safeSrc).filter(Boolean);
    const B = P.business, cols = P.collections.filter(c => !c.hidden), SHOW = P.show;
    const route = h => "#" + h;
    const ownerLink = OPT.preview ? "#owner" : (OPT.dashboardHref || "owner.html");

    document.title = B.name + (B.kind ? " · " + B.kind : "") + (B.city ? " in " + B.city : "");
    const bookLabel = P.booking.title || "Book";
    const navItems = [["home", "Home"], ...cols.map(c => [c.id, c.title]), ...(SHOW.about && P.about.paragraphs.length ? [["about", "About"]] : []), ...(SHOW.pricing && P.pricing.lanes.length ? [["pricing", "Pricing"]] : [])];

    function brand() { const parts = B.name.split(" "); return parts.length > 1 ? `${esc(parts.slice(0, -1).join(" "))} <span>${esc(parts[parts.length - 1])}</span>` : esc(B.name); }
    document.body.innerHTML = `
${OPT.preview ? `<div class="concept">Concept preview by Plainline · built from ${esc(B.domain || B.name)} · not live</div>` : OPT.connected ? "" : `<div class="concept">Preview · this site isn't connected yet, so the booking form doesn't send</div>`}
<header class="top"><div class="wrap bar">
<a class="brand" href="#home">${/^ADD:/i.test(B.name) ? say(B.name) : brand()}</a>
<button class="iconbtn menu-btn" id="menuBtn" aria-expanded="false" aria-controls="nav">Menu</button>
<nav class="main" id="nav" aria-label="Main">${navItems.map(([id, l]) => `<a href="#${esc(id)}">${esc(l)}</a>`).join("")}<a href="#book" class="cta">${esc(bookLabel)}</a></nav>
<button class="iconbtn" id="themeBtn" aria-label="Change theme">Auto</button>
</div></header>
<main id="app" class="wrap"></main>
<footer><div class="wrap foot">
<div><div class="brand" style="font-size:20px">${brand()}</div><div class="mono" style="margin-top:6px">${esc([B.kind, B.city].filter(Boolean).join(" · "))}</div></div>
<div class="socials">${B.socials.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.label)}</a>`).join("")}</div>
<div class="mono">© ${new Date().getFullYear()} ${esc(B.name)}${OPT.ownerLink ? ` · <a href="${esc(ownerLink)}" id="ownerLink">Owner login</a>` : ""}</div>
</div></footer>
<a class="btn solid mbook" id="mbook" href="#book" hidden>${esc(P.hero.cta)}</a>
<div class="lb" id="lb" hidden role="dialog" aria-modal="true" aria-label="Photo viewer"><button type="button" id="lbClose">Close</button><img id="lbImg" alt=""></div>`;

    const H = P.hero;
    const heroLines = H.lines.map(l => { const i = H.highlight ? l.toLowerCase().indexOf(H.highlight.toLowerCase()) : -1; return i < 0 ? esc(l) : esc(l.slice(0, i)) + `<span class="mark">${esc(l.slice(i, i + H.highlight.length))}</span>` + esc(l.slice(i + H.highlight.length)); }).join("<br>");
    const heroPics = H.photos.length ? H.photos : cols.flatMap(c => c.items.map(i => i.photos[0])).filter(Boolean).slice(0, 3);

    function deckOf(id, items) {
      return `<div class="deckwrap"><div class="swipe" id="${id}" tabindex="0" aria-label="Swipe for more">${items.map((it, i) => {
        const pic = img("cover:" + it.path, it.photos[0] || { src: extra(it.path)[0] }, 1000, it.title);
        return `<a class="panel" href="${route(it.path)}" aria-label="${esc(it.title)}, ${i + 1} of ${items.length}">${pic || art(it.title.slice(0, 1))}<span class="cap"><small>${esc(it.kicker)}</small><b>${esc(it.title)}</b><span>${esc(it.line)}</span></span></a>`;
      }).join("")}</div>
<div class="deckbar"><button class="arrow" type="button" data-prev="${id}" aria-label="Previous">←</button><div class="pdots" data-dots="${id}">${items.map((_, i) => `<button type="button" aria-label="Go to ${i + 1}" data-i="${i}"></button>`).join("")}</div><button class="arrow" type="button" data-next="${id}" aria-label="Next">→</button></div></div>`;
    }
    const withPath = c => c.items.map(it => Object.assign({}, it, { path: c.id + "/" + it.id, kicker: it.kicker || c.title }));

    const pages = {
      home() {
        return `<section class="hero"><div>
${H.eyebrow ? `<div class="mono">${esc(H.eyebrow)}</div>` : ""}
<h1>${heroLines}</h1>
${H.lede ? `<p class="lede">${tx("home-lede", H.lede)}</p>` : ""}
<div class="btns"><a class="btn solid" href="#book">${esc(H.cta)}</a>${cols[0] ? `<a class="btn" href="#${esc(cols[0].id)}">See ${esc(cols[0].title.toLowerCase())}</a>` : ""}</div>
${B.tagline ? `<p class="tagline">${esc(B.tagline)}</p>` : ""}
</div>
<div class="deck" id="deck" aria-label="Featured">${(heroPics.length ? heroPics : [null, null, null]).slice(0, 3).map((p, i) => `<figure>${p ? img("hero:" + i, p, 1200, p.alt) : art(B.name)}${p && p.alt ? `<figcaption class="mono">${esc(p.alt.slice(0, 40))}</figcaption>` : ""}</figure>`).join("")}</div>
</section>
${cols.map((c, ci) => `<section class="sec"><div class="sec-head"><h2>${esc(c.title)}</h2>${c.blurb ? `<p>${esc(c.blurb)}</p>` : ""}</div>${deckOf("d" + ci, withPath(c))}</section>`).join("")}
${SHOW.recent && P.recent.photos.length ? `<section class="sec"><div class="sec-head"><h2>${esc(P.recent.title)}</h2></div><div class="masonry">${P.recent.photos.map((p, i) => `<figure>${img("recent:" + i, p, 1000, p.alt || "Recent work by " + B.name)}</figure>`).join("")}</div></section>` : ""}
${SHOW.proof && P.proof.items.length ? `<section class="sec"><div class="sec-head"><h2>${esc(P.proof.title)}</h2></div><div class="strip">${P.proof.items.map(x => `<span>${esc(x)}</span>`).join("")}</div></section>` : ""}
${visit()}`;
      },
      collection(c, sub) {
        const items = withPath(c), it = items.find(x => x.id === sub);
        const tabs = `<div class="subtabs">${items.map(x => `<a href="${route(x.path)}" aria-current="${!!(it && it.id === x.id)}">${esc(x.title)}</a>`).join("")}</div>`;
        if (!it) return `<section class="sec"><div class="sec-head"><h2>${esc(c.title)}</h2>${c.blurb ? `<p>${esc(c.blurb)}</p>` : ""}</div>${tabs}
<div class="roster">${items.map(x => `<a class="tile tilt" href="${route(x.path)}">${img("cover:" + x.path, x.photos[0] || { src: extra(x.path)[0] }, 800, x.title) || art(x.title.slice(0, 1))}<span class="cap"><small>${esc(x.kicker)}</small><b>${esc(x.title)}</b></span></a>`).join("")}</div></section>`;
        const link = B.domain ? `https://${B.domain}/#${it.path}` : /^https?:$/.test(location.protocol) ? location.origin + location.pathname + "#" + it.path : "";
        const pics = it.photos.map((p, i) => i === 0 ? img("cover:" + it.path, p, 1600, p.alt || it.title) : img("photo:" + it.path + ":" + i, p, 1600, p.alt || it.title)).filter(Boolean).concat(extra(it.path).map(s => `<img src="${esc(s)}" alt="${esc(it.title)}" loading="lazy">`));
        return `<section class="sec">${tabs}<div class="gal-hero"><h3>${esc(it.title)}</h3><div class="meta">${it.line ? `<div class="mono">${esc(it.line)}</div>` : ""}
${link ? `<div class="share"><code>${esc(link)}</code><button class="iconbtn" data-copy="${esc(link)}" type="button">Copy link</button></div>` : ""}
<a class="btn solid" href="#book">${esc(P.hero.cta)}</a></div></div>
${pics.length ? `<div class="masonry">${pics.map(h => `<figure>${h}</figure>`).join("")}</div>` : `<p class="note">New ${esc(it.title.toLowerCase())} photos are coming soon.</p>`}</section>`;
      },
      about() {
        const A = P.about;
        return `<section class="sec about">
<div class="portrait">${A.photo ? img("about", A.photo, 900, A.photo.alt || B.name) : `<div style="position:relative;aspect-ratio:4/5">${art(B.name)}</div>`}</div>
<div><div class="mono">About</div><h3>${say(A.title)}</h3>
${A.paragraphs.map((t, i) => `<p>${tx("about-" + (i + 1), t)}</p>`).join("")}
${A.why.length ? `<div class="why">${A.why.map((w, i) => `<div><b>${esc(w.title)}</b>${tx("why-" + (i + 1), w.text)}</div>`).join("")}</div>` : ""}
${A.timeline.length ? `<ol class="timeline">${A.timeline.map(t => `<li><time>${esc(t.when)}</time><span>${esc(t.text)}</span></li>`).join("")}</ol>` : ""}
${A.signoff ? `<div class="sign">${esc(A.signoff)}</div>` : ""}
</div></section>`;
      },
      pricing() {
        const R = P.pricing;
        return `<section class="sec"><div class="sec-head"><h2>Pricing</h2>${R.intro ? `<p>${esc(R.intro)}</p>` : ""}</div>
<div class="lanes">${R.lanes.map(l => `<div class="lane"><div class="mono">${esc(l.who)}</div><h3>${esc(l.name)}</h3><div class="price"><small>Starting at</small>${tx("price-" + l.id, l.startingAt || "$ —")}</div><ul>${l.items.map((x, i) => `<li>${tx("p-" + l.id + "-" + i, x)}</li>`).join("")}</ul><a class="btn solid" href="#book?type=${esc(laneType(l))}">Ask about ${esc(l.name.toLowerCase())}</a></div>`).join("")}</div>
${R.note || edits["txt:price-note"] ? `<div class="note">${tx("price-note", R.note)}</div>` : ""}</section>`;
      },
      book(q) {
        const K = P.booking, types = K.types;
        const want = new URLSearchParams(q || "").get("type"), type = types.some(t => t.id === want) ? want : types[0].id;
        const field = (t, f) => { const id = "f-" + t.id + "-" + f.id, lab = `<label for="${id}">${esc(f.label)}</label>`;
          return `<div class="field">${lab}${f.kind === "select" && f.options.length ? `<select id="${id}" name="${esc(f.id)}">${f.options.map(o => `<option>${esc(o)}</option>`).join("")}</select>` : `<input id="${id}" name="${esc(f.id)}" type="${f.kind === "date" ? "date" : "text"}"${f.kind === "number" ? ' inputmode="numeric"' : ""}>`}</div>`; };
        return `<section class="sec book"><div>
<div class="sec-head" style="border:0;margin:0"><h2>${esc(K.title)}</h2></div>
${K.intro ? `<p>${say(K.intro)}</p>` : ""}
<ol class="steps">${K.steps.map(s => `<li>${say(s)}</li>`).join("")}</ol>
${visitFacts()}
<p class="mono">Your details go to ${esc(B.name)} and are never shown on this site.</p></div>
<form class="card" id="bookForm" novalidate>
${types.length > 1 ? `<fieldset style="border:0;padding:0;margin:0"><legend style="font-weight:600;margin-bottom:8px">What can we help with?</legend><div class="seg">${types.map(t => `<label><input type="radio" name="type" value="${esc(t.id)}" ${t.id === type ? "checked" : ""}> ${esc(t.label)}</label>`).join("")}</div></fieldset>` : `<input type="hidden" name="type" value="${esc(types[0].id)}">`}
<div class="row"><div class="field"><label for="f-name">Your name</label><input id="f-name" name="name" required autocomplete="name"></div>
<div class="field"><label for="f-email">Email</label><input id="f-email" name="email" type="email" required autocomplete="email"></div></div>
<div class="row"><div class="field"><label for="f-date">Date</label><input id="f-date" name="date" type="date"></div><div class="field"><label for="f-loc">City or address</label><input id="f-loc" name="loc" autocomplete="address-level2"></div></div>
${types.map(t => t.fields.length ? `<div data-for="${esc(t.id)}" class="row">${t.fields.map(f => field(t, f)).join("")}</div>` : "").join("")}
${K.minors ? `<div class="check"><input type="checkbox" id="f-guardian" name="guardian"><label for="f-guardian">I'm a parent or guardian booking for someone under 18</label></div>` : ""}
<div class="field"><label for="f-msg">Anything else?</label><textarea id="f-msg" name="msg"></textarea></div>
<div class="check"><input type="checkbox" id="f-ok" required><label for="f-ok">${esc(B.name)} can contact me about this request. My details aren't sold or shared.</label></div>
<button class="btn solid" type="submit">Send request</button>
<div class="ok" id="ok" hidden role="status"><b>Preview only. Nothing was sent.</b> Once this site is connected, your request goes straight to ${esc(B.name)}.</div>
</form></section>`;
      }
    };
    function laneType(l) { const t = P.booking.types.find(t => (t.label + " " + t.id).toLowerCase().includes(l.name.toLowerCase().replace(/s$/, ""))); return t ? t.id : P.booking.types[0].id; }
    function visitFacts() {
      const C = P.contact, f = [];
      if (C.phone) f.push(`<div><b>Call or text</b><a href="tel:${esc(C.phone.replace(/[^0-9+]/g, ""))}">${esc(C.phone)}</a></div>`);
      if (C.hours.length) f.push(`<div><b>Hours</b>${C.hours.map(say).join("<br>")}</div>`);
      if (C.address) f.push(`<div><b>Find us</b><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(C.address)}" target="_blank" rel="noopener">${esc(C.address)}</a></div>`);
      if (C.serviceArea) f.push(`<div><b>Service area</b>${say(C.serviceArea)}</div>`);
      return f.length ? `<div class="facts">${f.join("")}</div>` : "";
    }
    function visit() { if (!SHOW.visit) return ""; const v = visitFacts(); return v ? `<section class="sec"><div class="sec-head"><h2>Visit</h2></div>${v}</section>` : ""; }

    const app = document.getElementById("app"), nav = document.getElementById("nav"), menuBtn = document.getElementById("menuBtn"), mbook = document.getElementById("mbook");
    const lb = document.getElementById("lb"), lbImg = document.getElementById("lbImg");
    const ol = document.getElementById("ownerLink");
    if (ol && OPT.preview) ol.addEventListener("click", e => { e.preventDefault(); try { parent.postMessage({ plStudio: "open", page: "dashboard" }, "*"); } catch (x) {} });
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Routes live in a variable, not only in the address bar: inside the Studio's srcdoc preview a "#x" link
    // resolves against the Studio's own URL and would load the Studio into the frame.
    let here = location.hash.slice(1);
    function go(h) { h = String(h || "").slice(0, 200); if (h === here) return render(); here = h; try { history.pushState(null, "", "#" + here); } catch (e) {} render(); }
    document.addEventListener("click", e => { const a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a || e.defaultPrevented || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return; e.preventDefault(); go(a.getAttribute("href").slice(1)); });
    function render() {
      let raw = here || "home";
      if (/^owner(?:$|[/?])/.test(raw)) { if (OPT.preview) { try { parent.postMessage({ plStudio: "open", page: "dashboard" }, "*"); } catch (e) {} } here = "home"; try { history.replaceState(null, "", "#home"); } catch (e) {} raw = "home"; }
      const [path, q] = raw.split("?"), [page, sub] = path.split("/");
      const col = cols.find(c => c.id === page), known = own(pages, page) && page !== "collection" && !(page === "about" && !SHOW.about) && !(page === "pricing" && !SHOW.pricing);
      const html = col ? pages.collection(col, sub) : known ? pages[page](q) : pages.home();
      app.innerHTML = `<div class="page">${html}</div>`;
      nav.querySelectorAll("a").forEach(a => a.setAttribute("aria-current", a.getAttribute("href") === "#" + (col ? col.id : known ? page : "home") ? "page" : "false"));
      nav.classList.remove("open"); menuBtn.setAttribute("aria-expanded", "false"); scrollTo({ top: 0 }); wire();
    }
    function wire() {
      const form = document.getElementById("bookForm");
      if (form) {
        const sync = () => { const t = (form.querySelector("[name=type]:checked") || form.querySelector("[name=type]")).value; form.querySelectorAll("[data-for]").forEach(el => el.hidden = el.dataset.for !== t); };
        form.addEventListener("change", sync); sync();
        form.addEventListener("submit", e => { e.preventDefault(); if (!form.reportValidity()) return; document.getElementById("ok").hidden = false; });
      }
      app.querySelectorAll("[data-copy]").forEach(b => b.addEventListener("click", async () => {
        try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = "Copied"; }
        catch (e) { const c = b.previousElementSibling, r = document.createRange(); r.selectNodeContents(c); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Selected"; }
      }));
      app.querySelectorAll(".masonry figure").forEach(f => f.addEventListener("click", () => { const i = f.querySelector("img"); if (!i) return; lbImg.src = i.dataset.full || i.src; lbImg.alt = i.alt; lb.hidden = false; document.getElementById("lbClose").focus(); }));
      app.querySelectorAll(".swipe").forEach(wireDeck);
      fit();
      if (!reduce) { tilt(); sweep(); }
      mbook.hidden = true;
    }
    document.getElementById("lbClose").onclick = () => lb.hidden = true;
    lb.addEventListener("click", e => { if (e.target === lb) lb.hidden = true; });
    addEventListener("keydown", e => { if (e.key === "Escape") lb.hidden = true; });
    function fit() {
      app.querySelectorAll(".hero h1,.gal-hero h3,.sec-head h2").forEach(el => {
        el.style.fontSize = ""; let fs = parseFloat(getComputedStyle(el).fontSize);
        while (el.scrollWidth > el.clientWidth + 1 && fs > 22) { fs -= 2; el.style.fontSize = fs + "px"; }
      });
    }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
    addEventListener("resize", () => requestAnimationFrame(fit));
    function tilt() {
      if (!matchMedia("(hover:hover) and (pointer:fine)").matches) return;
      app.querySelectorAll(".tilt").forEach(t => {
        t.addEventListener("pointermove", e => { const r = t.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; t.style.transform = `perspective(800px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg) translateZ(6px)`; });
        t.addEventListener("pointerleave", () => t.style.transform = "");
      });
    }
    function wireDeck(sw) {
      const panels = [...sw.children], id = sw.id, dots = [...document.querySelectorAll(`[data-dots="${id}"] button`)];
      const prev = document.querySelector(`[data-prev="${id}"]`), next = document.querySelector(`[data-next="${id}"]`);
      const go = i => { const p = panels[Math.max(0, Math.min(panels.length - 1, i))]; sw.scrollTo({ left: p.offsetLeft - (sw.clientWidth - p.clientWidth) / 2, behavior: reduce ? "auto" : "smooth" }); };
      let cur = -1;
      const frame = () => {
        const mid = sw.scrollLeft + sw.clientWidth / 2; let best = 0, bd = 1e9;
        panels.forEach((p, i) => { const d = (p.offsetLeft + p.clientWidth / 2 - mid) / p.clientWidth; if (Math.abs(d) < bd) { bd = Math.abs(d); best = i; }
          if (!reduce) { const k = Math.max(-1.4, Math.min(1.4, d)); p.style.transform = `rotateY(${-k * 16}deg) translateZ(${-Math.abs(k) * 70}px) scale(${1 - Math.abs(k) * .05})`; } });
        if (best !== cur) { cur = best; dots.forEach((b, i) => b.setAttribute("aria-current", i === cur)); if (prev) prev.disabled = cur === 0; if (next) next.disabled = cur === panels.length - 1; }
      };
      sw.addEventListener("scroll", () => requestAnimationFrame(frame), { passive: true }); frame();
      dots.forEach(b => b.onclick = () => go(+b.dataset.i)); if (prev) prev.onclick = () => go(cur - 1); if (next) next.onclick = () => go(cur + 1);
      sw.addEventListener("keydown", e => { if (e.key === "ArrowRight") { e.preventDefault(); go(cur + 1); } if (e.key === "ArrowLeft") { e.preventDefault(); go(cur - 1); } });
    }
    function sweep() {
      if (!("IntersectionObserver" in window)) return;
      const io = new IntersectionObserver(es => es.forEach(en => { if (en.isIntersecting) { en.target.style.setProperty("--sweep", "100%"); io.unobserve(en.target); } }), { threshold: .8 });
      app.querySelectorAll(".mark").forEach(m => { m.style.setProperty("--sweep", "0%"); io.observe(m); });
    }
    (function deckFrame() {
      const d = document.getElementById("deck");
      if (d) { const p = Math.min(1, Math.max(0, scrollY / 420)); const n = d.children.length; [...d.children].forEach((f, i) => { const o = i - (n - 1) / 2;
        f.style.transform = reduce ? `translateX(${o * 14}%) rotate(${o * 4}deg)` : `translateX(${o * (10 + p * 26)}%) translateZ(${-Math.abs(o) * (60 + p * 80)}px) rotateY(${-o * (8 + p * 14)}deg) rotate(${o * (3 - p * 2)}deg)`;
        f.style.zIndex = 3 - Math.abs(o); }); }
      requestAnimationFrame(deckFrame);
    })();
    menuBtn.onclick = () => { const o = nav.classList.toggle("open"); menuBtn.setAttribute("aria-expanded", o); };
    const themes = ["auto", "light", "dark"], themeBtn = document.getElementById("themeBtn");
    let th = "auto"; try { th = localStorage.getItem("pl:theme") || "auto"; } catch (e) {}
    const applyTheme = () => { if (th === "auto") document.documentElement.removeAttribute("data-theme"); else document.documentElement.setAttribute("data-theme", th); themeBtn.textContent = th[0].toUpperCase() + th.slice(1); };
    themeBtn.onclick = () => { th = themes[(themes.indexOf(th) + 1) % 3]; try { localStorage.setItem("pl:theme", th); } catch (e) {} applyTheme(); };
    applyTheme();
    addEventListener("scroll", () => { mbook.hidden = /^book/.test(here) || scrollY < 520; }, { passive: true });
    addEventListener("storage", e => { if (e.key === KEY) { edits = store.get(); render(); } });
    addEventListener("hashchange", () => { const h = location.hash.slice(1); if (h !== here) { here = h; render(); } });
    // In the Studio preview the parent page can jump to a section (only the Studio, nothing else).
    if (OPT.preview) addEventListener("message", e => { if (e.source === parent && e.data && e.data.plStudio === "go" && typeof e.data.hash === "string") go(e.data.hash.replace(/[^a-z0-9\-/?=]/gi, "")); });
    render();
  }

  /* =====================================================================
     OWNER DASHBOARD
     ===================================================================== */
  const DASH_CSS = `
body{font-size:15px;padding-bottom:calc(84px + env(safe-area-inset-bottom,0px))}
.eyebrow{font:500 11px/1.2 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.concept{font:500 11px/1.3 var(--mono);letter-spacing:.08em;text-transform:uppercase;text-align:center;padding:8px var(--gutr) 8px var(--gut);background:var(--ink);color:var(--bg)}
.mark{background:linear-gradient(var(--hi),var(--hi)) no-repeat 0 100%/100% 62%;box-shadow:inset 0 -2px 0 var(--accent);padding:0 .1em;border-radius:2px}
.small{font-size:13px;color:var(--muted)}
.top{position:sticky;top:env(safe-area-inset-top,0px);z-index:20;background:color-mix(in srgb,var(--bg) 90%,transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);border-bottom:1px solid var(--line)}
.top .in{display:flex;align-items:center;gap:10px;padding-block:10px;max-width:1100px}
.me{width:38px;height:38px;border-radius:50%;overflow:hidden;flex:none;background:var(--hi);border:2px solid var(--surface);display:grid;place-items:center;font:800 16px/1 var(--display);color:var(--accent)}
.me img{width:100%;height:100%;object-fit:cover}
.hello{min-width:0}.hello b{display:block;font:800 21px/1.05 var(--display);text-transform:var(--up);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.top .act{margin-left:auto;display:flex;gap:6px}
.chipbtn{border:1px solid var(--line);background:var(--surface);border-radius:999px;padding:9px 13px;min-height:40px;font-size:13px;font-weight:600;cursor:pointer;text-decoration:none;color:var(--ink);white-space:nowrap;display:inline-flex;align-items:center;gap:6px}
.chipbtn.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-ink)}
.tabs{display:flex;gap:4px}
.tab{flex:1;border:0;background:transparent;cursor:pointer;display:grid;justify-items:center;gap:3px;padding:8px 4px;border-radius:12px;color:var(--muted);font-size:11.5px;font-weight:600;min-height:52px}
.tab svg{width:22px;height:22px}
.tab[aria-selected="true"]{color:var(--accent);background:var(--hi)}
.tabbar{position:fixed;left:0;right:0;bottom:0;z-index:25;background:color-mix(in srgb,var(--surface) 94%,transparent);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid var(--line);padding:6px max(10px,env(safe-area-inset-right,0px)) calc(6px + env(safe-area-inset-bottom,0px)) max(10px,env(safe-area-inset-left,0px))}
.tabbar .tabs{max-width:560px;margin:0 auto}
@media (min-width:900px){body{padding-bottom:40px}.tabbar{position:sticky;top:calc(env(safe-area-inset-top,0px) + 61px);bottom:auto;border-top:0;border-bottom:1px solid var(--line);background:color-mix(in srgb,var(--bg) 90%,transparent);z-index:19}.tabbar .tabs{max-width:1100px;justify-content:flex-start}.tab{flex:none;grid-auto-flow:column;gap:8px;padding:10px 16px;font-size:14px;min-height:0}.tab svg{width:18px;height:18px}}
.wrap.d{max-width:1100px}
.card{background:var(--surface);border:1px solid var(--line);border-radius:14px;box-shadow:0 1px 0 rgb(0 0 0 / .03),0 12px 30px -14px rgb(0 0 0 / .28);overflow:hidden;min-width:0}
.chrome{display:flex;align-items:center;gap:8px;padding:8px 12px;border-bottom:1px solid var(--line);font:500 10.5px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.lights{display:flex;gap:4px}.lights i{width:7px;height:7px;border-radius:50%;background:var(--line)}
.chrome .r{margin-left:auto;display:flex;gap:8px;align-items:center}
.body{padding:14px;display:grid;gap:12px}.body>*{min-width:0}
.ex{font:500 10px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted);padding:7px 14px;border-top:1px dashed var(--line)}
.pill{display:inline-flex;align-items:center;gap:5px;font:500 11px/1 var(--mono);padding:6px 10px;border-radius:999px;background:var(--hi);color:var(--ink);white-space:nowrap;border:0}
.pill::before{content:"";width:6px;height:6px;border-radius:50%;background:var(--accent)}
.pill.ok::before{background:#2E9E62}.pill.warn::before{background:#E08A1E}
.pill.idle{background:transparent;border:1px solid var(--line);color:var(--muted)}
button.pill{cursor:pointer;min-height:30px}
.page{display:grid;gap:18px;padding-block:18px 24px;animation:in .45s cubic-bezier(.2,.7,.2,1) both}
@keyframes in{from{opacity:.001;transform:translateY(12px)}to{opacity:1;transform:none}}
h1{font:900 clamp(36px,9vw,62px)/.92 var(--display);text-transform:var(--up);letter-spacing:var(--track);margin:0;text-wrap:balance}
h2{font:800 25px/1 var(--display);text-transform:var(--up);margin:0}
.head{display:flex;justify-content:space-between;align-items:end;gap:12px;flex-wrap:wrap}
.grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;align-items:start}
.grid3{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:14px;align-items:start}
@media (max-width:899px){.grid2{grid-template-columns:minmax(0,1fr)}}
.kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}
.kpi{padding:12px 14px;display:grid;gap:4px}.kpi b{font:900 32px/1 var(--display);font-variant-numeric:tabular-nums}.kpi .small{font-size:12px}
@media (max-width:640px){.kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
.shoot{display:grid;grid-template-columns:60px minmax(0,1fr) auto;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--line)}
.shoot:last-child{border-bottom:0}
.thumb{width:60px;height:60px;border-radius:10px;overflow:hidden;background:var(--hi);display:grid;place-items:center;font:900 18px/1 var(--display);color:var(--accent)}
.thumb img{width:100%;height:100%;object-fit:cover}
.date{display:grid;justify-items:center;line-height:1}.date b{font:900 25px/1 var(--display)}.date span{font:500 10px/1 var(--mono);letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.trunc{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.log{font:400 12px/1.8 var(--mono);color:var(--muted)}.log div{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.log b{color:var(--ink);font-weight:500}
.toolbar{display:flex;gap:8px;flex-wrap:wrap;align-items:center}
.seg{display:inline-flex;background:var(--surface);border:1px solid var(--line);border-radius:999px;padding:3px;gap:2px;flex-wrap:wrap}
.seg button{border:0;background:transparent;border-radius:999px;padding:8px 12px;font-size:13px;font-weight:600;color:var(--muted);cursor:pointer}
.seg button[aria-pressed="true"]{background:var(--ink);color:var(--bg)}
.jobs{display:grid;gap:12px}
.job .row{display:flex;align-items:center;gap:10px;min-width:0}
.job h3{margin:0;font:700 17px/1.2 var(--body);min-width:0}
.facts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.facts div{background:var(--bg);border-radius:9px;padding:8px 10px;min-width:0}
.facts b{display:block;font:800 19px/1.05 var(--display);white-space:nowrap}
.facts span{font:500 10px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
@media (max-width:480px){.facts{gap:6px}.facts div{padding:7px 8px}.facts b{font-size:17px}}
.stages{display:flex;gap:4px}.stages i{flex:1;height:6px;border-radius:3px;background:var(--line)}.stages i.on{background:var(--accent)}
.worth{font:500 11px/1 var(--mono)}
.gals{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:14px}
.gal .cover{position:relative;aspect-ratio:16/10;background:var(--hi);overflow:hidden}
.gal .cover img{width:100%;height:100%;object-fit:cover}
.gal .cover .tag{position:absolute;left:10px;top:10px;z-index:1;background:var(--surface)}
.gal .cover .name{position:absolute;left:12px;bottom:10px;color:#fff;font:900 28px/1 var(--display);text-transform:var(--up);text-shadow:0 2px 12px rgb(0 0 0 / .5);z-index:1}
.gal .cover::after{content:"";position:absolute;inset:40% 0 0;background:linear-gradient(transparent,rgb(0 0 0 / .55))}
.gal .acts{display:flex;gap:6px;flex-wrap:wrap}
.field{display:grid;gap:6px;min-width:0}.field label{font-weight:600;font-size:13px}
.field input,.field select,.field textarea{width:100%;border:1px solid var(--line);background:var(--bg);border-radius:10px;padding:11px 12px;font-size:16px}
.field textarea{min-height:96px;resize:vertical}
.price-in{display:flex;align-items:center;gap:6px}.price-in span{font:900 28px/1 var(--display)}
.price-in input{font:900 28px/1 var(--display)!important;padding:6px 10px!important;max-width:170px}
.req{border-left:3px solid var(--accent);background:var(--bg);border-radius:0 10px 10px 0;padding:10px 12px;font-size:14px;white-space:pre-wrap}
.sheet{position:fixed;inset:0;z-index:40;background:rgb(10 12 14 / .45);display:grid;align-items:end}
.sheet .card{border-radius:18px 18px 0 0;max-height:88vh;overflow:auto;padding-bottom:env(safe-area-inset-bottom,0px);max-width:640px;width:100%;margin:0 auto;animation:up .3s cubic-bezier(.2,.7,.2,1)}
@keyframes up{from{transform:translateY(40px);opacity:.001}to{transform:none;opacity:1}}
@media (min-width:900px){.sheet{align-items:center}.sheet .card{border-radius:18px}}
.toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(92px + env(safe-area-inset-bottom,0px));z-index:50;background:var(--ink);color:var(--bg);padding:10px 16px;border-radius:999px;font-size:14px;font-weight:600}
@media (min-width:900px){.toast{bottom:24px}}
`;

  function dashRuntime() {
    const P = window.__PROFILE__, OPT = window.__OPTIONS__ || {};
    const NS = "pl:" + P._slug + ":", KEY = NS + "edits";
    let canStore = true; try { localStorage.setItem(NS + "t", "1"); localStorage.removeItem(NS + "t"); } catch (e) { canStore = false; }
    const mem = {};
    const ls = {
      get(k, d) { if (!canStore) return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : d; try { const v = localStorage.getItem(NS + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
      set(k, v) { if (!canStore) { mem[k] = v; return true; } try { localStorage.setItem(NS + k, JSON.stringify(v)); return true; } catch (e) { return false; } }
    };
    const $ = s => document.querySelector(s);
    const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const safeSrc = s => /^https?:\/\//i.test(s) || /^data:image\/(jpeg|png|webp);base64,/i.test(s) ? s : "";
    // Ask common site builders for a phone-sized copy instead of the multi-megabyte original.
    const sized = (s, w) => { try { const u = new URL(s);
      if (u.hostname === "static.wixstatic.com") { const m = u.pathname.match(/^\/media\/([^/]+)$/); if (m) return `${u.origin}/media/${m[1]}/v1/fit/w_${w},h_${w},q_82/${m[1]}`; }
      if (/squarespace-cdn\.com$/.test(u.hostname) && !u.searchParams.has("format")) { u.searchParams.set("format", (w <= 500 ? 500 : w <= 1000 ? 1000 : 1500) + "w"); return u.href; }
      return s; } catch (e) { return s; } };
    const B = P.business, STAGES = P.owner.stages, WORD = P.owner.jobWord, TYPES = P.booking.types;
    const siteHref = OPT.preview ? "#site" : (OPT.siteHref || "index.html");
    let site = ls.get("edits", {});
    const saveSite = () => ls.set("edits", site);
    const iso = d => d.toISOString().slice(0, 10);
    const addDays = n => { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + n); return iso(d); };
    const GALS = P.collections.filter(c => !c.hidden).flatMap(c => c.items.map(it => ({ path: c.id + "/" + it.id, name: it.title, sec: c.title, photo: it.photos[0] || null, count: it.photos.length })));
    const coverOf = g => safeSrc(site["img:cover:" + g.path] || (g.photo && sized(g.photo.src, 700)) || (site["gal:" + g.path] || [])[0] || "");
    const city = B.city || "town";
    // Example jobs are clearly marked and use no real people's names.
    function examples() {
      const t = i => TYPES[i % TYPES.length], g = i => GALS.length ? GALS[i % GALS.length] : null;
      return [
        { id: "e1", ex: true, name: "Example client A", type: t(0).id, what: (g(0) ? g(0).name + " · " : "") + t(0).label, date: addDays(2), place: "Near " + city, miles: 12, value: 400, stage: Math.min(2, STAGES.length - 1), gal: g(0) && g(0).path },
        { id: "e2", ex: true, name: "Example client B", type: t(1).id, what: (g(1) ? g(1).name + " · " : "") + t(1).label, date: addDays(5), place: "Near " + city, miles: 30, value: 250, stage: Math.min(2, STAGES.length - 1), gal: g(1) && g(1).path },
        { id: "e3", ex: true, name: "Example client C", type: t(2).id, what: t(2).label, date: addDays(9), place: "Out of town", miles: 95, value: 600, stage: 0, gal: g(2) && g(2).path },
        { id: "e4", ex: true, name: "Example client D", type: t(0).id, what: t(0).label, date: addDays(-4), place: city, miles: 5, value: 150, stage: Math.min(3, STAGES.length - 1), gal: g(3) && g(3).path }
      ];
    }
    let jobs = ls.get("jobs", null); if (!Array.isArray(jobs)) { jobs = examples(); ls.set("jobs", jobs); }
    jobs.forEach(j => { j.stage = Math.max(0, Math.min(STAGES.length - 1, Math.floor(+j.stage) || 0)); });
    let fixes = ls.get("fixes", []);
    let galMeta = ls.get("gal", {});
    const saveJobs = () => ls.set("jobs", jobs), saveFixes = () => ls.set("fixes", fixes), saveGal = () => ls.set("gal", galMeta);
    const money = n => "$" + Number(n || 0).toLocaleString("en-US");
    const fmt = d => { const x = new Date(d + "T12:00:00"); return { m: x.toLocaleString("en-US", { month: "short" }), d: x.getDate(), wd: x.toLocaleString("en-US", { weekday: "short" }) }; };
    const daysAway = d => Math.round((new Date(d + "T12:00:00") - new Date().setHours(12, 0, 0, 0)) / 864e5);
    const typeLabel = id => (TYPES.find(t => t.id === id) || { label: "Other" }).label;
    function toast(t) { const el = $("#toast"); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 1800); }
    const chrome = (label, right) => `<div class="chrome"><span class="lights"><i></i><i></i><i></i></span><span>${label}</span><span class="r">${right || ""}</span></div>`;
    const exTag = `<div class="ex">Example data · clear it on the ${esc(cap(WORD))}s tab</div>`;
    function cap(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
    const last = STAGES.length - 1, booked = Math.min(2, last);
    const stagePill = j => { const s = STAGES[j.stage], cls = j.stage === 0 ? "warn" : j.stage >= last - 1 ? "ok" : ""; return `<button class="pill ${cls}" data-adv="${j.id}" aria-label="Status ${esc(s)}. Tap to move to the next step">${esc(s)}</button>`; };
    const ICON = {
      today: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
      jobs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>',
      pages: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="4"/></svg>',
      pricing: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 12l-8 8-9-9V3h8z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>',
      site: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M14 4l6 6L9 21H3v-6z"/></svg>'
    };
    const TABS = [["today", "Today"], ["jobs", cap(WORD) + "s"], ...(GALS.length ? [["pages", "Photos"]] : []), ...(P.show.pricing && P.pricing.lanes.length ? [["pricing", "Pricing"]] : []), ["site", "My site"]];
    let tab = location.hash.slice(1) || "today"; if (!TABS.some(t => t[0] === tab)) tab = "today";
    const note = OPT.preview ? "Preview: changes stay in this window and aren't saved" : canStore ? "Saved on this device. Your site shows them in this browser until it's connected" : "This browser won't save changes";
    let sortBy = "date", filter = "all";

    document.body.innerHTML = `${OPT.connected ? "" : `<div class="concept">${OPT.preview ? "Owner dashboard preview by Plainline · not live" : "Owner dashboard · not connected yet · no login"}</div>`}<header class="top"><div class="wrap d in">
<div class="me" id="me">${esc(B.name[0] || "")}</div>
<div class="hello"><span class="eyebrow" id="dateLine"></span><b>${esc(B.name)}</b></div>
<div class="act"><a class="chipbtn" href="${esc(siteHref)}" id="viewSite" ${OPT.preview ? "" : 'target="_blank" rel="noopener"'}>View site ↗</a></div>
</div></header>
<nav class="tabbar" aria-label="Sections"><div class="tabs" role="tablist" id="tabs"></div></nav>
<main class="wrap d" id="main"></main>
<input type="file" id="pick" accept="image/jpeg,image/png,image/webp" multiple hidden>
<div class="sheet" id="sheet" hidden></div>
<div class="toast" id="toast" hidden role="status"></div>`;
    if (OPT.preview) $("#viewSite").onclick = e => { e.preventDefault(); try { parent.postMessage({ plStudio: "open", page: "site" }, "*"); } catch (x) {} };
    const meSrc = safeSrc(site["img:about"] || (P.about.photo && sized(P.about.photo.src, 160)) || "");
    if (meSrc) $("#me").innerHTML = `<img src="${esc(meSrc)}" alt="" referrerpolicy="no-referrer">`;

    const V = {};
    V.today = () => {
      const upcoming = jobs.filter(j => daysAway(j.date) >= 0 && j.stage >= booked && j.stage < last).sort((a, b) => a.date.localeCompare(b.date));
      const fresh = jobs.filter(j => j.stage === 0), won = jobs.filter(j => j.stage >= booked), unpaid = jobs.filter(j => j.stage > booked && j.stage < last);
      const hasEx = jobs.some(j => j.ex);
      return `<div class="head"><div><div class="eyebrow">${upcoming.length ? "Next " + esc(WORD) + " " + (daysAway(upcoming[0].date) === 0 ? "today" : "in " + daysAway(upcoming[0].date) + " days") : "Nothing booked yet"}</div>
<h1>Hey ${esc(B.name.split(" ")[0])}, <span class="mark">here's your week.</span></h1></div></div>
<div class="kpis"><div class="card kpi"><span class="small">New to answer</span><b>${fresh.length}</b></div><div class="card kpi"><span class="small">${esc(STAGES[booked])}</span><b>${won.length}</b></div>
<div class="card kpi"><span class="small">${esc(STAGES[booked])} value</span><b>${money(won.reduce((s, j) => s + (+j.value || 0), 0))}</b></div><div class="card kpi"><span class="small">Waiting on payment</span><b>${unpaid.length}</b></div></div>
<div class="grid2"><div class="card">${chrome("Coming up", `<span class="pill ok">${upcoming.length} ${esc(STAGES[booked].toLowerCase())}</span>`)}
<div class="body" style="gap:0">${upcoming.length ? upcoming.slice(0, 5).map(j => { const f = fmt(j.date), g = GALS.find(x => x.path === j.gal), src = g ? coverOf(g) : ""; return `<div class="shoot"><div class="thumb">${src ? `<img src="${esc(src)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : esc(typeLabel(j.type)[0])}</div>
<div style="min-width:0"><b class="trunc" style="display:block">${esc(j.what)}</b><div class="small trunc">${esc(j.name)} · ${esc(j.place)}</div></div><div class="date"><b>${f.d}</b><span>${f.wd} ${f.m}</span></div></div>`; }).join("") : `<p class="small">Nothing booked yet. New requests from your site land on the ${esc(cap(WORD))}s tab.</p>`}</div>${hasEx ? exTag : ""}</div>
<div style="display:grid;gap:14px;align-content:start"><div class="card">${chrome("Needs you", fresh.length ? `<span class="pill warn">${fresh.length} new</span>` : "")}
<div class="body">${fresh.length ? fresh.map(j => `<div style="display:flex;gap:10px;align-items:center"><div style="min-width:0;flex:1"><b class="trunc" style="display:block">${esc(j.name)} · ${esc(j.what)}</b><div class="small">${esc(j.place)} · ${+j.miles || 0} mi · ${money(j.value)}</div></div><button class="chipbtn primary" data-adv="${j.id}">Mark ${esc(STAGES[1].toLowerCase())}</button></div>`).join("") : `<p class="small">You're all caught up.</p>`}</div></div>
<div class="card">${chrome("Recent activity")}<div class="body log">${jobs.slice().reverse().slice(0, 3).map(j => `<div>${esc(STAGES[j.stage].toLowerCase())} · <b>${esc(j.name)} · ${esc(j.what)}</b></div>`).join("")}${fixes.slice(0, 2).map(f => `<div>site fix · <b>${esc(f.state.toLowerCase())} · ${esc(f.page)}</b></div>`).join("")}</div></div></div></div>`;
    };
    V.jobs = () => {
      const list = jobs.filter(j => filter === "all" || j.type === filter).sort((a, b) => sortBy === "money" ? b.value - a.value : sortBy === "miles" ? a.miles - b.miles : a.date.localeCompare(b.date));
      const hasEx = jobs.some(j => j.ex);
      return `<div class="head"><div><div class="eyebrow">${jobs.length} ${esc(WORD)}s · tap a status to move it along</div><h1>${esc(cap(WORD))}s</h1></div><button class="chipbtn primary" id="addJob">+ Add ${esc(WORD)}</button></div>
<div class="toolbar"><div class="seg" role="group" aria-label="Sort">${[["date", "Soonest"], ["money", "Most $"], ["miles", "Closest"]].map(([k, l]) => `<button aria-pressed="${sortBy === k}" data-sort="${k}">${l}</button>`).join("")}</div>
${TYPES.length > 1 ? `<div class="seg" role="group" aria-label="Filter">${[["all", "All"], ...TYPES.map(t => [t.id, t.label])].map(([k, l]) => `<button aria-pressed="${filter === k}" data-filter="${esc(k)}">${esc(l)}</button>`).join("")}</div>` : ""}
${hasEx ? `<button class="chipbtn" id="clearEx">Clear examples</button>` : ""}</div>
<div class="jobs">${list.length ? list.map(jobCard).join("") : `<div class="card"><div class="body"><b>Nothing here yet.</b><span class="small">Tap “Add ${esc(WORD)}” when a request comes in. Once the site is live, requests land here on their own.</span></div></div>`}</div>`;
    };
    function jobCard(j) {
      const f = fmt(j.date), per = j.miles ? Math.round(j.value / (j.miles * 2)) : j.value;
      return `<article class="card job">${chrome(esc(typeLabel(j.type)), j.ex ? "<span>example</span>" : "")}<div class="body">
<div class="row"><h3 class="trunc" style="flex:1">${esc(j.what)}</h3>${stagePill(j)}</div><div class="small">${esc(j.name)} · ${esc(j.place)}</div>
<div class="facts"><div><span>Date</span><b>${f.m} ${f.d}</b></div><div><span>Pay</span><b>${money(j.value)}</b></div><div><span>Miles</span><b>${+j.miles || 0}</b></div><div><span>$/mile*</span><b>${money(per)}</b></div></div>
<div class="stages" aria-hidden="true">${STAGES.map((_, i) => `<i class="${i <= j.stage ? "on" : ""}"></i>`).join("")}</div>
<div class="row"><span class="worth">${per >= 5 ? "Worth the drive" : "Long drive for the pay"}</span><span class="small" style="margin-left:auto">*pay ÷ round-trip miles</span><button class="chipbtn" data-edit="${j.id}">Edit</button></div></div></article>`;
    }
    V.pages = () => `<div class="head"><div><div class="eyebrow">${esc(note)}</div><h1>Photos</h1></div></div>
<p class="small" style="margin:0;max-width:60ch">Every section of your site has its own page. Swap the cover, add new photos, or copy the link to send to a customer.</p>
<div class="gals">${GALS.map(g => { const n = (site["gal:" + g.path] || []).length + g.count, src = coverOf(g), link = (B.domain ? "https://" + B.domain + "/" : "") + "#" + g.path;
  return `<article class="card gal"><div class="cover">${src ? `<img src="${esc(src)}" alt="${esc(g.name)} cover" loading="lazy" referrerpolicy="no-referrer">` : ""}<span class="tag pill ${n ? "ok" : "warn"}">${n ? n + " photo" + (n > 1 ? "s" : "") : "empty"}</span><span class="name">${esc(g.name)}</span></div>
<div class="body"><div class="small">${esc(g.sec)} · ${galMeta[g.path] ? "updated " + esc(galMeta[g.path]) : "not updated yet"}</div>
<div class="gal acts" style="display:flex;gap:6px;flex-wrap:wrap"><button class="chipbtn" data-cover="cover:${esc(g.path)}" data-path="${esc(g.path)}">Swap cover</button><button class="chipbtn" data-addto="${esc(g.path)}">+ Add photos</button><button class="chipbtn" data-copy="${esc(link)}">Copy link</button></div></div></article>`; }).join("")}</div>`;
    V.pricing = () => {
      const lane = l => `<div class="card">${chrome(esc(l.who || "Pricing"))}<div class="body"><h2>${esc(l.name)}</h2>
<div class="field"><label for="p-${esc(l.id)}">Starting at</label><div class="price-in"><span>$</span><input id="p-${esc(l.id)}" inputmode="numeric" data-price="${esc(l.id)}" value="${esc(String(site["txt:price-" + l.id] || l.startingAt || "").replace(/[^0-9]/g, ""))}" placeholder="—"></div></div>
<div class="field"><label>What's included</label>${l.items.map((it, i) => `<input data-txt="p-${esc(l.id)}-${i}" value="${esc(site["txt:p-" + l.id + "-" + i] != null ? site["txt:p-" + l.id + "-" + i] : it)}" aria-label="${esc(l.name)} item ${i + 1}">`).join("")}</div></div></div>`;
      return `<div class="head"><div><div class="eyebrow">${esc(note)}</div><h1>Pricing</h1></div><a class="chipbtn" href="${esc(siteHref)}${OPT.preview ? "" : "#pricing"}" data-open="pricing">See pricing page ↗</a></div>
<div class="grid3">${P.pricing.lanes.map(lane).join("")}</div>
<div class="card">${chrome("Note under your prices")}<div class="body"><div class="field"><textarea data-txt="price-note" aria-label="Pricing note">${esc(site["txt:price-note"] != null ? site["txt:price-note"] : P.pricing.note)}</textarea></div></div></div>`;
    };
    V.site = () => {
      const pages = ["Home", ...(P.about.paragraphs.length ? ["About"] : []), ...(P.pricing.lanes.length ? ["Pricing"] : []), "Booking", ...GALS.map(g => g.sec + " · " + g.name)];
      const area = (id, label, val) => `<div class="field"><label for="t-${id}">${esc(label)}</label><textarea id="t-${id}" data-txt="${id}">${esc(site["txt:" + id] != null ? site["txt:" + id] : val)}</textarea></div>`;
      return `<div class="head"><div><div class="eyebrow">Something bugging you? Fix it here.</div><h1>My site</h1></div><a class="chipbtn" href="${esc(siteHref)}" data-open="home">Open site ↗</a></div>
<div class="grid2"><div class="card">${chrome("Quick edits")}<div class="ex" style="border-top:0;border-bottom:1px dashed var(--line)">${esc(note)}</div><div class="body">
${P.hero.lede ? area("home-lede", "Homepage intro", P.hero.lede) : ""}
${P.about.paragraphs.map((t, i) => area("about-" + (i + 1), "About, paragraph " + (i + 1), t)).join("")}
${P.about.photo ? `<div class="field"><label for="t-me">Photo on the About page</label><button class="chipbtn" id="t-me" data-cover="about">Swap photo</button></div>` : ""}
</div></div>
<div class="card">${chrome("Bigger changes · send to Plainline")}<div class="body">
<div class="field"><label for="fx-page">Which page?</label><select id="fx-page">${pages.map(p => `<option>${esc(p)}</option>`).join("")}</select></div>
<div class="field"><label for="fx-text">What's wrong, in your words</label><textarea id="fx-text" placeholder="e.g. this page needs newer photos"></textarea></div>
<button class="chipbtn primary" id="fx-add" style="justify-self:start">Turn into a request</button>
<div style="display:grid;gap:10px">${fixes.map(f => `<div style="display:grid;gap:6px"><div class="req">Page: ${esc(f.page)}\nChange: ${esc(f.text)}</div>
<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap"><span class="pill ${f.state === "Done" ? "ok" : f.state === "Sent" ? "" : "warn"}">${esc(f.state)}</span>
<button class="chipbtn" data-copyfix="${f.id}" style="margin-left:auto">Copy request</button><button class="chipbtn" data-fixstate="${f.id}">${f.state === "To send" ? "Mark sent" : f.state === "Sent" ? "Mark done" : "Reopen"}</button></div></div>`).join("")}</div></div></div></div>
<div class="card">${chrome("Undo")}<div class="body"><span class="small">Put the site back the way it was before any edits made here.</span><button class="chipbtn" id="resetSite" style="justify-self:start">Reset site edits</button></div></div>`;
    };
    function drawTabs() { $("#tabs").innerHTML = TABS.map(([k, l]) => `<button class="tab" role="tab" aria-selected="${tab === k}" data-tab="${k}">${ICON[k]}<span>${esc(l)}</span></button>`).join(""); }
    function render() { drawTabs(); $("#main").innerHTML = `<div class="page">${V[tab]()}</div>`; }
    async function copy(text, msg) { try { await navigator.clipboard.writeText(text); toast(msg); } catch (e) { toast("Couldn't copy. Press and hold to select instead"); } }
    document.addEventListener("click", e => {
      const t = e.target.closest("button,[data-copy],[data-open]"); if (!t) return;
      const d = t.dataset;
      if (d.tab) { tab = d.tab; try { history.replaceState(null, "", "#" + tab); } catch (x) {} render(); scrollTo({ top: 0 }); return; }
      if (d.open && OPT.preview) { e.preventDefault(); try { parent.postMessage({ plStudio: "open", page: "site", hash: d.open }, "*"); } catch (x) {} return; }
      if (d.adv) { const j = jobs.find(x => x.id === d.adv); j.stage = (j.stage + 1) % STAGES.length; saveJobs(); render(); toast(STAGES[j.stage]); return; }
      if (d.sort) { sortBy = d.sort; render(); return; }
      if (d.filter) { filter = d.filter; render(); return; }
      if (t.id === "clearEx") { jobs = jobs.filter(j => !j.ex); saveJobs(); render(); toast("Examples cleared"); return; }
      if (t.id === "addJob") return openJob();
      if (d.edit) return openJob(jobs.find(x => x.id === d.edit));
      if (d.cover) return pickFor({ cover: d.cover, path: d.path });
      if (d.addto) return pickFor({ add: d.addto });
      if (d.copy) return copy(d.copy, "Link copied");
      if (t.id === "fx-add") { const tx = $("#fx-text").value.trim(); if (!tx) { $("#fx-text").focus(); return; } fixes.unshift({ id: "f" + Date.now(), page: $("#fx-page").value, text: tx.slice(0, 1000), state: "To send" }); saveFixes(); render(); toast("Request ready to send"); return; }
      if (d.copyfix) { const f = fixes.find(x => x.id === d.copyfix); return copy(`Website change for ${B.name}:\nPage: ${f.page}\nChange: ${f.text}`, "Copied. Paste it to Plainline"); }
      if (d.fixstate) { const f = fixes.find(x => x.id === d.fixstate); f.state = f.state === "To send" ? "Sent" : f.state === "Sent" ? "Done" : "To send"; saveFixes(); render(); return; }
      if (t.id === "resetSite") { site = {}; saveSite(); render(); toast("Site edits reset"); }
    });
    document.addEventListener("input", e => {
      const el = e.target, d = el.dataset;
      if (d.price !== undefined) { const v = el.value.replace(/[^0-9]/g, ""); site["txt:price-" + d.price] = v ? "$" + Number(v).toLocaleString("en-US") : "$ —"; saveSite(); }
      else if (d.txt) { site["txt:" + d.txt] = el.value.slice(0, 2000); saveSite(); }
    });
    const pick = $("#pick"); let target = null;
    function pickFor(t) { target = t; pick.value = ""; pick.multiple = !!t.add; pick.click(); }
    function shrink(file) { return new Promise(res => { const r = new FileReader(); r.onload = () => { const i = new Image(); i.onload = () => { const s = Math.min(1, 1400 / Math.max(i.width, i.height)), c = document.createElement("canvas"); c.width = Math.round(i.width * s); c.height = Math.round(i.height * s); c.getContext("2d").drawImage(i, 0, 0, c.width, c.height); res(c.toDataURL("image/jpeg", .8)); }; i.onerror = () => res(""); i.src = r.result; }; r.readAsDataURL(file); }); }
    // Re-encoding through a canvas also drops the photo's EXIF data, including GPS location.
    pick.addEventListener("change", async () => {
      const files = [...pick.files].slice(0, 12); if (!files.length) return;
      for (const f of files) { const u = await shrink(f); if (!u) continue; if (target.cover) site["img:" + target.cover] = u; else { const k = "gal:" + target.add; (site[k] = site[k] || []).push(u); } }
      const p = target.path || target.add; if (p) { galMeta[p] = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }); saveGal(); }
      if (!saveSite()) { toast("Too many photos to save here. Try fewer"); return; }
      render(); toast(files.length > 1 ? files.length + " photos added" : "Photo updated");
    });
    function openJob(j) {
      const isNew = !j; j = j || { id: "j" + Date.now(), name: "", type: TYPES[0].id, what: "", date: addDays(7), place: "", miles: "", value: "", stage: 0, gal: null };
      const sh = $("#sheet");
      sh.innerHTML = `<div class="card" role="dialog" aria-modal="true" aria-labelledby="sh-h">${chrome(isNew ? "New " + esc(WORD) : "Edit " + esc(WORD))}<form class="body" id="jobForm">
<h2 id="sh-h">${isNew ? "Add a " + esc(WORD) : "Edit " + esc(WORD)}</h2>
<div class="field"><label for="j-what">What is it?</label><input id="j-what" required value="${esc(j.what)}"></div>
<div class="grid2"><div class="field"><label for="j-name">Client</label><input id="j-name" required value="${esc(j.name)}"></div>
<div class="field"><label for="j-type">Type</label><select id="j-type">${TYPES.map(t => `<option value="${esc(t.id)}" ${j.type === t.id ? "selected" : ""}>${esc(t.label)}</option>`).join("")}</select></div></div>
<div class="grid2"><div class="field"><label for="j-date">Date</label><input id="j-date" type="date" required value="${esc(j.date)}"></div><div class="field"><label for="j-place">Where</label><input id="j-place" value="${esc(j.place)}"></div></div>
<div class="grid2"><div class="field"><label for="j-miles">Miles away</label><input id="j-miles" inputmode="numeric" value="${esc(j.miles)}"></div><div class="field"><label for="j-value">Pay ($)</label><input id="j-value" inputmode="numeric" value="${esc(j.value)}"></div></div>
<div style="display:flex;gap:8px;flex-wrap:wrap">${!isNew ? `<button type="button" class="chipbtn" id="j-del">Delete</button>` : ""}<span style="flex:1"></span><button type="button" class="chipbtn" id="j-cancel">Cancel</button><button class="chipbtn primary" type="submit">Save</button></div></form></div>`;
      sh.hidden = false; $("#j-what").focus();
      $("#j-cancel").onclick = () => sh.hidden = true;
      sh.onclick = e => { if (e.target === sh) sh.hidden = true; };
      if (!isNew) $("#j-del").onclick = () => { jobs = jobs.filter(x => x.id !== j.id); saveJobs(); sh.hidden = true; render(); toast("Deleted"); };
      $("#jobForm").onsubmit = e => { e.preventDefault();
        Object.assign(j, { what: $("#j-what").value.trim().slice(0, 120), name: $("#j-name").value.trim().slice(0, 80), type: $("#j-type").value, date: $("#j-date").value, place: $("#j-place").value.trim().slice(0, 80), miles: +$("#j-miles").value.replace(/\D/g, "") || 0, value: +$("#j-value").value.replace(/\D/g, "") || 0, ex: false });
        if (isNew) jobs.push(j); saveJobs(); sh.hidden = true; tab = "jobs"; render(); toast(isNew ? "Added" : "Saved"); };
    }
    addEventListener("keydown", e => { if (e.key === "Escape") $("#sheet").hidden = true; });
    $("#dateLine").textContent = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });
    render();
  }

  /* ---------- Render ---------- */
  function page(p, kind, opts) {
    const o = { preview: !!(opts && opts.preview), connected: !!(opts && opts.connected), ownerLink: !!(opts && (opts.preview || opts.ownerLink)), dashboardHref: (opts && opts.dashboardHref) || "owner.html", siteHref: (opts && opts.siteHref) || "index.html" };
    const B = p.business, isSite = kind === "site";
    const metaDesc = isSite ? (p.hero.lede || [B.kind, B.city].filter(Boolean).join(" in ")) : "";
    const extra = isSite
      ? `<meta name="description" content="${escHtml(metaDesc.slice(0, 155))}">\n${B.domain ? `<link rel="canonical" href="https://${escHtml(B.domain)}/">\n` : ""}<meta property="og:title" content="${escHtml(B.name)}">\n${p.hero.photos[0] ? `<meta property="og:image" content="${escHtml(p.hero.photos[0].src)}">\n` : ""}${o.connected ? "" : '<meta name="robots" content="noindex">\n'}<script type="application/ld+json">${embed(ldJson(p))}</script>`
      : `<meta name="robots" content="noindex,nofollow">`;
    const runtime = isSite ? siteRuntime : dashRuntime;
    return `${head(p, isSite ? B.name : B.name + " · Owner", extra)}
${isSite ? SITE_CSS : DASH_CSS}
</style>
</head>
<body>
<noscript>${escHtml(B.name)}${B.kind ? " · " + escHtml(B.kind) : ""}. Turn on JavaScript to see this site.</noscript>
<script>window.__PROFILE__=${embed(o.preview ? p : Object.assign({}, p, { questions: [], todos: [] }))};window.__OPTIONS__=${embed(o)};</script>
<script>(${runtime.toString()})();</script>
</body>
</html>
<!-- Built by Plainline Studio from a site profile. Placeholders marked "ADD:" must be filled before launch. -->
`;
  }
  function ldJson(p) {
    const B = p.business, C = p.contact, o = { "@context": "https://schema.org", "@type": "LocalBusiness", name: B.name };
    if (B.domain) o.url = "https://" + B.domain + "/";
    if (C.phone) o.telephone = C.phone;
    if (C.address) o.address = C.address;
    if (B.city) o.areaServed = B.city;
    if (p.hero.photos[0]) o.image = p.hero.photos[0].src;
    if (B.socials.length) o.sameAs = B.socials.map(s => s.url);
    return o;
  }
  function render(profile, opts) {
    const p = sanitize(profile);
    return { profile: p, site: page(p, "site", opts), dashboard: page(p, "dashboard", opts), todos: countTodos(p) };
  }
  function countTodos(p) { let n = p.todos.length; JSON.stringify(p, (k, v) => { if (typeof v === "string" && /^ADD:/i.test(v)) n++; return v; }); return n; }

  const API = { render, sanitize, LOOKS: Object.keys(LOOKS), VOICES: Object.keys(VOICES), version: 1 };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.StudioEngine = API;
})(typeof window !== "undefined" ? window : globalThis);
