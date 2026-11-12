// What to log when Anthropic answers with an error: its error type, plus a hint that can never carry request text.
// The error body can quote the request, which holds visitor or client-site text, so its message is never logged.
// The hint is one fixed phrase (an account problem or bad request text), the request field the API names
// (such as "tools.0.input_schema"), taken only from an allow-list of top-level fields, or, when neither fits,
// which words from a fixed list the message uses ("mentions organization, disabled"). No other text ever leaves.
const HINTS = [
  [/credit balance/i, "credit balance too low"],
  [/usage limit|spend(ing)? limit/i, "API usage limit reached"],
  [/surrogate|not valid JSON|invalid JSON/i, "request text is not valid JSON"],
  [/too complex/i, "response schema too complex"],
  [/organi[sz]ation (has been |is )?(disabled|suspended|deactivated)/i, "organization disabled"],
  [/prompt is too long|context (window|length)/i, "prompt too long"],
];
const FIELD = /^(model|messages|system|tools|tool_choice|output_config|thinking|max_tokens|stream|metadata|temperature|top_p|top_k)(\.[a-z0-9_]{1,40}){0,6}(?=:)/;
const WORDS = ["organization", "workspace", "model", "region", "permission", "access", "disabled", "verify", "terms", "key", "billing", "beta", "effort", "thinking",
  "schema", "property", "properties", "required", "enum", "nest", "depth", "grammar", "format", "exceed", "limit", "support", "unsupported"];
const mentions = msg => { const w = WORDS.filter(x => new RegExp("\\b" + x, "i").test(msg)).slice(0, 6); return w.length ? "mentions " + w.join(", ") : ""; };

// e is the "error" object of an error body or of a stream "error" event.
function describe(e) {
  const type = e && typeof e.type === "string" && /^[a-z_]{1,64}$/.test(e.type) ? e.type : "unknown";
  const msg = e && typeof e.message === "string" ? e.message : "";
  const fixed = HINTS.find(([re]) => re.test(msg));
  const field = msg.match(FIELD);
  const hint = fixed ? fixed[1] : [field && "at " + field[0], mentions(field ? msg.slice(field[0].length) : msg)].filter(Boolean).join("; ");
  return { type, hint };
}
async function errInfo(r) {
  try { return describe((await r.json()).error); } catch { return { type: "unknown", hint: "" }; }
}

// The one string to log: "invalid_request_error (credit balance too low)", or the type alone.
module.exports = async function errType(r) {
  const { type, hint } = await errInfo(r);
  return hint ? `${type} (${hint})` : type;
};
Object.assign(module.exports, { errInfo, describe });
