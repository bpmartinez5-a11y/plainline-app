# api/

- `chat.js` is a Vercel serverless function: POST builds a prompt and calls Claude; GET reports whether AI is on.
- Model comes from `ANTHROPIC_MODEL` (default `claude-haiku-5-5`). Keep the demo on a Haiku-class model; it's a cost-capped public endpoint.
- Without `ANTHROPIC_API_KEY` it returns 501 and the demo falls back to built-in replies. Over the per-IP limit it returns 429; an upstream failure returns 502. Keep all three fallbacks working.
- Rate limit is per warm instance (soft). The real cap is the spend limit on the API key.
- Never log or echo the API key or full visitor messages.
