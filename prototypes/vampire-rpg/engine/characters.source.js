// Vampire RPG prototype roster. Follows the same character/skill/effect JSON
// shape as the live game's characters.js so it can run on the vendored,
// unmodified battleEngine.js with zero engine changes.
//
// This file is authored here, sanity-tested directly under Node against the
// real (unmodified) battleLogic.js, and then wrapped for the browser via
// cjs-shim.js into engine/characters.js. Edit this file, not the wrapped one.

const characters = [
    {
        id: 'vampire',
        characterId: 'vampire',
        name: 'Vampire',
        role: 'Bloodline Duelist',
        roleCategory: 'bloodline-duelist',
        universe: 'vampire-rpg',
        facePicture: '',
        characterdeescription: 'A newly-turned vampire, caught between the hunger for blood and the burning weight of the sun.',
        // Vampire's Curse: which of these two is present determines day/night.
        // game.js toggles between them directly (filters the other out, then
        // calls BattleEngine.applyStatus) - only one is ever present at a time.
        // Default start state is Day.
        startStatuses: [
            {
                id: 'vampire_daylight_curse',
                duration: 999,
                metadata: {
                    infiniteDuration: true,
                    harmful: true,
                    DamageDebuff: 5,
                    damageTakenBonusFlat: 5,
                    healingBonusFlat: -5,
                    tooltipText: 'Daylight Curse: deals 5 less damage, takes 5 more damage, heals 5 less.',
                },
            },
        ],
        skills: [
            {
                id: 'vampire_bite',
                name: 'Vampire Bite',
                skillimage: '',
                skilldescription: 'Sink your fangs into an enemy, dealing damage and drawing out their Blood. 15% chance to crit for extra damage; a deep lifesteal drink heals you for a good share of the damage.',
                energy: [],
                target: 'single-enemy',
                damage: 0,
                cooldown: 1,
                classes: ['Physical', 'Melee', 'Instant'],
                effects: [
                    // Armor-piercing: fangs ignore flat damage reduction
                    // (armor) entirely - Life Rip does not get this, so
                    // heavily-armored targets are meaningfully tougher
                    // against Life Rip than against Bite.
                    { type: 'damage', amount: 20, scope: 'target', metadata: { ignoreDamageReduction: true } },
                    // 15% chance to land a second, identical hit as a "crit".
                    // Note: this is its own damage instance, so the day/night
                    // curse's flat +-5 applies to it too - on a crit the curse
                    // swings by +-10 total, not +-5.
                    { type: 'damage', amount: 20, scope: 'target', activationChancePercent: 15, metadata: { ignoreDamageReduction: true } },
                    // Lifesteal: heals the Vampire for a flat 10 (50% of the
                    // 20 base - was 2/10% before user feedback asked for a
                    // bigger drink) whenever this connects. Doesn't scale
                    // with the crit roll above - the engine has no "% of
                    // damage just dealt" mechanic, only 1:1
                    // health_steal_damage, so this is its own fixed slice,
                    // expressed as a fraction of the base hit instead. Goes
                    // through the same curse math as everything else: at 10
                    // the daytime -3/-5 flat debuff (curseFlat) only shaves
                    // it down to 5-7, not to 0 like the old 2-heal did, so
                    // (unlike before) it's a reliable heal day or night, just
                    // a stronger one at night. Also armor-piercing, same as
                    // the rest of the bite.
                    { type: 'health_steal_damage', amount: 10, scope: 'target', metadata: { ignoreDamageReduction: true } },
                    {
                        type: 'apply_status',
                        statusId: 'vampire_blood_resource',
                        duration: 99,
                        scope: 'self',
                        metadata: {
                            harmful: false,
                            infiniteDuration: true,
                            stackMetadataKey: 'bloodStacks',
                            stackDelta: 2,
                            stackMax: 10,
                            tooltipTextTemplate: 'Blood: {bloodStacks}/10',
                        },
                    },
                ],
            },
            {
                id: 'life_rip',
                name: 'Life Rip',
                skillimage: '',
                skilldescription: 'Tear into an enemy, unleashing all stored Blood as bonus damage. Consumes all Blood.',
                energy: [],
                target: 'single-enemy',
                damage: 0,
                cooldown: 2,
                classes: ['Bloodline', 'Instant', 'Affliction'],
                effects: [
                    {
                        type: 'damage',
                        amount: 8,
                        scope: 'target',
                        metadata: {
                            bonusPerStatusMetadata: {
                                statusId: 'vampire_blood_resource',
                                metadataKey: 'bloodStacks',
                                multiplier: 6,
                                scope: 'self',
                                consumeStatus: true,
                            },
                        },
                    },
                ],
            },
            {
                id: 'vampire_guard',
                name: 'Guard',
                skillimage: '',
                skilldescription: 'Brace yourself, gaining 5 Armor against the enemy’s next attack.',
                energy: [],
                target: 'self',
                damage: 0,
                // No cooldown - this is the always-available defensive
                // option (replaces a plain no-op Wait). Re-casting while
                // already guarding just refreshes the same status rather
                // than stacking (applyStatus merges same-id statuses), so
                // there's no way to compound Armor by spamming this.
                cooldown: 0,
                classes: ['Instant'],
                effects: [
                    {
                        type: 'apply_status',
                        statusId: 'vampire_guard_status',
                        // duration:2 mirrors every other "protects through
                        // the opponent's next turn" self-buff already in
                        // this roster (Brittle Guard, Shield Wall, Swarm
                        // Squeak all use the same value for the same intent).
                        duration: 2,
                        scope: 'self',
                        metadata: {
                            harmful: false,
                            damageReductionFlat: 5,
                            armorAmount: 5, // shows the shield badge too
                            tooltipText: 'Guard: +5 Armor against the enemy’s next attack.',
                        },
                    },
                ],
            },
            {
                id: 'vampire_potion',
                name: 'Potion',
                skillimage: '',
                skilldescription: 'Drink a healing potion, restoring 80 health. Limited supply - 3 per encounter.',
                energy: [],
                target: 'self',
                damage: 0,
                // No engine cooldown - the "3 per encounter" limit is tracked
                // separately in game.js's own battle state
                // (state.potionsRemaining), since the engine's cooldown
                // system is turn-based, not use-count-based. See
                // onSkillClick/playPlayerAction/renderSkillButton in game.js.
                cooldown: 0,
                classes: ['Instant'],
                effects: [
                    { type: 'heal', amount: 80, scope: 'self' },
                ],
            },
            {
                id: 'vampire_curse_passive',
                name: "Passive: Vampire's Curse",
                skillimage: '',
                skilldescription: 'Daylight: -5 to all stats. Night: +5 to all stats. (Toggle Day/Night to test.)',
                energy: [],
                target: '',
                damage: 0,
                cooldown: 0,
                classes: ['Passive'],
            },
        ],
    },
    {
        id: 'goblin-grunt',
        characterId: 'goblin-grunt',
        name: 'Goblin Grunt',
        // The engine has no per-character max-HP concept (every unit starts
        // at a hardcoded 100); game.js reads this field itself right after
        // buildInitialBoard() and overrides unit.hp for characters that
        // declare it, purely in the prototype's own glue code.
        startingHp: 40,
        role: 'Basic Melee',
        roleCategory: 'basic-melee',
        universe: 'vampire-rpg',
        facePicture: '',
        characterdeescription: 'A common goblin warrior, all snarl and rusty steel.',
        skills: [
            {
                id: 'goblin_grunt_rusty_cleaver',
                name: 'Rusty Cleaver',
                skilldescription: 'A crude chop with a notched blade.',
                energy: [],
                target: 'single-enemy',
                damage: 0,
                cooldown: 0,
                classes: ['Physical', 'Melee', 'Instant'],
                effects: [{ type: 'damage', amount: 9, scope: 'target' }],
            },
            {
                id: 'goblin_grunt_reckless_swing',
                name: 'Reckless Swing',
                skilldescription: 'A wild overhead swing that hits hard but leaves the goblin winded.',
                energy: [],
                target: 'single-enemy',
                damage: 0,
                cooldown: 2,
                classes: ['Physical', 'Melee', 'Instant'],
                effects: [{ type: 'damage', amount: 16, scope: 'target' }],
            },
        ],
    },
    {
        id: 'skeleton',
        characterId: 'skeleton',
        name: 'Skeleton',
        startingHp: 40,
        role: 'Undead Fighter',
        roleCategory: 'undead-fighter',
        universe: 'vampire-rpg',
        facePicture: '',
        characterdeescription: 'Bones held together by old magic and the memory of a soldier’s stance.',
        skills: [
            {
                id: 'skeleton_bone_slash',
                name: 'Bone Slash',
                skilldescription: 'A dry, clattering slash.',
                energy: [],
                target: 'single-enemy',
                damage: 0,
                cooldown: 0,
                classes: ['Physical', 'Melee', 'Instant'],
                effects: [{ type: 'damage', amount: 8, scope: 'target' }],
            },
            {
                id: 'skeleton_brittle_guard',
                name: 'Brittle Guard',
                skilldescription: 'Locks its bones into a rigid stance, reducing incoming damage for a short time.',
                energy: [],
                target: 'self',
                damage: 0,
                cooldown: 3,
                classes: ['Physical', 'Instant'],
                effects: [
                    {
                        type: 'apply_status',
                        statusId: 'skeleton_brittle_guard_status',
                        duration: 2,
                        scope: 'self',
                        metadata: {
                            harmful: false,
                            damageReductionFlat: 6,
                            tooltipText: 'Takes 6 less damage for 2 turns.',
                        },
                    },
                ],
            },
        ],
    },
    {
        id: 'giant-rat',
        characterId: 'giant-rat',
        name: 'Giant Rat',
        startingHp: 40,
        role: 'Weak Fast Attacker',
        roleCategory: 'weak-fast-attacker',
        universe: 'vampire-rpg',
        facePicture: '',
        characterdeescription: 'Oversized, mangy, and quick to bite.',
        skills: [
            {
                id: 'giant_rat_nibble',
                name: 'Nibble',
                skilldescription: 'A quick, weak bite.',
                energy: [],
                target: 'single-enemy',
                damage: 0,
                cooldown: 0,
                classes: ['Physical', 'Melee', 'Instant'],
                effects: [{ type: 'damage', amount: 6, scope: 'target' }],
            },
            {
                id: 'giant_rat_swarm_squeak',
                name: 'Swarm Squeak',
                skilldescription: 'A shrill call that whips it into a biting frenzy.',
                energy: [],
                target: 'self',
                damage: 0,
                cooldown: 3,
                classes: ['Instant'],
                effects: [
                    {
                        type: 'apply_status',
                        statusId: 'giant_rat_frenzy_status',
                        duration: 2,
                        scope: 'self',
                        metadata: {
                            harmful: false,
                            damageBonusFlat: 4,
                            tooltipText: 'Deals 4 more damage for 2 turns.',
                        },
                    },
                ],
            },
        ],
    },
    {
        id: 'goblin-sneak',
        characterId: 'goblin-sneak',
        name: 'Goblin Sneak',
        startingHp: 28,
        role: 'Fast Low-HP Attacker',
        roleCategory: 'fast-low-hp-attacker',
        universe: 'vampire-rpg',
        facePicture: '',
        characterdeescription: 'Quick, thin-bladed, and quicker to run than to stand and fight fair.',
        skills: [
            {
                id: 'goblin_sneak_quick_stab',
                name: 'Quick Stab',
                skilldescription: 'A fast, shallow stab.',
                energy: [],
                target: 'single-enemy',
                damage: 0,
                cooldown: 0,
                classes: ['Physical', 'Melee', 'Instant'],
                effects: [{ type: 'damage', amount: 7, scope: 'target' }],
            },
            {
                id: 'goblin_sneak_slip_away',
                name: 'Slip Away',
                skilldescription: 'Ducks and weaves, harder to hit for a moment.',
                energy: [],
                target: 'self',
                damage: 0,
                cooldown: 3,
                classes: ['Instant'],
                effects: [
                    {
                        type: 'apply_status',
                        statusId: 'goblin_sneak_slip_away_status',
                        duration: 2,
                        scope: 'self',
                        metadata: {
                            harmful: false,
                            damageReductionFlat: 4,
                            tooltipText: 'Takes 4 less damage for 2 turns.',
                        },
                    },
                ],
            },
        ],
    },
    {
        id: 'goblin-shaman',
        characterId: 'goblin-shaman',
        name: 'Goblin Shaman',
        startingHp: 32,
        role: 'Weak Ranged Caster',
        roleCategory: 'weak-ranged-caster',
        universe: 'vampire-rpg',
        facePicture: '',
        characterdeescription: 'Rattles bone charms and mutters curses from a safe distance.',
        skills: [
            {
                id: 'goblin_shaman_bone_bolt',
                name: 'Bone Bolt',
                skilldescription: 'A crude bolt of splintered bone.',
                energy: [],
                target: 'single-enemy',
                damage: 0,
                cooldown: 0,
                classes: ['Ranged', 'Instant'],
                effects: [{ type: 'damage', amount: 8, scope: 'target' }],
            },
            {
                id: 'goblin_shaman_hex',
                name: 'Hex',
                skilldescription: 'A muttered curse that weakens the target’s strikes.',
                energy: [],
                target: 'single-enemy',
                damage: 0,
                cooldown: 3,
                classes: ['Ranged', 'Instant'],
                effects: [
                    {
                        type: 'apply_status',
                        statusId: 'goblin_shaman_hex_status',
                        duration: 2,
                        scope: 'target',
                        metadata: {
                            harmful: true,
                            DamageDebuff: 4,
                            tooltipText: 'Hexed: deals 4 less damage for 2 turns.',
                        },
                    },
                ],
            },
            {
                id: 'goblin_shaman_mending_chant',
                name: 'Mending Chant',
                skilldescription: 'Channels restorative magic into itself or its most wounded ally.',
                energy: [],
                // Not 'self' or 'single-enemy' - a marker game.js's enemy
                // turn AI (chooseEnemyAction) reads specifically: heal
                // whichever of itself/its allies is hurt worst, and only
                // when someone actually needs it (see the function for the
                // exact threshold) - otherwise this skill is skipped
                // entirely in favor of a normal attack, same turn.
                target: 'self-or-ally',
                damage: 0,
                cooldown: 3,
                classes: ['Bloodline', 'Instant'],
                effects: [{ type: 'heal', amount: 14, scope: 'target' }],
            },
        ],
    },
    {
        id: 'hobgoblin-warrior',
        characterId: 'hobgoblin-warrior',
        // Display name only - "Hobgoblin" implied bigger/orange art that
        // doesn't exist yet, this reuses tinted goblin-grunt.png (see
        // ENEMY_ART in game.js), so it's named for what it actually looks
        // like. id/characterId stay as-is (saves/CAMPAIGN reference them).
        name: 'Goblin Warrior',
        startingHp: 55,
        role: 'Stronger Frontline',
        roleCategory: 'stronger-frontline',
        universe: 'vampire-rpg',
        facePicture: '',
        characterdeescription: 'Disciplined where goblins are chaotic - a real soldier among rabble.',
        // Permanent Armor (not a temporary buff like Shield Wall below):
        // real plate, not a stance. Rides the same damageReductionFlat
        // metadata key Shield Wall/Brittle Guard already use - the two
        // stack additively if Shield Wall is also up. armorAmount is a
        // second, engine-unread marker key purely so game.js's UI can
        // find and display "Armor" specifically (see getArmorAmount()).
        startStatuses: [
            {
                id: 'hobgoblin_warrior_armor_status',
                duration: 999,
                metadata: {
                    infiniteDuration: true,
                    harmful: false,
                    damageReductionFlat: 5,
                    armorAmount: 5,
                    tooltipText: 'Armor: reduces damage taken by 5 (bypassed by armor-piercing attacks).',
                },
            },
        ],
        skills: [
            {
                id: 'hobgoblin_warrior_heavy_slam',
                name: 'Heavy Slam',
                skilldescription: 'A disciplined, heavy overhead blow.',
                energy: [],
                target: 'single-enemy',
                damage: 0,
                cooldown: 0,
                classes: ['Physical', 'Melee', 'Instant'],
                effects: [{ type: 'damage', amount: 12, scope: 'target' }],
            },
            {
                id: 'hobgoblin_warrior_shield_wall',
                name: 'Shield Wall',
                skilldescription: 'Braces behind its shield, taking far less damage.',
                energy: [],
                target: 'self',
                damage: 0,
                cooldown: 3,
                classes: ['Physical', 'Instant'],
                effects: [
                    {
                        type: 'apply_status',
                        statusId: 'hobgoblin_warrior_shield_wall_status',
                        duration: 2,
                        scope: 'self',
                        metadata: {
                            harmful: false,
                            damageReductionFlat: 8,
                            tooltipText: 'Takes 8 less damage for 2 turns.',
                        },
                    },
                ],
            },
        ],
    },
    {
        id: 'hobgoblin-archer',
        characterId: 'hobgoblin-archer',
        // Same reasoning as Goblin Warrior above - display name only.
        name: 'Goblin Archer',
        startingHp: 35,
        role: 'Ranged',
        roleCategory: 'ranged',
        universe: 'vampire-rpg',
        facePicture: '',
        characterdeescription: 'Picks a target and puts arrow after arrow into it.',
        skills: [
            {
                id: 'hobgoblin_archer_aimed_shot',
                name: 'Aimed Shot',
                skilldescription: 'A steady, aimed arrow.',
                energy: [],
                target: 'single-enemy',
                damage: 0,
                cooldown: 0,
                classes: ['Ranged', 'Instant'],
                effects: [{ type: 'damage', amount: 11, scope: 'target' }],
            },
            {
                id: 'hobgoblin_archer_piercing_volley',
                name: 'Piercing Volley',
                skilldescription: 'A rapid volley aimed at the gaps in armor.',
                energy: [],
                target: 'single-enemy',
                damage: 0,
                cooldown: 2,
                classes: ['Ranged', 'Instant'],
                effects: [{ type: 'damage', amount: 15, scope: 'target' }],
            },
        ],
    },
    {
        id: 'zombie',
        characterId: 'zombie',
        name: 'Zombie',
        startingHp: 50,
        role: 'Slow Durable Undead',
        roleCategory: 'slow-durable-undead',
        universe: 'vampire-rpg',
        facePicture: '',
        characterdeescription: 'Shambling, rotted, and slow to fall.',
        skills: [
            {
                id: 'zombie_rotting_grasp',
                name: 'Rotting Grasp',
                skilldescription: 'A slow, grasping claw.',
                energy: [],
                target: 'single-enemy',
                damage: 0,
                cooldown: 0,
                classes: ['Physical', 'Melee', 'Instant'],
                effects: [{ type: 'damage', amount: 8, scope: 'target' }],
            },
            {
                id: 'zombie_grasping_lunge',
                name: 'Grasping Lunge',
                skilldescription: 'A sudden lurching lunge, faster than it looks.',
                energy: [],
                target: 'single-enemy',
                damage: 0,
                cooldown: 2,
                classes: ['Physical', 'Melee', 'Instant'],
                effects: [{ type: 'damage', amount: 14, scope: 'target' }],
            },
        ],
    },
];

module.exports = characters;
