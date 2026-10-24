---
name: build-ui
description: "Build production-grade, reusable, accessible UI for Plainline pages and client kits, in the card-kit style. Handles loading, empty, error and edge states, responsive layout and accessibility, with a clear options API and usage examples."
---
# Build UI the senior-frontend way

**Style rules (from the card kit):** real-looking UI cards built from the client's own data, one accent color per client, neutral everything else. Use documentary Higgsfield photos only as tinted backdrops. No AI faces or robot art, and no Plainline prices; the call to action is "Book a walkthrough".

1. **Define the component.** Its name, the data it takes (its "props", written as a plain JS object, like the card-kit profile) and where it's used.
2. **Build it** as a function that returns HTML from data, with escaped text and no `innerHTML` of raw user or model text. Styles use CSS variables (tokens) so a client's accent swaps in one place.
3. **Handle every state:**
   - loading (skeleton or "replying…")
   - empty (what will appear and how to start)
   - error (what happened and what to do)
   - long text (wraps or truncates, never overflows)
   - many items, and zero items
4. **Responsive:** works at 400px with no sideways scroll; flex and grid with `gap` and `min-width: 0` on text children.
5. **Accessible:**
   - Real `<button>`s and links, a visible focus ring, and labels on icon buttons.
   - Contrast of at least 4.5:1, and `prefers-reduced-motion` respected.
   - Swipe areas also work with arrow keys and buttons.
6. **Usage example.** Show one call with sample data marked "values illustrative".
7. **Verify** at 400px and desktop in light and dark, then run the review gate (`reviewer`, then `refuter`).
