// Studio step 2: write a production-ready one-page website for a business from its real facts.
// Streams the HTML back as Claude writes it, so long builds don't hit the function's time limit.
const { authorized, body } = require("./_studio");
const STYLES = require("../studio-styles.json");

const MODEL = process.env.STUDIO_MODEL || "claude-sonnet-5-5";
const API = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com") + "/v1/messages";
const MAX_INPUT = 60_000;

const SYSTEM = `You are Plainline's senior web designer and front-end developer. You rebuild websites for local businesses so they can be sold to the owner and go live on the owner's own domain.

Output: one complete, production-ready HTML document and nothing else. Start with <!doctype html> and end with </html>. No markdown, no commentary.

Facts (never break these):
- Use only facts given to you: business name, services, prices, hours, phone, email, address, team names, reviews, awards, years in business. Never invent any of them.
- If a section needs a fact you don't have, keep the section and put a clearly marked placeholder: <mark class="todo">ADD: what's needed</mark>. Ben fills these in before the owner sees it.
- Reviews and testimonials: only quote ones that appear in the facts, word for word, with the name as given. Otherwise leave a todo.
- Use the business's real photos and logo by their URLs when given (with descriptive alt text). Never use stock photos of people. Where there's no photo, use art made in the chosen style with CSS/SVG, never fake photos of the work or the team.

Design (it must not look AI-made):
- One primary style, the one named in the brief, applied with taste. Build it from the business's own things: its trade, products, town and colors. The style is the treatment, not the subject.
- No default purple-blue gradients, floating glass cards, generic glowing blobs, emoji icons, or "Elevate your experience" filler copy.
- Pick typefaces that fit the style (Google Fonts link is fine, at most two families). Real hierarchy: a strong hero, clear sections, generous spacing.
- Copy in plain, specific words a local owner would say. Lead each section with the answer, not a slogan.
- Motion: one signature animation in the hero and small hover/scroll touches. Wrap all motion in @media (prefers-reduced-motion: no-preference). Nothing loops behind body text.

Sections (in an order that suits the business): hero with the one main action (call, text or book), services (with prices only if given), why us / about, real reviews if any, hours and location (with an embedded map link built from the address, not an API key), FAQ (3-5 questions a customer would really ask, answered from the facts), contact, footer with the business name and year.

Production quality:
- Semantic HTML5 landmarks, one h1, logical headings. Mobile-first and responsive down to 360px wide, no horizontal scroll. Tap targets at least 44px.
- Accessible: WCAG AA contrast, alt text, visible focus styles, labels on every form field, lang attribute.
- Fast: all CSS in one <style>, minimal vanilla JS only if needed (mobile menu), no frameworks, images with loading="lazy" width/height, no external scripts except fonts.
- SEO and answer engines: <title> "Business · main service in City", meta description under 155 characters, canonical to the owner's domain, Open Graph tags, and JSON-LD for LocalBusiness (or the closest subtype) with only known fields, plus FAQPage matching the visible FAQ word for word.
- Tappable phone (tel:), email (mailto:) and map links. Contact form markup posts nowhere yet: action="#" with a todo note to connect it.
- A small comment at the top: <!-- Built by Plainline Studio for DOMAIN. Placeholders marked .todo must be filled before launch. -->`;

function brief(b) {
  const style = STYLES.find(s => s.id === b.style);
  const domain = String(b.domain || "").replace(/^https?:\/\//, "").replace(/\/.*$/, "") || "the owner's domain";
  const scan = b.scan ? JSON.stringify(b.scan) : "No website: build from the details below only.";
  return [
    `Style: ${style ? `${style.name}: ${style.look}` : "choose the best fit for this business from: " + STYLES.map(s => s.name).join(", ")}.`,
    `Domain: ${domain} (use it for canonical and Open Graph URLs).`,
    `Details Ben entered (these override the scan):\n${JSON.stringify(b.business || {}, null, 1)}`,
    b.notes ? `Ben's notes: ${String(b.notes).slice(0, 2000)}` : "",
    `What we found on their current site:\n${scan}`
  ].filter(Boolean).join("\n\n").slice(0, MAX_INPUT);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!authorized(req, res)) return;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(501).json({ error: "Add ANTHROPIC_API_KEY in Vercel to build sites" });
  const b = body(req);
  if (!b.scan && !(b.business && b.business.name)) return res.status(400).json({ error: "Scan a site or enter the business name first" });

  let r;
  try {
    r = await fetch(API, {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 24000, stream: true, system: SYSTEM, messages: [{ role: "user", content: brief(b) }] }),
      signal: AbortSignal.timeout(280_000)
    });
  } catch (e) { return res.status(502).json({ error: "Couldn't reach Claude: " + e.message }); }
  if (!r.ok) { const t = await r.text(); console.error("anthropic", r.status, t); return res.status(502).json({ error: `Claude said ${r.status}` }); }

  res.status(200);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  const reader = r.body.getReader(), dec = new TextDecoder();
  let buf = "", stop = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        if (!line.startsWith("data:")) continue;
        let ev; try { ev = JSON.parse(line.slice(5)); } catch { continue; }
        if (ev.type === "content_block_delta" && ev.delta && ev.delta.text) res.write(ev.delta.text);
        else if (ev.type === "message_delta" && ev.delta && ev.delta.stop_reason) stop = ev.delta.stop_reason;
        else if (ev.type === "error") throw new Error((ev.error && ev.error.message) || "stream error");
      }
    }
    if (stop === "max_tokens") res.write("\n<!--STUDIO_ERROR: the site was cut off at the length limit; build again or simplify -->");
  } catch (e) {
    console.error(e);
    res.write(`\n<!--STUDIO_ERROR: ${String(e.message).replace(/--/g, "")} -->`);
  }
  res.end();
};
