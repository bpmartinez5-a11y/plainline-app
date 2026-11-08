---
name: tactile-ui
description: "Make Plainline and client UI feel like real objects (keys that sink, hold-to-delete, a request slip that prints) instead of AI-template UI. Use when building or reviewing buttons, destructive actions or confirmations in studio-engine.js, Plainline pages or client builds."
---
# Tactile UI

The idea comes from "The Kitchen" by dqnamo (https://www.dqnamo.com/kitchen, Ben's video, Nov 8, 2026). Their code has no license. **Never copy their code.** Copy the idea only, and write our own plain CSS and JS. Enforcer note: `/mnt/project-files/security/enforcer/2026-11-08-kitchen-tactile-ui.md`.

## The rules
1. One real-world object per interaction. The object must explain the action: a key sinks, a fuse fills, a receipt prints. No decoration for its own sake.
2. Keep it small. CSS first, a few lines of JS at most, no library, no new dependency.
3. Every motion respects `prefers-reduced-motion` (studio-engine's shared CSS turns motion off). The action must still work without the motion.
4. Every interaction works with a keyboard and on touch.
5. Honest states. A slip, receipt or "done" mark never says something was sent, paid or saved when it was not.

## The patterns (already in `studio-engine.js`)
| Pattern | Use it for | Where |
|---|---|---|
| Tactile press: the button sinks 1px and loses its bottom edge on `:active` | Every call to action (`.btn`, `.chipbtn`) | Site and dashboard CSS |
| Hold to confirm: red fills the button over 1.2 s; it fires only on a full hold (mouse, touch, or Enter/Space held); then the toast offers Undo for 5 s | Anything that removes data. Add `class="hold"` to the button and a function to `HOLD[id]` | Owner dashboard: Delete, Clear examples, Reset site edits |
| Printed slip: the confirmation prints out of the form in steps, with a summary of what was sent and a torn edge | Form confirmations, bookings | Site booking form (`#ok`) |

## Ideas not built yet (build only when a client job needs one)
- Dynamic button: the button width animates when its label changes ("Save" to "Saved").
- Magnetic drop zone: a file target that leans toward a dragged file (owner dashboard photo upload).
- Ticket or stamp frame for event and booking cards.

## Checks before you ship
- `node --test tests/*.test.js` passes.
- Playwright: a short click does nothing on a hold button; a full hold acts; Undo restores.
- Run the review gate (`reviewer`, then `refuter`).
