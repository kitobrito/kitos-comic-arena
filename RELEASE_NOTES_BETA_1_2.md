# Beta Version 1.2

Comic-Arena beta 1.2 expands the mission and in-game experience with special PvE unlock fights, cleaner mission entry points, admin testing support, and chat placement improvements.

## New Features

- Added the Raid on the Xenomorph Hive special PvE mission flow.
- Added mission-list fight actions for special PvE missions so players can jump into team selection and start the fight.
- Added admin bypass support for special PvE mission level requirements, making mission fight testing easier.
- Added selection and in-game mission panels for PvE unlock fights and replay access.
- Added in-game match chat with timestamps, quick emoji buttons, unread count, and opponent mute controls.
- Moved the in-game chat button under the music, SFX, skill FX, and volume controls.

## UI Sound Overhaul (New!)

- **High-Fidelity Interaction:** Replaced legacy UI sounds with a professional SFX suite for a crisper, more modern audio experience.
- **Improved Feedback:** Unique sounds for menu navigation (clicks, selects, and swipes) and scroll/popup interactions provide better tactile feedback.
- **Combat Clarity:** Updated the "Apply Skill" sound to be more distinct, ensuring players have clear audio confirmation during fast-paced turns.

## Cinematic Killing Blows (New!)

- **Predator "Hunted" Effect:** When Predator Stalker secures a killing blow, his iconic cloaking sound plays as a triple-bladed gauntlet pokes through the enemy's portrait, ripping them in half under the glowing text "HUNTED."
- **Laser "Lasered" Effect:** Characters with heat vision now feature a unique execution animation. When Homelander, Superman, or Billy Butcher defeat an opponent, two intense laser beams slice the portrait in half, causing it to vaporize and disperse while the text "LASERED" flashes.
- **Character-Specific Laser Colors:** The laser effect is color-coded for thematic accuracy—Homelander and Superman utilize devastating red beams, while Billy Butcher unleashes scorching yellow lasers.

## UI And Targeting Polish (New!)

- **Enhanced Skill Targeting:** Skill icons now appear instantly on character portraits when targeted, providing immediate visual confirmation of your actions.
- **Visual Feedback:** Active target icons on portraits are now larger and feature a pulsing golden highlight, making it easier to track your queued moves.
- **Smooth Queue Transitions:** Replaced the legacy sliding skill animation with a high-performance fade-out/fade-in sequence for a significantly snappier and more modern feel.
- **Transition Toggle:** Added a new "Skill queue trail" option in the UI settings menu, allowing players to choose between the classic sliding trail and the new fade transitions.
- **Performance Optimizations:** Refactored core UI animations (pulses, transitions) to use hardware-accelerated CSS properties, ensuring smooth performance even in complex battle states.

## Ghost Rider Overhaul

- **Thematic Damage Scaling:** Ghost Rider's power now grows with every transgression. He deals +1 Affliction damage for every Sin stack on the target (targets gain 1 Sin whenever they use a harmful skill).
- **Penance Stare Scaling:** Maintained the high-multiplier +10 damage per harmful skill for Penance Stare, now tracked separately from general Sins.
- **Custom Death Animation:** Enemies killed by Ghost Rider are now "Purified" — they are lifted, sliced in an X by hellfire chains, and burned away to ash.
- **Visual Feedback:** Ghost Rider's status icons and names now correctly reflect his passive ("Spirit of Vengeance") and active skills.

## Mission And PvE Updates

- **Fix:** Corrected roster IDs for the "Raid on the Xenomorph Hive" mission, ensuring the specialized player team loads correctly.
- Special PvE missions now preserve their mission metadata on the mission list.
- Mission-list PvE buttons open character selection with the mission panel expanded.
- Starting a PvE mission fight creates a bot match with the configured mission enemy team and mission background.
- Xenomorph Hive fights use the Xenomorph Nest bot setup and Xenomorph Drone reward path.

## UI Updates

- Chat controls are grouped with the in-game audio controls for easier access.
- The mission catalog now shows clear fight actions for missions that require a special PvE battle.
- Selection mission links can scroll to the requested mission when opened from the mission catalog.

## Beta Notes

This is a beta release, so balance, roster size, missions, UI polish, and matchmaking behavior will continue to evolve. Feedback from live games will help tune character power, PvE unlock difficulty, draft strategy, ranked progression, and future roster additions.
