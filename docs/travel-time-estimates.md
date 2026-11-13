# Rover and walking travel estimates

Added 13 November 2026 to the regional route-data card in both map views.

Default mode is **crewed rover**, using an editable assumed average of **5 km/h** (83.333 m/min). Suited walking defaults to **2 km/h** (33.333 m/min). Each mode retains its edited speed while switching; this selection changes the estimate only, not the route search or slope rules.

```text
metres per minute = kilometres per hour × 1000 / 60
one-way moving minutes = verified route metres / metres per minute
```

Use average speed, not minimum distance covered per minute or maximum design speed. The full native-profile route distance is used before display rounding. Show no ETA until the route profile is verified. Invalid, missing, nonpositive or nonfinite speed/distance produces no estimate. Positive durations round up to a whole Earth minute, displayed as hours/minutes; zero distance shows zero minutes. This is elapsed duration, not Mars local arrival-clock time.

The estimate excludes stops, science work, rests, return travel and any explicit slope-, soil-, obstacle-, fatigue- or weather-dependent slowdown. Users should choose an average appropriate to their assumed conditions. It is not an EVA feasibility, life-support or vehicle traversability assessment.

## Why these defaults

- **5 km/h rover:** our illustrative crewed vehicle average, not a NASA Mars standard, measured value, guaranteed minimum, or Perseverance speed. [NASA's Apollo rover performance abstract](https://ntrs.nasa.gov/citations/20250011301) distinguishes theoretical design speed (9–13 km/h) from lower actual as-traversed average speeds. It does not establish our chosen 5 km/h default.
- **2 km/h walking:** a lunar planning analogy from [NASA EVA-EXP-0042 Rev B, 19 October 2020, PDF page 40](https://www.nasa.gov/wp-content/uploads/2017/02/eva-exp-0042_xeva_system_con_ops_rev_b_final_dtd_10192020_ref_doc.pdf#page=40). Its assumptions describe relatively level regolith and omit slope/obstacle effects; some walk-back parameters are marked to be resolved. PDF page 41 identifies Mars walk-back ranges as future work. This does not validate a 2 km/h suited Mars pace.

The interface labels these limitations and links both references. Neither source supplies validated operating characteristics for the hypothetical Mars crewed rover in this app. A future mobility model must define the rover and suit before assigning separate traversability or terrain-speed rules.

## Example and checks

For the current slope-priority route of 10,052.545 m:

| Mode | Assumed speed | Calculated moving time | Display |
|---|---:|---:|---|
| Crewed rover | 5 km/h | 120.631 minutes | 2 h 1 min |
| Suited walking | 2 km/h | 301.576 minutes | 5 h 2 min |

For distance priority (8,263.671 m), defaults give 1 h 40 min by rover or 4 h 8 min walking. These estimates do not imply either traverse is operationally safe.

Tests check unit conversion, distinct modes, actual unrounded route length, distance/speed scaling, invalid input, zero distance and duration rounding. Browser verification checks default rover selection, walking, custom speeds and unavailable ETA for invalid speed. No additional terrain downloads or Supabase storage are introduced by the estimator.
