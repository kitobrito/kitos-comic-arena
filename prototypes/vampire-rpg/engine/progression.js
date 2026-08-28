// Milestone 2 progression data. Plain data only (no logic beyond simple
// lookups) - the composition logic that reads this lives in game.js. Not
// required by the vendored engine, so unlike characters.js this doesn't need
// the cjs-shim wrap; it just attaches a global for game.js to read.
//
// Numeric deltas here were chosen to be REAL mechanical differences (per the
// milestone brief: origin/age/specialization must change how the character
// plays, not just relabel it), while staying inside effect types and status
// metadata keys already proven working in this codebase - see the comments
// on each entry for exactly which existing mechanic it rides on.
(function (root) {
    const ORIGINS = {
        made: {
            id: 'made',
            name: 'Made',
            description: 'Once mortal, transformed by another’s bite.',
            mechanicalNote: 'Reduced sunlight weakness. Higher Blood capacity.',
            powerBonus: 0,
            curseFlat: 3, // softer +-3 day/night swing - more natural affinity
            bloodCapBonus: 2, // 12 max Blood instead of 10
        },
        born: {
            id: 'born',
            name: 'Born',
            description: 'Born into a Vampire bloodline, never fully human.',
            mechanicalNote: 'Stronger traditional Vampire power. Full sunlight weakness.',
            powerBonus: 2, // flat bonus added to Bite/Life Rip base damage
            curseFlat: 5, // full +-5 day/night swing (unchanged from Milestone 1)
            bloodCapBonus: 0,
        },
    };

    const AGES = {
        neonate: {
            id: 'neonate',
            name: 'Neonate',
            description: 'Recently turned. The hunger is still sharp.',
            mechanicalNote: 'Strong early power that fades with experience. Lower Blood capacity.',
            powerBonus: 4, // strong at level 1
            powerDecayPerLevel: 0.5, // decays toward 0 as level rises - "levels off"
            bloodCapModifier: -2,
            specializationLevelOffset: 0,
        },
        adult: {
            id: 'adult',
            name: 'Adult',
            description: 'Settled into the long unlife. Steady and reliable.',
            mechanicalNote: 'No bonuses, no penalties - the balanced baseline.',
            powerBonus: 0,
            powerDecayPerLevel: 0,
            bloodCapModifier: 0,
            specializationLevelOffset: 0,
        },
        elder: {
            id: 'elder',
            name: 'Elder',
            description: 'Centuries old. The hunger no longer rules you.',
            mechanicalNote: 'Lower early power. Higher Blood capacity. Specializes one level sooner.',
            powerBonus: -2,
            powerDecayPerLevel: 0,
            bloodCapModifier: 2,
            specializationLevelOffset: -1,
        },
    };

    // Cumulative XP required to REACH each level (index 0 = level 1).
    const XP_TABLE = [0, 20, 45, 75, 110, 150, 195, 245];
    // XP awarded for winning campaign encounter N (index 0 = encounter 1).
    // 4 encounters already cross the specialization-unlock threshold - the
    // 5th exists specifically so the player has at least one fight left to
    // actually use their new specialization skill in, not just pick it and
    // roll credits. The 6th (Milestone 3) continues the same ramp and
    // exists for the same reason, one tier further: level 5 (a
    // specialization "branch" skill, see LEVEL_CHOICES[5] below) is already
    // reached after encounter 5 with zero retuning - encounter 6 exists so
    // there's a fight left to use THAT skill in too, and its 38 XP is what
    // pushes cumulative XP (153) past the level-6 threshold (150) for the
    // second branch skill, unlocked as encounter 6's own capstone reward.
    const XP_PER_ENCOUNTER = [15, 18, 22, 28, 32, 38];

    // Pick-one-of-two (or, for the specialization-gated entries added in
    // Milestone 3, pick-the-one-matching-entry) at these levels. Each
    // choice is stored on the save (levelChoiceIds) and re-applied every
    // time the character is (re)composed - see game.js's
    // buildComposedVampire(). Two shapes:
    //  - kind: 'maxHp' | 'bloodCap' | 'power' -> a flat numeric bonus,
    //    accumulated into choiceBonuses.
    //  - kind: 'skill', skill: {...} -> the skill object (same shape as
    //    every other skill in this roster) is pushed onto the composed
    //    character's skills[]. Entries carrying requiresSpecialization are
    //    filtered by game.js's renderLevelUpScreen to just the one
    //    matching the character's chosen specialization before display -
    //    since specialization is always chosen by level 4, well before
    //    level 5/6, exactly one of the three per level ever matches.
    const LEVEL_CHOICES = {
        2: [
            { id: 'vigor', label: '+8 Max HP', kind: 'maxHp', value: 8 },
            { id: 'wellspring', label: '+2 Blood Capacity', kind: 'bloodCap', value: 2 },
            // A little early taste of each path - freely pickable like
            // every other option here (requiresSpecialization is used
            // purely as flavor + investment-tracking metadata, not a gate -
            // same as the level 5/6 branch skills below), but it DOES
            // count as a real point toward that specialization behind the
            // scenes (see investedSpecializations/comboArtKeyFor in
            // game.js), same as picking one of their actual skills would.
            // kind:'evasion' is new - buildComposedVampire turns the total
            // into a small permanent evadeChancePercent status (the same
            // real engine primitive Mist Form's temporary version rides -
            // confirmed additive with it, not overriding, via direct
            // source read of battleEngine.js's evade-chance summation).
            { id: 'evasion_feral', label: "Predator's Instinct", requiresSpecialization: 'feral', kind: 'evasion', value: 1, mechanics: '+1% evade chance' },
            { id: 'evasion_hemonancer', label: 'Blood-Sense', requiresSpecialization: 'hemonancer', kind: 'evasion', value: 1, mechanics: '+1% evade chance' },
            { id: 'evasion_shadow', label: 'Fading Step', requiresSpecialization: 'elder_mastery', kind: 'evasion', value: 1, mechanics: '+1% evade chance' },
        ],
        // Milestone 3: each specialization's first "branch" skill - see the
        // comments on SPECIALIZATIONS above for the shared mechanics list
        // (evadeChancePercent, cannotUseHarmfulSkills, etc.) these ride on.
        5: [
            {
                id: 'feral_blood_frenzy',
                label: 'Blood Frenzy',
                requiresSpecialization: 'feral',
                kind: 'skill',
                skill: {
                    id: 'feral_blood_frenzy',
                    name: 'Blood Frenzy',
                    skilldescription: 'Give in further to the hunger - hit harder, but take the consequences.',
                    energy: [],
                    target: 'self',
                    damage: 0,
                    cooldown: 3,
                    classes: ['Instant'],
                    effects: [
                        {
                            type: 'apply_status',
                            statusId: 'feral_blood_frenzy_status',
                            duration: 2,
                            scope: 'self',
                            metadata: {
                                harmful: false,
                                // Stacks with the Feral passive's own +3
                                // damageTakenBonusFlat - Frenzy is a real
                                // risk spike (+7 taken total), not a free
                                // bonus, matching Feral's high-risk identity.
                                damageBonusFlat: 6,
                                damageTakenBonusFlat: 4,
                                tooltipText: 'Blood Frenzy: deals 6 more damage, takes 4 more damage, for 2 turns.',
                            },
                        },
                    ],
                },
            },
            {
                id: 'hemonancer_blood_projectile',
                label: 'Blood Projectile',
                requiresSpecialization: 'hemonancer',
                kind: 'skill',
                skill: {
                    id: 'hemonancer_blood_projectile',
                    name: 'Blood Projectile',
                    skilldescription: 'Hurl a bolt of hardened blood, drawing a little more into reserve.',
                    energy: [],
                    target: 'single-enemy',
                    damage: 0,
                    cooldown: 1,
                    classes: ['Bloodline', 'Ranged', 'Instant'],
                    effects: [
                        { type: 'damage', amount: 14, scope: 'target' },
                        // A second, smaller Blood-generation source than
                        // Bite (stackDelta 1 vs 2) - gives Hemonancer a
                        // non-melee way to build toward Life Rip.
                        {
                            type: 'apply_status',
                            statusId: 'vampire_blood_resource',
                            duration: 99,
                            scope: 'self',
                            metadata: {
                                harmful: false,
                                infiniteDuration: true,
                                stackMetadataKey: 'bloodStacks',
                                stackDelta: 1,
                                stackMax: 10,
                                tooltipTextTemplate: 'Blood: {bloodStacks}/10',
                            },
                        },
                    ],
                },
            },
            {
                id: 'elder_mastery_mist_form',
                label: 'Mist Form',
                requiresSpecialization: 'elder_mastery',
                kind: 'skill',
                skill: {
                    id: 'elder_mastery_mist_form',
                    name: 'Mist Form',
                    skilldescription: 'Dissolve into mist for a moment, harder to land a blow on.',
                    energy: [],
                    target: 'self',
                    damage: 0,
                    cooldown: 4,
                    classes: ['Instant'],
                    effects: [
                        {
                            type: 'apply_status',
                            statusId: 'elder_mastery_mist_form_status',
                            duration: 2,
                            scope: 'self',
                            metadata: {
                                harmful: false,
                                evadeChancePercent: 35,
                                tooltipText: 'Mist Form: 35% chance to evade an attack entirely, for 2 turns.',
                            },
                        },
                    ],
                },
            },
        ],
        // Milestone 3: each specialization's second "branch" skill -
        // unlocked as the campaign's own capstone (encounter 6's XP is what
        // crosses this threshold - see XP_PER_ENCOUNTER above).
        6: [
            {
                id: 'feral_blood_claw',
                label: 'Blood Claw',
                requiresSpecialization: 'feral',
                kind: 'skill',
                skill: {
                    id: 'feral_blood_claw',
                    name: 'Blood Claw',
                    skilldescription: 'A deeper, armor-piercing rend - more lifesteal than Rampage.',
                    energy: [],
                    target: 'single-enemy',
                    damage: 0,
                    cooldown: 2,
                    classes: ['Physical', 'Melee', 'Instant'],
                    effects: [
                        { type: 'health_steal_damage', amount: 20, scope: 'target', metadata: { ignoreDamageReduction: true } },
                    ],
                },
            },
            {
                id: 'hemonancer_blood_curse',
                label: 'Blood Curse',
                requiresSpecialization: 'hemonancer',
                kind: 'skill',
                skill: {
                    id: 'hemonancer_blood_curse',
                    name: 'Blood Curse',
                    skilldescription: 'Curse the enemy’s blood, weakening the force behind their strikes.',
                    energy: [],
                    target: 'single-enemy',
                    damage: 0,
                    cooldown: 3,
                    classes: ['Bloodline', 'Instant'],
                    effects: [
                        {
                            type: 'apply_status',
                            statusId: 'hemonancer_blood_curse_status',
                            duration: 2,
                            scope: 'target',
                            metadata: {
                                harmful: true,
                                DamageDebuff: 5,
                                tooltipText: 'Blood Curse: deals 5 less damage, for 2 turns.',
                            },
                        },
                    ],
                },
            },
            {
                id: 'elder_mastery_charm',
                label: 'Charm',
                requiresSpecialization: 'elder_mastery',
                kind: 'skill',
                skill: {
                    id: 'elder_mastery_charm',
                    name: 'Charm',
                    skilldescription: 'Command the enemy’s will for a moment - they cannot bring themselves to strike.',
                    energy: [],
                    target: 'single-enemy',
                    damage: 0,
                    cooldown: 4,
                    classes: ['Instant'],
                    effects: [
                        {
                            type: 'apply_status',
                            statusId: 'elder_mastery_charm_status',
                            duration: 2,
                            scope: 'target',
                            metadata: {
                                harmful: true,
                                cannotUseHarmfulSkills: true,
                                tooltipText: 'Charmed: cannot use a harmful skill for 2 turns.',
                            },
                        },
                    ],
                },
            },
        ],
        8: [
            { id: 'ferocity', label: '+3 Power (Bite/Life Rip)', kind: 'power', value: 3 },
            { id: 'resilience', label: '+10 Max HP', kind: 'maxHp', value: 10 },
        ],
    };

    const SPECIALIZATION_UNLOCK_LEVEL = 4;

    // Each specialization grants one new skill (following the same
    // effects[] shape every other skill in this roster uses - no new engine
    // mechanics) plus an optional passive status merged into startStatuses.
    const SPECIALIZATIONS = {
        feral: {
            id: 'feral',
            name: 'Feral',
            flavorText: '"I am becoming a monster."',
            gameplayText: 'Bite scales with your current Blood (not spent). Reckless - you take more damage. New skill: Rampage, a cheap melee lifesteal strike.',
            // Merged onto the composed Bite skill's primary damage effect at
            // build time - the same bonusPerStatusMetadata mechanism that
            // already powers Life Rip, just with consumeStatus:false so it
            // reads current Blood instead of spending it.
            biteBonusPerBlood: {
                statusId: 'vampire_blood_resource',
                metadataKey: 'bloodStacks',
                multiplier: 1.5,
                scope: 'self',
                consumeStatus: false,
            },
            passiveStartStatus: {
                id: 'feral_bloodlust_passive',
                duration: 999,
                metadata: {
                    infiniteDuration: true,
                    harmful: false,
                    damageTakenBonusFlat: 3,
                    tooltipText: 'Feral Bloodlust: Bite scales with current Blood; reckless instincts take 3 more damage.',
                },
            },
            skill: {
                id: 'feral_rampage',
                name: 'Rampage',
                skilldescription: 'A reckless melee lifesteal strike.',
                energy: [],
                target: 'single-enemy',
                damage: 0,
                cooldown: 1,
                classes: ['Physical', 'Melee', 'Instant'],
                effects: [{ type: 'health_steal_damage', amount: 14, scope: 'target' }],
            },
        },
        hemonancer: {
            id: 'hemonancer',
            name: 'Hemonancer',
            flavorText: '"I have learned to control blood itself."',
            gameplayText: 'Utility and control over raw damage. New skill: Blood Ward, a self-heal plus a defensive ward.',
            skill: {
                id: 'hemonancer_blood_ward',
                name: 'Blood Ward',
                skilldescription: 'Channel blood magic to mend wounds and harden your skin.',
                energy: [],
                target: 'self',
                damage: 0,
                cooldown: 3,
                classes: ['Bloodline', 'Instant'],
                effects: [
                    { type: 'heal', amount: 10, scope: 'self' },
                    {
                        type: 'apply_status',
                        statusId: 'hemonancer_blood_ward_status',
                        duration: 2,
                        scope: 'self',
                        metadata: {
                            harmful: false,
                            damageReductionFlat: 5,
                            tooltipText: 'Blood Ward: takes 5 less damage for 2 turns.',
                        },
                    },
                ],
            },
        },
        // Distinct id from the Age "elder" - this is the specialization,
        // not the lineage age. The internal id stays "elder_mastery" (saves
        // already store this string), but it's labeled "Shadow" in the UI -
        // also avoids confusing it with the Age called "Elder".
        elder_mastery: {
            id: 'elder_mastery',
            name: 'Shadow',
            flavorText: '"I have mastered being a Vampire."',
            gameplayText: 'Refined, defensive mastery. New skill: Shadow Veil - guard, then punish.',
            skill: {
                id: 'elder_mastery_shadow_veil',
                name: 'Shadow Veil',
                skilldescription: 'Refined mastery: guard low, then strike from the shadows.',
                energy: [],
                target: 'self',
                damage: 0,
                cooldown: 3,
                classes: ['Instant'],
                effects: [
                    {
                        type: 'apply_status',
                        statusId: 'elder_mastery_shadow_veil_status',
                        duration: 2,
                        scope: 'self',
                        metadata: {
                            harmful: false,
                            damageReductionFlat: 4,
                            damageBonusFlat: 4,
                            tooltipText: 'Shadow Veil: takes 4 less damage, deals 4 more, for 2 turns.',
                        },
                    },
                ],
            },
        },
    };

    const api = { ORIGINS, AGES, XP_TABLE, XP_PER_ENCOUNTER, LEVEL_CHOICES, SPECIALIZATION_UNLOCK_LEVEL, SPECIALIZATIONS };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.VampireProgression = api;
    }
})(typeof window !== 'undefined' ? window : undefined);
