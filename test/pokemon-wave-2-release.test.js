const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const characters = require('../characters');
const wave = require('../pokemon-wave-2-live');
const { newsPost, launchIds, buildLatestReleasesState, mergeWave2Missions } = require('../sync_pokemon_wave_2_release');
const {
    buildInitialBoard,
    computeEffectiveEnergyCost,
    resolveEffectiveSkill,
    resolvePendingTurnSkills,
    tickStatusesForTurnEnd,
} = require('../battleLogic');
const { buildMissionUserMap, ensureRequiredMissionCatalogEntries, resolveMissionUnlockPointCost } = require('../server');

const expectedIds = ['clefairy','jigglypuff','beedrill','articuno','moltres','zapdos','mew','mewtwo','dragonite'];
const excludedIds = ['cyndaquil','chikorita','totodile'];

test('the launch contains exactly the nine approved Pokemon and excludes the held starters', () => {
    assert.deepEqual(wave.map((character) => character.id), expectedIds);
    assert.deepEqual(launchIds, expectedIds);
    expectedIds.forEach((id) => assert.ok(characters.some((character) => character.id === id), `Missing ${id}`));
    excludedIds.forEach((id) => assert.ok(!wave.some((character) => character.id === id), `${id} was promoted`));
});

test('the browser launch bundle does not append duplicate characters', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '..', 'pokemon-wave-2-live.js'), 'utf8');
    const existing = wave.map((character) => ({ ...character }));
    const context = { characters: existing };
    context.window = context;
    context.globalThis = context;
    vm.runInNewContext(source, context);
    assert.equal(context.characters.length, expectedIds.length);
    expectedIds.forEach((id) => {
        assert.equal(context.characters.filter((character) => character.id === id).length, 1);
    });
});

test('every launch portrait, skill picture, evolved picture, and mission picture exists locally', () => {
    const root = path.resolve(__dirname, '..');
    const art = [];
    wave.forEach((character) => {
        art.push(character.facePicture);
        (character.skills || []).forEach((skill) => {
            if (skill.skillimage) art.push(skill.skillimage);
            if (skill.evolvesTo?.skillimage) art.push(skill.evolvesTo.skillimage);
        });
        (character.startStatuses || []).forEach((status) => {
            if (status?.metadata?.evolvedFacePicture) art.push(status.metadata.evolvedFacePicture);
        });
    });
    const missionFiles = ['articuno.jpg','beedrill.jpg','clefairy.jpg','dragonite.webp','jigglypuff.jpg','mew.jpg','mewtwo.avif','moltres.webp','zapdos.jpg'];
    missionFiles.forEach((file) => art.push(`assets/images/PokemonArena/missionpics/${file}`));
    [...new Set(art)].forEach((file) => assert.ok(fs.existsSync(path.join(root, file)), `Missing ${file}`));
});

test('the launch news includes every character, every base skill, evolved skill summaries, and image metadata', () => {
    expectedIds.forEach((id) => {
        const character = wave.find((entry) => entry.id === id);
        const entries = newsPost.changes.filter((entry) => entry.characterId === id);
        assert.equal(entries.length, character.skills.length, `Wrong news entry count for ${id}`);
        entries.forEach((entry) => {
            assert.ok(entry.facePicture);
            assert.ok(entry.skillimage);
            assert.match(entry.text, /Cost:/);
            assert.match(entry.text, /Cooldown:/);
        });
    });
    const joinedNews = newsPost.changes.map((entry) => entry.text).join(' ');
    assert.doesNotMatch(joinedNews, /\b(?:Ninjutsu|Bloodline|Taijutsu|Genjutsu)\b/);
    assert.match(joinedNews, /\b(?:Blue|Red|Green|Yellow)\b/);
    assert.doesNotMatch(joinedNews, /\bWhite\b/);
});

test('Latest Releases highlights Dragonite, Mewtwo, and Mew without changing Comic releases', () => {
    const state = buildLatestReleasesState({ releasesByArena: { comic: [{ characterId: 'grand-master-yoda' }] } });
    assert.deepEqual(state.releasesByArena.pokemon.map((entry) => entry.characterId), ['dragonite','mewtwo','mew']);
    assert.deepEqual(state.releasesByArena.comic, [{ characterId: 'grand-master-yoda' }]);
});

