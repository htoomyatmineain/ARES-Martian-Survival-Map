# Explicit return routing — 15 November 2026

- Return search runs in a worker from the actual outbound endpoint (including an approach point) to the habitat, under the same configured terrain/exclusion rules.
- Both outbound and return paths receive native 1 m elevation-profile checks. The current Mission UI requires a verified connected return before departure. Return failure leaves no launchable route.
- Round-trip time and simplified supply budgets use outbound time + independently calculated return time + science time. Same assumed speed applies in both directions.
- Blue dashed line previews return in 2D. At endpoint return, both map modes display the return corridor and simulation position follows that path.
- An early abort retraces only the already-traversed outbound corridor. It does not teleport to the destination or to the precomputed endpoint-return path.
- During outbound travel, reserve monitoring conservatively scales the larger of endpoint-return and outbound travel time; this is a static-map demo policy, not a route-wide operational contingency certification.
- Reports retain the return route, profile, timing and events in the locked mission snapshot.

Limits: routes can overlap under the symmetric static terrain model. No changed-hazard feed, automatic dynamic replanning, direction-dependent speed, or independently verified walking route is added. The walk-back card is explicitly labelled an endpoint-only scenario; rover failure at every route point is not yet assessed. Earlier screenshots/reports describing automatic retracing for every return are superseded for new endpoint-return plans.

Validation: 84 tests pass; production build passes. Tests cover required return, disconnected/unverified return rejection, different return distance in the budget, distinct return geometry, completion at habitat and partial-route early abort. Browser visual and real-data end-to-end checks remain to be performed.
