# Live Jezero navigation map

> **Current regional integration (15 November 2026):** Emergency now supports location-based tasks, workload/EVA-aware decisions, progressive trails and shared verified return overlays/metrics in both 2D and Tactical 3D. [Final checklist: 10/10; browser evidence and limitations](emergency-simulation.md). Existing Mission/Map behavior is preserved; earlier map descriptions below are historical context.

The explorer now opens with the 3D scene and a live 2D navigation panel visible together. The **Field terminal** header button switches back to the planning/suit interface. **Live 2D map** restores the map.

## Connected behavior

- The scene's `onPosition` callback is the authoritative simulated astronaut position, elevation, and heading stream.
- Every map instance uses that state; neither route percentage nor a demo timer positions the marker.
- `FreeCameraRig` publishes at its existing 150 ms cadence when position changes by over 0.1 m or heading changes by over 1 degree. Stationary turns update heading without adding walking-track points.
- Amber breadcrumbs record movement of at least 1 m, retaining up to 2,000 points per exploration session. Reset clears the track.
- Tablet camera orbit does not move the astronaut. Camera view and astronaut position remain distinct.

## Map controls

- **Jezero Crater:** source-derived 55 × 55 km CTX relief context, with the local 3D coverage and detailed terrain tile overlaid.
- **Local traverse:** the scene's HiRISE orbital image, rotated north-up, with actual simulated position, heading, guidance endpoints, and recorded track.
- **Follow:** centers the map on the astronaut as they move.
- **+/−:** zoom; **Fit:** restores the selected extent. Drag to pan; dragging exits follow mode.
- **Grid:** toggles a geographic coordinate grid.
- Click a point to inspect its Mars coordinates. This does not teleport the astronaut or establish traversability.

## Coverage and limits

The 2D context spans the crater. The existing 3D terrain covers approximately 4.4 × 3.6 km, rotated in its documented local frame, with a 512 m HiRISE detail tile. This change does not create a full-crater 3D terrain model or alter terrain/Blender assets. The scope choice to expand 3D coverage remains open.

The cyan guidance line represents the existing simulated outbound/return behavior. It is not a validated safe walking route. CTX context relief, HiRISE imagery, simulation markers, and telemetry retain separate meanings.

## Verification

`npm test` includes coordinate alignment with the 3D transform, north-up raster placement, whole-crater registration, inverse map inspection, and bounded movement tracking. Browser checks confirmed position updates during guided traversal and heading updates during a stationary camera turn.
