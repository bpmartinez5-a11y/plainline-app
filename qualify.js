/* Who gets a walkthrough (Ben, Nov 13: "qualify the leads before I even see the traffic"). One file for the page
   (index.html loads /qualify.js for the contact form and the walkthrough chat) and the server (api/lead.js writes
   the answer as the first line of the saved request), so the page and the saved request always agree.
   - fit: the page shows the booking page right away, and the Event runner emails the booking link too.
   - check: the page says we reply within 24 hours; the Lead inbox keeper reads the company's public site first.
   - no: the page says why, no booking page, and no agent works on it.
   The rules and what each agent does with each answer: project files plainline/website/README.md. Change the three
   together, with tests/qualify.test.js. No price, rate or amount ever goes in a label. */
(function (root) {
  const ASK = [
    ["role", "Your role", { owner: "Owner or partner", manager: "Manager", staff: "Employee", vendor: "Selling to Plainline or looking for work" }],
    ["area", "Where is the business?", { kc: "Kansas City metro", us: "Elsewhere in the US", away: "Outside the US" }],
    ["size", "Team size", { solo: "Just me", small: "2 to 5 people", mid: "6 to 20 people", big: "21 to 100 people", large: "More than 100 people" }],
    ["kind", "Kind of business", { home: "Home services (HVAC, plumbing, electrical)", auto: "Auto repair, tires or detailing", salon: "Salon, studio or gym",
      health: "Health, dental or vet", office: "Law or other office", food: "Restaurant or retail", build: "Construction or trades",
      money: "Bank, lender, insurance or investments", other: "Something else" }]
  ];
  // Not a fit: [the reason saved for Plainline, what the visitor reads]. Plainline never works with financial firms.
  const NO = {
    "kind.money": ["financial services", "Plainline doesn't work with banks, lenders, insurers or investment firms."],
    "area.away": ["outside the US", "Plainline works only with businesses in the US for now."],
    "role.vendor": ["selling to us or looking for work", "This form is for businesses that want Plainline's help, so there's no walkthrough to book."]
  };
  // A person checks these first (the Lead inbox keeper reads the company's site). Everything else is a fit.
  const CHECK = { "role.staff": "not the owner or a manager", "area.us": "outside the Kansas City metro", "size.solo": "one-person business", "kind.other": "kind of business not listed" };

  // answers: {role, area, size, kind}, each a key from ASK. A missing or unknown answer is a "check", never a fit.
  function qualify(answers) {
    const a = answers && typeof answers === "object" ? answers : {}, no = [], check = [], shown = [];
    for (const [key, , opts] of ASK) {
      const v = typeof a[key] === "string" && Object.prototype.hasOwnProperty.call(opts, a[key]) ? a[key] : "";
      shown.push(v ? opts[v] : "not answered");
      if (!v) check.push(key + " not answered");
      else if (NO[key + "." + v]) no.push(NO[key + "." + v]);
      else if (CHECK[key + "." + v]) check.push(CHECK[key + "." + v]);
    }
    const fit = no.length ? "no" : check.length ? "check" : "fit";
    const why = no.length ? no.map(n => n[0]) : check;
    return {
      fit,
      note: no.map(n => n[1]).join(" "), // for the visitor, only when not a fit
      line: `Fit: ${fit === "no" ? "not a fit" : fit}${why.length ? ` (${why.join("; ")})` : ""}\nAnswers: ${shown.join(" · ")}`
    };
  }

  const API = { ASK, qualify };
  if (typeof module !== "undefined" && module.exports) module.exports = API; else root.Qualify = API;
})(typeof window !== "undefined" ? window : globalThis);
