# Style checklist: where each rule of the skill lives, and what to look at in your stills

Run `npm run stills` (about a minute), open `out/stills/*.png` next to `skill/references/frames/` and tick these off.
Values come from `skill/references/reports/*.md` (measured on the reference shorts) and are already built into the engine files.

| Rule (reference measurement) | Where it is in this project | What to check |
|---|---|---|
| 2D bean characters in a 3D world: 3.5 head-heights, thin stick limbs, ink-dot hands, plum outline thicker on the shadow side, deadpan lidded eyes, no blush | `toon.ts` (unchanged character system) + new outfits/props at the top and bottom | characters are flat cards that stay upright, always face the camera (yaw-only billboards) |
| World ink: ~3 px geometry-edge lines, near-constant width with distance, plum not black | `ink.ts` (InkPass, unchanged) | shelves, cart bars, tiles have thin dark outlines; no lines on the cards or effects (NOINK layer) |
| Two-tone world shading: warm lit side, violet-blue shadow, coloured darks, painted (not photographic) | `shade.ts` + `lights.ts` + palette in `store.ts` (`PAL`) | no pure black anywhere; shadows are blue-violet; sun patches fall across the floor |
| Camera-relative sun frozen per shot (day: 75 deg right / 48 up; golden: 6 deg ahead / 7 up = backlight) | `lights.ts`, `World.shotSun` | day shots lit from screen-right; shot 5 backlit with long shadows toward camera |
| Depth of field on about a third of the screen time, focus on the eyes, near props blurred | `story.ts` `DOF`, `lensblur.ts` | shot 1 hook shelves soft; produce table in shot 2 blurred; shot 4 high wide sharp |
| Haze matches the horizon; saturated but never neon | `lights.ts` fog, `grade.ts` | far aisle fades to pale periwinkle; glass is the brightest thing (bloom, emissive only) |
| Camera never dead still: push-in on every hold (0.15-0.35 %/f, ~0.6 %/f for 35 f on punch words) | `story.ts` `pushK`, `CAMS` | slow constant creep on holds |
| Moves are 18-40 f symmetric smootherstep glides; big reframes are hard cuts; rolls 4-5 deg on emphasis | `story.ts` `glide`, `CAMS` | 5 hard cuts, 3 glides, rolls on "doubled", "convenience", "half-empty", "tricks", "forty" |
| Impact = 7-frame kick that flips sign every frame | `story.ts` `kickAt` | kicks at the cart landing, on "food", on the last word |
| Reactions land 0-3 f BEFORE their word; a blink hides every expression swap | `story.ts` `LEAD`, `shopperExpr`, `cast.ts` `lidAt` | shock is already on her face when "doubled" is heard |
| Hook = wide establishing shot; light/place change at the story turn; 4-frame white flash after the hook | `story.ts` `FLASH_AT`, `XFADE`, shot 5 `golden` | flash on the cut to the manager; golden crossfade at "Swapping" |
| Literal illustration of every phrase; no captions or labels in the picture | whole `store.ts` / `cast.ts` | no text anywhere (pictograms only) |
| Original score, synthesised SFX, voice on top (voice -16 LUFS, programme -14.5 LUFS, true peak <= -1.2 dBTP) | `audio/` | `npm run sync` prints the levels; cues are listed in `audio/out/cues.md` |

If a still looks off, the tuning knobs are: camera positions in `story.ts` (`S1a ... S5c`, run `npm run framing` after editing),
colours in `store.ts` (`PAL`, `PROD`), light values in `lights.ts`, characters in `toon.ts` (`SHOPPER`, `MANAGER`, `EXTRAS`).