test('the server mission catalog contains all nine unlock missions with the uploaded mission art', () => {
    const missions = ensureRequiredMissionCatalogEntries([]);
    expectedIds.forEach((id) => {
        const mission = missions.find((entry) => entry.reward_character === id);
        assert.ok(mission, `Missing ${id} mission`);
        assert.equal(mission.arena, 'pokemon');
        assert.ok(mission.image.includes('/missionpics/'));
        const teamWins = mission.goals.find((goal) => goal.type === 'win_matches_same_team');
        const streak = mission.goals.find((goal) => goal.type === 'win_streak_same_team');
        const rank = Number(mission.rank);
        const expectedStreak = rank <= 6 ? 3 : rank <= 12 ? 4 : rank <= 17 ? 5 : 6;
        assert.ok(teamWins);
        assert.ok(streak);
        assert.deepEqual(streak.character_ids, teamWins.character_ids);
        assert.deepEqual(streak.character_names, teamWins.character_names);
        assert.equal(streak.wins, expectedStreak);
        assert.ok(!mission.goals.some((goal) => goal.type === 'win_streak'));
        assert.ok(mission.requirements.some((requirement) =>
            requirement.includes(`Win ${expectedStreak} Quick or Ladder matches in a row`) &&
            teamWins.character_ids.every((characterId) => requirement.includes(characterId))
        ));
        const expectedPointCost = ['articuno','moltres','zapdos','mew','mewtwo'].includes(id)
            ? 600
            : rank <= 6 ? 150 : rank <= 12 ? 250 : rank <= 17 ? 350 : 450;
        assert.equal(resolveMissionUnlockPointCost(mission), expectedPointCost);
    });
    const expectedRanks = { articuno:20, moltres:21, zapdos:22, mew:23, mewtwo:25, dragonite:18 };
    Object.entries(expectedRanks).forEach(([id, rank]) => {
        assert.equal(missions.find((mission) => mission.reward_character === id).level_requirement, rank);
    });
    ['articuno','moltres','zapdos','mew','mewtwo'].forEach((id) => {
        const mission = missions.find((entry) => entry.reward_character === id);
        assert.equal(mission.purchase_requires_rank, true);
        assert.equal(resolveMissionUnlockPointCost(mission), 600);
    });
});

test('mission character point costs follow the requested rank bands', () => {
    assert.equal(resolveMissionUnlockPointCost({ rank: 1 }), 150);
    assert.equal(resolveMissionUnlockPointCost({ rank: 6 }), 150);
    assert.equal(resolveMissionUnlockPointCost({ rank: 7 }), 250);
    assert.equal(resolveMissionUnlockPointCost({ rank: 12 }), 250);
    assert.equal(resolveMissionUnlockPointCost({ rank: 13 }), 350);
    assert.equal(resolveMissionUnlockPointCost({ rank: 17 }), 350);
    assert.equal(resolveMissionUnlockPointCost({ rank: 18 }), 450);
    assert.equal(resolveMissionUnlockPointCost({ rank: 40 }), 450);
});

test('Pokemon evolution auras stay inside portraits instead of covering health bars', () => {
    const root = path.resolve(__dirname, '..');
    const styleSource = fs.readFileSync(path.join(root, 'styles', 'style.css'), 'utf8');
    const auraRule = styleSource.match(/\.pokemon-evolution-aura\s*\{([\s\S]*?)\}/)?.[1] || '';
    assert.match(auraRule, /width:\s*75px/);
    assert.match(auraRule, /height:\s*75px/);
    assert.match(auraRule, /overflow:\s*hidden/);
    const ingameSource = fs.readFileSync(path.join(root, 'ingame.html'), 'utf8');
    assert.match(ingameSource, /styles\/style\.css\?v=pokemon-battle-polish-v1/);
});

test('the Mongo mission merge persists every wave-two unlock without dropping existing missions', () => {
    const missions = mergeWave2Missions([{ missionId: 'existing-mission', reward_character: 'pikachu' }]);
    assert.ok(missions.some((mission) => mission.missionId === 'existing-mission'));
    expectedIds.forEach((id) => assert.ok(missions.some((mission) => mission.reward_character === id)));
});

test('mission user lookup and winner comparisons are case insensitive', () => {
    const kito = { username: 'Kito', usernameLower: 'kito' };
    assert.equal(buildMissionUserMap([kito]).get('kito'), kito);
    const { usernamesEqual } = require('../server');
    assert.equal(usernamesEqual('KITO', 'Kito'), true);
});

