Pose art for the Experimental Battlefield. Each file is named after a render (the names in the
render packs) plus the pose: `charmander-attack.png`, `iron-man-hit.png`, `magikarp-gyarados-ko.png`.

- attack: winding up or striking (shown while the fighter attacks)
- hit: flinching (shown for a moment when the fighter takes damage)
- ko: knocked down (shown from the knockout until the fighter is revived)

More frames of one pose are numbered and play in order: `rick-grimes-attack.png` (aim),
`rick-grimes-attack-2.png` (fire), `rick-grimes-attack-3.png` (pump the shotgun).

Use the same canvas size as the render with the character in the same spot, on a transparent
background. Then run `node scripts/build-scene-poses.js`. A character with no pose file keeps
its normal movement.

Art drawn at another size or reaching past the render (a muzzle flash, a body lying down) gets a
`box` in `poses.json`: [left, top, width, height] as fractions of the render's canvas.
