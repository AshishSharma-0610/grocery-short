# Shot plan: "The Half-Empty Cart"

Voice-over (11.89 s, 357 frames @ 30 fps). Every frame number below is derived from `voice/words.json`
(source: energy-estimate); `npm run sync` regenerates them and the picture follows automatically.

> Grocery stores doubled their cart sizes, not for your convenience... but because a half-empty cart tricks your brain into
> buying forty percent more food. Swapping the cart for a small hand basket.

World: a bright supermarket entrance + aisle running away from camera to a glass storefront. Hero = a shopper (teal jacket) and her
shopping cart; antagonist = the store manager (blue vest, moustache). Colour story: day interior (cool haze, warm sun patches) for the
trick, **golden hour backlight through the storefront glass** for the payoff (light change = story beat, like the reference shorts).

| # | frames | words | what we see | camera | lens / light | action + FX | sound |
|---|---|---|---|---|---|---|---|
| 1 | f0-78 (2.63 s) | "Grocery stores doubled their cart sizes" | Shopper behind a normal cart; nest of old small carts for scale. On **"doubled"** the cart swells (~4x volume, overshoot bounce); the 4 items she had now look lost. | wide low 3/4 slow push -> glide to MS on "doubled" (roll -2.3 deg) -> closer on "sizes" (roll +2.3) | DOF cInf 12-14, focus on her eyes; day | face: smile -> shock ("doubled") -> nervous ("sizes"); burst + dust puffs at the landing; 7 f kick | cart wheels, boing + whoosh on the swell, metal clatter on landing, **ka-ching** on the flash cut |
| 2 | f79-120 (1.40 s) | "not for your convenience" | Manager rubs his hands, grinning; the shopper, far behind him, smiles thankfully (irony). | hard cut; MS 46 deg fov, push-in -> glide closer on "convenience" | foreground produce table blurred bottom-left; focus on manager's eyes | manager grin -> laugh on "convenience", glint star | hands-rub noise (2.4 Hz = animation rate), glint ting |
| 3 | f121-197 (2.57 s) | "but because a half-empty cart tricks your brain" | The big cart holds only 4 items. Cut into the cart on "half-empty". Cut to her face on "tricks": dashed phantom items appear in the empty half; on "brain" a pink brain pulses over her head; eyes go to spirals. | MS -> hard cut high into the cart (roll -2 deg) -> hard cut CU face (roll +2.3, punch push) | DOF on cart interior then on her eyes | phantom items (dashed lavender) fade in one by one; brain wobble + rays | hollow can knock, pings per phantom item, rising shimmer, brain wobble |
| 4 | f198-277 (2.67 s) | "into buying forty percent more food" | Ten products arc from both shelves into the cart, two per word; each landing pops a star burst and squashes. On **"food"** the cart overflows (big burst, kick). | high wide (sharp, readable) -> low glide with roll +2.9 deg on "forty percent" -> hard cut CU of the overflowing cart | DOF 0 -> 8 -> 12 | items land exactly on the word onsets; cart fills 4 -> 14 | whoosh + thump + clink + pop per item, overflow thump/rattle, cymbal |
| 5 | f278-356 (2.63 s) | "Swapping the cart for a small hand basket." | **Golden hour.** She strolls out toward camera with a small red basket (apple, bread, milk). Behind her a queue of shoppers wrestles overflowing carts. Callback twist: she is the only calm one. | low MS -> glide to the basket on "small" -> 52 f crane out/up over the queue on "basket" | crossfade 8 f from the day light, backlit golden, real card shadows, DOF 10-12 then 0 | basket swing, glints on the last word; face smile -> grin -> laugh | door chime, her steps (2.5/s), queue wheels, final glint, scanner *bip* |

Cut frames: 79 / 121 / 198 / 278. White flash: 4 frames at f79. Crossfade into the golden light: 8 frames around f278.

## Props, characters, world (all procedural, no model files)
* Cart: wire basket, red grip + seat flap, chassis and wheels; built at the old size and scaled to the big one on "doubled".
* Gondola shelves with painted product blocks, ceiling light strips (HDR, they bloom), hanging aisle signs with pictograms, produce tables,
  checker floor, painted wall murals (apple, carrot, milk, bread), glass storefront with mullions.
* Characters: flat 2D cards in the reference drawing system (`toon.ts`): bean head, stick limbs, ink-dot hands. New: the **rub** and
  **basket** props, three outfits (shopper, manager, queue extras) and three effect cards (brain, phantom item, glint).
