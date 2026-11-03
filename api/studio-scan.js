// Studio step 1: read a business's current website and pull out the facts a rebuild needs.
// Fetches the home page plus up to 3 linked pages (about, services, menu, contact...). No dependencies.
const { authorized, body } = require("./_studio");
const { get, facts, uniq } = require("./_scan");

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
