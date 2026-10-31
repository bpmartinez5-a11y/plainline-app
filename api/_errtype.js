// What to log when Anthropic answers with an error: its error type only (e.g. "overloaded_error").
// The error body can quote the request, which holds visitor or client-site text, so it is never logged whole.
module.exports = async function errType(r) {
  try { const t = (await r.json()).error.type; return /^[a-z_]{1,64}$/.test(t) ? t : "unknown"; } catch { return "unknown"; }
};
