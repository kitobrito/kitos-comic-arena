Pose art for the Experimental Battlefield. Each file is named after a render (the names in the
render packs) plus the pose: `charmander-attack.png`, `iron-man-hit.png`, `magikarp-gyarados-ko.png`.

- attack: winding up or striking (shown while the fighter attacks)
- hit: flinching (shown for a moment when the fighter takes damage)
- ko: knocked down (shown from the knockout until the fighter is revived)

Use the same canvas size as the render with the character in the same spot, on a transparent
background. Then run `node scripts/build-scene-poses.js`. A character with no pose file keeps
its normal movement.
