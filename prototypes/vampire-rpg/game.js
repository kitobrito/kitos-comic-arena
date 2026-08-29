(function () {
    'use strict';
    const BE = window.BattleEngine;
    const ROSTER = window.__modules.characters;
    const PROGRESSION = window.VampireProgression;
    const BASE_VAMPIRE = ROSTER.find((c) => c.characterId === 'vampire');

    const DAY_STATUS_ID = 'vampire_daylight_curse';
    const NIGHT_STATUS_ID = 'vampire_night_blessing';
    const BLOOD_STATUS_ID = 'vampire_blood_resource';
    // Base Armor (flat damage reduction) every Vampire has regardless of
    // Origin - stronger at night, same as everything else about the curse.
    // Rides the day/night curse status's own metadata (see
    // curseMetadataFor()) rather than a separate status, so it's always in
    // sync with whichever of the two is currently active.
    const PLAYER_ARMOR = { day: 2, night: 4 };

    // Vampire has a full pose set (see assets/); 'idle' and 'death' are the
    // two *persistent* poses (tracked in state.vampirePose, used by render()).
    // The rest are transient action-sequence frames applied directly to the
    // <img> via setVampireImage(), outside of state, then reverted to
    // whatever the persistent pose currently is.
    const VAMPIRE_POSES = {
        idle: 'assets/vampire-standing.png',
        windup: 'assets/vampire-half-lunge.png',
        vampire_bite: 'assets/vampire-bite.png',
        life_rip: 'assets/vampire-life-rip.png',
        vampire_guard: 'assets/vampire-guard.png',
        // Dedicated hit-reaction art (previously reused vampire-guard.png
        // for this, before dedicated hit art existed).
        hit: 'assets/vampire-hit.png',
        death: 'assets/vampire-defeated.png',
        levelup: 'assets/vampire-level-up.png',
        // Milestone 3 branch-skill poses. Blood Ward and Blood Projectile
        // are 2/3-frame sequences (see SKILL_ACTION_POSE below); the rest
        // are single poses.
        feral_rampage: 'assets/vampire-rampage.png',
        feral_blood_frenzy: 'assets/vampire-blood-frenzy.png',
        hemonancer_blood_ward_1: 'assets/vampire-blood-ward-1.png',
        hemonancer_blood_ward_2: 'assets/vampire-blood-ward-2.png',
        hemonancer_blood_projectile_1: 'assets/vampire-blood-projectile-1.png',
        hemonancer_blood_projectile_2: 'assets/vampire-blood-projectile-2.png',
        hemonancer_blood_projectile_3: 'assets/vampire-blood-projectile-3.png',
        elder_mastery_shadow_veil: 'assets/vampire-shadow-veil.png',
        elder_mastery_mist_form: 'assets/vampire-mist-form.png',
        elder_mastery_charm: 'assets/vampire-charm.png',
        // Multi-spec transformed idle forms - see playerIdlePoseKey()
        // below. Only stage 1 of each combo exists in this prototype -
        // the campaign is short enough that no character reaches further
        // than that no matter how they spec (see investedSpecializations).
        form_feral: 'assets/form-feral-1.png',
        form_hemo: 'assets/form-hemo-1.png',
        form_shadow: 'assets/form-shadow-1.png',
        form_hemo_feral: 'assets/form-hemo-feral-1.png',
        form_shadow_feral: 'assets/form-shadow-feral-1.png',
        form_shadow_hemo: 'assets/form-shadow-hemo-1.png',
        form_shadow_hemo_feral: 'assets/form-shadow-hemo-feral-1.png',
        // 3-frame walk cycle played before a Melee-tagged skill's own
        // action pose (see playPlayerAction) - one set per current
        // appearance (base/feral/hemo/shadow), see playerWalkFrames().
        // Not tied to a skill id (SKILL_ACTION_POSE) since it's a shared
        // pre-attack flourish, not any one skill's own pose.
        walk_base_1: 'assets/vampire-walk-1.png',
        walk_base_2: 'assets/vampire-walk-2.png',
        walk_base_3: 'assets/vampire-walk-3.png',
        // Feral and Hemo each got extended to a 6-frame cycle (playerWalkFrames
        // returns all 6 for these two specifically - see WALK_FRAME_COUNT).
        // Hemo's new frames were inserted BEFORE its original 3, which were
        // renumbered 4-6 rather than reshuffled in place.
        walk_feral_1: 'assets/feral-walk-1.png',
        walk_feral_2: 'assets/feral-walk-2.png',
        walk_feral_3: 'assets/feral-walk-3.png',
        walk_feral_4: 'assets/feral-walk-4.png',
        walk_feral_5: 'assets/feral-walk-5.png',
        walk_feral_6: 'assets/feral-walk-6.png',
        walk_hemo_1: 'assets/hemo-walk-1.png',
        walk_hemo_2: 'assets/hemo-walk-2.png',
        walk_hemo_3: 'assets/hemo-walk-3.png',
        walk_hemo_4: 'assets/hemo-walk-4.png',
        walk_hemo_5: 'assets/hemo-walk-5.png',
        walk_hemo_6: 'assets/hemo-walk-6.png',
        walk_shadow_1: 'assets/shadow-walk-1.png',
        walk_shadow_2: 'assets/shadow-walk-2.png',
        walk_shadow_3: 'assets/shadow-walk-3.png',
        // Full hybrid-combo walk sets now exist too (matches every form_X
        // combo already in this file) - playerWalkFrames() uses these
        // directly instead of falling back to a single spec's set.
        walk_hemo_feral_1: 'assets/hemo-feral-walk-1.png',
        walk_hemo_feral_2: 'assets/hemo-feral-walk-2.png',
        walk_hemo_feral_3: 'assets/hemo-feral-walk-3.png',
        walk_shadow_feral_1: 'assets/shadow-feral-walk-1.png',
        walk_shadow_feral_2: 'assets/shadow-feral-walk-2.png',
        walk_shadow_feral_3: 'assets/shadow-feral-walk-3.png',
        walk_shadow_hemo_1: 'assets/shadow-hemo-walk-1.png',
        walk_shadow_hemo_2: 'assets/shadow-hemo-walk-2.png',
        walk_shadow_hemo_3: 'assets/shadow-hemo-walk-3.png',
        walk_shadow_hemo_feral_1: 'assets/shadow-hemo-feral-walk-1.png',
        walk_shadow_hemo_feral_2: 'assets/shadow-hemo-feral-walk-2.png',
        walk_shadow_hemo_feral_3: 'assets/shadow-hemo-feral-walk-3.png',
    };
    // The idle pose is tall and narrow; the lunge/bite poses are wide
    // action shots. Since .figure's height is fixed (see style.css), a wide
    // pose at the same height renders much wider than idle and reads as
    // oversized. Shrink the figure's height for those specific poses so
    // they stay contained; poses not listed here use the base CSS height.
    const VAMPIRE_POSE_HEIGHT = {
        windup: '34cqh',
        vampire_bite: '32cqh',
        life_rip: '42cqh',
        // The Milestone 3 branch-skill art (below) shares one 351x710
        // canvas, but unlike idle - which fills ~99.6% of ITS canvas
        // height edge to edge - each of these poses only fills 65-83% of
        // theirs (crouched/dynamic poses leave headroom/legroom idle
        // doesn't). At the base height that reads as a noticeably SMALLER
        // character, not a same-scale action pose - so each gets scaled
        // up by the inverse of its own content-fill ratio (measured via a
        // pixel-alpha bounding-box scan of the actual art, not guessed) to
        // land back at roughly idle's true on-screen character size.
        feral_rampage: '71cqh',
        feral_blood_frenzy: '65cqh',
        hemonancer_blood_ward_1: '55cqh',
        hemonancer_blood_ward_2: '58cqh',
        hemonancer_blood_projectile_1: '63cqh',
        hemonancer_blood_projectile_2: '63cqh',
        hemonancer_blood_projectile_3: '63cqh',
        elder_mastery_shadow_veil: '68cqh',
        elder_mastery_mist_form: '60cqh',
        elder_mastery_charm: '56cqh',
        // Multi-spec transformed idle forms - see playerIdlePoseKey()
        // below. Same content-fill-scan reasoning as above; these fill
        // 79-92% of their canvas (standing portraits, not dynamic action
        // shots), so the corrections are milder.
        form_feral: '54cqh',
        form_hemo: '50cqh',
        form_shadow: '58cqh',
        form_hemo_feral: '50cqh',
        form_shadow_feral: '54cqh',
        form_shadow_hemo: '50cqh',
        form_shadow_hemo_feral: '50cqh',
        // Same content-fill-scan reasoning as above (measured directly from
        // the art). The shadow set's middle frame dissolves into a
        // shapeless shadow-wisp (not bottom-anchored like a normal stride -
        // by design, matching Mist Form's aesthetic), so its true fill
        // ratio isn't comparable to a standing pose's - sized to match its
        // two neighboring grounded frames instead of the raw scan number,
        // so the 3-frame cycle doesn't visibly pop in size mid-swap.
        walk_base_1: '54cqh',
        walk_base_2: '54cqh',
        walk_base_3: '49cqh',
        walk_feral_1: '61cqh',
        // Reported live as visibly too large in the actual battle scene
        // compared to its neighbors, despite the formula putting it close
        // to frames 1/3 - cut down by feel rather than by the raw scan.
        walk_feral_2: '54cqh',
        walk_feral_3: '62cqh',
        // New frames 4-6 are lower-crouch dynamic poses with more head/
        // footroom in their own canvas than 1-3 - capped near this game's
        // existing high end (feral_rampage sits at 71cqh) instead of the
        // raw scan formula, which would swing as high as ~124cqh and pop
        // wildly mid-cycle against frames 1-3.
        walk_feral_4: '72cqh',
        walk_feral_5: '74cqh',
        walk_feral_6: '70cqh',
        // walk_hemo_1/2/3 are the NEW inserted frames (measured fresh);
        // walk_hemo_4/5/6 carry the ORIGINAL 3 frames' own heights
        // forward unchanged, just renumbered.
        walk_hemo_1: '60cqh',
        walk_hemo_2: '54cqh',
        walk_hemo_3: '54cqh',
        walk_hemo_4: '55cqh',
        walk_hemo_5: '56cqh',
        walk_hemo_6: '49cqh',
        walk_shadow_1: '60cqh',
        walk_shadow_2: '62cqh',
        walk_shadow_3: '62cqh',
        // Hybrid-combo walk art is a low, dynamic crouched-run pose (not a
        // tall standing stride) across all three frames of every combo set,
        // so its fill ratio runs much lower (40-53%) than the single-spec
        // sets above - flat per-set values (matched within each set so the
        // 3 frames don't visibly pop in size) rather than the raw
        // formula, same reasoning as walk_shadow_2 above.
        walk_hemo_feral_1: '64cqh',
        walk_hemo_feral_2: '64cqh',
        walk_hemo_feral_3: '64cqh',
        walk_shadow_feral_1: '66cqh',
        walk_shadow_feral_2: '66cqh',
        walk_shadow_feral_3: '66cqh',
        walk_shadow_hemo_1: '57cqh',
        walk_shadow_hemo_2: '57cqh',
        walk_shadow_hemo_3: '57cqh',
        walk_shadow_hemo_feral_1: '65cqh',
        walk_shadow_hemo_feral_2: '65cqh',
        walk_shadow_hemo_feral_3: '65cqh',
    };
    // Milestone 3+: the player can invest in more than one specialization
    // (see renderLevelUpScreen - level 5/6 branch choices are no longer
    // filtered to just the character's primary pick), and their idle
    // appearance transforms to reflect whichever specialization(s) they've
    // actually put choices into. Internal specialization ids -> the short
    // key used both in VAMPIRE_POSES/VAMPIRE_POSE_HEIGHT's form_X entries
    // and in the art's own file naming.
    const SPEC_ART_KEY = { feral: 'feral', hemonancer: 'hemo', elder_mastery: 'shadow' };
    // Combined-key ordering always follows this sequence (matches the
    // source art's own file-naming convention: shadow-hemo-feral, not
    // e.g. feral-hemo-shadow).
    const SPEC_ART_ORDER = ['shadow', 'hemo', 'feral'];
    // Every specialization choice the character has actually picked -
    // their level-4 primary pick, plus any level 5/6 branch skill picked
    // from a DIFFERENT specialization's option (now allowed - see
    // renderLevelUpScreen). Returns a Set of internal specialization ids.
    // Weighted "investment points" toward each specialization - the real
    // level 4 pick (characterSave.specialization) is worth
    // PRIMARY_SPEC_POINTS on its own; every other spec-tagged pick (level
    // 2/3's hidden choices, or a level 5/6 branch skill from ANY tree, not
    // just the primary one) is worth 1. A single uniform rule then decides
    // what "counts" (see investedSpecializations below): >= SPEC_POINTS_TO_SHOW
    // - the primary clears that on its own with room to spare, so it never
    // needs special-casing, while a second specialization only shows up
    // once at least two separate picks have actually gone toward it, not
    // just one stray choice.
    const PRIMARY_SPEC_POINTS = 4;
    const SPEC_POINTS_TO_SHOW = 2;
    function specializationPoints(characterSave) {
        const points = {};
        if (characterSave.specialization) {
            points[characterSave.specialization] = (points[characterSave.specialization] || 0) + PRIMARY_SPEC_POINTS;
        }
        (characterSave.levelChoiceIds || []).forEach((choiceId) => {
            Object.values(PROGRESSION.LEVEL_CHOICES).forEach((options) => {
                const found = options.find((c) => c.id === choiceId);
                if (found && found.requiresSpecialization) {
                    points[found.requiresSpecialization] = (points[found.requiresSpecialization] || 0) + 1;
                }
            });
        });
        return points;
    }
    function investedSpecializations(characterSave) {
        const points = specializationPoints(characterSave);
        const specs = new Set();
        Object.keys(points).forEach((id) => {
            if (points[id] >= SPEC_POINTS_TO_SHOW) specs.add(id);
        });
        return specs;
    }
    // The combined art key for whatever the character has invested in so
    // far (e.g. 'shadow-feral'), or null if not specialized yet at all.
    function comboArtKeyFor(characterSave) {
        // The character's LOOK stays the base form until the real
        // specialization choice (level 4's "Choose Your Path") is made,
        // even if a hidden level-2 pick already counts as an investment
        // (see LEVEL_CHOICES[2] in progression.js) - it should count
        // toward the eventual combo once specialized, not transform the
        // character early on its own.
        if (!characterSave.specialization) return null;
        const specs = investedSpecializations(characterSave);
        if (specs.size === 0) return null;
        const artKeys = new Set(Array.from(specs).map((id) => SPEC_ART_KEY[id]));
        return SPEC_ART_ORDER.filter((k) => artKeys.has(k)).join('-');
    }
    // "Feral" for a single specialization, "Shadow + Feral" for a
    // multi-spec build, or '' if not specialized yet - the one shared
    // formatter for every "Specialization" display spot (title slot card,
    // header subtitles, Camp's character sheet). Same shadow/hemo/feral
    // ordering as SPEC_ART_ORDER, just in internal-id form.
    const SPEC_ID_ORDER = ['elder_mastery', 'hemonancer', 'feral'];
    function specializationLabel(characterSave) {
        const specs = investedSpecializations(characterSave);
        if (specs.size === 0) return '';
        return SPEC_ID_ORDER.filter((id) => specs.has(id))
            .map((id) => PROGRESSION.SPECIALIZATIONS[id].name)
            .join(' + ');
    }
    // The pose key (into VAMPIRE_POSES/VAMPIRE_POSE_HEIGHT) for the
    // player's current idle appearance - the base standing pose until
    // they've specialized, then their transformed form.
    function playerIdlePoseKey() {
        const key = save && save.character ? comboArtKeyFor(save.character) : null;
        return key ? 'form_' + key.replace(/-/g, '_') : 'idle';
    }
    // The 3-frame walk-cycle pose keys (into VAMPIRE_POSES) matching the
    // player's CURRENT appearance, played as a walk-up flourish before a
    // Melee-tagged skill's own action pose (see playPlayerAction). Every
    // combo comboArtKeyFor can produce now has a matching walk_X set (base
    // plus all 7 specialization combos), so this mirrors comboArtKeyFor
    // exactly rather than approximating with a single spec.
    function playerWalkFrames() {
        const key = save && save.character ? comboArtKeyFor(save.character) : null;
        const primary = key ? key.replace(/-/g, '_') : 'base';
        // Feral and Hemo (pure, non-hybrid appearances only) each got
        // extended to a 6-frame walk cycle; base, Shadow, and every hybrid
        // combo still have 3.
        const frameCount = (primary === 'feral' || primary === 'hemo') ? 6 : 3;
        // Pose KEYS (into VAMPIRE_POSES/VAMPIRE_POSE_HEIGHT), not resolved
        // paths - setVampireImage does that lookup itself, and also needs
        // the key to apply the matching height override.
        const frames = [];
        for (let i = 1; i <= frameCount; i++) frames.push('walk_' + primary + '_' + i);
        return frames;
    }
    // .camp-figure's height/bottom (style.css) were hand-tuned specifically
    // for vampire-standing.png's crop (99.6% content-fill - see
    // VAMPIRE_POSE_HEIGHT's own comment) to get the "big, centered,
    // feet-not-visible" look. The form_X portraits fill less of their own
    // canvas (79-92%), so both values scale up together by the same
    // content-fill-deficit factor to preserve that same crop framing
    // instead of just going bigger and shifting the crop point.
    const CAMP_FIGURE_OVERRIDE = {
        form_feral: { height: '170%', bottom: '-64%' },
        form_hemo: { height: '156%', bottom: '-59%' },
        form_shadow: { height: '182%', bottom: '-69%' },
        form_hemo_feral: { height: '157%', bottom: '-60%' },
        form_shadow_feral: { height: '170%', bottom: '-64%' },
        form_shadow_hemo: { height: '156%', bottom: '-59%' },
        form_shadow_hemo_feral: { height: '156%', bottom: '-59%' },
    };
    // Enemies only have illustrated art for the original three; the five
    // Milestone 2 additions reuse that art with a CSS tint filter (see
    // .figure.char-X in style.css) as a clearly-flagged placeholder pending
    // real art - same spirit as the earlier character-art placeholder pass,
    // just scoped to these five.
    const ENEMY_ART = {
        'goblin-grunt': 'assets/goblin-grunt.png',
        'skeleton': 'assets/skeleton.png',
        'giant-rat': 'assets/giant-rat.png',
        'zombie': 'assets/zombie.png',
        // ?v=2 on these three specifically - their source PNGs got
        // cropped in place (real transparent padding removed, see the
        // sizing-audit comment on .figure.char-* in style.css) without a
        // filename change, so a browser that already cached the old
        // (padded) bytes under this same path needs a new query string
        // to actually re-fetch.
        'hobgoblin-archer': 'assets/goblin-archer.png?v=2',
        'goblin-shaman': 'assets/goblin-shaman.png',
        'goblin-sneak': 'assets/goblin-sneak.png?v=2',
        // Display name "Goblin Warrior" (see characters.source.js) - a
        // goblin in heavy armor, not a distinct hobgoblin species.
        'hobgoblin-warrior': 'assets/goblin-warrior.png?v=2',
    };
    // Attack/hit/defeated pose sets, for every enemy - the whole roster now
    // has real art, no placeholders left. Mirrors VAMPIRE_POSES/
    // setVampireImage below, just keyed by characterId instead of skill id.
    // `attack` may be a single path or an array of paths played as a
    // sequence (see playEnemyPoseSequence) - Goblin Grunt/Skeleton/Giant
    // Rat predate that and stay single-frame. `buff` is a separate pose
    // for an enemy's own self-target skill (see chooseEnemyAction's
    // poseKey logic) - falls back to idle for enemies with no dedicated
    // one (Skeleton's Brittle Guard, Goblin Warrior's Shield Wall, etc.).
    const ENEMY_POSES = {
        'goblin-grunt': {
            idle: 'assets/goblin-grunt.png',
            attack: 'assets/goblin-grunt-attack.png',
            hit: 'assets/goblin-grunt-hit.png',
            defeated: 'assets/goblin-grunt-defeated.png',
        },
        'skeleton': {
            idle: 'assets/skeleton.png',
            attack: 'assets/skeleton-attack.png',
            hit: 'assets/skeleton-hit.png',
            defeated: 'assets/skeleton-defeated.png',
        },
        'giant-rat': {
            idle: 'assets/giant-rat.png',
            attack: 'assets/giant-rat-attack.png',
            hit: 'assets/giant-rat-hit.png',
            defeated: 'assets/giant-rat-defeated.png',
        },
        'zombie': {
            idle: 'assets/zombie.png',
            attack: ['assets/zombie-attack-1.png', 'assets/zombie-attack-2.png'],
            hit: 'assets/zombie-hit.png',
            defeated: 'assets/zombie-defeated.png',
        },
        'hobgoblin-archer': {
            idle: 'assets/goblin-archer.png?v=2',
            attack: ['assets/goblin-archer-attack-1.png', 'assets/goblin-archer-attack-2.png'],
            hit: 'assets/goblin-archer-hit.png',
            defeated: 'assets/goblin-archer-defeated.png',
            // Not a pose - the arrow sprite fired alongside the attack
            // sequence (see fireProjectile / showTurnEffects).
            projectile: 'assets/goblin-archer-projectile.png',
        },
        'goblin-shaman': {
            idle: 'assets/goblin-shaman.png',
            attack: 'assets/goblin-shaman-spell.png',
            // A second, distinct pose for Mending Chant specifically (see
            // showTurnEffects) - the offensive spell art doesn't fit
            // healing itself or an ally.
            heal: 'assets/goblin-shaman-heal-spell.png',
            hit: 'assets/goblin-shaman-hit.png',
            defeated: 'assets/goblin-shaman-defeated.png',
        },
        'goblin-sneak': {
            idle: 'assets/goblin-sneak.png?v=2',
            attack: 'assets/goblin-sneak-attack.png',
            // Slip Away (self-target) gets its own "vanish into shadow"
            // pose instead of the attack lunge - see chooseEnemyAction.
            buff: 'assets/goblin-sneak-buff.png',
            hit: 'assets/goblin-sneak-hit.png',
            defeated: 'assets/goblin-sneak-defeated.png',
        },
        'hobgoblin-warrior': {
            idle: 'assets/goblin-warrior.png?v=2',
            attack: ['assets/goblin-warrior-attack-1.png', 'assets/goblin-warrior-attack-2.png'],
            hit: 'assets/goblin-warrior-hit.png',
            defeated: 'assets/goblin-warrior-defeated.png',
        },
    };

    // Each encounter's own illustrated locale (one photo, not a day/night
    // pair - see the .night-tint CSS rule for how the day/night curse
    // toggle still reads as a mood shift over a single background image).
    // Single enemy per encounter for now (per feedback - the multi-enemy
    // groupings and their occupancy/lane mechanic were pulled back out,
    // "lets stick to one single enemy for the time being. 1 on 1 combat").
    // Each entry below keeps its original encounter's background/theme but
    // was trimmed to one representative enemy, chosen so nothing repeats
    // across the whole campaign and the back half still escalates.
    const CAMPAIGN = [
        { label: 'A Lone Goblin Grunt', enemies: ['goblin-grunt'], bg: 'assets/bg-goblin-cave.jpg' },
        { label: 'A Goblin Sneak', enemies: ['goblin-sneak'], bg: 'assets/bg-forest-day.jpg' },
        { label: 'A Restless Skeleton', enemies: ['skeleton'], bg: 'assets/bg-graveyard.jpg' },
        { label: 'A Goblin Shaman', enemies: ['goblin-shaman'], bg: 'assets/bg-abandoned-village.jpg' },
        // By this point the player has specialized - this finale exists so
        // there's at least one fight left to actually feel that choice in,
        // not just pick it and see the campaign end.
        { label: "The Warband's Last Warrior", enemies: ['hobgoblin-warrior'], bg: 'assets/bg-forest-night.jpg' },
        // Milestone 3: exists so there's a fight left to use the first
        // specialization "branch" skill (unlocked after encounter 5) in -
        // same reasoning as the encounter above.
        { label: "The Elder's Trial", enemies: ['zombie'], bg: 'assets/bg-ruined-castle.jpg' },
    ];

    // --- UI sound effects (JDSherbert's free Ultimate UI SFX Pack) ---------
    // Several numbered variants per category (mp3, mono - smallest/most
    // compatible of the pack's formats for short one-shot blips) - a
    // category with more than one variant picks randomly each play so
    // frequent sounds (select, cursor) don't feel like the same clip on
    // repeat.
    const SFX = {
        select: ['assets/sfx-select-1.mp3', 'assets/sfx-select-2.mp3'],
        cancel: ['assets/sfx-cancel-1.mp3', 'assets/sfx-cancel-2.mp3'],
        cursor: ['assets/sfx-cursor-1.mp3', 'assets/sfx-cursor-2.mp3', 'assets/sfx-cursor-3.mp3', 'assets/sfx-cursor-4.mp3', 'assets/sfx-cursor-5.mp3'],
        error: ['assets/sfx-error-1.mp3'],
        popupOpen: ['assets/sfx-popup-open-1.mp3'],
        popupClose: ['assets/sfx-popup-close-1.mp3'],
        swipe: ['assets/sfx-swipe-1.mp3', 'assets/sfx-swipe-2.mp3'],
    };
    // A fresh Audio() per play (not a shared/reused element) so two quick
    // clicks can overlap instead of the second cutting the first off.
    // Wrapped in try/catch + a swallowed play() rejection since browsers
    // can block audio before the page has seen a user gesture - a blocked
    // sound should never be a console error, just silently skipped.
    function playSfx(category) {
        const variants = SFX[category];
        if (!variants || !variants.length) return;
        try {
            const src = variants[Math.floor(Math.random() * variants.length)];
            const audio = new Audio(src);
            audio.volume = 0.5;
            const p = audio.play();
            if (p && p.catch) p.catch(() => {});
        } catch (err) {
            // Ignore - sound is a nice-to-have, never worth breaking a click over.
        }
    }

    // --- Save / persistence -------------------------------------------------
    // Multiple character slots, all under one localStorage key (an array of
    // save-or-null). `activeSlotIndex` tracks which slot the in-memory
    // `save` belongs to, so writeSave() always lands in the right place.

    const SAVES_KEY = 'vampire-rpg-saves-v2';
    const SLOT_COUNT = 3;

    function loadSlots() {
        try {
            const raw = window.localStorage.getItem(SAVES_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            const slots = Array.isArray(parsed && parsed.slots) ? parsed.slots.slice(0, SLOT_COUNT) : [];
            while (slots.length < SLOT_COUNT) slots.push(null);
            return slots;
        } catch (err) {
            return new Array(SLOT_COUNT).fill(null);
        }
    }
    function writeSlots(slots) {
        try {
            window.localStorage.setItem(SAVES_KEY, JSON.stringify({ version: 2, slots }));
        } catch (err) {
            // Private browsing / storage disabled - progress just won't
            // survive a reload this session. Not fatal.
        }
    }
    function writeSave(saveToWrite) {
        if (activeSlotIndex == null) return;
        const slots = loadSlots();
        slots[activeSlotIndex] = saveToWrite;
        writeSlots(slots);
    }
    function clearSlot(index) {
        const slots = loadSlots();
        slots[index] = null;
        writeSlots(slots);
    }
    function newSave(origin, age, name) {
        return {
            version: 1,
            character: { name: name || 'Vampire', origin, age, specialization: null, level: 1, xp: 0, levelChoiceIds: [] },
            campaign: { encounterIndex: 0, completed: false },
        };
    }

    let save = null;
    let activeSlotIndex = null; // which of the SLOT_COUNT slots `save` came from / saves back to
    let screen = 'title';
    let creationDraft = null; // { origin, age, name } while creating, before confirm
    let state = null; // ephemeral battle state, unchanged shape from Milestone 1

    // --- Character composition -----------------------------------------------

    // Builds a fresh roster entry from the base Vampire template + this
    // save's origin/age/level/specialization/level-choices, following only
    // effect types and metadata keys already proven in this codebase (see
    // engine/progression.js's comments for which mechanic each piece rides
    // on). Pushed onto ROSTER and referenced by index - the same array the
    // vendored engine already reads by index, so no engine changes needed.
    function buildComposedVampire(characterSave) {
        const character = JSON.parse(JSON.stringify(BASE_VAMPIRE));
        const origin = PROGRESSION.ORIGINS[characterSave.origin];
        const age = PROGRESSION.AGES[characterSave.age];
        const level = characterSave.level;

        // Decay only ever erodes a POSITIVE bonus toward 0 (Neonate
        // "leveling off") - it must never push an age's own negative bonus
        // (Elder's -2) up toward 0, or Elder would lose its identity.
        const decayedAgePower = age.powerBonus > 0
            ? Math.max(0, age.powerBonus - age.powerDecayPerLevel * (level - 1))
            : age.powerBonus;

        const choiceBonuses = { maxHp: 0, bloodCap: 0, power: 0, evasion: 0 };
        const choiceSkills = [];
        // Level 3's secretly-spec-tagged passives (see LEVEL_CHOICES[3]) -
        // a real permanent status pushed onto startStatuses below, same as
        // every other choice here grants its effect immediately on pick.
        const choicePassives = [];
        let biteBloodBonus = 0;
        (characterSave.levelChoiceIds || []).forEach((choiceId) => {
            Object.values(PROGRESSION.LEVEL_CHOICES).forEach((options) => {
                const found = options.find((c) => c.id === choiceId);
                if (!found) return;
                if (found.kind === 'skill') {
                    choiceSkills.push(found.skill);
                } else if (found.kind === 'passive') {
                    if (found.passiveStatus) choicePassives.push(found.passiveStatus);
                    if (found.biteBloodBonus) biteBloodBonus += found.biteBloodBonus;
                    // nightStatBonus (Shadow's level 3 pick) isn't applied
                    // here - curseMetadataFor reads the choice id directly,
                    // since the curse status is also (re)built outside
                    // buildComposedVampire (manual Day/Night toggle, a
                    // Night-start encounter roll).
                } else {
                    choiceBonuses[found.kind] += found.value;
                }
            });
        });

        const power = Math.round(origin.powerBonus + decayedAgePower + choiceBonuses.power);
        const bloodCap = 10 + origin.bloodCapBonus + age.bloodCapModifier + choiceBonuses.bloodCap;

        const bite = character.skills.find((s) => s.id === 'vampire_bite');
        bite.effects[0].amount += power;
        bite.effects[1].amount += power;
        bite.effects[3].metadata.stackMax = bloodCap;
        // Hemonancer's level 3 pick ("+5 Blood Drained") - see LEVEL_CHOICES[3].
        if (biteBloodBonus) bite.effects[3].metadata.stackDelta += biteBloodBonus;

        const lifeRip = character.skills.find((s) => s.id === 'life_rip');
        lifeRip.effects[0].amount += power;

        const dayCurse = character.startStatuses.find((s) => s.id === DAY_STATUS_ID);
        Object.assign(dayCurse.metadata, curseMetadataFor(characterSave, 'day'));

        character.startingHp = 100 + choiceBonuses.maxHp;

        // Level 2's "preview" evasion picks (see LEVEL_CHOICES) - a small
        // PERMANENT evadeChancePercent status, confirmed additive with a
        // temporary one like Mist Form's (battleEngine.js sums every
        // active status's evadeChancePercent, not last-write-wins).
        if (choiceBonuses.evasion > 0) {
            character.startStatuses.push({
                id: 'vampire_innate_evasion',
                duration: 999,
                metadata: {
                    infiniteDuration: true,
                    harmful: false,
                    evadeChancePercent: choiceBonuses.evasion,
                    tooltipText: choiceBonuses.evasion + '% chance to evade an attack entirely.',
                },
            });
        }

        choicePassives.forEach((status) => {
            character.startStatuses.push(JSON.parse(JSON.stringify(status)));
        });

        // Milestone 3 specialization "branch" skills, picked via the level-
        // up screen (kind:'skill' entries in LEVEL_CHOICES) - same
        // deep-clone-and-push pattern as the specialization's own unlock
        // skill just below.
        choiceSkills.forEach((skill) => {
            character.skills.push(JSON.parse(JSON.stringify(skill)));
        });

        if (characterSave.specialization) {
            const spec = PROGRESSION.SPECIALIZATIONS[characterSave.specialization];
            character.skills.push(JSON.parse(JSON.stringify(spec.skill)));
            if (spec.passiveStartStatus) {
                character.startStatuses.push(JSON.parse(JSON.stringify(spec.passiveStartStatus)));
            }
            if (spec.biteBonusPerBlood) {
                bite.effects[0].metadata = Object.assign({}, bite.effects[0].metadata, {
                    bonusPerStatusMetadata: spec.biteBonusPerBlood,
                });
            }
        }

        character.id = 'vampire-composed-' + ROSTER.length;
        character.name = characterSave.name || 'Vampire';
        ROSTER.push(character);
        return ROSTER.length - 1;
    }

    function curseMetadataFor(characterSave, mode) {
        const curseFlat = PROGRESSION.ORIGINS[characterSave.origin].curseFlat;
        const armorAmount = PLAYER_ARMOR[mode];
        if (mode === 'day') {
            return {
                infiniteDuration: true, harmful: true,
                DamageDebuff: curseFlat, damageTakenBonusFlat: curseFlat, healingBonusFlat: -curseFlat,
                // Armor still mitigates incoming damage during the day, on
                // top of (not instead of) the curse's own penalty above.
                damageReductionFlat: armorAmount,
                armorAmount: armorAmount, // engine-unread marker key - see getArmorAmount()
                tooltipText: 'Daylight Curse: deals ' + curseFlat + ' less damage, takes ' + curseFlat + ' more damage, heals ' + curseFlat + ' less. Armor ' + armorAmount + '.',
            };
        }
        // Level 3's secretly-Shadow pick ("+5 Stats at Night") merges
        // straight into the Night Blessing itself rather than a second
        // status - looked up by choice id directly since curseMetadataFor
        // is also called for the manual Day/Night toggle and a Night-start
        // encounter roll, not just at composition time (see
        // buildComposedVampire).
        const nightGift = (characterSave.levelChoiceIds || []).includes('elder_mastery_night_gift') ? 5 : 0;
        const nightTotal = curseFlat + nightGift;
        return {
            infiniteDuration: true, harmful: false,
            damageBonusFlat: nightTotal, healingBonusFlat: nightTotal,
            // Night Blessing's own curseFlat reduction and base Armor both
            // land on the same damageReductionFlat total, and add together.
            damageReductionFlat: nightTotal + armorAmount,
            armorAmount: armorAmount,
            tooltipText: 'Night Blessing: deals ' + nightTotal + ' more damage, takes ' + nightTotal + ' less damage, heals ' + nightTotal + ' more. Armor ' + armorAmount + '.' + (nightGift ? ' (+5 from your affinity for the night.)' : ''),
        };
    }

    // --- XP / leveling ---------------------------------------------------------

    function levelForXp(xp) {
        const table = PROGRESSION.XP_TABLE;
        let level = 1;
        for (let i = 0; i < table.length; i++) {
            if (xp >= table[i]) level = i + 1;
        }
        return Math.min(level, table.length);
    }
    function specializationUnlockLevel(characterSave) {
        const offset = PROGRESSION.AGES[characterSave.age].specializationLevelOffset || 0;
        return Math.max(1, PROGRESSION.SPECIALIZATION_UNLOCK_LEVEL + offset);
    }

    // --- shared helpers (unchanged from Milestone 1) ----------------------

    function rosterIndex(characterId) {
        return ROSTER.findIndex((c) => c.characterId === characterId);
    }
    function emptyChakraPool() {
        return { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0 };
    }
    function characterForUnit(unit) {
        return ROSTER[unit.rosterIndex];
    }
    // The engine has no per-character max-HP concept - buildInitialBoard()
    // always starts every unit at its own hardcoded 100. Characters that
    // declare `startingHp` get overridden right after the board is built,
    // entirely in this glue code; the engine itself is untouched.
    function maxHpForCharacter(character) {
        return Number(character?.startingHp) || 100;
    }
    function applyStartingHpOverrides(board) {
        Object.keys(board).forEach((username) => {
            board[username].forEach((unit) => {
                const character = characterForUnit(unit);
                unit.hp = maxHpForCharacter(character);
            });
        });
    }
    // Second engine gap, same "patch it in glue code, not the vendored
    // file" boundary as the override above. Two separate vendored
    // functions - applyHealToUnit() (the 'heal' effect type) and
    // applyDirectHpGainToUnit() (the lifesteal side of
    // 'health_steal_damage', e.g. Rampage/Blood Claw/Bite's lifesteal
    // sub-effect) - both clamp to Math.min(DEFAULT_HP, cap, before + gain),
    // and DEFAULT_HP is a hardcoded module constant (100, the original
    // Naruto-Arena baseline) - not something unit.hpCap can raise, since
    // it's unconditionally included in that min() regardless. So any
    // Vampire with a real max HP above 100 (e.g. the +8 Max HP level-2
    // choice) silently can't be healed OR lifestealed past 100, even
    // though their HP bar's own max is higher - and worse, once already
    // above 100 (starting HP, or a prior over-cap moment), ANY further
    // heal/lifesteal clamps them straight back DOWN to 100, which reads
    // as the lifesteal damaging its own caster. Confirmed via direct
    // source read of both functions, reproduced live (Potion: 82->100 not
    // 82->108), and root-caused for Rampage via a traced/instrumented
    // copy of battleLogic.js (908->100 landed on applyDirectHpGainToUnit's
    // clamp, not any self-damage effect - see scratchpad/rampage_trace_test.js).
    // Fixed here by re-deriving each effect's own gain formula (base
    // amount + the healer's own relevant positive status bonus - floored
    // at 0, mirroring getStatusMetadataTotals' sourceHealingBonus/
    // skill-damage-bonus math) and topping the unit up to its REAL cap
    // after the engine's clamp has already run.
    function statusMetadataFlatFor(unitState, key) {
        let total = 0;
        (unitState && unitState.statuses || []).forEach((s) => {
            total += Number(s && s.metadata && s.metadata[key]) || 0;
        });
        return Math.max(0, total);
    }
    function fixHpCapBug(unit, skill, beforeHp) {
        const cap = maxHpForCharacter(characterForUnit(unit));
        if (!unit || cap <= 100 || !skill || !Array.isArray(skill.effects)) return;
        const healingBonus = statusMetadataFlatFor(unit.state, 'healingBonusFlat');
        const damageBonus = statusMetadataFlatFor(unit.state, 'damageBonusFlat');
        let trueGain = 0;
        skill.effects.forEach((effect) => {
            if (effect.type === 'heal' && effect.scope === 'self') {
                trueGain += (Number(effect.amount) || 0) + healingBonus;
            } else if (effect.type === 'health_steal_damage' && effect.scope === 'target') {
                // health_steal_damage is always armor-piercing in the
                // engine (queueDamage forces ignoreDamageReduction for it
                // regardless of the effect's own metadata), so the raw
                // amount + the caster's own damage bonus IS what's dealt
                // (and so lifestolen) - no target-side mitigation to
                // account for.
                trueGain += (Number(effect.amount) || 0) + damageBonus;
            }
        });
        if (trueGain <= 0) return;
        const correctHp = Math.min(cap, beforeHp + trueGain);
        if (correctHp > unit.hp) unit.hp = correctHp;
    }
    function isActiveSkill(skill) {
        if (!skill) return false;
        if ((skill.classes || []).some((c) => String(c).toLowerCase() === 'passive')) return false;
        return Array.isArray(skill.effects) && skill.effects.length > 0;
    }
    function log(message, cls) {
        state.log.unshift({ text: message, cls: cls || '' });
        state.log = state.log.slice(0, 12);
    }

    function newGame(encounterIndex) {
        const encounter = CAMPAIGN[encounterIndex] || CAMPAIGN[0];
        const playerRosterIndex = buildComposedVampire(save.character);
        const players = [
            { username: 'player', team: [playerRosterIndex] },
            { username: 'enemy', team: encounter.enemies.map(rosterIndex) },
        ];
        const board = BE.buildInitialBoard(players, ROSTER);
        applyStartingHpOverrides(board);
        // Random start (was always Day). buildComposedVampire's
        // startStatuses already put the Day curse on the player unit by
        // default - on a Night roll, swap it for the Night blessing using
        // the exact same status swap the manual toggle button uses
        // (toggleDayNight), just inlined since that function assumes
        // `state` already exists and this runs before it does.
        const startDayNight = Math.random() < 0.5 ? 'night' : 'day';
        if (startDayNight === 'night') {
            const playerUnit = board.player[0];
            const vs = playerUnit.state;
            vs.statuses = vs.statuses.filter((s) => s.id !== DAY_STATUS_ID);
            BE.applyStatus({
                targetState: vs,
                targetUnit: playerUnit,
                statusId: NIGHT_STATUS_ID,
                duration: 999,
                metadata: curseMetadataFor(save.character, 'night'),
            });
        }
        state = {
            match: {
                players,
                board,
                pendingTurns: {},
                chakraPools: { player: emptyChakraPool(), enemy: emptyChakraPool() },
                economy: { turnCounts: { player: 0, enemy: 0 } },
            },
            dayNight: startDayNight,
            vampirePose: 'idle',
            log: [],
            over: null,
            pendingSkillIndex: null,
            busy: false,
            bg: encounter.bg,
            // Consumable, not a skill on cooldown - gated by this count
            // instead of the engine's own per-skill cooldown system (see
            // onSkillClick/playPlayerAction/renderSkillButton). Resets to 3
            // at the start of every encounter, same "fresh start each fight"
            // philosophy as HP already fully healing at Camp.
            potionsRemaining: 3,
        };
        log(encounter.label + ' blocks your path.');
        screen = 'battle';
        render();
    }

    function vampireUnit() {
        return state.match.board.player[0];
    }

    // --- HP-delta tracking, for floating damage/heal numbers ---
    function snapshotHp() {
        const snap = {};
        Object.keys(state.match.board).forEach((username) => {
            snap[username] = state.match.board[username].map((unit) => unit.hp);
        });
        return snap;
    }
    function diffHp(before) {
        const diffs = [];
        Object.keys(state.match.board).forEach((username) => {
            state.match.board[username].forEach((unit, slot) => {
                const prev = before[username] ? before[username][slot] : unit.hp;
                const delta = unit.hp - prev;
                if (delta !== 0) diffs.push({ username, slot, delta });
            });
        });
        return diffs;
    }

    // Turns a diffHp() result into a trailing "(20 dmg to Skeleton, +2 HP)"
    // clause for the combat log - reused for both the player's own actions
    // and each enemy's. actorUsername/actorSlot identify who cast the skill,
    // so a self-heal/self-buff reads as "(+80 HP)" rather than the more
    // stilted "(+80 HP to you)".
    function describeDiffsForLog(diffs, actorUsername, actorSlot) {
        if (!diffs || !diffs.length) return '';
        const parts = diffs
            .map(({ username, slot, delta }) => {
                if (!delta) return null;
                const isSelf = username === actorUsername && slot === actorSlot;
                let who = '';
                if (!isSelf) {
                    const unit = state.match.board[username] && state.match.board[username][slot];
                    const character = unit && characterForUnit(unit);
                    who = ' to ' + (username === 'player' ? 'you' : (character ? character.name : 'the target'));
                }
                return (delta < 0 ? -delta + ' dmg' : '+' + delta + ' HP') + who;
            })
            .filter(Boolean);
        return parts.length ? ' (' + parts.join(', ') + ')' : '';
    }

    function toggleDayNight() {
        if (state.over || state.busy) return;
        const unit = vampireUnit();
        const vs = unit.state;
        const removingId = state.dayNight === 'day' ? DAY_STATUS_ID : NIGHT_STATUS_ID;
        const applyingId = state.dayNight === 'day' ? NIGHT_STATUS_ID : DAY_STATUS_ID;
        const applyingMetadata = curseMetadataFor(save.character, state.dayNight === 'day' ? 'night' : 'day');
        vs.statuses = vs.statuses.filter((s) => s.id !== removingId);
        BE.applyStatus({
            targetState: vs,
            targetUnit: unit,
            statusId: applyingId,
            duration: 999,
            metadata: applyingMetadata,
        });
        state.dayNight = state.dayNight === 'day' ? 'night' : 'day';
        log(state.dayNight === 'night' ? 'Night falls. The curse becomes a blessing.' : 'Dawn breaks. The curse returns.');
        render();
    }

    // No range gate any more (per feedback - the whole Approach/lane
    // system was pulled back out) - every skill can hit any alive enemy
    // regardless of distance. skillRequiresMelee stays only as a cosmetic
    // hint: playPlayerAction plays a brief walk-up flourish before a
    // Melee-tagged skill's own action pose, instead of gating anything.
    function skillRequiresMelee(skill) {
        return !!(skill && skill.classes && skill.classes.some((c) => String(c).toLowerCase() === 'melee'));
    }

    function buildTargetSelection(skill, actingUsername, actorSlot, targetSlot) {
        if (skill.target === 'self') return [{ username: actingUsername, slot: actorSlot }];
        if (targetSlot == null) return [];
        const opponentUsername = actingUsername === 'player' ? 'enemy' : 'player';
        return [{ username: opponentUsername, slot: targetSlot }];
    }

    function endSideTurn(username) {
        BE.tickCooldownsForTurnEnd({ match: state.match, endingUsername: username });
        BE.tickStatusesForTurnEnd({ match: state.match, endingUsername: username });
    }

    function checkOutcome() {
        const wasOver = state.over;
        const enemiesAlive = state.match.board.enemy.some((u) => u.alive !== false);
        const playerAlive = state.match.board.player.some((u) => u.alive !== false);
        if (!enemiesAlive) state.over = 'win';
        else if (!playerAlive) state.over = 'lose';
        // checkOutcome() is called after every actor's turn, win or not - only
        // sound off on the actual win/lose transition, not every re-check.
        if (!wasOver && state.over) playSfx('popupOpen');
    }

    function onSkillClick(skillIndex) {
        if (state.over || state.busy) return;
        const unit = vampireUnit();
        const character = characterForUnit(unit);
        const skill = character.skills[skillIndex];
        if (!isActiveSkill(skill)) return;
        if (BE.getSkillCooldownRemaining(unit.state, skill.id) > 0) return;
        if (skill.id === 'vampire_potion' && state.potionsRemaining <= 0) return;
        if (skill.id === 'life_rip' && bloodStacks(unit) <= 0) return;
        playSfx('select');
        if (skill.target === 'self') {
            playPlayerAction(skillIndex, null);
            return;
        }
        // Always go through the target picker, even with only one valid
        // enemy - no auto-fire-on-the-only-target shortcut (removed per
        // feedback: picking a target should always be an explicit click).
        // No range gate any more - every enemy is a valid target.
        state.pendingSkillIndex = skillIndex;
        render();
    }

    function onEnemyTargetClick(slot) {
        if (state.over || state.busy || state.pendingSkillIndex == null) return;
        const unit = state.match.board.enemy[slot];
        if (!unit || unit.alive === false) return;
        playSfx('select');
        const skillIndex = state.pendingSkillIndex;
        state.pendingSkillIndex = null;
        playPlayerAction(skillIndex, slot);
    }

    // Skill id -> action-pose key(s) in VAMPIRE_POSES, for the attack
    // sequence (windup -> action pose -> impact -> back to idle). A value
    // can be a single key or an array of keys played in sequence (Blood
    // Ward, Blood Projectile) - see playVampirePoseSequence. Skills with
    // no mapped pose just hold the windup frame briefly instead (attacks)
    // or show no pose swap at all (self-target - see playPlayerAction).
    const SKILL_ACTION_POSE = {
        vampire_bite: 'vampire_bite',
        life_rip: 'life_rip',
        vampire_guard: 'vampire_guard',
        feral_rampage: 'feral_rampage',
        feral_blood_frenzy: 'feral_blood_frenzy',
        elder_mastery_shadow_veil: 'elder_mastery_shadow_veil',
        elder_mastery_mist_form: 'elder_mastery_mist_form',
        elder_mastery_charm: 'elder_mastery_charm',
        hemonancer_blood_ward: ['hemonancer_blood_ward_1', 'hemonancer_blood_ward_2'],
        hemonancer_blood_projectile: [
            'hemonancer_blood_projectile_1',
            'hemonancer_blood_projectile_2',
            'hemonancer_blood_projectile_3',
        ],
        // feral_blood_claw and hemonancer_blood_curse have no dedicated
        // art yet - left unmapped, same as before this batch.
    };

    // Steps the Vampire's image through one or more VAMPIRE_POSES frames,
    // landing floating damage/heal numbers on the LAST frame (the moment
    // of impact/completion), then reverting to the persistent pose once
    // done. `frames` may be empty (no dedicated art for this skill) - the
    // numbers still show, just with no pose swap. Returns the total time
    // (ms) the sequence takes, so callers can time the enemy's reply.
    function playVampirePoseSequence(frames, diffs, opts) {
        const stepMs = (opts && opts.stepMs) || 260;
        const holdMs = (opts && opts.holdMs) || 550;
        frames.forEach((frame, i) => {
            setTimeout(() => {
                setVampireImage(frame);
                if (i === frames.length - 1) showTurnEffects([{ username: 'player', slot: 0 }], diffs);
            }, i * stepMs);
        });
        if (!frames.length) showTurnEffects([{ username: 'player', slot: 0 }], diffs);
        const totalMs = frames.length ? (frames.length - 1) * stepMs + holdMs : holdMs;
        setTimeout(() => setVampireImage(state.vampirePose), totalMs);
        return totalMs;
    }

    // Animates the player's .combatant stepping forward (toward the
    // enemy) or back (returning to its base spot) for the melee walk-up
    // flourish below, by interpolating an inline transform directly via
    // requestAnimationFrame - re-resolving the element fresh on EVERY
    // frame instead of holding one reference for the whole animation.
    // render() fully tears down and rebuilds the combatant DOM on any
    // state change (see its own comments); a plain CSS class+transition
    // toggled once and left to run doesn't survive that. Two ways it
    // broke, both reported live: render() firing between the class being
    // added and the next paint hands the transition a brand new element
    // with no "before" frame to animate from, so it jumps straight to
    // the end position instead of visibly walking there ("teleporting
    // forward then walking instead of walking from its original spot");
    // render() firing again mid-transition abandons whatever the CSS
    // engine had in flight, snapping to whatever the fresh element's
    // static (untransitioned) style happens to resolve to. Re-querying
    // the element every single frame sidesteps both - if render() swaps
    // it out between two frames, the very next frame just keeps writing
    // the current interpolated position onto the new element, not
    // whatever that element's own default style would have been.
    function animatePlayerStep(forward, durationMs, onDone) {
        const startCqw = forward ? 0 : 20;
        const endCqw = forward ? 20 : 0;
        const startTime = performance.now();
        function tick(now) {
            const el = findCombatantEl('player', 0);
            const t = Math.min(1, (now - startTime) / durationMs);
            const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; // easeInOutCubic
            const cqw = startCqw + (endCqw - startCqw) * eased;
            if (el) el.style.transform = cqw ? 'translateX(' + cqw.toFixed(2) + 'cqw)' : '';
            if (t < 1) {
                requestAnimationFrame(tick);
            } else if (onDone) {
                onDone();
            }
        }
        requestAnimationFrame(tick);
    }

    function playPlayerAction(skillIndex, targetSlot) {
        const unit = vampireUnit();
        const character = characterForUnit(unit);
        const skill = character.skills[skillIndex];
        const targetSelection = buildTargetSelection(skill, 'player', 0, targetSlot);
        state.match.pendingTurns.player = {
            queueOrder: [0],
            queuedByActorSlot: { 0: { skillIndex, targetSelection } },
        };
        if (skill.id === 'vampire_potion') state.potionsRemaining = Math.max(0, state.potionsRemaining - 1);
        const before = snapshotHp();
        BE.resolvePendingTurnSkills({ match: state.match, actingUsername: 'player', characters: ROSTER });
        fixHpCapBug(unit, skill, before.player[0]);
        endSideTurn('player');
        checkOutcome();
        state.pendingSkillIndex = null;
        const diffs = diffHp(before);
        log('You use ' + skill.name + '.' + describeDiffsForLog(diffs, 'player', 0), 'you');
        render();
        // Any self-target skill (Guard, Potion, and now the self-buff
        // branch skills - Blood Frenzy/Blood Ward/Mist Form/Shadow Veil)
        // is a brace or a working of magic on oneself, not a strike - it
        // skips the windup/lunge that reads as an attack. Enemy-targeted
        // skills still get the full windup -> action -> impact sequence.
        // Slowed down from the original 900ms/700ms/160ms - too fast to
        // actually see the new pose art land (reported by a friend of the
        // player's). enemyTurnDelay stays a bit ahead of each branch's own
        // worst-case total (self: 2-frame Blood Ward, 920ms; attack:
        // windup + 3-frame Blood Projectile, 1330ms) so the enemy never
        // replies mid-animation.
        let enemyTurnDelay = 1450;
        const actionPose = SKILL_ACTION_POSE[skill.id];
        const frames = actionPose ? (Array.isArray(actionPose) ? actionPose : [actionPose]) : [];
        if (skill.target === 'self') {
            playVampirePoseSequence(frames, diffs, { stepMs: 320, holdMs: 600 });
            enemyTurnDelay = 1050;
        } else if (skillRequiresMelee(skill)) {
            // A walk-up flourish before the strike itself - purely
            // cosmetic (no range gate any more, every skill can already
            // hit any alive enemy), just sells "closing the gap" for a
            // Melee-tagged hit specifically. Ranged/self skills skip
            // straight to their own windup below. The player's own
            // .combatant physically steps forward while this plays (see
            // animatePlayerStep above) and steps back again once the
            // strike lands - a temporary, timer-driven, self-resetting
            // transform, not the old persistent --engage-x position
            // (removed per feedback) - nothing is ever left shifted
            // between turns.
            const walkFrames = playerWalkFrames();
            const walkStepMs = walkFrames.length > 3 ? 200 : 260;
            // Mirrors playVampirePoseSequence's own totalMs formula
            // below (frames.length ? (frames.length-1)*stepMs+holdMs :
            // holdMs) - needed here, ahead of that call, so the walk and
            // the physical step start together and take the same total
            // time. Keep the two in sync if either formula ever changes.
            const walkTotalMs = walkFrames.length ? (walkFrames.length - 1) * walkStepMs + 300 : 300;
            animatePlayerStep(true, walkTotalMs);
            playVampirePoseSequence(walkFrames, [], { stepMs: walkStepMs, holdMs: 300 });
            setTimeout(() => {
                setVampireImage('windup');
                setTimeout(() => {
                    const attackTotalMs = playVampirePoseSequence(frames, diffs, { stepMs: 260, holdMs: 550 });
                    setTimeout(() => {
                        animatePlayerStep(false, 450);
                    }, attackTotalMs);
                }, 260);
            }, walkTotalMs);
            enemyTurnDelay = walkTotalMs + 1450;
        } else {
            setVampireImage('windup');
            setTimeout(() => {
                playVampirePoseSequence(frames, diffs, { stepMs: 260, holdMs: 550 });
            }, 260);
        }
        if (!state.over) {
            state.busy = true;
            setTimeout(runEnemyTurn, enemyTurnDelay);
        }
    }

    // Goblin Shaman's Mending Chant (target:'self-or-ally') is the one
    // enemy skill that isn't just "attack the player" - it needs a real
    // "should I heal, and who" decision instead of the plain
    // first-available-skill pick below. Heals only when it or an ally is
    // actually hurt (below 75% of their own max HP), picking whoever's
    // worst off; otherwise falls through to a normal attack, same turn.
    function chooseEnemyAction(unit, character, slot, enemyBoard) {
        const healSkillIndex = character.skills.findIndex(
            (sk) => sk.target === 'self-or-ally' && isActiveSkill(sk) && BE.getSkillCooldownRemaining(unit.state, sk.id) <= 0
        );
        if (healSkillIndex >= 0) {
            let bestSlot = -1;
            let bestRatio = 0.75; // only worth casting below this fraction of max HP
            enemyBoard.forEach((allyUnit, allySlot) => {
                if (!allyUnit || allyUnit.alive === false) return;
                const ratio = allyUnit.hp / maxHpForCharacter(characterForUnit(allyUnit));
                if (ratio < bestRatio) {
                    bestRatio = ratio;
                    bestSlot = allySlot;
                }
            });
            if (bestSlot >= 0) {
                const skill = character.skills[healSkillIndex];
                return { skillIndex: healSkillIndex, skill, targetSelection: [{ username: 'enemy', slot: bestSlot }], poseKey: 'heal' };
            }
        }
        const skillIndex = character.skills.findIndex(
            (sk) => sk.target !== 'self-or-ally' && isActiveSkill(sk) && BE.getSkillCooldownRemaining(unit.state, sk.id) <= 0
        );
        if (skillIndex < 0) return null;
        const skill = character.skills[skillIndex];
        const targetSelection = skill.target === 'self'
            ? [{ username: 'enemy', slot }]
            : [{ username: 'player', slot: 0 }];
        // 'buff' for a self-target skill (e.g. Slip Away's shadow-step
        // pose) rather than the attack lunge - falls back to idle for
        // enemies with no dedicated buff pose (see ENEMY_POSES).
        const poseKey = skill.target === 'self' ? 'buff' : 'attack';
        return { skillIndex, skill, targetSelection, poseKey };
    }

    function runEnemyTurn() {
        const enemyBoard = state.match.board.enemy;
        const actions = [];
        const acted = [];
        enemyBoard.forEach((unit, slot) => {
            if (!unit || unit.alive === false) return;
            const character = characterForUnit(unit);
            const action = chooseEnemyAction(unit, character, slot, enemyBoard);
            if (!action) return;
            const { skillIndex, skill, targetSelection, poseKey } = action;
            actions.push({ slot, character, skillIndex, skill, targetSelection, poseKey });
            const target = targetSelection[0];
            acted.push({ username: 'enemy', slot, poseKey, targetUsername: target && target.username, targetSlot: target && target.slot });
        });
        const overallBefore = snapshotHp();
        // Resolved one actor at a time rather than as a single batched call -
        // Node-verified to produce byte-identical final HP/cooldown state to
        // the old combined call (see scratchpad/split_resolve_test.js) - so
        // each log line can report the damage/heal THAT specific skill use
        // caused, instead of one number blurred across every acting enemy.
        actions.forEach(({ slot, character, skillIndex, skill, targetSelection }) => {
            const before = snapshotHp();
            state.match.pendingTurns.enemy = {
                queueOrder: [slot],
                queuedByActorSlot: { [slot]: { skillIndex, targetSelection } },
            };
            BE.resolvePendingTurnSkills({ match: state.match, actingUsername: 'enemy', characters: ROSTER });
            const stepDiffs = diffHp(before);
            log(character.name + ' uses ' + skill.name + '.' + describeDiffsForLog(stepDiffs, 'enemy', slot), 'foe');
        });
        endSideTurn('enemy');
        checkOutcome();
        state.busy = false;
        const diffs = diffHp(overallBefore);
        const vampireHurt = diffs.some((d) => d.username === 'player' && d.slot === 0 && d.delta < 0);
        const justLost = state.over === 'lose';
        if (justLost) state.vampirePose = 'hit';
        // Suppress the defeat overlay for a beat so the hit -> death pose
        // sequence is actually visible before it's covered.
        render(justLost ? { suppressOverlay: true } : undefined);
        showTurnEffects(acted, diffs);
        if (justLost) {
            setTimeout(() => {
                state.vampirePose = 'death';
                render();
            }, 750);
        } else if (vampireHurt) {
            setVampireImage('hit');
            setTimeout(() => setVampireImage(state.vampirePose), 620);
        }
    }

    function prefersReducedMotion() {
        try {
            return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (err) {
            return false;
        }
    }

    // --- Post-battle flow: XP, level-ups, specialization, campaign advance ---

    // A "big moment" screen (a real choice to make, or the campaign's own
    // ending) gets a popup-open sting; a plain return to Camp doesn't -
    // keeps this from turning into a sound on literally every screen swap.
    function screenTransitionSfx(nextScreen) {
        if (nextScreen === 'levelup' || nextScreen === 'levelup-anim' || nextScreen === 'specialization' || nextScreen === 'campaign-complete') {
            playSfx('popupOpen');
        }
    }

    function onBattleOverContinue() {
        const won = state.over === 'win';
        state = null;
        if (!won) {
            screen = 'camp';
            render();
            return;
        }
        const encounterIndex = save.campaign.encounterIndex;
        const xpGain = PROGRESSION.XP_PER_ENCOUNTER[encounterIndex] || PROGRESSION.XP_PER_ENCOUNTER[PROGRESSION.XP_PER_ENCOUNTER.length - 1];
        save.character.xp += xpGain;
        save.campaign.encounterIndex = encounterIndex + 1;
        if (save.campaign.encounterIndex >= CAMPAIGN.length) save.campaign.completed = true;

        const newLevel = levelForXp(save.character.xp);
        const pendingLevelUps = [];
        for (let lvl = save.character.level + 1; lvl <= newLevel; lvl++) {
            if (PROGRESSION.LEVEL_CHOICES[lvl]) pendingLevelUps.push(lvl);
        }
        const reachedSpecLevel = newLevel >= specializationUnlockLevel(save.character) && !save.character.specialization;
        save.character.level = newLevel;
        save.character.lastXpGain = xpGain;
        save.character.pendingLevelUps = pendingLevelUps;
        save.character.pendingSpecialization = reachedSpecLevel;
        writeSave(save);

        if (pendingLevelUps.length > 0) {
            screen = prefersReducedMotion() ? 'levelup' : 'levelup-anim';
        } else if (reachedSpecLevel) {
            screen = 'specialization';
        } else {
            screen = save.campaign.completed ? 'campaign-complete' : 'camp';
        }
        screenTransitionSfx(screen);
        render();
    }

    function resolveNextPostVictoryScreen() {
        if (save.character.pendingLevelUps && save.character.pendingLevelUps.length > 0) {
            screen = prefersReducedMotion() ? 'levelup' : 'levelup-anim';
        } else if (save.character.pendingSpecialization) {
            screen = 'specialization';
        } else {
            screen = save.campaign.completed ? 'campaign-complete' : 'camp';
        }
        screenTransitionSfx(screen);
        render();
    }

    function pickLevelChoice(level, choiceId) {
        save.character.levelChoiceIds.push(choiceId);
        save.character.pendingLevelUps = (save.character.pendingLevelUps || []).filter((l) => l !== level);
        writeSave(save);
        resolveNextPostVictoryScreen();
    }

    function pickSpecialization(specId) {
        save.character.specialization = specId;
        save.character.pendingSpecialization = false;
        writeSave(save);
        resolveNextPostVictoryScreen();
    }

    // --- Rendering: battle screen (unchanged from Milestone 1) ---

    function bloodStacks(unit) {
        const status = unit.state.statuses.find((s) => s.id === BLOOD_STATUS_ID);
        return status ? Math.max(0, Number(status.metadata.bloodStacks) || 0) : 0;
    }

    // Sums the engine-unread `armorAmount` marker key across a unit's active
    // statuses (see curseMetadataFor() for the player, and Goblin
    // Warrior's (characterId 'hobgoblin-warrior') startStatuses for an
    // enemy example) - purely for the shield
    // badge UI. The real mitigation math runs entirely on the standard
    // damageReductionFlat metadata key already read by the vendored engine;
    // this never affects combat, only what the shield badge displays.
    function getArmorAmount(unit) {
        return unit.state.statuses.reduce((total, s) => {
            return total + (Number(s.metadata && s.metadata.armorAmount) || 0);
        }, 0);
    }

    function findCombatantEl(username, slot) {
        const root = document.getElementById('app');
        return root.querySelector('.combatant[data-username="' + username + '"][data-slot="' + slot + '"]');
    }

    // Swaps the Vampire's <img src> directly (no full render()) so an
    // in-flight damage number or hit-flash on any combatant isn't cut short.
    function setVampireImage(poseKey) {
        // 'idle' isn't a fixed image - it's whichever transformed form (or
        // the base standing pose) the character's current specialization
        // investment resolves to. See playerIdlePoseKey().
        const resolvedKey = poseKey === 'idle' ? playerIdlePoseKey() : poseKey;
        const el = findCombatantEl('player', 0);
        const figure = el && el.querySelector('.figure');
        const img = figure && figure.querySelector('img');
        if (img) img.src = VAMPIRE_POSES[resolvedKey] || VAMPIRE_POSES.idle;
        if (figure) figure.style.height = VAMPIRE_POSE_HEIGHT[resolvedKey] || '';
    }

    // Same direct-DOM-swap pattern as setVampireImage, for an enemy slot.
    // A no-op for any characterId without an ENEMY_POSES entry - those keep
    // their single static ENEMY_ART image, unchanged.
    function setEnemyImage(slot, characterId, poseKey) {
        const poses = ENEMY_POSES[characterId];
        if (!poses) return;
        const el = findCombatantEl('enemy', slot);
        const img = el && el.querySelector('.figure img');
        if (!img) return;
        const pose = poses[poseKey] || poses.idle;
        img.src = Array.isArray(pose) ? pose[pose.length - 1] : pose;
    }

    // Steps an enemy's image through a pose (a single path, or an array of
    // paths - Zombie/Goblin Archer's 2-frame attacks) at stepMs intervals,
    // holding the last frame for holdMs before reverting to idle. Mirrors
    // playVampirePoseSequence's shape and reasoning: a same-tick swap
    // doesn't give the new pose art any time to actually be seen.
    function playEnemyPoseSequence(slot, characterId, poseKey, opts) {
        const poses = ENEMY_POSES[characterId];
        if (!poses) return;
        const pose = poses[poseKey] || poses.idle;
        const frames = Array.isArray(pose) ? pose : [pose];
        const stepMs = (opts && opts.stepMs) || 260;
        const holdMs = (opts && opts.holdMs) || 550;
        frames.forEach((frameSrc, i) => {
            setTimeout(() => {
                const el = findCombatantEl('enemy', slot);
                const img = el && el.querySelector('.figure img');
                if (img) img.src = frameSrc;
            }, i * stepMs);
        });
        setTimeout(() => setEnemyImage(slot, characterId, 'idle'), (frames.length - 1) * stepMs + holdMs);
    }

    // Measures the flight path for fireProjectile - split out from it and
    // called EARLY (synchronously, right when showTurnEffects itself runs)
    // rather than inside the delayed setTimeout that actually launches the
    // arrow. Measuring .stage's aspect-ratio-derived box from deep inside
    // that nested timeout intermittently returned a zero-size rect in
    // testing (a real, reproduced layout-timing quirk - the exact same
    // query against the exact same element succeeds immediately before and
    // after), even though nothing else touches the DOM in between.
    // Capturing coordinates at a known-good synchronous moment sidesteps
    // it entirely instead of chasing the browser-timing root cause.
    function computeProjectileShot(fromUsername, fromSlot, toUsername, toSlot) {
        const stageEl = document.querySelector('.stage');
        const fromEl = findCombatantEl(fromUsername, fromSlot);
        const toEl = findCombatantEl(toUsername, toSlot);
        if (!stageEl || !fromEl || !toEl) return null;
        const stageRect = stageEl.getBoundingClientRect();
        const fromRect = fromEl.getBoundingClientRect();
        const toRect = toEl.getBoundingClientRect();
        if (!stageRect.width || !stageRect.height) return null;
        return {
            fromX: fromRect.left + fromRect.width / 2 - stageRect.left,
            fromY: fromRect.top + fromRect.height * 0.4 - stageRect.top,
            toX: toRect.left + toRect.width / 2 - stageRect.left,
            toY: toRect.top + toRect.height * 0.4 - stageRect.top,
        };
    }

    // A rotated arrow sprite that flies from the pre-measured shot's start
    // to end point, timed to land right as showTurnEffects' hit-flash and
    // damage number apply to the target - purely cosmetic, no bearing on
    // the actual (already-resolved) combat math.
    function fireProjectile(shot, imgSrc, durationMs) {
        const stageEl = document.querySelector('.stage');
        if (!stageEl || !shot) return;
        const { fromX, fromY, toX, toY } = shot;
        const angleDeg = (Math.atan2(toY - fromY, toX - fromX) * 180) / Math.PI;
        const dist = Math.hypot(toX - fromX, toY - fromY);

        const proj = document.createElement('img');
        proj.src = imgSrc;
        proj.className = 'projectile';
        proj.style.width = Math.max(36, dist * 0.24) + 'px';
        proj.style.left = fromX + 'px';
        proj.style.top = fromY + 'px';
        proj.style.transform = 'translate(-8%, -50%) rotate(' + angleDeg + 'deg)';
        stageEl.appendChild(proj);
        // Force layout so the position transition below actually animates
        // from the start point instead of jumping straight to the end.
        void proj.offsetWidth;
        proj.style.transition = 'left ' + durationMs + 'ms linear, top ' + durationMs + 'ms linear';
        proj.style.left = toX + 'px';
        proj.style.top = toY + 'px';
        setTimeout(() => proj.remove(), durationMs + 80);
    }

    // Applies brief lunge/hit-flash animation classes and spawns floating
    // damage/heal numbers, reading fresh DOM built by the render() just
    // prior. Also drives enemy attack/heal/defeated pose-swapping
    // (playEnemyPoseSequence) and the Goblin Archer's flying-arrow sprite,
    // for every enemy with a real pose set - a no-op for the placeholder
    // two (Goblin Sneak, Goblin Warrior).
    function showTurnEffects(acted, diffs) {
        acted.forEach(({ username, slot, poseKey, targetUsername, targetSlot }) => {
            const el = findCombatantEl(username, slot);
            const figure = el && el.querySelector('.figure');
            if (!figure) return;
            figure.classList.add('is-acting');
            setTimeout(() => figure.classList.remove('is-acting'), 380);
            if (username === 'enemy') {
                const unit = state.match.board.enemy[slot];
                const character = unit && characterForUnit(unit);
                if (character) {
                    const key = poseKey || 'attack';
                    playEnemyPoseSequence(slot, character.characterId, key, { stepMs: 260, holdMs: 550 });
                    const poses = ENEMY_POSES[character.characterId];
                    const attackFrames = poses && Array.isArray(poses.attack) ? poses.attack : (poses ? [poses.attack] : []);
                    if (poses && poses.projectile && key === 'attack' && targetUsername != null && targetSlot != null) {
                        // Measured NOW (see computeProjectileShot's own
                        // comment for why), launched later timed to land as
                        // the release frame (the last one) shows, right as
                        // the hit lands below.
                        const shot = computeProjectileShot('enemy', slot, targetUsername, targetSlot);
                        const launchDelay = (attackFrames.length - 1) * 260;
                        if (shot) setTimeout(() => fireProjectile(shot, poses.projectile, 420), launchDelay);
                    }
                }
            }
        });
        diffs.forEach(({ username, slot, delta }) => {
            const el = findCombatantEl(username, slot);
            const figure = el && el.querySelector('.figure');
            if (!figure) return;
            if (delta < 0) {
                figure.classList.remove('is-hit');
                void figure.offsetWidth; // restart animation if already applied this tick
                figure.classList.add('is-hit');
                // is-hit's animation (transform) takes over from idle-bob while
                // present; remove it once the shake finishes so idle-bob resumes
                // instead of being silently overridden for the rest of the fight.
                setTimeout(() => figure.classList.remove('is-hit'), 500);
                if (username === 'enemy') {
                    const unit = state.match.board.enemy[slot];
                    const character = unit && characterForUnit(unit);
                    if (character) {
                        if (unit.alive === false) {
                            setEnemyImage(slot, character.characterId, 'defeated');
                        } else {
                            playEnemyPoseSequence(slot, character.characterId, 'hit', { stepMs: 260, holdMs: 550 });
                        }
                    }
                }
            }
            const num = document.createElement('span');
            num.className = 'dmg-float ' + (delta < 0 ? 'dmg' : 'heal');
            num.textContent = delta < 0 ? String(delta) : '+' + delta;
            figure.appendChild(num);
        });
    }

    function renderMeter(kind, tone, value, max, label, extraLabelHtml, iconClass) {
        const pct = Math.max(0, Math.min(100, (value / max) * 100));
        const icon = iconClass ? '<span class="stat-icon ' + iconClass + '"></span>' : '';
        return (
            '<div class="meter ' + kind + (tone ? ' ' + tone : '') + '"><span style="width:' + pct + '%"></span></div>' +
            '<div class="meter-label"><span>' + icon + label + '</span><span>' + Math.max(0, value) + '&thinsp;/&thinsp;' + max + (extraLabelHtml || '') + '</span></div>'
        );
    }

    // Armor readout, shown inline next to the HP numbers. Omitted entirely
    // (not shown as "0") when a unit has no Armor.
    function renderArmorBadge(amount) {
        if (amount <= 0) return '';
        return '<span class="armor-badge" title="Armor: reduces incoming damage by ' + amount + ' (bypassed by armor-piercing attacks).">' +
            '<span class="stat-icon stat-icon-armor"></span>' + amount + '</span>';
    }

    // Shared by the Camp screen's XP bar and the battle nameplate's mini
    // XP readout, so the threshold math only lives in one place.
    function xpProgressFor(ch) {
        const table = PROGRESSION.XP_TABLE;
        const nextThreshold = table[ch.level] != null ? table[ch.level] : table[table.length - 1];
        const prevThreshold = table[ch.level - 1] || 0;
        const pct = nextThreshold > prevThreshold
            ? Math.min(100, Math.round(((ch.xp - prevThreshold) / (nextThreshold - prevThreshold)) * 100))
            : 100;
        return { xp: ch.xp, nextThreshold, pct };
    }

    function renderXpLine(ch) {
        const p = xpProgressFor(ch);
        return (
            '<div class="meter xp-meter-mini"><span style="width:' + p.pct + '%"></span></div>' +
            '<div class="meter-label"><span><span class="stat-icon stat-icon-xp"></span>XP</span><span>' + p.xp + '&thinsp;/&thinsp;' + p.nextThreshold + '</span></div>'
        );
    }

    function renderCombatant({ unit, character, isEnemy, slot, targetable }) {
        const dead = unit.alive === false;
        // An enemy with a dedicated defeated pose reads as "dead" through
        // its own art, so it skips the heavy grayscale/fade treatment
        // below that the placeholder enemies still need (see .combatant.dead
        // vs .combatant.dead.has-defeated-pose in style.css).
        const enemyPoses = isEnemy ? ENEMY_POSES[character.characterId] : null;
        const el = document.createElement('div');
        el.className = 'combatant' + (isEnemy ? '' : ' player') + (dead ? ' dead' : '') + (dead && enemyPoses ? ' has-defeated-pose' : '') + (targetable ? ' targetable' : '');
        el.dataset.username = isEnemy ? 'enemy' : 'player';
        el.dataset.slot = String(slot);
        const nameplate = document.createElement('div');
        nameplate.className = 'nameplate' + (isEnemy ? '' : ' player-nameplate');
        nameplate.innerHTML =
            '<div class="name">' + character.name + (!isEnemy ? ' <span class="level-badge">Lv ' + save.character.level + '</span>' : '') + '</div>' +
            renderMeter('hp', isEnemy ? 'enemy-tone' : 'player-tone', unit.hp, maxHpForCharacter(character), 'HP', renderArmorBadge(getArmorAmount(unit)), 'stat-icon-hp') +
            (!isEnemy ? renderMeter('blood', '', bloodStacks(unit), bite_bloodMax(character), 'Blood', '', 'stat-icon-blood') : '') +
            (!isEnemy ? renderXpLine(save.character) : '');
        el.appendChild(nameplate);

        const figure = document.createElement('div');
        figure.className = 'figure char-' + character.characterId;
        const img = document.createElement('img');
        img.alt = character.name;
        if (isEnemy) {
            img.src = dead && enemyPoses ? enemyPoses.defeated : (ENEMY_ART[character.characterId] || '');
        } else {
            const poseKey = state.vampirePose === 'idle' ? playerIdlePoseKey() : state.vampirePose;
            img.src = VAMPIRE_POSES[poseKey] || VAMPIRE_POSES.idle;
            figure.style.height = VAMPIRE_POSE_HEIGHT[poseKey] || '';
        }
        figure.appendChild(img);
        if (isEnemy) {
            el.appendChild(figure);
        } else {
            // A dedicated wrapper for the uniform size-down (see .figure-scale
            // in style.css) - .figure's own `transform` is perpetually
            // claimed by its idle-bob animation (and is-acting/is-hit swap
            // out that whole `animation` property while active), so a
            // static scale() declared directly on .figure would just get
            // silently overridden - hence the wrapper.
            // setVampireImage/playEnemyPoseSequence etc. all find
            // .figure via querySelector, which reaches through this extra
            // nesting level with no changes needed.
            const scaleWrap = document.createElement('div');
            scaleWrap.className = 'figure-scale';
            scaleWrap.appendChild(figure);
            el.appendChild(scaleWrap);
        }

        if (targetable) {
            el.setAttribute('role', 'button');
            el.setAttribute('tabindex', '0');
            el.setAttribute('aria-label', 'Target ' + character.name);
            el.addEventListener('click', () => onEnemyTargetClick(slot));
            el.addEventListener('keydown', (evt) => {
                if (evt.key === 'Enter' || evt.key === ' ') {
                    evt.preventDefault();
                    onEnemyTargetClick(slot);
                }
            });
        }
        return el;
    }

    function bite_bloodMax(character) {
        const bite = (character.skills || []).find((s) => s.id === 'vampire_bite');
        const bloodEffect = bite && bite.effects.find((e) => e.type === 'apply_status' && e.statusId === BLOOD_STATUS_ID);
        return (bloodEffect && bloodEffect.metadata.stackMax) || 10;
    }

    // Compact, numbers-only status summary (no flavor sentences) - reused
    // by both regular apply_status effects and the Passive button, which
    // reads straight off whatever curse/specialization statuses are
    // currently active on the unit.
    function describeStatusMetadataCompact(meta) {
        const parts = [];
        if (meta.armorAmount) parts.push('+' + meta.armorAmount + ' Armor');
        else if (meta.damageReductionFlat) parts.push('-' + meta.damageReductionFlat + ' dmg taken');
        if (meta.damageBonusFlat) parts.push('+' + meta.damageBonusFlat + ' dmg dealt');
        if (meta.DamageDebuff) parts.push('-' + meta.DamageDebuff + ' dmg dealt');
        if (meta.damageTakenBonusFlat) parts.push('+' + meta.damageTakenBonusFlat + ' dmg taken');
        if (meta.healingBonusFlat) parts.push((meta.healingBonusFlat > 0 ? '+' : '') + meta.healingBonusFlat + ' healing');
        if (meta.evadeChancePercent) parts.push(meta.evadeChancePercent + '% evade chance');
        if (meta.cannotUseHarmfulSkills) parts.push('cannot use harmful skills');
        return parts.join(', ');
    }

    // One short, vital-info-only line per effect, reading the skill's REAL
    // composed numbers (buildComposedVampire already baked origin/age/level
    // bonuses into skill.effects[].amount by the time this runs) - no lore
    // or flavor text, just what the skill actually does right now. Plain
    // words only (no "/Blood"-style shorthand) and `pierce` is a flag read
    // by the caller to show a single "Armor-piercing" tag once per skill,
    // not repeated on every line.
    function describeEffect(effect) {
        const meta = effect.metadata || {};
        const pierce = meta.ignoreDamageReduction;
        if (effect.type === 'damage') {
            if (effect.activationChancePercent) {
                return { text: effect.activationChancePercent + '% chance: +' + effect.amount + ' dmg', pierce };
            }
            const stack = meta.bonusPerStatusMetadata;
            if (stack) {
                return { text: effect.amount + ' dmg + ' + stack.multiplier + ' per Blood', pierce };
            }
            return { text: effect.amount + ' dmg', pierce };
        }
        if (effect.type === 'heal') {
            return { text: 'Heal ' + effect.amount };
        }
        if (effect.type === 'health_steal_damage') {
            return { text: effect.amount + ' dmg, heals you the same', pierce };
        }
        if (effect.type === 'apply_status') {
            if (effect.statusId === BLOOD_STATUS_ID) {
                return { text: '+' + (Number(meta.stackDelta) || 1) + ' Blood' };
            }
            const compact = describeStatusMetadataCompact(meta);
            if (!compact) return null;
            // Only worth calling out for a genuinely timed buff/debuff - not
            // the always-on curse/passive statuses (infiniteDuration) and
            // not 1-turn effects (the default, unremarkable case).
            const showDuration = effect.duration > 1 && !meta.infiniteDuration;
            return { text: showDuration ? compact + ', ' + effect.duration + ' turns' : compact };
        }
        return null;
    }

    function buildSkillTooltipLines(unit, skill) {
        if (skill.id === 'vampire_curse_passive') {
            const lines = [];
            const curseStatus = unit.state.statuses.find((s) => s.id === DAY_STATUS_ID || s.id === NIGHT_STATUS_ID);
            if (curseStatus) {
                const compact = describeStatusMetadataCompact(curseStatus.metadata);
                if (compact) lines.push({ text: compact });
            }
            const feralStatus = unit.state.statuses.find((s) => s.id === 'feral_bloodlust_passive');
            if (feralStatus) {
                const compact = describeStatusMetadataCompact(feralStatus.metadata);
                if (compact) lines.push({ text: compact });
            }
            const evasionStatus = unit.state.statuses.find((s) => s.id === 'vampire_innate_evasion');
            if (evasionStatus) {
                const compact = describeStatusMetadataCompact(evasionStatus.metadata);
                if (compact) lines.push({ text: compact });
            }
            // Level 3's secretly-spec-tagged passives (see LEVEL_CHOICES[3])
            // - the mechanical benefit is always visible here, only WHICH
            // specialization it's tied to stays hidden.
            ['feral_deep_hunger_passive', 'hemonancer_blood_drain_passive'].forEach((statusId) => {
                const status = unit.state.statuses.find((s) => s.id === statusId);
                if (status) {
                    const compact = describeStatusMetadataCompact(status.metadata);
                    if (compact) lines.push({ text: compact });
                }
            });
            return lines;
        }
        return (skill.effects || []).map(describeEffect).filter(Boolean);
    }

    function renderSkillButton(character, unit, skillIndex) {
        const skill = character.skills[skillIndex];
        const btn = document.createElement('button');
        btn.className = 'skill-btn';
        btn.type = 'button';
        const isPassive = !isActiveSkill(skill);
        const isPotion = skill.id === 'vampire_potion';
        const cooldown = isPassive ? 0 : BE.getSkillCooldownRemaining(unit.state, skill.id);
        const potionsLeft = state.potionsRemaining;
        // Life Rip's damage is entirely bonusPerStatusMetadata off current
        // Blood (see characters.source.js) - at 0 Blood it would still fire
        // for its bare 8 base damage, which read as "free to spam" rather
        // than the Blood-spending finisher it's meant to be.
        const noBlood = skill.id === 'life_rip' && bloodStacks(unit) <= 0;
        btn.disabled = isPassive || cooldown > 0 || state.over || state.busy || (isPotion && potionsLeft <= 0) || noBlood;
        const iconImg = skill.id === 'vampire_bite' ? 'assets/icon-bite.jpg'
            : skill.id === 'life_rip' ? 'assets/icon-liferip.jpg'
            : null;
        const icon = skill.id === 'vampire_guard' ? '&#128737;'
            : isPotion ? '&#129514;'
            : skill.id === 'feral_rampage' ? '&#128064;'
            : skill.id === 'hemonancer_blood_ward' ? '&#128167;'
            : skill.id === 'elder_mastery_shadow_veil' ? '&#127763;'
            : '&#10022;';
        const iconHtml = iconImg
            ? '<span class="skill-icon skill-icon-framed"><img src="' + iconImg + '" alt="" /></span>'
            : '<span class="skill-icon">' + icon + '</span>';
        // Potion is gated by a use-count, not the engine's turn-based cooldown
        // (see state.potionsRemaining) - it reuses the same .skill-tag slot
        // to show remaining uses instead of a cooldown.
        const tagHtml = isPotion ? '<span class="skill-tag">' + potionsLeft + ' left</span>'
            : isPassive ? '<span class="skill-tag">Passive</span>'
            : noBlood ? '<span class="skill-tag">No Blood</span>'
            : cooldown > 0 ? '<span class="skill-tag">Cooldown ' + cooldown + '</span>'
            : '';
        btn.innerHTML =
            iconHtml +
            '<span class="skill-text"><span class="skill-name">' + skill.name + '</span>' +
            tagHtml +
            '</span>';
        const tooltip = document.createElement('div');
        tooltip.className = 'skill-tooltip';
        const lines = buildSkillTooltipLines(unit, skill);
        if (lines.length === 0) lines.push({ text: 'No further effect.' });
        lines.forEach((line) => {
            const row = document.createElement('div');
            row.className = 'skill-tooltip-line';
            row.textContent = line.text;
            tooltip.appendChild(row);
        });
        // Shown once per skill (not repeated on every line) if ANY of its
        // effects bypass Armor.
        if (lines.some((line) => line.pierce)) {
            const pierceRow = document.createElement('div');
            pierceRow.className = 'skill-tooltip-line pierce';
            pierceRow.textContent = 'Armor-piercing';
            tooltip.appendChild(pierceRow);
        }
        if (noBlood) {
            const bloodRow = document.createElement('div');
            bloodRow.className = 'skill-tooltip-line';
            bloodRow.textContent = 'Requires at least 1 Blood.';
            tooltip.appendChild(bloodRow);
        }
        if (!isPassive) {
            btn.addEventListener('click', () => onSkillClick(skillIndex));
        }
        // The tooltip is a SIBLING of the button, not a child - a disabled
        // button's dimmed opacity composites onto its whole subtree, which
        // would fade the tooltip along with it (this is exactly the Passive
        // slot, the one button that's always disabled and most needs a
        // clearly-readable tooltip since it can't be tried by clicking).
        const slot = document.createElement('div');
        slot.className = 'skill-slot';
        slot.appendChild(btn);
        slot.appendChild(tooltip);
        return slot;
    }

    // Each encounter carries its own single illustrated locale (not a
    // day/night pair) - the day/night curse toggle is conveyed by
    // .night-tint fading in over whichever photo this is, rather than by
    // swapping to a second photo (most locations don't have one).
    function renderStageBackdrop(bg) {
        return (
            '<div class="backdrop" style="background-image:url(\'' + bg + '\')"></div>' +
            '<div class="night-tint"></div><div class="scrim"></div>'
        );
    }

    function renderBattleScreen(root, opts) {
        const suppressOverlay = !!(opts && opts.suppressOverlay);
        const frame = document.createElement('div');
        frame.className = 'stage-frame';
        const stage = document.createElement('div');
        stage.className = 'stage ' + (state.dayNight === 'night' ? 'is-night' : 'is-day');
        stage.innerHTML = renderStageBackdrop(state.bg || 'assets/background-day.jpg');

        const dnBtn = document.createElement('button');
        dnBtn.className = 'daynight-toggle';
        dnBtn.type = 'button';
        dnBtn.disabled = !!state.over || state.busy;
        dnBtn.innerHTML = '<span class="medallion"></span>' + (state.dayNight === 'night' ? 'Night' : 'Day');
        dnBtn.title = 'Toggle Day/Night (test)';
        dnBtn.addEventListener('click', toggleDayNight);
        stage.appendChild(dnBtn);

        // Lives below the stage as its own panel (not overlaid on the art)
        // so it never competes for space with the characters or chrome.
        const logBox = document.createElement('div');
        logBox.className = 'log';
        logBox.innerHTML = '<div class="log-title">Combat Log</div>';
        const list = document.createElement('ul');
        state.log.forEach((entry) => {
            const li = document.createElement('li');
            li.className = entry.cls;
            li.textContent = entry.text;
            list.appendChild(li);
        });
        logBox.appendChild(list);

        if (state.pendingSkillIndex != null) {
            const hint = document.createElement('div');
            hint.className = 'target-hint';
            hint.textContent = 'Choose a target...';
            stage.appendChild(hint);
        }

        const vUnit = vampireUnit();
        const vChar = characterForUnit(vUnit);
        stage.appendChild(renderCombatant({ unit: vUnit, character: vChar, isEnemy: false, slot: 0, targetable: false }));

        const cluster = document.createElement('div');
        cluster.className = 'enemy-cluster';
        cluster.dataset.count = String(state.match.board.enemy.length);
        state.match.board.enemy.forEach((unit, slot) => {
            const character = characterForUnit(unit);
            const targetable = state.pendingSkillIndex != null && unit.alive !== false;
            cluster.appendChild(renderCombatant({ unit, character, isEnemy: true, slot, targetable }));
        });
        stage.appendChild(cluster);

        // A sibling of the stage now, not a child overlaid on top of it (see
        // .panel in style.css) - it used to be position:absolute inside
        // .stage, pinned to the bottom. That was fine at 5 skills, but a
        // leveled-up character can have 8 (base 5 + 3 specialization
        // picks), wrapping the button grid to 3 rows - measured live, that
        // covers up to 44% of the stage's height, hiding the lower portion
        // of the enemy cluster and even the player themself behind it.
        // Living below the stage entirely (like Combat Log already does,
        // see logBox below) scales correctly no matter how many skills a
        // character ends up with, instead of fragile margin-tuning for one
        // specific row count.
        const panel = document.createElement('div');
        panel.className = 'panel';
        vChar.skills.forEach((_, idx) => panel.appendChild(renderSkillButton(vChar, vUnit, idx)));

        if (state.over && !suppressOverlay) {
            const overlay = document.createElement('div');
            overlay.className = 'game-over-overlay ' + (state.over === 'win' ? 'win' : 'lose');
            overlay.innerHTML = '<div class="game-over-title">' + (state.over === 'win' ? 'Victory' : 'Defeat') + '</div>';
            const btn = document.createElement('button');
            btn.className = 'restart-btn';
            btn.textContent = state.over === 'win' ? 'Continue' : 'Return to camp';
            btn.addEventListener('click', () => {
                playSfx('select');
                onBattleOverContinue();
            });
            overlay.appendChild(btn);
            stage.appendChild(overlay);
        }

        frame.appendChild(stage);
        frame.appendChild(panel);
        frame.appendChild(logBox);
        root.appendChild(frame);
    }

    // --- Rendering: character creation + camp + level-up + specialization ---

    function panelWrap(children) {
        const wrap = document.createElement('div');
        wrap.className = 'rpg-screen';
        children.forEach((c) => wrap.appendChild(c));
        return wrap;
    }
    function screenHeader(eyebrow, title, subtitle) {
        const frag = document.createDocumentFragment();
        const eb = document.createElement('div');
        eb.className = 'eyebrow';
        eb.textContent = eyebrow;
        frag.appendChild(eb);
        const h1 = document.createElement('h1');
        h1.textContent = title;
        frag.appendChild(h1);
        if (subtitle) {
            const p = document.createElement('p');
            p.className = 'subtitle';
            p.textContent = subtitle;
            frag.appendChild(p);
        }
        const holder = document.createElement('div');
        holder.appendChild(frag);
        return holder;
    }
    function choiceCard({ name, flavor, mechanics, onClick }) {
        const btn = document.createElement('button');
        btn.className = 'choice-card';
        btn.innerHTML =
            '<span class="choice-name">' + name + '</span>' +
            (flavor ? '<span class="choice-flavor">' + flavor + '</span>' : '') +
            (mechanics ? '<span class="choice-mechanics">' + mechanics + '</span>' : '');
        // Shared by every pick-a-card screen (Origin/Age at creation, Level
        // Up choices, Specialization) - one hook covers all of them.
        btn.addEventListener('click', () => {
            playSfx('select');
            onClick();
        });
        return btn;
    }

    function renderTitleScreen(root) {
        const slots = loadSlots();
        const header = screenHeader('Single-Player Prototype', 'Vampire', 'Choose a character, or create a new one.');
        const grid = document.createElement('div');
        grid.className = 'choice-grid';
        slots.forEach((slotSave, index) => grid.appendChild(renderSlotCard(index, slotSave)));
        root.appendChild(panelWrap([header, grid]));
    }

    function renderSlotCard(index, slotSave) {
        const card = document.createElement('div');
        card.className = 'choice-card slot-card';
        const name = document.createElement('span');
        name.className = 'choice-name';
        const flavor = document.createElement('span');
        flavor.className = 'choice-flavor';
        card.appendChild(name);
        card.appendChild(flavor);

        if (!slotSave) {
            name.textContent = 'Empty Slot';
            flavor.textContent = 'No character yet.';
            const createBtn = document.createElement('button');
            createBtn.className = 'encounter-btn';
            createBtn.textContent = 'Create Character';
            createBtn.addEventListener('click', () => {
                activeSlotIndex = index;
                creationDraft = {};
                screen = 'origin';
                render();
            });
            card.appendChild(createBtn);
            return card;
        }

        const ch = slotSave.character;
        const origin = PROGRESSION.ORIGINS[ch.origin];
        const age = PROGRESSION.AGES[ch.age];
        const specLabel = specializationLabel(ch);
        name.textContent = ch.name || 'Vampire';
        flavor.textContent = 'Level ' + ch.level + ' ' + origin.name + ' ' + age.name + (specLabel ? ' · ' + specLabel : '');
        const actions = document.createElement('div');
        actions.className = 'slot-card-actions';
        const playBtn = document.createElement('button');
        playBtn.className = 'encounter-btn';
        playBtn.textContent = 'Play';
        playBtn.addEventListener('click', () => {
            activeSlotIndex = index;
            save = slotSave;
            // A pending level-up/specialization choice (saved but never
            // picked - e.g. the browser was closed mid-choice) must be
            // resumed here, not silently skipped straight to camp.
            resolveNextPostVictoryScreen();
        });
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-link-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.addEventListener('click', (evt) => {
            evt.stopPropagation();
            clearSlot(index);
            render();
        });
        actions.appendChild(playBtn);
        actions.appendChild(deleteBtn);
        card.appendChild(actions);
        return card;
    }

    function renderOriginScreen(root) {
        const header = screenHeader('Create Character — Step 1 of 3', 'Choose Your Origin', 'How you became a Vampire shapes what you are now.');
        const grid = document.createElement('div');
        grid.className = 'choice-grid';
        Object.values(PROGRESSION.ORIGINS).forEach((origin) => {
            grid.appendChild(choiceCard({
                name: origin.name,
                flavor: origin.description,
                mechanics: origin.mechanicalNote,
                onClick: () => {
                    creationDraft.origin = origin.id;
                    screen = 'age';
                    render();
                },
            }));
        });
        root.appendChild(panelWrap([header, grid]));
    }

    function renderAgeScreen(root) {
        const header = screenHeader('Create Character — Step 2 of 3', 'Choose Your Age', 'How long you have carried the curse.');
        const grid = document.createElement('div');
        grid.className = 'choice-grid';
        Object.values(PROGRESSION.AGES).forEach((age) => {
            grid.appendChild(choiceCard({
                name: age.name,
                flavor: age.description,
                mechanics: age.mechanicalNote,
                onClick: () => {
                    creationDraft.age = age.id;
                    screen = 'confirm';
                    render();
                },
            }));
        });
        const back = document.createElement('button');
        back.className = 'text-link-btn';
        back.textContent = '← Back to Origin';
        back.addEventListener('click', () => { screen = 'origin'; render(); });
        root.appendChild(panelWrap([header, grid, back]));
    }

    function renderConfirmScreen(root) {
        const origin = PROGRESSION.ORIGINS[creationDraft.origin];
        const age = PROGRESSION.AGES[creationDraft.age];
        const header = screenHeader('Create Character — Step 3 of 3', 'Confirm Your Character', 'Class: Vampire');

        const nameField = document.createElement('div');
        nameField.className = 'name-field';
        const nameLabel = document.createElement('label');
        nameLabel.className = 'name-label';
        nameLabel.htmlFor = 'character-name-input';
        nameLabel.textContent = 'Name Your Vampire';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.id = 'character-name-input';
        nameInput.className = 'name-input';
        nameInput.maxLength = 24;
        nameInput.placeholder = 'Vampire';
        nameInput.value = creationDraft.name || '';
        // Deliberately does NOT call render() on every keystroke - a full
        // re-render would wipe and rebuild this input's DOM node each time,
        // losing focus/cursor position mid-type. Just track the value.
        nameInput.addEventListener('input', () => { creationDraft.name = nameInput.value; });
        nameField.appendChild(nameLabel);
        nameField.appendChild(nameInput);

        const summary = document.createElement('div');
        summary.className = 'character-sheet';
        summary.innerHTML =
            '<div class="sheet-row"><span>Class</span><span>Vampire</span></div>' +
            '<div class="sheet-row"><span>Origin</span><span>' + origin.name + '</span></div>' +
            '<div class="sheet-row"><span>Age</span><span>' + age.name + '</span></div>' +
            '<div class="sheet-row"><span>Level</span><span>1</span></div>' +
            '<p class="sheet-note">' + origin.mechanicalNote + ' ' + age.mechanicalNote + '</p>';
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'encounter-btn';
        confirmBtn.textContent = 'Confirm Character';
        confirmBtn.addEventListener('click', () => {
            save = newSave(creationDraft.origin, creationDraft.age, (creationDraft.name || '').trim());
            writeSave(save);
            creationDraft = null;
            screen = 'camp';
            render();
        });
        const back = document.createElement('button');
        back.className = 'text-link-btn';
        back.textContent = '← Back to Age';
        back.addEventListener('click', () => { screen = 'age'; render(); });
        root.appendChild(panelWrap([header, nameField, summary, confirmBtn, back]));
    }

    function renderCampScreen(root) {
        const ch = save.character;
        const origin = PROGRESSION.ORIGINS[ch.origin];
        const age = PROGRESSION.AGES[ch.age];
        const specLabel = specializationLabel(ch);
        const xpProgress = xpProgressFor(ch);

        const header = screenHeader('Camp', ch.name || 'The Vampire', 'Level ' + ch.level + ' ' + origin.name + ' ' + age.name + (specLabel ? ' · ' + specLabel : ''));
        const encounterIndex = save.campaign.encounterIndex;
        // Very-basic quest, no tracking/rewards/panel art: just the
        // upcoming encounter's enemy count, handed out fresh each Camp
        // visit rather than persisted, since it's always "beat what's next."
        const upcomingEncounter = !save.campaign.completed ? CAMPAIGN[encounterIndex] : null;

        // The Vampire standing in camp, with the mission panel beside them.
        // Clicking the panel doesn't jump straight into the fight - it
        // confirms first (native confirm(), same "no custom modal system"
        // precedent as Delete This Character below).
        const scene = document.createElement('div');
        scene.className = 'camp-stage';
        const figureWrap = document.createElement('div');
        figureWrap.className = 'camp-figure';
        const campPoseKey = playerIdlePoseKey();
        figureWrap.innerHTML = '<img src="' + (VAMPIRE_POSES[campPoseKey] || VAMPIRE_POSES.idle) + '" alt="" />';
        const campOverride = CAMP_FIGURE_OVERRIDE[campPoseKey];
        if (campOverride) {
            figureWrap.style.height = campOverride.height;
            figureWrap.style.bottom = campOverride.bottom;
        }
        scene.appendChild(figureWrap);
        if (upcomingEncounter) {
            const mission = document.createElement('button');
            mission.className = 'mission-panel';
            mission.type = 'button';
            mission.innerHTML =
                '<span class="mission-title">Mission ' + (encounterIndex + 1) + ' of ' + CAMPAIGN.length + '</span>' +
                '<span class="mission-label">' + upcomingEncounter.label + '</span>' +
                '<span class="mission-quest">Defeat ' + upcomingEncounter.enemies.length + ' ' +
                    (upcomingEncounter.enemies.length === 1 ? 'enemy' : 'enemies') + '</span>';
            mission.addEventListener('click', () => {
                if (window.confirm('Start this encounter?\n\n' + upcomingEncounter.label)) {
                    playSfx('swipe');
                    newGame(encounterIndex);
                }
            });
            scene.appendChild(mission);
        } else {
            const done = document.createElement('div');
            done.className = 'mission-panel mission-complete';
            done.textContent = 'The campaign is complete. ' + (ch.name || 'Your Vampire') + ' has survived every encounter.';
            scene.appendChild(done);
        }

        const sheet = document.createElement('div');
        sheet.className = 'character-sheet';
        sheet.innerHTML =
            '<div class="sheet-row"><span><span class="stat-icon stat-icon-xp"></span>XP</span><span>' + xpProgress.xp + ' / ' + xpProgress.nextThreshold + '</span></div>' +
            '<div class="meter xp-meter"><span style="width:' + xpProgress.pct + '%"></span></div>' +
            '<div class="sheet-row"><span>Specialization</span><span>' + (specLabel || 'Not yet chosen') + '</span></div>';

        const btnRow = document.createElement('div');
        btnRow.className = 'button-column';
        const menuBtn = document.createElement('button');
        menuBtn.className = 'text-link-btn';
        menuBtn.textContent = '← Save and Exit to Main Menu';
        menuBtn.addEventListener('click', () => {
            // Camp already writes on every meaningful mutation, so there's
            // nothing left to flush here - this just clears the in-memory
            // pointer and returns to the slot list.
            save = null;
            activeSlotIndex = null;
            screen = 'title';
            render();
        });
        btnRow.appendChild(menuBtn);
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'text-link-btn danger';
        deleteBtn.textContent = 'Delete This Character';
        deleteBtn.addEventListener('click', () => {
            // Native confirm - this is a destructive, irreversible action
            // (the whole save slot, not just progress within a run) and
            // this prototype has no custom modal system to build a nicer
            // one with.
            const name = ch.name || 'this Vampire';
            if (!window.confirm('Permanently delete ' + name + '? This cannot be undone.')) return;
            if (activeSlotIndex != null) clearSlot(activeSlotIndex);
            save = null;
            activeSlotIndex = null;
            screen = 'title';
            render();
        });
        btnRow.appendChild(deleteBtn);
        const wrap = panelWrap([header, scene, sheet, btnRow]);
        wrap.classList.add('camp-screen'); // the main hub - see CSS
        root.appendChild(wrap);
    }

    // A short celebratory beat before the actual choice screen: the XP bar
    // tops out, a burst flashes, an aura swirls in behind the character,
    // and "LEVEL UP!" banners in - then it hands off to the existing,
    // unchanged renderLevelUpScreen. Purely presentational; no game state
    // changes here beyond the screen transition at the end.
    function renderLevelUpAnimScreen(root) {
        const level = save.character.pendingLevelUps[0];
        const wrap = document.createElement('div');
        wrap.className = 'levelup-anim';
        wrap.innerHTML =
            '<div class="levelup-xp-track"><div class="levelup-xp-fill"></div></div>' +
            '<div class="levelup-stage">' +
            '<div class="levelup-aura"></div>' +
            '<img class="levelup-burst" src="assets/level-up-burst.png" alt="" />' +
            '<img class="levelup-figure" src="assets/vampire-level-up.png" alt="" />' +
            '<div class="levelup-banner">Level Up!</div>' +
            '<div class="levelup-sublabel">Level ' + level + '</div>' +
            '</div>';
        root.appendChild(wrap);
        // Fill the XP bar on the next frame so the width change from 0 is
        // actually a transition, not an instant jump (can't animate a
        // property from its own initial value applied in the same paint).
        const fill = wrap.querySelector('.levelup-xp-fill');
        requestAnimationFrame(() => requestAnimationFrame(() => { fill.style.width = '100%'; }));
        setTimeout(() => {
            if (screen !== 'levelup-anim') return; // player navigated away (e.g. fast reload)
            screen = 'levelup';
            render();
        }, 2600);
    }

    function renderLevelUpScreen(root) {
        const level = save.character.pendingLevelUps[0];
        // Specialization-gated entries (Milestone 3's "branch" skills) are
        // NOT filtered to the character's own specialization - the player
        // can multi-spec, picking a branch skill from any of the three
        // trees at each of these levels regardless of what they picked
        // before (see investedSpecializations/comboArtKeyFor, which read
        // these picks back out to drive the transformed-idle-form art).
        const options = PROGRESSION.LEVEL_CHOICES[level];
        const header = screenHeader('Level Up', 'Level ' + level, 'Choose one.');
        const grid = document.createElement('div');
        grid.className = 'choice-grid';
        options.forEach((opt) => {
            // Only a real skill unlock (level 5/6's branch skills) shows
            // which specialization it belongs to - the level 2/8 plain
            // stat choices carry requiresSpecialization purely as hidden
            // investment-tracking metadata (see LEVEL_CHOICES[2] in
            // progression.js) and must show nothing beyond their label.
            const isSkillChoice = opt.kind === 'skill';
            const mechanics = isSkillChoice
                ? buildSkillTooltipLines(null, opt.skill).map((l) => l.text).join(' · ')
                : '';
            const spec = isSkillChoice && opt.requiresSpecialization ? PROGRESSION.SPECIALIZATIONS[opt.requiresSpecialization] : null;
            grid.appendChild(choiceCard({
                name: opt.label,
                flavor: spec ? spec.name : '',
                mechanics: mechanics,
                onClick: () => pickLevelChoice(level, opt.id),
            }));
        });
        root.appendChild(panelWrap([header, grid]));
    }

    function renderSpecializationScreen(root) {
        const header = screenHeader('A Turning Point', 'Choose Your Path', 'This choice is permanent.');
        const grid = document.createElement('div');
        grid.className = 'choice-grid';
        Object.values(PROGRESSION.SPECIALIZATIONS).forEach((spec) => {
            grid.appendChild(choiceCard({
                name: spec.name,
                flavor: spec.flavorText,
                mechanics: spec.gameplayText,
                onClick: () => pickSpecialization(spec.id),
            }));
        });
        root.appendChild(panelWrap([header, grid]));
    }

    function renderCampaignCompleteScreen(root) {
        const name = (save.character.name || 'Your Vampire');
        const header = screenHeader('The Campaign Ends', 'Victory', name + ' has survived every encounter this prototype has to offer.');
        const btnRow = document.createElement('div');
        btnRow.className = 'button-column';
        const camp = document.createElement('button');
        camp.className = 'encounter-btn';
        camp.textContent = 'Return to Camp';
        camp.addEventListener('click', () => { screen = 'camp'; render(); });
        btnRow.appendChild(camp);
        root.appendChild(panelWrap([header, btnRow]));
    }

    // --- Top-level dispatch ---

    function render(opts) {
        const root = document.getElementById('app');
        root.innerHTML = '';
        if (screen === 'battle' && state) {
            renderBattleScreen(root, opts);
            return;
        }
        if (screen === 'origin') return renderOriginScreen(root);
        if (screen === 'age') return renderAgeScreen(root);
        if (screen === 'confirm') return renderConfirmScreen(root);
        if (screen === 'camp') return renderCampScreen(root);
        if (screen === 'levelup-anim') return renderLevelUpAnimScreen(root);
        if (screen === 'levelup') return renderLevelUpScreen(root);
        if (screen === 'specialization') return renderSpecializationScreen(root);
        if (screen === 'campaign-complete') return renderCampaignCompleteScreen(root);
        renderTitleScreen(root);
    }

    document.addEventListener('DOMContentLoaded', render);
})();
