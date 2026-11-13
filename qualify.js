/* Who gets a walkthrough (Ben, Nov 13: "qualify the leads before I even see the traffic"). One file for the page
   (index.html loads /qualify.js for the contact form and the walkthrough chat) and the server (api/lead.js writes
   the answer as the first lines of the saved request), so the page and the saved request always agree.
   - fit: the page shows the booking page right away, and the Event runner emails the booking link too.
   - check: the page says we reply within 24 hours; the Lead inbox keeper reads the company's public site first.
   - no: the page says why, no booking page, and no agent works on it.
   The rules and what each agent does with each answer: project files plainline/website/README.md. Change the three
   together, with tests/qualify.test.js. No price, rate or amount ever goes in a label. */
(function (root) {
  const ASK = [
    ["role", "Your role", { owner: "Owner or partner", manager: "Manager", staff: "Office manager or other employee", vendor: "Selling something to Plainline", job: "Looking for work" }],
    ["area", "Where is the business?", { kc: "Kansas City metro", us: "Elsewhere in the US", away: "Outside the US" }],
    ["size", "Team size", { solo: "Just me", small: "2 to 5 people", mid: "6 to 20 people", big: "21 to 100 people", large: "More than 100 people" }],
    ["kind", "Kind of business", { home: "Home services (HVAC, plumbing, electrical)", auto: "Auto repair, tires or detailing", salon: "Salon, studio or gym",
      health: "Health, dental or vet", office: "Law or other office", food: "Restaurant or retail", build: "Construction or trades",
      money: "Bank, lender, insurance or investments", other: "Something else" }],
    ["when", "How soon do you want this running?", { month: "This month", quarter: "This quarter", looking: "Just looking" }]
  ];
  // Not a fit: [the reason saved for Plainline, what the visitor reads, a page they can go to: [address, its name]]. Plainline never
  // works with financial firms. Ben, Nov 13 (10c): someone looking for work gets the seller page.
  const NO = {
    "kind.money": ["financial services", "Plainline doesn't work with banks, lenders, insurers or investment firms."],
    "area.away": ["outside the US", "Plainline works only with businesses in the US for now."],
    "role.vendor": ["selling to us", "This form is for businesses that want Plainline's help, so there's no walkthrough to book."],
    "role.job": ["looking for work", "This form is for businesses that want Plainline's help. To work with Plainline, start here:", ["/sell", "Sell with Plainline"]]
  };
  // A person checks these first (the Lead inbox keeper reads the company's site). Everything else is a fit.
  // Ben, Nov 13: elsewhere in the US stays a check (1c); one person (2a) and an employee (5a) are a fit; "Just looking" waits (4a).
  const CHECK = { "area.us": "outside the Kansas City metro", "kind.other": "kind of business not listed", "when.looking": "just looking" };

  // A US phone number as (913) 555-0100, or "" when it isn't one. Ben, Nov 13 (7a): the phone number is required.
  function phone(v) {
    const d = typeof v === "string" && v.length <= 40 ? v.replace(/\D/g, "") : "", n = d.length === 11 && d[0] === "1" ? d.slice(1) : d;
    return /^[2-9]\d\d[2-9]\d{6}$/.test(n) ? `(${n.slice(0, 3)}) ${n.slice(3, 6)}-${n.slice(6)}` : "";
  }
  // A public website as https://host/path, or "" when it isn't one: http or https, a named host with a dot, no sign-in
  // and no port, no spaces. Ben, Nov 13 (6b): the website is optional, with a "We don't have a website" box.
  function site(v) {
    let s = typeof v === "string" ? v.trim() : "";
    if (!s || s.length > 200 || /\s/.test(s)) return "";
    if (!/^https?:\/\//i.test(s)) s = "https://" + s;
    try {
      const u = new URL(s);
      return /^https?:$/.test(u.protocol) && !u.username && !u.password && !u.port
        && /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i.test(u.hostname) ? u.href : "";
    } catch (e) { return ""; }
  }

  // answers: {role, area, size, kind, when}, each a key from ASK. contact: {company, phone, site, nosite} from the form.
  // A missing or unknown answer, or no phone number, is a "check", never a fit.
  function qualify(answers, contact) {
    const a = answers && typeof answers === "object" ? answers : {}, c = contact && typeof contact === "object" ? contact : {};
    const no = [], check = [], shown = [];
    for (const [key, , opts] of ASK) {
      const v = typeof a[key] === "string" && Object.prototype.hasOwnProperty.call(opts, a[key]) ? a[key] : "";
      shown.push(v ? opts[v] : "not answered");
      if (!v) check.push(key + " not answered");
      else if (NO[key + "." + v]) no.push(NO[key + "." + v]);
      else if (CHECK[key + "." + v]) check.push(CHECK[key + "." + v]);
    }
    const tel = phone(c.phone), web = site(c.site) || (c.nosite === true ? "they don't have one" : "");
    const company = typeof c.company === "string" ? c.company.replace(/\s+/g, " ").trim().slice(0, 200) : "";
    if (!tel) check.push("no phone number");
    const fit = no.length ? "no" : check.length ? "check" : "fit";
    const why = no.length ? no.map(n => n[0]) : check;
    return {
      fit,
      note: no.map(n => n[1]).join(" "), // for the visitor, only when not a fit
      link: (no.find(n => n[2]) || [])[2] || "", // [address, name] of a page for the visitor, only when not a fit
      line: [`Fit: ${fit === "no" ? "not a fit" : fit}${why.length ? ` (${why.join("; ")})` : ""}`, `Answers: ${shown.join(" · ")}`,
        company && `Company: ${company}`, `Phone: ${tel || "not given"}`, `Website: ${web || "not given"}`].filter(Boolean).join("\n")
    };
  }

  const API = { ASK, qualify, phone, site };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.Qualify = API;
})(typeof window !== "undefined" ? window : globalThis);
