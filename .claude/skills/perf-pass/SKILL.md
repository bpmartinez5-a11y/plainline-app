---
name: perf-pass
description: "Performance pass on the site, demo and API. Measures first, then fixes the biggest wins (load time, layout shift, heavy scripts, repaints, caching headers, API latency) without changing what the pages do."
---
# Performance pass

1. **Measure.** Run the `perf-engineer` subagent. Include the Vercel preview URL if there is one.
2. **Pick the work.** Choose the top 3 wins by visitor impact per minute of work. Skip anything under 5% gain, or anything that needs a bundler or framework, unless Ben asks for it.
3. **Apply each win as its own small diff**: image dimensions and lazy loading, `defer` on scripts, passive listeners, clearing intervals, cache headers in `vercel.json`, a smaller `max_tokens` or prompt in the API.
4. **Verify behavior is unchanged.** Pages look the same at 400px and desktop, the demo still replies, and `node --check` passes. Re-measure sizes and compare before and after.
5. **Review** with the review gate (`reviewer`, then `refuter`).
6. **Report.** A before/after table, what changed, and scaling notes for later (e.g. moving the rate limit to shared storage when traffic justifies it).