test('follow-up balance values and replacement artwork are applied', () => {
    const byId = new Map(wave.map((character) => [character.id, character]));
    const beedrill = byId.get('beedrill');
    const poisonSting = beedrill.skills.find((skill) => skill.id === 'beedrill-poison-sting');
    assert.equal(poisonSting.evolvesTo.effects[0].amount, 10);
    assert.equal(beedrill.skills.find((skill) => skill.id === 'beedrill-hive-sting').skillimage.endsWith('/hivesting.webp'), true);
    assert.equal(byId.get('articuno').skills.find((skill) => skill.id === 'articuno-ice-beam').effects[0].amount, 15);
    assert.equal(byId.get('moltres').skills.find((skill) => skill.id === 'moltres-fire-spin').effects[0].metadata.teamTrapEnemyHarmfulDamage, 10);
    assert.equal(byId.get('zapdos').skills.find((skill) => skill.id === 'zapdos-flight').effects[0].metadata.zapdosThunderboltDamage, 7);
    const mewtwo = byId.get('mewtwo');
    assert.equal(mewtwo.skills.find((skill) => skill.id === 'mewtwo-psychic').cooldown, 1);
    assert.equal(mewtwo.skills.find((skill) => skill.id === 'mewtwo-recover').effects[0].type, 'mewtwo_recover');
    assert.match(mewtwo.skills.find((skill) => skill.id === 'mewtwo-psychic').skilldescription, /next Drain Punch or Shadow Ball deals 5 additional damage/);
    assert.match(mewtwo.skills.find((skill) => skill.id === 'mewtwo-drain-punch').skilldescription, /next Shadow Ball or Psychic steals 5 HP/);
    assert.match(mewtwo.skills.find((skill) => skill.id === 'mewtwo-shadow-ball').skilldescription, /next Drain Punch or Psychic deals 5 affliction damage/);
    assert.match(fs.readFileSync(path.resolve(__dirname, '..', 'ingame.html'), 'utf8'), /mewtwo-combos-v1/);
    assert.match(fs.readFileSync(path.resolve(__dirname, '..', 'selection.html'), 'utf8'), /mewtwo-combos-v1/);
});

test('Mewtwo Psychic, Drain Punch, and Shadow Ball empower only their next combo move', () => {
    const mewtwoIndex = characters.findIndex((character) => character.id === 'mewtwo');
    const mewtwo = characters[mewtwoIndex];
    const skillIndexById = new Map(mewtwo.skills.map((skill, index) => [skill.id, index]));
    const players = [{ username: 'MewtwoUser', team: [mewtwoIndex] }, { username: 'Opponent', team: [0] }];
    const board = buildInitialBoard(players, characters);
    board.MewtwoUser[0].hp = 20;
    board.Opponent[0].hp = 300;
    board.Opponent[0].maxHp = 300;
    const match = {
        players,
        board,
        chakraPools: {
            MewtwoUser: { taijutsu: 5, ninjutsu: 5, genjutsu: 5, bloodline: 5 },
            Opponent: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
        },
        pendingTurns: {},
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: { turnCounts: { MewtwoUser: 1, Opponent: 1 } },
    };
    const useSkill = (skillId) => {
        board.MewtwoUser[0].state.cooldowns = {};
        match.pendingTurns.MewtwoUser = {
            queueOrder: ['0'],
            queuedByActorSlot: {
                0: {
                    skillIndex: skillIndexById.get(skillId),
                    targetSelection: [{ username: 'Opponent', slot: 0 }],
                },
            },
        };
        resolvePendingTurnSkills({ match, actingUsername: 'MewtwoUser', characters });
    };

    useSkill('mewtwo-psychic');
    assert.equal(board.Opponent[0].hp, 280);
    assert.equal(board.MewtwoUser[0].state.statuses.some((status) => status.id === 'mewtwo_psychic_followup' && status.remainingTurns === 1), true);

    useSkill('mewtwo-drain-punch');
    assert.equal(board.Opponent[0].hp, 255);
    assert.equal(board.MewtwoUser[0].hp, 40);
    assert.equal(board.MewtwoUser[0].state.statuses.some((status) => status.id === 'mewtwo_psychic_followup'), false);

    useSkill('mewtwo-shadow-ball');
    assert.equal(board.Opponent[0].hp, 230);
    assert.equal(board.MewtwoUser[0].hp, 45);
    assert.equal(board.MewtwoUser[0].state.statuses.some((status) => status.id === 'mewtwo_drain_punch_followup'), false);

    useSkill('mewtwo-psychic');
    assert.equal(board.Opponent[0].hp, 205);
    assert.equal(board.MewtwoUser[0].state.statuses.some((status) => status.id === 'mewtwo_shadow_ball_followup'), false);
});

