#!/usr/bin/env node
/* App Store screenshots for Plainline Front Desk: 5 captions over the demo's front desk view (demo.html),
   filled with the made-up chats in seed.js for the demo's fictional salon. Writes 1320x2868 (6.9") and 1290x2796 (6.7") PNGs.
   The owner app isn't built yet: retake these from the real app before submitting (Apple wants the actual app).
   Run: NODE_PATH=$(npm root -g) node appstore/make_screenshots.js */
const { chromium } = require("playwright");
const fs = require("fs"), path = require("path");
const seed = require("./seed.js");
const ROOT = path.resolve(__dirname, ".."), OUT = path.join(__dirname, "screenshots");
const SHOTS = [
  { file: "1-inbox", head: "All your customer texts", sub: "See who's booked and who needs you", pick: "priya", top: true },
  { file: "2-booking", head: "Bookings inside the chat", sub: "With an optional deposit to hold the spot", pick: "jordan" },
  { file: "3-handoff", head: "Flags what needs you", sub: "Upset customers and refunds come to you", pick: "sam", to: ".c-row" },
  { file: "4-takeover", head: "Take over with one tap", sub: "Reply as yourself, hand back anytime", pick: "chris" },
  { file: "5-bookings", head: "Every booking at a glance", sub: "Upcoming visits and deposits held", end: "#bookings" }
];

async function capture(browser){
  const ctx = await browser.newContext({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 3 });
  await ctx.route(/\/api\/chat/, r => r.fulfill({ status: 200, contentType: "application/json", body: '{"ai":false}' }));
  const p = await ctx.newPage();
  await p.goto("file://" + path.join(ROOT, "demo.html"));
  await p.waitForTimeout(1200);
  /* Only the owner's side: no demo labels, customer phone or customer tab */
  await p.addStyleTag({ content: ".brand span,.pills,.under,[data-view=customer]{display:none!important}body{padding-bottom:900px!important}" });
  const ids = await p.evaluate(`(${seed.toString()})()`);
  const imgs = {};
  for (const s of SHOTS){
    await p.evaluate(id => { S.view = "desk"; document.body.dataset.view = "desk"; S.selected = id; render(); scrollTo(0, 0); }, ids[s.pick || "sam"]);
    if (s.pick && !s.to && !s.top) await p.evaluate(() => scrollTo(0, document.querySelector("#tpane").getBoundingClientRect().top + scrollY - 12));
    if (s.to) await p.evaluate(sel => scrollTo(0, document.querySelector(sel).parentElement.getBoundingClientRect().top + scrollY - 12), s.to);
    if (s.end) await p.evaluate(sel => scrollTo(0, document.querySelector(sel).parentElement.getBoundingClientRect().bottom + scrollY - innerHeight + 24), s.end);
    await p.waitForTimeout(400);
    imgs[s.file] = (await p.screenshot()).toString("base64");
  }
  await ctx.close();
  return imgs;
}

const frame = (s, img, W, H) => `<!doctype html><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden}
body{background:linear-gradient(180deg,#0d6b71 0%,#0a5357 55%,#083f43 100%);font-family:-apple-system,"SF Pro Display","Figtree","Segoe UI",system-ui,sans-serif;
  color:#fff;display:flex;flex-direction:column;align-items:center;position:relative}
h1{font-size:${W * .066}px;font-weight:800;letter-spacing:-.02em;line-height:1.08;text-align:center;margin-top:${H * .055}px;padding:0 ${W * .06}px}
p{font-size:${W * .036}px;color:#CFEDEE;margin-top:${H * .012}px;text-align:center;padding:0 ${W * .08}px}
.phone{margin-top:${H * .035}px;width:${W * .78}px;border-radius:${W * .095}px;padding:${W * .018}px;background:#0c1417;box-shadow:0 40px 120px rgba(0,0,0,.35)}
.phone img{display:block;width:100%;border-radius:${W * .078}px}
small{position:absolute;bottom:${H * .012}px;font-size:${W * .022}px;color:#A9D6D8}
</style><h1>${s.head}</h1><p>${s.sub}</p><div class="phone"><img src="data:image/png;base64,${img}"></div><small>Sample business and customers shown</small>`;

(async () => {
  const browser = await chromium.launch();
  const imgs = await capture(browser);
  fs.mkdirSync(OUT, { recursive: true });
  for (const [W, H, tag] of [[1320, 2868, "6.9in"], [1290, 2796, "6.7in"]]){
    const p = await browser.newPage({ viewport: { width: W, height: H } });
    for (const s of SHOTS){ await p.setContent(frame(s, imgs[s.file], W, H)); await p.waitForTimeout(150); await p.screenshot({ path: path.join(OUT, `${tag}-${s.file}.png`) }); }
    await p.close();
  }
  await browser.close();
  console.log("wrote", fs.readdirSync(OUT).length, "screenshots to", path.relative(ROOT, OUT));
})().catch(e => { console.error(e); process.exit(1); });
