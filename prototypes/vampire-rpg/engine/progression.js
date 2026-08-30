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
            // Fallback only - a Born character always picks one of LINEAGES
            // below (see renderLineageScreen/effectiveOriginStats in
            // game.js), which fully overrides powerBonus/curseFlat. These
            // three values stay here just as the Full Vampire lineage's own
            // numbers, so an old save with origin:'born' and no lineage
            // field (from before this feature existed) still resolves to
            // exactly what "Born" always meant, unchanged.
            powerBonus: 2, // flat bonus added to Bite/Life Rip base damage
            curseFlat: 5, // full +-5 day/night swing (unchanged from Milestone 1)
            bloodCapBonus: 0,
        },
    };

    // A Born Vampire additionally picks a bloodline (see renderLineageScreen
    // in game.js) - which of their parents was the Vampire changes how
    // strong the blood runs. Rides the exact same two levers Origin itself
    // already uses (powerBonus/curseFlat - see ORIGINS above and
    // curseMetadataFor in game.js for what curseFlat actually drives: the
    // day-curse penalty AND the night-blessing bonus are the same swing, so
    // "no weakness to sunlight" below also means no night blessing either -
    // a real trade, not a pure downgrade). bloodCapBonus is deliberately
    // NOT overridden per-lineage - Born's own bloodCapBonus (0, above)
    // applies to all three; only Vampire power and the day/night swing were
    // asked to differ.
    const LINEAGES = {
        full: {
            id: 'full',
            name: 'Full Vampire',
            description: 'Two Vampire parents - the bloodline runs purest in you.',
            mechanicalNote: 'Strongest Vampire power. Full sunlight weakness.',
            powerBonus: 2,
            curseFlat: 5,
        },
        'half-vampire': {
            id: 'half-vampire',
            name: 'Half-Vampire',
            description: 'A Vampire mother, a human father.',
            mechanicalNote: 'Higher Vampire power than a Half-Human. Very little sunlight weakness.',
            powerBonus: 1,
            curseFlat: 2,
        },
        'half-human': {
            id: 'half-human',
            name: 'Half-Human',
            description: 'A human mother, a Vampire father.',
            mechanicalNote: 'Weaker overall Vampire power. No weakness to sunlight.',
            powerBonus: -1,
            curseFlat: 0,
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
    // 45 (7th entry, Smile Golem) continues the same ramp and pushes
    // cumulative XP (153 -> 198) past the level-7 threshold (195) for one
    // last level-up on the way out - there's no LEVEL_CHOICES[7] (and
    // none is added for this - the campaign ends right after this fight,
    // same "only add a choice tier when there's a fight left to use it
    // in" reasoning as encounters 5/6 above), so it's just the ordinary
    // passive level-up with no choice screen.
    const XP_PER_ENCOUNTER = [15, 18, 22, 28, 32, 38, 45];

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
        // Exactly 3 plain-looking options - "+8 Max HP" / "+5 Blood
        // Capacity" / "+2% Evasion", nothing else shown on any of them (see
        // renderLevelUpScreen in game.js, which only shows flavor/mechanics
        // text for kind:'skill' entries - never for these). Each one is
        // SECRETLY tied to one specialization via requiresSpecialization
        // (Max HP->Feral, Blood Capacity->Hemonancer, Evasion->Shadow) -
        // purely investment-tracking metadata read by
        // investedSpecializations/comboArtKeyFor in game.js, not a gate and
        // never surfaced to the player. Picking one is a real, if invisible,
        // step toward that specialization's transformed idle art, same as
        // picking one of the level 5/6 branch skills below would be.
        2: [
            { id: 'vigor', label: '+8 Max HP', kind: 'maxHp', value: 8, requiresSpecialization: 'feral' },
            { id: 'wellspring', label: '+5 Blood Capacity', kind: 'bloodCap', value: 5, requiresSpecialization: 'hemonancer' },
            // buildComposedVampire turns the evasion total into a small
            // permanent evadeChancePercent status (the same real engine
            // primitive Mist Form's temporary version rides - confirmed
            // additive with it, not overriding, via direct source read of
            // battleEngine.js's evade-chance summation).
            { id: 'evasion_shadow', label: '+2% Evasion', kind: 'evasion', value: 2, requiresSpecialization: 'elder_mastery' },
        ],
        // Same "secretly tied to a specialization, nothing shown about
        // that" treatment as level 2 above - kind:'passive' entries grant
        // a real permanent effect immediately on pick (see
        // buildComposedVampire in game.js), same as everything else here.
        3: [
            {
                id: 'feral_deep_hunger',
                label: '+5% Life Steal',
                kind: 'passive',
                requiresSpecialization: 'feral',
                // The engine has no generic "% of damage dealt, by any
                // skill" lifesteal primitive (only per-skill, fixed
                // health_steal_damage amounts - see Vampire Bite/Rampage/
                // Blood Claw, which already lifesteal on their own). This
                // approximates the ask with a flat healingBonusFlat that
                // strengthens EVERY lifesteal effect already in the kit,
                // reusing the same primitive the day/night curse's own
                // heal swing already rides, rather than hand-tuning a new
                // sub-effect onto each damage skill individually.
                passiveStatus: {
                    id: 'feral_deep_hunger_passive',
                    duration: 999,
                    metadata: {
                        infiniteDuration: true,
                        harmful: false,
                        healingBonusFlat: 3,
                        tooltipText: 'Deeper hunger: +3 to any lifesteal healing.',
                    },
                },
            },
            {
                id: 'hemonancer_blood_drain',
                label: '+5 Blood Drained',
                kind: 'passive',
                requiresSpecialization: 'hemonancer',
                // Adds directly to Vampire Bite's own Blood-generation
                // (its apply_status effect's stackDelta, 2 -> 7) at
                // composition time - see buildComposedVampire in game.js,
                // same "merge extra metadata onto Bite's own effect"
                // pattern Feral's biteBonusPerBlood already uses on the
                // damage effect, just a different field/effect.
                biteBloodBonus: 5,
                passiveStatus: {
                    id: 'hemonancer_blood_drain_passive',
                    duration: 999,
                    metadata: {
                        infiniteDuration: true,
                        harmful: false,
                        tooltipText: 'Deeper drain: Vampire Bite draws 5 more Blood per bite.',
                    },
                },
            },
            {
                id: 'elder_mastery_night_gift',
                label: '+5 Stats at Night',
                kind: 'passive',
                requiresSpecialization: 'elder_mastery',
                // No standalone status - merged directly into the Night
                // Blessing curse status itself (see curseMetadataFor in
                // game.js), keyed off this choice's id, so it always
                // tracks whichever curse status is currently active
                // (battle start, manual toggle, etc.) instead of being a
                // second, separately-managed bonus that could drift out
                // of sync with it.
                nightStatBonus: 5,
            },
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
                    skilldescription: 'Give in further to the hunger - hit harder the more hurt you are, but take the consequences.',
                    energy: [],
                    target: 'self',
                    damage: 0,
                    // Raised from 3 alongside the longer duration below -
                    // per feedback.
                    cooldown: 6,
                    classes: ['Instant'],
                    effects: [
                        {
                            type: 'apply_status',
                            statusId: 'feral_blood_frenzy_status',
                            // Raised from 2 turns, per feedback.
                            duration: 3,
                            scope: 'self',
                            metadata: {
                                harmful: false,
                                // damageBonusFlat is a PLACEHOLDER here (0)
                                // deliberately - the real value ("+5 per 15
                                // missing HP") has to be computed from the
                                // caster's actual HP at the moment this is
                                // cast, which this static skill data can't
                                // express. getStatusMetadataTotals in
                                // battleEngine.js only ever reads a flat
                                // number here (no missing-HP-scaling
                                // support at the status layer - confirmed
                                // by reading it directly; that scaling only
                                // exists for a skill's OWN damage effect,
                                // via amountFromSourceMissingHp, which
                                // doesn't apply to a buff affecting later,
                                // unrelated skills). game.js's
                                // applyDynamicSkillEffects overwrites this
                                // field with the real computed number
                                // immediately before every cast - see its
                                // own comment for the exact formula.
                                damageBonusFlat: 0,
                                // "+15% lifesteal" - translated to a flat
                                // bonus for the same reason as above (no
                                // percent-of-damage-healed primitive exists
                                // in this engine - healingBonusFlat is
                                // strictly additive, not multiplicative).
                                // +3 approximates 15% of a typical single
                                // Feral lifesteal hit (Rampage 14, Bite's
                                // own Feral-boosted drink ~10-20).
                                healingBonusFlat: 3,
                                // Stacks with the Feral passive's own +3
                                // damageTakenBonusFlat - Frenzy is a real
                                // risk spike, not a free bonus, matching
                                // Feral's high-risk identity.
                                damageTakenBonusFlat: 4,
                                // {damageBonusFlat} is filled in live by
                                // describeStatusMetadataCompact/the
                                // tooltip renderer in game.js, same
                                // template-placeholder mechanism the Blood
                                // resource status already uses (see
                                // tooltipTextTemplate elsewhere in this
                                // file) - shows the ACTUAL number this
                                // specific cast landed on, not a generic
                                // formula string.
                                tooltipTextTemplate:
                                    'Blood Frenzy: deals {damageBonusFlat} more damage (+5 per 15 missing HP when cast), heals more from lifesteal, takes 4 more damage, for 3 turns.',
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
                    skilldescription: 'Hurl a bolt of hardened blood that drinks on impact, drawing a little more into reserve.',
                    energy: [],
                    target: 'single-enemy',
                    damage: 0,
                    cooldown: 1,
                    classes: ['Bloodline', 'Ranged', 'Instant'],
                    effects: [
                        // health_steal_damage instead of plain damage, per
                        // feedback - now heals the caster too, not just a
                        // ranged hit.
                        { type: 'health_steal_damage', amount: 14, scope: 'target' },
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
                    skilldescription: 'Dissolve into mist, shrugging off every hostile working on you - even mid-stun.',
                    energy: [],
                    target: 'self',
                    damage: 0,
                    cooldown: 5,
                    classes: ['Instant'],
                    // cleanse_harmful is a real, proven engine effect type
                    // (battleEngine.js) - strips every harmful status off
                    // the target, no count given so it's unbounded (all of
                    // them, not just one). A stun (cannotUseSkills) is a
                    // harmful status, so this genuinely breaks one - but
                    // only because game.js's own stun-handling specifically
                    // special-cases this ONE skill id to stay castable
                    // while stunned (see its own comment in game.js);
                    // nothing about this effect itself bypasses the
                    // engine's normal cannotUseSkills gate.
                    effects: [{ type: 'cleanse_harmful', scope: 'self' }],
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
                    skilldescription: 'Spend every drop of stored Blood in one armor-piercing rend, stealing half of it back as health.',
                    energy: [],
                    target: 'single-enemy',
                    damage: 0,
                    cooldown: 2,
                    classes: ['Physical', 'Melee', 'Instant'],
                    effects: [
                        {
                            type: 'health_steal_damage',
                            // 0 base - per feedback, the whole amount comes
                            // from consumed Blood below (same
                            // bonusPerStatusMetadata/consumeStatus
                            // mechanism Life Rip already proves works,
                            // just multiplier:0.5 - "half the amount of
                            // blood spent" - instead of Life Rip's 6, and
                            // health_steal_damage instead of plain damage
                            // so it heals the caster too).
                            amount: 0,
                            scope: 'target',
                            metadata: {
                                ignoreDamageReduction: true, // "piercing damage"
                                bonusPerStatusMetadata: {
                                    statusId: 'vampire_blood_resource',
                                    metadataKey: 'bloodStacks',
                                    multiplier: 0.5,
                                    scope: 'self',
                                    consumeStatus: true,
                                },
                            },
                        },
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
                    skilldescription: 'Curse the enemy’s blood, souring it in their veins and weakening the force behind their strikes.',
                    energy: [],
                    target: 'single-enemy',
                    damage: 0,
                    cooldown: 3,
                    classes: ['Bloodline', 'Instant'],
                    effects: [
                        {
                            type: 'apply_status',
                            statusId: 'hemonancer_blood_curse_status',
                            duration: 3,
                            scope: 'target',
                            metadata: {
                                harmful: true,
                                // A real percent, not a flat DamageDebuff -
                                // nonAfflictionDamageMultiplier is a real,
                                // proven engine primitive (battleEngine.js)
                                // that multiplies the STATUS HOLDER's own
                                // outgoing (non-affliction) damage - reads
                                // "sourceTotals" specifically when THIS
                                // unit is the attacker, confirmed by
                                // reading the multiplication site directly,
                                // not assumed. Doesn't touch this turnEndDamage
                                // tick below (that's affliction damage,
                                // exempted from this multiplier by the same
                                // engine code).
                                nonAfflictionDamageMultiplier: 0.5,
                                // turnEndDamage + afflictionDamage:true is
                                // the same "This character takes N
                                // affliction damage each turn" primitive
                                // already proven elsewhere in the vendored
                                // engine - applied to the enemy (scope:
                                // 'target' above), it bleeds them for 7
                                // every turn this is active.
                                turnEndDamage: 7,
                                afflictionDamage: true,
                                tooltipText: 'Blood Curse: deals 50% less damage and takes 7 affliction damage each turn, for 3 turns.',
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
                skilldescription: 'A reckless melee lifesteal strike, drawing deep on the hunger.',
                energy: [],
                target: 'single-enemy',
                damage: 0,
                // Raised from 1 - "for 3 turns" (per feedback) read as
                // this skill's own new reuse timer rather than a
                // multi-turn auto-ticking effect: this engine's turn-end
                // recurring-effect primitives (turnEndDamage/
                // turnEndHealFlat, used elsewhere in this file) are all
                // self-scoped - they damage/heal whoever HOLDS the status,
                // not a specific opponent chosen at cast time - so a true
                // "automatically steal from the enemy every turn for 3
                // turns" effect isn't something this engine's proven
                // primitives support without a real risk of quietly
                // building something that doesn't work as intended.
                cooldown: 3,
                classes: ['Physical', 'Melee', 'Instant'],
                effects: [
                    // amounts raised from 14/(no Blood) to 12 health stolen
                    // + 12 Blood gained, per feedback.
                    { type: 'health_steal_damage', amount: 12, scope: 'target' },
                    {
                        type: 'apply_status',
                        statusId: 'vampire_blood_resource',
                        duration: 99,
                        scope: 'self',
                        metadata: {
                            harmful: false,
                            infiniteDuration: true,
                            stackMetadataKey: 'bloodStacks',
                            stackDelta: 12,
                            stackMax: 10,
                            tooltipTextTemplate: 'Blood: {bloodStacks}/10',
                        },
                    },
                ],
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
                        // Long enough to read as "lasts until it breaks",
                        // not a short timed buff like the old flat
                        // mitigation this replaced - a shield dying to
                        // plain expiry rather than actually absorbing a
                        // hit would feel wrong for this mechanic.
                        duration: 6,
                        scope: 'self',
                        metadata: {
                            harmful: false,
                            // destructibleDefensePoints is a real, proven
                            // engine primitive (battleEngine.js) - a shield
                            // pool that absorbs incoming damage before HP,
                            // ticking down per hit rather than per turn.
                            // onBreakDamageToSourceAmount is the engine's
                            // own "counterattack when the shield reaches 0"
                            // hook, read from this exact status right when
                            // its destructibleDefensePoints hits 0 - fires
                            // automatically against whichever enemy dealt
                            // the breaking hit, no extra wiring needed.
                            destructibleDefensePoints: 30,
                            onBreakDamageToSourceAmount: 30,
                            onBreakDamageToSourceLabel: 'Blood Ward bursts',
                            tooltipText: 'Blood Ward: a 30-point shield. Bursts for 30 damage to whatever breaks it.',
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
                skilldescription: 'Refined mastery: slip half into shadow, striking harder from it.',
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
                            // Per feedback: real evasion instead of the old
                            // flat damageReductionFlat, and a bigger damage
                            // bonus (10, was 4) - evadeChancePercent is the
                            // same proven primitive Mist Form/the level-2
                            // evasion picks already use.
                            evadeChancePercent: 30,
                            damageBonusFlat: 10,
                            tooltipText: 'Shadow Veil: 30% chance to evade an attack, deals 10 more damage, for 2 turns.',
                        },
                    },
                ],
            },
        },
    };

    const api = { ORIGINS, LINEAGES, AGES, XP_TABLE, XP_PER_ENCOUNTER, LEVEL_CHOICES, SPECIALIZATION_UNLOCK_LEVEL, SPECIALIZATIONS };
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = api;
    }
    if (root) {
        root.VampireProgression = api;
    }
})(typeof window !== 'undefined' ? window : undefined);