test('Mewtwo Recover loses 2 healing on each consecutive use', () => {
    const mewtwoIndex = characters.findIndex((character) => character.id === 'mewtwo');
    const recoverIndex = characters[mewtwoIndex].skills.findIndex((skill) => skill.id === 'mewtwo-recover');
    const players = [{ username: 'MewtwoUser', team: [mewtwoIndex] }, { username: 'Opponent', team: [0] }];
    const board = buildInitialBoard(players, characters);
    board.MewtwoUser[0].hp = 20;
    const match = {
        players,
        board,
        chakraPools: {
            MewtwoUser: { taijutsu: 5, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
            Opponent: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
        },
        pendingTurns: {},
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: { turnCounts: { MewtwoUser: 1, Opponent: 1 } },
    };
    const useRecover = () => {
        match.pendingTurns.MewtwoUser = {
            queueOrder: ['0'],
            queuedByActorSlot: { 0: { skillIndex: recoverIndex, targetSelection: [{ username: 'MewtwoUser', slot: 0 }] } },
        };
        resolvePendingTurnSkills({ match, actingUsername: 'MewtwoUser', characters });
    };
    useRecover();
    assert.equal(board.MewtwoUser[0].hp, 40);
    useRecover();
    assert.equal(board.MewtwoUser[0].hp, 58);
    useRecover();
    assert.equal(board.MewtwoUser[0].hp, 74);
});

test('Abra Calm Mind tracker survives its own trigger and Vaporeon uses player-facing wording', () => {
    const abra = characters.find((character) => character.id === 'abra');
    assert.equal(abra.startStatuses.find((status) => status.statusId === 'abra_calm_mind_tracker').metadata.preserveOnOwnerUseSkillTrigger, true);
    const abraCalmMind = abra.skills.find((skill) => skill.id === 'abra-calm-mind');
    const kadabraCalmMind = abra.skills.find((skill) => skill.id === 'kadabra-calm-mind');
    assert.deepEqual(
        {
            reduction: abraCalmMind.effects[0].metadata.damageReductionPercent,
            bonus: abraCalmMind.effects[0].metadata.damageBonusFlat,
        },
        { reduction: 10, bonus: 5 }
    );
    assert.deepEqual(
        {
            reduction: kadabraCalmMind.effects[0].metadata.damageReductionPercent,
            bonus: kadabraCalmMind.effects[0].metadata.damageBonusFlat,
        },
        { reduction: 15, bonus: 10 }
    );
    assert.match(abraCalmMind.effects[0].metadata.tooltipText, /10%.*5 additional damage/);
    const vaporeon = characters.find((character) => character.id === 'vaporeon');
    const sandAttack = vaporeon.skills.find((skill) => skill.id === 'vaporeon-sand-attack');
    assert.doesNotMatch(JSON.stringify(sandAttack), /purple/i);
});

test('using Calm Mind actually increments Abra mission and evolution tracking', () => {
    const abraIndex = characters.findIndex((character) => character.id === 'abra');
    const calmMindIndex = characters[abraIndex].skills.findIndex((skill) => skill.id === 'abra-calm-mind');
    const players = [{ username: 'Ash', team: [abraIndex] }, { username: 'Gary', team: [0] }];
    const board = buildInitialBoard(players, characters);
    const match = {
        players,
        board,
        chakraPools: {
            Ash: { taijutsu: 0, ninjutsu: 0, genjutsu: 2, bloodline: 0 },
            Gary: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
        },
        pendingTurns: {
            Ash: {
                queueOrder: ['0'],
                queuedByActorSlot: {
                    0: { skillIndex: calmMindIndex, targetSelection: [{ username: 'Ash', slot: 0 }] },
                },
            },
        },
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: { turnCounts: { Ash: 1, Gary: 1 } },
    };
    resolvePendingTurnSkills({ match, actingUsername: 'Ash', characters });
    const tracker = board.Ash[0].state.statuses.find((status) => status.id === 'abra_calm_mind_tracker');
    assert.equal(tracker.metadata.abraCalmMindUses, 1);
});

test('Clefairy, Jigglypuff, and Beedrill resolve their evolved skill sets', () => {
    for (const id of ['clefairy','jigglypuff','beedrill']) {
        const rosterIndex = characters.findIndex((character) => character.id === id);
        const base = characters[rosterIndex].skills.findIndex((skill) => skill.evolvesTo);
        const evolved = resolveEffectiveSkill({
            characters,
            rosterIndex,
            skillIndex: base,
            actorState: { statuses: [{ id: `${id}_evolved`, remainingTurns: 99, metadata: { useEvolvedSkills: true } }] },
        });
        assert.equal(evolved.id, characters[rosterIndex].skills[base].evolvesTo.id);
    }
});

test('Jigglypuff and Wigglytuff use the shorter Perish Song countdowns and reactive Wish', () => {
    const jigglypuff = wave.find((character) => character.id === 'jigglypuff');
    const perishSong = jigglypuff.skills.find((skill) => skill.id === 'jigglypuff-perish-song');
    const wish = jigglypuff.skills.find((skill) => skill.id === 'jigglypuff-wish');
    const sing = jigglypuff.skills.find((skill) => skill.id === 'jigglypuff-sing');
    assert.equal(perishSong.effects[0].duration, 4);
    assert.match(perishSong.skilldescription, /4 turns/);
    assert.equal(perishSong.effects[0].metadata.endIfSourceDies, undefined);
    assert.equal(perishSong.evolvesTo.effects[0].duration, 3);
    assert.match(perishSong.evolvesTo.skilldescription, /3 turns/);
    assert.equal(perishSong.evolvesTo.effects[0].metadata.endIfSourceDies, undefined);
    const humiliate = jigglypuff.skills.find((skill) => skill.id === 'jigglypuff-humiliate');
    assert.deepEqual(humiliate.energy, []);
    assert.deepEqual(humiliate.evolvesTo.energy, []);
    assert.equal(humiliate.effects[1].type, 'gain_chakra');
    assert.equal(humiliate.effects[1].condition.statusId, 'jigglypuff_sing');
    assert.equal(humiliate.evolvesTo.effects[1].condition.statusId, 'jigglypuff_sing');
    assert.ok(sing.classes.includes('Channeled'));
    assert.ok(!sing.classes.includes('Instant'));
    assert.equal(sing.target, 'single-enemy');
    assert.equal(sing.effects[0].duration, 2);
    assert.equal(sing.effects[0].scope, 'target');
    assert.equal(sing.effects[1].metadata.advanceAllEnemyPerishEachTurn, true);
    assert.ok(sing.evolvesTo.classes.includes('Channeled'));
    assert.ok(!sing.evolvesTo.classes.includes('Instant'));
    assert.equal(sing.evolvesTo.target, 'all-enemy');
    assert.equal(sing.evolvesTo.effects[0].duration, 2);
    assert.equal(sing.evolvesTo.effects[0].scope, 'all-enemy');
    assert.equal(sing.evolvesTo.effects[1].metadata.advanceAllEnemyPerishEachTurn, true);
    assert.ok(wish.classes.includes('Invisible'));
    assert.equal(wish.effects[0].metadata.turnStartHeal, 20);
    assert.equal(wish.effects[0].metadata.wishAdvancePerishOnHarmful, true);
    assert.ok(wish.evolvesTo.classes.includes('Invisible'));
    assert.equal(wish.evolvesTo.effects[0].metadata.turnStartHeal, 20);
    assert.equal(wish.evolvesTo.effects[0].metadata.wishAdvancePerishOnHarmful, true);
});
test('wave-two evolutions are exposed to both Pokemon roster viewers, including Fell Stinger', () => {
    const root = path.resolve(__dirname, '..');
    const selectionSource = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    const skillsPageSource = fs.readFileSync(path.join(root, 'pokemon-charactersandskills.html'), 'utf8');
    assert.match(selectionSource, /getSelectionVisibleSkills[\s\S]*?skill\?\.evolvesTo/);
    assert.match(skillsPageSource, /var evolvedSkills = baseSkills\.map[\s\S]*?skill\.evolvesTo/);
    assert.match(skillsPageSource, /metadata\.evolvedFacePicture/);

    const beedrill = wave.find((character) => character.id === 'beedrill');
    const fellStinger = beedrill.skills.find((skill) => skill.id === 'beedrill-envenom').evolvesTo;
    assert.equal(fellStinger.id, 'mega-beedrill-fell-stinger');
    assert.notEqual(fellStinger.hiddenFromSelectionViewer, true);
});

test('Pokemon roster presentation is Trainer first and then National Pokedex order', () => {
    const expected = [
        'pokemon-trainer','bulbasaur','charmander','squirtle','butterfree','beedrill','pidgey','ekans',
        'pikachu','clefairy','jigglypuff','zubat','meowth','abra','machop','primeape','magnemite','gastly','onix',
        'krabby','hitmonlee','hitmonchan','koffing','chansey','mr-mime','scyther','magikarp','ditto',
        'eevee','vaporeon','jolteon','flareon','aerodactyl','articuno','zapdos','moltres','dragonite',
        'mewtwo','mew','chikorita','cyndaquil','totodile','nincada','scraggy','aegislash','dragapult',
    ];
    const root = path.resolve(__dirname, '..');
    const selectionSource = fs.readFileSync(path.join(root, 'scripts', 'script.js'), 'utf8');
    const selectionHtml = fs.readFileSync(path.join(root, 'selection.html'), 'utf8');
    const skillsPageSource = fs.readFileSync(path.join(root, 'pokemon-charactersandskills.html'), 'utf8');
    const selectionOrder = selectionSource.match(/const preferredPokemonCharacterDisplayOrder = \[([\s\S]*?)\];/)?.[1] || '';
    const skillsOrder = skillsPageSource.match(/var preferredCharacterDisplayOrder = \[([\s\S]*?)\];/)?.[1] || '';
    for (const source of [selectionOrder, skillsOrder]) {
        const listedIds = [...source.matchAll(/["']([a-z0-9-]+)["']/g)].map((match) => match[1]);
        assert.deepEqual(listedIds, expected);
    }
    const currentPokemonIds = characters
        .filter((character) => String(character?.arena || character?.universe || '').toLowerCase() === 'pokemon')
        .map((character) => character.id);
    assert.deepEqual(new Set(expected), new Set(currentPokemonIds));
    assert.equal(expected.length, currentPokemonIds.length);
    assert.match(selectionHtml, /pokemon-roster-dex-v1/);
});

test('Rare Candy can evolve Clefairy, Jigglypuff, and Meowth', () => {
    const trainer = characters.find((character) => character.id === 'pokemon-trainer');
    const rareCandy = trainer.skills.find((skill) => skill.id === 'pokemon-trainer-rare-candy');
    for (const characterId of ['clefairy', 'jigglypuff', 'meowth']) {
        const evolution = rareCandy.effects.find(
            (effect) => effect.condition?.characterId === characterId && /_evolution$/.test(effect.statusId || '')
        );
        const defense = rareCandy.effects.find(
            (effect) => effect.condition?.characterId === characterId && /rare_candy_defense$/.test(effect.statusId || '')
        );
        assert.ok(evolution, `Missing ${characterId} Rare Candy evolution`);
        assert.ok(defense, `Missing ${characterId} Rare Candy defense`);
    }
});

test('Rare Candy applies Clefairy evolution, defense, evolved skills, and Trainer Revive swap', () => {
    const trainerIndex = characters.findIndex((character) => character.id === 'pokemon-trainer');
    const clefairyIndex = characters.findIndex((character) => character.id === 'clefairy');
    const rareCandyIndex = characters[trainerIndex].skills.findIndex(
        (skill) => skill.id === 'pokemon-trainer-rare-candy'
    );
    const players = [
        { username: 'Ash', team: [trainerIndex, clefairyIndex] },
        { username: 'Gary', team: [0] },
    ];
    const board = buildInitialBoard(players, characters);
    const match = {
        players,
        board,
        chakraPools: {
            Ash: { taijutsu: 0, ninjutsu: 1, genjutsu: 1, bloodline: 0 },
            Gary: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
        },
        pendingTurns: {
            Ash: {
                queueOrder: ['0'],
                queuedByActorSlot: {
                    0: {
                        skillIndex: rareCandyIndex,
                        targetSelection: [{ username: 'Ash', slot: 1 }],
                    },
                },
            },
        },
        pendingActions: [],
        pendingQueuedEffects: [],
        economy: { turnCounts: { Ash: 1, Gary: 1 } },
    };

    resolvePendingTurnSkills({ match, actingUsername: 'Ash', characters });

    const clefairyStatuses = board.Ash[1].state.statuses;
    assert.ok(clefairyStatuses.some((status) => status.id === 'clefairy_clefable_evolution'));
    assert.ok(clefairyStatuses.some((status) => status.id === 'clefairy_clefable_rare_candy_defense'));
    assert.ok(!clefairyStatuses.some((status) => status.id === 'clefairy_evolution_tracker'));
    const evolvedMetronome = resolveEffectiveSkill({
        characters,
        rosterIndex: clefairyIndex,
        skillIndex: 0,
        actorState: board.Ash[1].state,
    });
    assert.equal(evolvedMetronome.id, 'clefable-metronome');
    const trainerSwap = board.Ash[0].state.statuses.find(
        (status) => status.id === 'pokemon_trainer_rare_candy_swap'
    );
    assert.equal(trainerSwap?.metadata?.skillReplacements?.['pokemon-trainer-rare-candy'], 'pokemon-trainer-revive');
});

test('permanent stacking damage starts on cast and uses the current stack total', () => {
    const beedrillIndex = characters.findIndex((character) => character.id === 'beedrill');
    const poisonStingIndex = characters[beedrillIndex].skills.findIndex(
        (skill) => skill.id === 'beedrill-poison-sting'
    );
    const players = [{ username: 'bee', team: [beedrillIndex] }, { username: 'target', team: [0] }];
    const board = buildInitialBoard(players, characters);
    const match = {
        players,
        board,
        chakraPools: {
            bee: { taijutsu: 2, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
            target: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
        },
        pendingTurns: {}, pendingActions: [], pendingQueuedEffects: [],
        economy: { turnCounts: { bee: 1, target: 1 } },
    };
    const cast = () => {
        match.pendingTurns.bee = {
            queueOrder: ['0'],
            queuedByActorSlot: {
                0: { skillIndex: poisonStingIndex, targetSelection: [{ username: 'target', slot: 0 }] },
            },
        };
        resolvePendingTurnSkills({ match, actingUsername: 'bee', characters });
        match.board.bee[0].state.cooldowns = {};
    };
    cast();
    assert.equal(board.target[0].hp, 95);
    cast();
    assert.equal(board.target[0].hp, 85);
});

test('Overheat loses Random after one use and costs one Bloodline after two', () => {
    const moltresIndex = characters.findIndex((character) => character.id === 'moltres');
    const moltres = characters[moltresIndex];
    const overheatIndex = moltres.skills.findIndex((skill) => skill.id === 'moltres-overheat');
    const overheat = moltres.skills[overheatIndex];
    const players = [{ username: 'moltres', team: [moltresIndex] }, { username: 'target', team: [0] }];
    const board = buildInitialBoard(players, characters);
    const match = {
        players,
        board,
        chakraPools: {
            moltres: { taijutsu: 2, ninjutsu: 0, genjutsu: 0, bloodline: 4 },
            target: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
        },
        pendingTurns: {}, pendingActions: [], pendingQueuedEffects: [],
        economy: { turnCounts: { moltres: 1, target: 1 } },
    };
    const cast = () => {
        match.pendingTurns.moltres = {
            queueOrder: ['0'],
            queuedByActorSlot: {
                0: { skillIndex: overheatIndex, targetSelection: [{ username: 'target', slot: 0 }] },
            },
        };
        resolvePendingTurnSkills({ match, actingUsername: 'moltres', characters });
    };
    cast();
    assert.deepEqual(computeEffectiveEnergyCost({ skill: overheat, actorState: board.moltres[0].state }), {
        reservedSpecific: { taijutsu: 0, ninjutsu: 0, bloodline: 2, genjutsu: 0 },
        requiredRandom: 0,
    });
    cast();
    assert.deepEqual(computeEffectiveEnergyCost({ skill: overheat, actorState: board.moltres[0].state }), {
        reservedSpecific: { taijutsu: 0, ninjutsu: 0, bloodline: 1, genjutsu: 0 },
        requiredRandom: 0,
    });
});

test('Articuno uses only Ninjutsu costs and Zap Cannon costs two Genjutsu plus Random', () => {
    const articuno = wave.find((character) => character.id === 'articuno');
    articuno.skills.forEach((skill) => assert.ok(!(skill.energy || []).includes('Genjutsu')));
    assert.deepEqual(articuno.skills.find((skill) => skill.id === 'articuno-blizzard').energy, ['Ninjutsu']);
    assert.deepEqual(articuno.skills.find((skill) => skill.id === 'articuno-sheer-cold').energy, [
        'Ninjutsu', 'Ninjutsu', 'Random',
    ]);
    const zapdos = wave.find((character) => character.id === 'zapdos');
    assert.deepEqual(zapdos.skills.find((skill) => skill.id === 'zapdos-zap-cannon').energy, [
        'Genjutsu', 'Genjutsu', 'Random',
    ]);
});

test('Sunny Day grants exactly one Heat total', () => {
    const moltres = wave.find((character) => character.id === 'moltres');
    const sunnyDay = moltres.skills.find((skill) => skill.id === 'moltres-sunny-day');
    assert.equal(sunnyDay.effects.filter((effect) => effect.type === 'gain_heat').length, 1);
    assert.equal(sunnyDay.effects.find((effect) => effect.type === 'gain_heat').amount, 1);
    assert.ok(!sunnyDay.effects.some((effect) => Number(effect?.metadata?.turnStartGainHeat) > 0));
});

test('requested Pokemon use only their assigned role categories', () => {
    const roles = Object.fromEntries(wave.map((character) => [character.id, character.role]));
    const roleCategories = Object.fromEntries(wave.map((character) => [character.id, character.roleCategory]));
    assert.deepEqual(
        {
            mew: roles.mew,
            clefairy: roles.clefairy,
            jigglypuff: roles.jigglypuff,
            articuno: roles.articuno,
            mewtwo: roles.mewtwo,
            dragonite: roles.dragonite,
        },
        {
            mew: 'Shield Support',
            clefairy: 'Damage Support',
            jigglypuff: 'Utility Support',
            articuno: 'AOE DPS',
            mewtwo: 'Specialist',
            dragonite: 'Tank',
        }
    );
    assert.deepEqual(
        {
            mew: roleCategories.mew,
            clefairy: roleCategories.clefairy,
            jigglypuff: roleCategories.jigglypuff,
            articuno: roleCategories.articuno,
            mewtwo: roleCategories.mewtwo,
            dragonite: roleCategories.dragonite,
        },
        {
            mew: 'shield-support',
            clefairy: 'damage-support',
            jigglypuff: 'utility-support',
            articuno: 'aoe-dps',
            mewtwo: 'specialist',
            dragonite: 'tank',
        }
    );
});

test('Dragonite Pressure stacks and an ignored taunt refreshes only once', () => {
    const dragonite = wave.find((character) => character.id === 'dragonite');
    const pressure = dragonite.skills.find((skill) => skill.id === 'dragonite-pressure');
    assert.match(pressure.skilldescription, /stacking 10 unpierceable damage reduction/i);
    assert.match(pressure.skilldescription, /does not attack[\s\S]*taunt refreshes once/i);
    const pressureStatus = dragonite.startStatuses.find((status) => status.statusId === 'dragonite_pressure_passive');
    assert.equal(
        pressureStatus.metadata.onOwnerUseSkillApplyStatusToOwner.metadata.allowDuplicateStatusInstances,
        true
    );

    const players = [{ username: 'dragonite', team: [0] }, { username: 'enemy', team: [1] }];
    const board = buildInitialBoard(players, characters);
    const match = { players, board };
    const enemyState = board.enemy[0].state;
    enemyState.statuses.push({
        id: 'dragonite_taunt', remainingTurns: 1, fresh: false,
        metadata: { harmful: true, taunt: true, refreshIfIgnoredOnce: true },
    });
    tickStatusesForTurnEnd({ match, endingUsername: 'enemy' });
    let taunt = enemyState.statuses.find((status) => status.id === 'dragonite_taunt');
    assert.equal(taunt.remainingTurns, 1);
    assert.equal(taunt.metadata._refreshIfIgnoredOnceConsumed, true);
    tickStatusesForTurnEnd({ match, endingUsername: 'enemy' });
    taunt = enemyState.statuses.find((status) => status.id === 'dragonite_taunt');
    assert.equal(taunt, undefined);
});
