const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const characters = require('../characters');
const wave = require('../pokemon-wave-2-live');
const { newsPost, launchIds, buildLatestReleasesState, mergeWave2Missions } = require('../sync_pokemon_wave_2_release');
const { buildInitialBoard, resolveEffectiveSkill, resolvePendingTurnSkills } = require('../battleLogic');
const { buildMissionUserMap, ensureRequiredMissionCatalogEntries } = require('../server');

const expectedIds = ['clefairy','jigglypuff','beedrill','articuno','moltres','zapdos','mew','mewtwo','dragonite'];
const excludedIds = ['cyndaquil','chikorita','totodile'];

test('the launch contains exactly the nine approved Pokemon and excludes the held starters', () => {
    assert.deepEqual(wave.map((character) => character.id), expectedIds);
    assert.deepEqual(launchIds, expectedIds);
    expectedIds.forEach((id) => assert.ok(characters.some((character) => character.id === id), `Missing ${id}`));
    excludedIds.forEach((id) => assert.ok(!wave.some((character) => character.id === id), `${id} was promoted`));
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
    assert.match(joinedNews, /\b(?:Blue|Red|Green|White)\b/);
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
        assert.ok(mission.goals.some((goal) => goal.type === 'win_matches_same_team'));
    });
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
});

test('Abra Calm Mind tracker survives its own trigger and Vaporeon uses player-facing wording', () => {
    const abra = characters.find((character) => character.id === 'abra');
    assert.equal(abra.startStatuses.find((status) => status.statusId === 'abra_calm_mind_tracker').metadata.preserveOnOwnerUseSkillTrigger, true);
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

test('Jigglypuff and Wigglytuff Wish are invisible and advertise the Perish Song reaction', () => {
    const wish = wave.find((character) => character.id === 'jigglypuff').skills.find((skill) => skill.id === 'jigglypuff-wish');
    assert.ok(wish.classes.includes('Invisible'));
    assert.equal(wish.effects[0].metadata.wishAdvancePerishOnHarmful, true);
    assert.ok(wish.evolvesTo.classes.includes('Invisible'));
    assert.equal(wish.evolvesTo.effects[0].metadata.wishAdvancePerishOnHarmful, true);
});
