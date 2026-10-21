// Studio step 2 (engine path): turn a scan of a business's site into a site profile.
// The engine (studio-engine.js) renders the profile into the new website and the owner dashboard,
// so Claude only writes facts and structure here, not page code. Streams a heartbeat while Claude works
// so the request stays under the function time limit, then sends the profile as the last line.
const { authorized, body } = require("./_studio");
const Engine = require("../studio-engine.js");

const MODEL = process.env.STUDIO_MODEL || "claude-sonnet-5-5";
const API = (process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com") + "/v1/messages";
const MAX_INPUT = 60_000;

const SYSTEM = `You are Plainline's site planner. You read what was scraped from a local business's current website and fill in a site profile. A fixed, reviewed template turns the profile into their new website and an owner dashboard, so you choose content and structure only.

Facts (never break these):
- Use only facts in the scan: names, services, products, prices, hours, phone, address, team, clients, awards, dates, years in business. Never invent any of them.
- Where the template needs a fact you don't have, write the string "ADD: <what's needed>" (for example "ADD: starting price"). Ben fills these in. List each one in todos too.
- Write copy in the business's own voice, shortened and made easier to read. You may tighten their sentences; you may not add claims.
- Never include an email address anywhere. Include a phone number only if the business publishes it on their site.
- Photos: use only image URLs that appear in the scan, exactly as given. Put each photo where its page, alt text or file name shows it belongs. Skip logos, icons, badges, maps and stock-looking images. No photo is better than a wrong one.
- Reviews or testimonials: leave them out unless quoted word for word in the scan.

Structure:
- collections: 1 to 3 groups of things the business shows or sells (a photographer: Sports, Portraits; a plumber: Services; a restaurant: Menu, Events). Each item becomes its own page with its own link, so split by what a customer would want to send or bookmark.
- pricing.lanes: include lanes when the site lists prices or the business sells packages; startingAt only from the scan, otherwise "ADD: starting price". Leave lanes empty when pricing isn't how they sell.
- booking.types: the 2 to 4 kinds of request a customer makes, each with up to 3 extra fields that help the owner quote. Set minors true if they serve students, kids or seniors in school.
- owner.jobWord: what the owner calls one piece of work (shoot, job, appointment, order, event). owner.stages: 5 to 7 steps from first request to paid.
- look: "studio" for photo-led or premium businesses, "grid" for trades and services, "backstage" for night, emergency or nightlife businesses. voice: "bold" (sports, trades, energy), "clean" (most services, health, tech), "warm" (food, family, hospitality, weddings). accent: their main brand color from the scan's colors if one fits, else a color that suits the trade, as #RRGGBB.
- hero.lines: 2 or 3 short lines (max 4 words each) that say what they do; highlight: one word or phrase from those lines.

Return the profile by calling the save_profile tool once.`;

const S = { type: "string" };
const photo = { type: "object", properties: { src: S, alt: S }, required: ["src"] };
const TOOL = {
  name: "save_profile",
  description: "Save the site profile for this business.",
  input_schema: {
    type: "object",
    properties: {
      business: { type: "object", properties: { name: S, kind: S, city: S, region: S, domain: S, tagline: S, socials: { type: "array", items: { type: "object", properties: { label: S, url: S } } } }, required: ["name"] },
      look: { type: "string", enum: Engine.LOOKS }, voice: { type: "string", enum: Engine.VOICES }, accent: S,
      hero: { type: "object", properties: { eyebrow: S, lines: { type: "array", items: S }, highlight: S, lede: S, cta: S, photos: { type: "array", items: photo } } },
      collections: { type: "array", items: { type: "object", properties: { id: S, title: S, blurb: S, items: { type: "array", items: { type: "object", properties: { id: S, title: S, kicker: S, line: S, photos: { type: "array", items: photo } }, required: ["title"] } } }, required: ["title", "items"] } },
      recent: { type: "object", properties: { title: S, photos: { type: "array", items: photo } } },
      proof: { type: "object", properties: { title: S, items: { type: "array", items: S } } },
      about: { type: "object", properties: { title: S, photo, paragraphs: { type: "array", items: S }, why: { type: "array", items: { type: "object", properties: { title: S, text: S } } }, timeline: { type: "array", items: { type: "object", properties: { when: S, text: S } } }, signoff: S } },
      pricing: { type: "object", properties: { intro: S, lanes: { type: "array", items: { type: "object", properties: { id: S, name: S, who: S, startingAt: S, items: { type: "array", items: S } } } }, note: S } },
      contact: { type: "object", properties: { phone: S, address: S, hours: { type: "array", items: S }, serviceArea: S } },
      booking: { type: "object", properties: { title: S, intro: S, steps: { type: "array", items: S }, minors: { type: "boolean" }, types: { type: "array", items: { type: "object", properties: { id: S, label: S, fields: { type: "array", items: { type: "object", properties: { id: S, label: S, kind: { type: "string", enum: ["text", "number", "date", "select"] }, options: { type: "array", items: S } } } } } } } } },
      owner: { type: "object", properties: { jobWord: S, stages: { type: "array", items: S } } },
      todos: { type: "array", items: S }
    },
    required: ["business", "look", "voice", "hero", "collections", "booking", "owner"]
  }
};

// Keep the parts of the scan the planner needs; drop the rest to stay well under the input limit.
function brief(b) {
  const scan = b.scan || {}, site = scan.site || {};
  const slim = {
    domain: scan.domain, url: site.url, title: site.title, description: site.description, siteName: site.siteName,
    logo: site.logo, shareImage: site.shareImage, headings: site.headings, phones: site.phones, social: site.social,
    colors: site.colors, structured: site.structured, images: site.images, text: site.text,
    pages: (scan.pages || []).map(p => ({ url: p.url, title: p.title, headings: p.headings, images: p.images, text: p.text, structured: p.structured }))
  };
  return [
    b.notes ? `Ben's notes (follow these): ${String(b.notes).slice(0, 2000)}` : "",
    `Scan of ${scan.domain || "their site"}:\n${JSON.stringify(slim)}`
  ].filter(Boolean).join("\n\n").slice(0, MAX_INPUT);
}

// The rules in SYSTEM are also enforced here, so a model mistake can't reach the page:
// photos must be URLs that were actually on their site, and no email address survives anywhere.
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
function enforce(profile, scan) {
  const seen = new Set();
  const add = u => { if (typeof u === "string" && u) seen.add(u); };
  const site = scan.site || {};
  add(site.logo); add(site.shareImage);
  [site, ...(scan.pages || [])].forEach(p => (p.images || []).forEach(i => add(i && i.src)));
  const hasEmail = v => /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(String(v || ""));
  const keep = list => list.filter(ph => ph && seen.has(ph.src) && !hasEmail(ph.src));
  profile.hero.photos = keep(profile.hero.photos);
  profile.recent.photos = keep(profile.recent.photos);
  profile.collections.forEach(c => c.items.forEach(it => { it.photos = keep(it.photos); }));
  if (profile.about.photo && (!seen.has(profile.about.photo.src) || hasEmail(profile.about.photo.src))) profile.about.photo = null;
  // Links and the domain come from the scan, not from text on their pages (which could carry injected instructions).
  const socials = new Set(site.social || []);
  profile.business.socials = profile.business.socials.filter(x => socials.has(x.url) && !hasEmail(x.url));
  if (scan.domain) profile.business.domain = String(scan.domain).toLowerCase();
  const launch = "Before launch: connect the booking form (Supabase + Resend), add a privacy page, and move photos off their old host";
  if (!profile.todos.includes(launch)) profile.todos.push(launch);
  const scrub = v => typeof v === "string" ? v.replace(EMAIL, "").replace(/\s{2,}/g, " ").trim() : Array.isArray(v) ? v.map(scrub) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === "src" || k === "url" ? x : scrub(x)])) : v;
  return scrub(profile);
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
  if (!authorized(req, res)) return;
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return res.status(501).json({ error: "Add ANTHROPIC_API_KEY in Vercel to build sites" });
  const b = body(req);
  if (!b.scan || !b.scan.site) return res.status(400).json({ error: "Scan their site first" });

  let r;
  try {
    r = await fetch(API, {
      method: "POST",
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 8000, stream: true, system: SYSTEM, tools: [TOOL], tool_choice: { type: "tool", name: "save_profile" }, messages: [{ role: "user", content: brief(b) }] }),
      signal: AbortSignal.timeout(280_000)
    });
  } catch (e) { return res.status(502).json({ error: "Couldn't reach Claude: " + e.message }); }
  if (!r.ok) { console.error("anthropic", r.status, await r.text()); return res.status(502).json({ error: `Claude said ${r.status}` }); }

  res.status(200);
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  const reader = r.body.getReader(), dec = new TextDecoder();
  let buf = "", json = "", stop = "", beat = 0;
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
        if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "input_json_delta") json += ev.delta.partial_json;
        else if (ev.type === "message_delta" && ev.delta && ev.delta.stop_reason) stop = ev.delta.stop_reason;
        else if (ev.type === "error") throw new Error((ev.error && ev.error.message) || "stream error");
      }
      if (++beat % 20 === 0) res.write(" "); // heartbeat so the connection stays open
    }
    if (stop === "max_tokens") throw new Error("The profile was cut off at the length limit. Try again");
    let raw; try { raw = JSON.parse(json); } catch { throw new Error("Claude didn't return a usable profile. Try again"); }
    const profile = enforce(Engine.sanitize(raw), b.scan);
    delete profile._tokens; delete profile._slug; // the browser re-derives these when it renders
    res.write("\n" + JSON.stringify({ profile }));
  } catch (e) {
    console.error(e);
    res.write("\n" + JSON.stringify({ error: String(e.message || e) }));
  }
  res.end();
};
