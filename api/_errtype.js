// What to log when Anthropic answers with an error: its error type, plus a hint that can never carry request text.
// The error body can quote the request, which holds visitor or client-site text, so its message is never logged.
// The hint is one fixed phrase (an account problem or bad request text) or the request field the API names
// (such as "tools.0.input_schema"), taken only from an allow-list of top-level fields.
const HINTS = [
  [/credit balance/i, "credit balance too low"],
  [/usage limit|spend(ing)? limit/i, "API usage limit reached"],
  [/surrogate|not valid JSON|invalid JSON/i, "request text is not valid JSON"],
  [/too complex/i, "response schema too complex"],
];
const FIELD = /^(model|messages|system|tools|tool_choice|output_config|thinking|max_tokens|stream|metadata|temperature|top_p|top_k)(\.[a-z0-9_]{1,40}){0,6}(?=:)/;

async function errInfo(r) {
  let e;
  try { e = (await r.json()).error; } catch { return { type: "unknown", hint: "" }; }
  const type = e && typeof e.type === "string" && /^[a-z_]{1,64}$/.test(e.type) ? e.type : "unknown";
  const msg = e && typeof e.message === "string" ? e.message : "";
  const fixed = HINTS.find(([re]) => re.test(msg));
  const field = msg.match(FIELD);
  return { type, hint: fixed ? fixed[1] : field ? "at " + field[0] : "" };
}

// The one string to log: "invalid_request_error (credit balance too low)", or the type alone.
module.exports = async function errType(r) {
  const { type, hint } = await errInfo(r);
  return hint ? `${type} (${hint})` : type;
};
module.exports.errInfo = errInfo;
