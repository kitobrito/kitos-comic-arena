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
        // Assignments deliberately avoid two reused-art enemies sharing a
        // base image within the same campaign encounter (see CAMPAIGN
        // below) - e.g. Hobgoblin Warrior fights alongside the real
        // Skeleton in encounter 3, so it reuses goblin-grunt art instead.
        'goblin-sneak': 'assets/goblin-grunt.png',
        'goblin-shaman': 'assets/goblin-grunt.png',
        'hobgoblin-warrior': 'assets/goblin-grunt.png',
        'hobgoblin-archer': 'assets/skeleton.png',
        'zombie': 'assets/skeleton.png',
    };
    // Attack/hit/defeated pose sets, for the three enemies with real
    // (non-tinted-placeholder) art - mirrors VAMPIRE_POSES/setVampireImage
    // below, just keyed by characterId instead of skill id. Enemies with no
    // entry here keep showing their single static ENEMY_ART image for the
    // whole fight, exactly as before - no regression for the placeholder five.
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
    };

    const CAMPAIGN = [
        { label: 'A Lone Goblin Grunt', enemies: ['goblin-grunt'] },
        { label: 'A Giant Rat and a Goblin Sneak', enemies: ['giant-rat', 'goblin-sneak'] },
        { label: 'A Skeleton and a Hobgoblin Warrior', enemies: ['skeleton', 'hobgoblin-warrior'] },
        { label: 'A Goblin Shaman, a Hobgoblin Archer, and a Zombie', enemies: ['goblin-shaman', 'hobgoblin-archer', 'zombie'] },
        // By this point the player has specialized - this finale exists so
        // there's at least one fight left to actually feel that choice in,
        // not just pick it and see the campaign end.
        { label: 'The Warband Regroups: Goblin Grunt, Skeleton, and Giant Rat', enemies: ['goblin-grunt', 'skeleton', 'giant-rat'] },
        // Milestone 3: exists so there's a fight left to use the first
        // specialization "branch" skill (unlocked after encounter 5) in -
        // same reasoning as the encounter above. Enemies chosen so none of
        // the three share a tinted-art base image with each other (Warrior
        // uses goblin-grunt.png, Zombie/Skeleton-family uses skeleton.png,
        // Giant Rat has its own real art) - see ENEMY_ART above.
        { label: "The Elder's Trial: Hobgoblin Warrior, Zombie, and Giant Rat", enemies: ['hobgoblin-warrior', 'zombie', 'giant-rat'] },
    ];

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

        const choiceBonuses = { maxHp: 0, bloodCap: 0, power: 0 };
        const choiceSkills = [];
        (characterSave.levelChoiceIds || []).forEach((choiceId) => {
            Object.values(PROGRESSION.LEVEL_CHOICES).forEach((options) => {
                const found = options.find((c) => c.id === choiceId);
                if (!found) return;
                if (found.kind === 'skill') {
                    choiceSkills.push(found.skill);
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

        const lifeRip = character.skills.find((s) => s.id === 'life_rip');
        lifeRip.effects[0].amount += power;

        const dayCurse = character.startStatuses.find((s) => s.id === DAY_STATUS_ID);
        Object.assign(dayCurse.metadata, curseMetadataFor(characterSave, 'day'));

        character.startingHp = 100 + choiceBonuses.maxHp;

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
        return {
            infiniteDuration: true, harmful: false,
            damageBonusFlat: curseFlat, healingBonusFlat: curseFlat,
            // Night Blessing's own curseFlat reduction and base Armor both
            // land on the same damageReductionFlat total, and add together.
            damageReductionFlat: curseFlat + armorAmount,
            armorAmount: armorAmount,
            tooltipText: 'Night Blessing: deals ' + curseFlat + ' more damage, takes ' + curseFlat + ' less damage, heals ' + curseFlat + ' more. Armor ' + armorAmount + '.',
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
        state = {
            match: {
                players,
                board,
                pendingTurns: {},
                chakraPools: { player: emptyChakraPool(), enemy: emptyChakraPool() },
                economy: { turnCounts: { player: 0, enemy: 0 } },
            },
            dayNight: 'day',
            vampirePose: 'idle',
            log: [],
            over: null,
            pendingSkillIndex: null,
            busy: false,
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
        const enemiesAlive = state.match.board.enemy.some((u) => u.alive !== false);
        const playerAlive = state.match.board.player.some((u) => u.alive !== false);
        if (!enemiesAlive) state.over = 'win';
        else if (!playerAlive) state.over = 'lose';
    }

    function onSkillClick(skillIndex) {
        if (state.over || state.busy) return;
        const unit = vampireUnit();
        const character = characterForUnit(unit);
        const skill = character.skills[skillIndex];
        if (!isActiveSkill(skill)) return;
        if (BE.getSkillCooldownRemaining(unit.state, skill.id) > 0) return;
        if (skill.target === 'self') {
            playPlayerAction(skillIndex, null);
            return;
        }
        const aliveEnemies = state.match.board.enemy
            .map((u, slot) => ({ u, slot }))
            .filter((e) => e.u.alive !== false);
        if (aliveEnemies.length === 1) {
            playPlayerAction(skillIndex, aliveEnemies[0].slot);
            return;
        }
        state.pendingSkillIndex = skillIndex;
        render();
    }

    function onEnemyTargetClick(slot) {
        if (state.over || state.busy || state.pendingSkillIndex == null) return;
        const unit = state.match.board.enemy[slot];
        if (!unit || unit.alive === false) return;
        const skillIndex = state.pendingSkillIndex;
        state.pendingSkillIndex = null;
        playPlayerAction(skillIndex, slot);
    }

    // Skill id -> action-pose key in VAMPIRE_POSES, for the attack sequence
    // (windup -> action pose -> impact -> back to idle). Skills with no
    // mapped pose just hold the windup frame briefly instead.
    const SKILL_ACTION_POSE = {
        vampire_bite: 'vampire_bite',
        life_rip: 'life_rip',
        vampire_guard: 'vampire_guard',
    };

    function playPlayerAction(skillIndex, targetSlot) {
        const unit = vampireUnit();
        const character = characterForUnit(unit);
        const skill = character.skills[skillIndex];
        const targetSelection = buildTargetSelection(skill, 'player', 0, targetSlot);
        state.match.pendingTurns.player = {
            queueOrder: [0],
            queuedByActorSlot: { 0: { skillIndex, targetSelection } },
        };
        const before = snapshotHp();
        BE.resolvePendingTurnSkills({ match: state.match, actingUsername: 'player', characters: ROSTER });
        log('You use ' + skill.name + '.', 'you');
        endSideTurn('player');
        checkOutcome();
        state.pendingSkillIndex = null;
        const diffs = diffHp(before);
        render();
        // Guard is a brace, not a strike - it skips the windup/lunge
        // (which reads as an attack), but now has its own dedicated pose
        // (distinct from the hit-reaction pose, which has its own art too)
        // so it still gets a visual beat, just not a lunge into it.
        let enemyTurnDelay = 900;
        if (skill.id === 'vampire_guard') {
            setVampireImage('vampire_guard');
            showTurnEffects([{ username: 'player', slot: 0 }], diffs);
            setTimeout(() => setVampireImage(state.vampirePose), 500);
            enemyTurnDelay = 700;
        } else {
            setVampireImage('windup');
            const actionPose = SKILL_ACTION_POSE[skill.id];
            setTimeout(() => {
                if (actionPose) setVampireImage(actionPose);
                showTurnEffects([{ username: 'player', slot: 0 }], diffs);
            }, 160);
            setTimeout(() => setVampireImage(state.vampirePose), 520);
        }
        if (!state.over) {
            state.busy = true;
            setTimeout(runEnemyTurn, enemyTurnDelay);
        }
    }

    function runEnemyTurn() {
        const enemyBoard = state.match.board.enemy;
        const queueOrder = [];
        const queuedByActorSlot = {};
        const acted = [];
        enemyBoard.forEach((unit, slot) => {
            if (!unit || unit.alive === false) return;
            const character = characterForUnit(unit);
            const skillIndex = character.skills.findIndex(
                (sk) => isActiveSkill(sk) && BE.getSkillCooldownRemaining(unit.state, sk.id) <= 0
            );
            if (skillIndex < 0) return;
            const skill = character.skills[skillIndex];
            const targetSelection = skill.target === 'self'
                ? [{ username: 'enemy', slot }]
                : [{ username: 'player', slot: 0 }];
            queueOrder.push(slot);
            queuedByActorSlot[slot] = { skillIndex, targetSelection };
            acted.push({ username: 'enemy', slot });
            log(character.name + ' uses ' + skill.name + '.', 'foe');
        });
        state.match.pendingTurns.enemy = { queueOrder, queuedByActorSlot };
        const before = snapshotHp();
        BE.resolvePendingTurnSkills({ match: state.match, actingUsername: 'enemy', characters: ROSTER });
        endSideTurn('enemy');
        checkOutcome();
        state.busy = false;
        const diffs = diffHp(before);
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
            }, 550);
        } else if (vampireHurt) {
            setVampireImage('hit');
            setTimeout(() => setVampireImage(state.vampirePose), 420);
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
    // statuses (see curseMetadataFor() for the player, and Hobgoblin
    // Warrior's startStatuses for an enemy example) - purely for the shield
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
        const el = findCombatantEl('player', 0);
        const figure = el && el.querySelector('.figure');
        const img = figure && figure.querySelector('img');
        if (img) img.src = VAMPIRE_POSES[poseKey] || VAMPIRE_POSES.idle;
        if (figure) figure.style.height = VAMPIRE_POSE_HEIGHT[poseKey] || '';
    }

    // Same direct-DOM-swap pattern as setVampireImage, for an enemy slot.
    // A no-op for any characterId without an ENEMY_POSES entry - those keep
    // their single static ENEMY_ART image, unchanged.
    function setEnemyImage(slot, characterId, poseKey) {
        const poses = ENEMY_POSES[characterId];
        if (!poses) return;
        const el = findCombatantEl('enemy', slot);
        const img = el && el.querySelector('.figure img');
        if (img) img.src = poses[poseKey] || poses.idle;
    }

    // Applies brief lunge/hit-flash animation classes and spawns floating
    // damage/heal numbers, reading fresh DOM built by the render() just prior.
    // Also drives enemy attack/hit/defeated pose-swapping (setEnemyImage) for
    // the three enemies with a real pose set - a no-op for everyone else.
    function showTurnEffects(acted, diffs) {
        acted.forEach(({ username, slot }) => {
            const el = findCombatantEl(username, slot);
            const figure = el && el.querySelector('.figure');
            if (!figure) return;
            figure.classList.add('is-acting');
            setTimeout(() => figure.classList.remove('is-acting'), 260);
            if (username === 'enemy') {
                const unit = state.match.board.enemy[slot];
                const character = unit && characterForUnit(unit);
                if (character) {
                    setEnemyImage(slot, character.characterId, 'attack');
                    setTimeout(() => setEnemyImage(slot, character.characterId, 'idle'), 420);
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
                setTimeout(() => figure.classList.remove('is-hit'), 340);
                if (username === 'enemy') {
                    const unit = state.match.board.enemy[slot];
                    const character = unit && characterForUnit(unit);
                    if (character) {
                        if (unit.alive === false) {
                            setEnemyImage(slot, character.characterId, 'defeated');
                        } else {
                            setEnemyImage(slot, character.characterId, 'hit');
                            setTimeout(() => setEnemyImage(slot, character.characterId, 'idle'), 420);
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
        img.src = isEnemy
            ? (dead && enemyPoses ? enemyPoses.defeated : (ENEMY_ART[character.characterId] || ''))
            : VAMPIRE_POSES[state.vampirePose] || VAMPIRE_POSES.idle;
        figure.appendChild(img);
        el.appendChild(figure);

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
            return compact ? { text: compact } : null;
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
        const cooldown = isPassive ? 0 : BE.getSkillCooldownRemaining(unit.state, skill.id);
        btn.disabled = isPassive || cooldown > 0 || state.over || state.busy;
        const iconImg = skill.id === 'vampire_bite' ? 'assets/icon-bite.jpg'
            : skill.id === 'life_rip' ? 'assets/icon-liferip.jpg'
            : null;
        const icon = skill.id === 'vampire_guard' ? '&#128737;'
            : skill.id === 'feral_rampage' ? '&#128064;'
            : skill.id === 'hemonancer_blood_ward' ? '&#128167;'
            : skill.id === 'elder_mastery_shadow_veil' ? '&#127763;'
            : '&#10022;';
        const iconHtml = iconImg
            ? '<span class="skill-icon skill-icon-framed"><img src="' + iconImg + '" alt="" /></span>'
            : '<span class="skill-icon">' + icon + '</span>';
        btn.innerHTML =
            iconHtml +
            '<span class="skill-text"><span class="skill-name">' + skill.name + '</span>' +
            (isPassive ? '<span class="skill-tag">Passive</span>' : cooldown > 0 ? '<span class="skill-tag">Cooldown ' + cooldown + '</span>' : '') +
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

    function renderStageBackdrop() {
        return (
            '<div class="backdrop day"></div><div class="backdrop night"></div><div class="scrim"></div>'
        );
    }

    function renderBattleScreen(root, opts) {
        const suppressOverlay = !!(opts && opts.suppressOverlay);
        const frame = document.createElement('div');
        frame.className = 'stage-frame';
        const stage = document.createElement('div');
        stage.className = 'stage ' + (state.dayNight === 'night' ? 'is-night' : 'is-day');
        stage.innerHTML = renderStageBackdrop();

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

        const panel = document.createElement('div');
        panel.className = 'panel';
        vChar.skills.forEach((_, idx) => panel.appendChild(renderSkillButton(vChar, vUnit, idx)));
        stage.appendChild(panel);

        if (state.over && !suppressOverlay) {
            const overlay = document.createElement('div');
            overlay.className = 'game-over-overlay ' + (state.over === 'win' ? 'win' : 'lose');
            overlay.innerHTML = '<div class="game-over-title">' + (state.over === 'win' ? 'Victory' : 'Defeat') + '</div>';
            const btn = document.createElement('button');
            btn.className = 'restart-btn';
            btn.textContent = state.over === 'win' ? 'Continue' : 'Return to camp';
            btn.addEventListener('click', onBattleOverContinue);
            overlay.appendChild(btn);
            stage.appendChild(overlay);
        }

        frame.appendChild(stage);
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
        btn.addEventListener('click', onClick);
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
        const spec = ch.specialization ? PROGRESSION.SPECIALIZATIONS[ch.specialization] : null;
        name.textContent = ch.name || 'Vampire';
        flavor.textContent = 'Level ' + ch.level + ' ' + origin.name + ' ' + age.name + (spec ? ' · ' + spec.name : '');
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
        const spec = ch.specialization ? PROGRESSION.SPECIALIZATIONS[ch.specialization] : null;
        const xpProgress = xpProgressFor(ch);

        const header = screenHeader('Camp', ch.name || 'The Vampire', 'Level ' + ch.level + ' ' + origin.name + ' ' + age.name + (spec ? ' · ' + spec.name : ''));
        const sheet = document.createElement('div');
        sheet.className = 'character-sheet';
        sheet.innerHTML =
            '<div class="sheet-row"><span><span class="stat-icon stat-icon-xp"></span>XP</span><span>' + xpProgress.xp + ' / ' + xpProgress.nextThreshold + '</span></div>' +
            '<div class="meter xp-meter"><span style="width:' + xpProgress.pct + '%"></span></div>' +
            '<div class="sheet-row"><span>Specialization</span><span>' + (spec ? spec.name : 'Not yet chosen') + '</span></div>';
        const encounterIndex = save.campaign.encounterIndex;
        const btnRow = document.createElement('div');
        btnRow.className = 'button-column';
        if (save.campaign.completed) {
            const done = document.createElement('div');
            done.className = 'subtitle';
            done.textContent = 'The campaign is complete. ' + (ch.name || 'Your Vampire') + ' has survived every encounter.';
            btnRow.appendChild(done);
        } else {
            const encounter = CAMPAIGN[encounterIndex];
            const enter = document.createElement('button');
            enter.className = 'encounter-btn';
            enter.textContent = 'Enter Encounter ' + (encounterIndex + 1) + ' of ' + CAMPAIGN.length + ': ' + encounter.label;
            enter.addEventListener('click', () => newGame(encounterIndex));
            btnRow.appendChild(enter);
        }
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
        root.appendChild(panelWrap([header, sheet, btnRow]));
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
        // filtered to just the one matching the character's specialization
        // - since specialization is always chosen well before these levels
        // are reached, exactly one of the three ever matches, so this still
        // renders as a single confirm-to-unlock card via the same flow as
        // every other level-up choice.
        const options = PROGRESSION.LEVEL_CHOICES[level].filter(
            (opt) => !opt.requiresSpecialization || opt.requiresSpecialization === save.character.specialization
        );
        const header = screenHeader('Level Up', 'Level ' + level, 'Choose one.');
        const grid = document.createElement('div');
        grid.className = 'choice-grid';
        options.forEach((opt) => {
            const mechanics = opt.kind === 'skill'
                ? buildSkillTooltipLines(null, opt.skill).map((l) => l.text).join(' · ')
                : '';
            grid.appendChild(choiceCard({
                name: opt.label,
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
