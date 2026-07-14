const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const characters = require('../characters');
const wave = require('../pokemon-wave-2-live');
const { newsPost, launchIds, buildLatestReleasesState } = require('../sync_pokemon_wave_2_release');
const { resolveEffectiveSkill } = require('../battleLogic');
const { ensureRequiredMissionCatalogEntries } = require('../server');

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
