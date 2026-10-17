// Studio step 1: read a business's current website and pull out the facts a rebuild needs.
// Fetches the home page plus up to 3 linked pages (about, services, menu, contact...). No dependencies.
const dns = require("dns").promises;
const net = require("net");
const { authorized, body } = require("./_studio");

const MAX_BYTES = 2_000_000, TIMEOUT_MS = 10_000, MAX_REDIRECTS = 4;
const UA = "Mozilla/5.0 (compatible; PlainlineStudio/1.0; +https://plainlineops.com)";

function privateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v.startsWith("::ffff:")) return privateIp(v.slice(7));
  return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe8") || v.startsWith("fe9") || v.startsWith("fea") || v.startsWith("feb");
}

// Public http(s) addresses only, so the Studio can't be used to reach private networks.
async function checkUrl(raw) {
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : "https://" + raw); } catch { throw new Error("That doesn't look like a web address"); }
  if (!/^https?:$/.test(u.protocol)) throw new Error("Only http and https addresses");
  if (process.env.NODE_ENV === "test" && process.env.STUDIO_ALLOW_PRIVATE === "1") return u; // local tests only
  const addrs = await dns.lookup(u.hostname, { all: true }).catch(() => { throw new Error("Couldn't find that website"); });
  if (!addrs.length || addrs.some(a => privateIp(a.address))) throw new Error("That address isn't a public website");
  return u;
}

async function get(raw) {
  let u = await checkUrl(raw);
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const r = await fetch(u, { redirect: "manual", headers: { "user-agent": UA, accept: "text/html" }, signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (r.status >= 300 && r.status < 400 && r.headers.get("location")) { u = await checkUrl(new URL(r.headers.get("location"), u).href); continue; }
    if (!r.ok) throw new Error(`The site answered ${r.status}`);
    if (!/html/i.test(r.headers.get("content-type") || "")) throw new Error("That page isn't a web page");
    const reader = r.body.getReader(); const chunks = []; let n = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; n += value.length; if (n > MAX_BYTES) { reader.cancel(); break; } chunks.push(value); }
    return { url: u.href, html: Buffer.concat(chunks.map(c => Buffer.from(c))).toString("utf8") };
  }
  throw new Error("Too many redirects");
}

const decode = s => s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d));
const clean = s => decode(String(s || "").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const meta = (html, key) => { const m = html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*>`, "i")); const c = m && m[0].match(/content=["']([^"']*)["']/i); return c ? decode(c[1]).trim() : ""; };
const abs = (src, base) => { if (/^(tel|mailto):/i.test(String(src).trim())) return decode(String(src).trim()); try { const u = new URL(decode(src), base); return /^https?:$/.test(u.protocol) ? u.href : ""; } catch { return ""; } };
const uniq = a => [...new Set(a.filter(Boolean))];

function text(html) {
  return clean(html.replace(/<(script|style|noscript|svg|iframe)[\s\S]*?<\/\1>/gi, " ").replace(/<!--[\s\S]*?-->/g, " ").replace(/<\/(p|div|li|h[1-6]|section|br|tr)>/gi, "\n"));
}

function jsonLd(html) {
  const out = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const j = JSON.parse(m[1].trim()); (Array.isArray(j) ? j : j["@graph"] || [j]).forEach(x => out.push(x)); } catch {}
  }
  return out.filter(x => x && typeof x === "object").slice(0, 6);
}

function colors(html) {
  const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1]).join(" ") + " " + [...html.matchAll(/style=["']([^"']*)["']/gi)].map(m => m[1]).join(" ");
  const count = {};
  for (const m of css.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) {
    let h = m[1].toLowerCase(); if (h.length === 3) h = h.split("").map(c => c + c).join("");
    const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)), max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max - min < 24) continue; // skip whites, greys and blacks
    count["#" + h] = (count["#" + h] || 0) + 1;
  }
  const theme = meta(html, "theme-color");
  return uniq([theme, ...Object.entries(count).sort((a, b) => b[1] - a[1]).map(e => e[0])]).slice(0, 6);
}

function facts(page) {
  const { html, url } = page;
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map(m => {
    const tag = m[0], src = (tag.match(/\s(?:data-src|src)=["']([^"']+)["']/i) || [])[1] || "";
    return { src: abs(src, url), alt: clean((tag.match(/alt=["']([^"']*)["']/i) || [])[1]) };
  }).filter(i => i.src && !/\.svg(\?|$)|pixel|spacer|tracking|1x1|gravatar|data:/i.test(i.src));
  const logo = (html.match(/<img\b[^>]*(?:logo)[^>]*>/i) || [""])[0];
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(m => ({ href: abs(m[1], url), label: clean(m[2]) }));
  return {
    url,
    title: clean((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1]),
    description: meta(html, "description") || meta(html, "og:description"),
    siteName: meta(html, "og:site_name"),
    shareImage: abs(meta(html, "og:image"), url),
    logo: logo ? abs((logo.match(/src=["']([^"']+)["']/i) || [])[1] || "", url) : "",
    headings: uniq([...html.matchAll(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi)].map(m => clean(m[2]))).filter(h => h.length < 120).slice(0, 30),
    phones: uniq(links.filter(l => /^tel:/i.test(l.href)).map(l => decodeURIComponent(l.href.slice(4)))).slice(0, 3),
    emails: uniq(links.filter(l => /^mailto:/i.test(l.href)).map(l => decodeURIComponent(l.href.slice(7).split("?")[0]))).slice(0, 3),
    social: uniq(links.map(l => l.href).filter(h => /facebook\.com|instagram\.com|tiktok\.com|yelp\.com|linkedin\.com|youtube\.com|x\.com|twitter\.com|google\.com\/maps|g\.page/i.test(h))).slice(0, 8),
    images: imgs.slice(0, 24),
    colors: colors(html),
    structured: jsonLd(html),
    text: text(html).slice(0, 9000),
    links
  };
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!authorized(req, res)) return;
  const { url } = body(req);
  if (typeof url !== "string" || !url.trim() || url.length > 2000) return res.status(400).json({ error: "Add the business's web address" });
  try {
    const home = facts(await get(url.trim()));
    const host = new URL(home.url).host;
    const more = uniq(home.links.filter(l => { try { return new URL(l.href).host === host && /about|service|menu|price|pricing|contact|team|story|location|hours|faq|review/i.test(l.href + " " + l.label); } catch { return false; } }).map(l => l.href.split("#")[0]))
      .filter(h => h !== home.url).slice(0, 3);
    const pages = [];
    for (const p of await Promise.allSettled(more.map(get))) if (p.status === "fulfilled") { const f = facts(p.value); pages.push({ url: f.url, title: f.title, headings: f.headings, text: f.text.slice(0, 4000), images: f.images.slice(0, 8), structured: f.structured }); }
    delete home.links;
    return res.status(200).json({ site: home, pages, domain: host.replace(/^www\./, "") });
  } catch (e) {
    return res.status(422).json({ error: e.message || "Couldn't read that site" });
  }
};
