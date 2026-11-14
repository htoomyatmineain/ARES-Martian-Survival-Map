# Phase 1 — mission workflow

Implemented 15 November 2026.

- [x] Proposed documentation procedure for every selected site, using its existing historical sample context. Wildcat and Skinner have tailored objectives; other sites use a site-labelled field documentation procedure, not invented NASA sampling instructions.
- [x] Tools, task evidence guidance and explicit documentation-only sample policy in Mission Brief.
- [x] Departure confirmations for equipment, simulated habitat radio, return/reserve review, environmental unknowns and target access.
- [x] Confirmations reset when route, travel or budget settings change and block simulation departure until completed.
- [x] Crew can record task confirmations during science or return review. Clock completion alone does not confirm actions.
- [x] Debrief distinguishes confirmed activities, evidence notes, time completion and target-access limits. Existing supply panel shows remaining budgets.
- [x] Export retains procedure, confirmations, shared field notes, departure checks, remaining supplies and event log.

No live suit, communications, weather or radiation telemetry is introduced. Checks are human-entered simulation acknowledgements. Evidence is self-reported; no camera capture or independent verification. Notes are shared mission evidence, not individual task attachments. Local lighting, work/rest, rescue feasibility and hardware models remain for later phases. Real terrain routing is unchanged.

Validation: 82 tests passed, including incomplete-check launch blocking, export persistence, no automatic task evidence after science time, and post-science crew confirmations. Production build passed. Interactive visual verification remains to be performed in the browser.

Demo: Map → select destination → calculate verified route → Mission Brief → Review → complete departure checks → Start EVA simulation → Begin science task → pause to enter notes/confirm actions → return → Debrief → download report. Approach-only routes retain zero science time and no crew science confirmations.
