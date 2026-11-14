# Science-site integration — 2026-11-12

The regional workspace now includes independently selectable Skinner Ridge / Skyland (S1) and Wildcat Ridge / Hazeltop (S2). Labels are offset with leader lines because the reported positions are about 23.57 metres apart. Selection does not change the simulated base, demo destination or route.

The science layer has a visibility switch, sidebar selection, 2D zoom, keyboard selection and Escape-to-close. Shared site records also supply 3D HTML markers; 3D appearance could not be validated in the available browser because WebGL is unavailable.

Coordinates and sample descriptions come from the teammate handoff in `source-data/Science location handoff`. The UI links NASA context and PDS reports. Coordinates remain provisional: the reported latitude convention, vertical datum compatibility and quantitative CTX–HiRISE registration are unresolved.

`node scripts/verify-science-coverage.mjs` independently sampled the downloaded native NASA raster chunks and reproduced both valid elevation and imagery samples. Its output is `src/data/science-site-coverage.json`. This establishes pixel availability under the documented coordinate assumption, not absolute position or height accuracy.

The displayed regional terrain remains the existing 20 m CTX elevation grid and 6 m imagery. This change does not integrate the full-resolution HiRISE rasters or certify astronaut EVA routes.

Validation: 23 unit tests passed; TypeScript and production/offline build passed. Browser checks covered both site details, zoom, layer visibility, keyboard selection, Escape, unchanged route values, and desktop/mobile popup layout.
