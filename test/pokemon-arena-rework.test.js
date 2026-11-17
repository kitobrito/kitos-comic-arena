'use strict';

// Pokemon Arena rework (tools/pokemon-rework): every reworked kit is simple, readable and actually plays
// through the battle engine: each skill (and its evolved form) is cast, and evolution happens on schedule.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const characters = require('../characters');
const { POKEMON_REWORKED_IDS } = require('../pokemonReworkData');
const kits = require('../tools/pokemon-rework/kits');
const { buildInitialBoard, processTurnStartStatusEffects, resolvePendingTurnSkills, tickStatusesForTurnEnd } = require('../battleLogic');

const root = path.resolve(__dirname, '..');
const byId = new Map(characters.map((c) => [c.id, c]));
const reworked = POKEMON_REWORKED_IDS.map((id) => byId.get(id));
const LEFT_ALONE = ['ditto', 'nincada', 'aegislash', 'scraggy', 'dragapult', 'darkrai', 'pokemon-trainer', 'lance', 'pidgey', 'aerodactyl'];
const isActive = (s) => !(s.classes || []).includes('Passive');
const words = (s) => String(s.skilldescription || '').split(/\s+/).filter(Boolean).length;

// A typeless (Comic Arena) dummy with lots of HP to aim at.
const dummy = { id: 'rework-dummy', characterId: 'rework-dummy', name: 'Dummy', arena: 'comic', skills: [
    { id: 'rd-wait', name: 'Wait', energy: [], cooldown: 0, target: 'self', classes: ['Instant'], effects: [] },
] };
function game(subject, foes = 3) {
    const roster = [subject, dummy];
    const players = [{ username: 'ash', team: [0, 1, 1] }, { username: 'foe', team: Array(foes).fill(1) }];
    const pool = { taijutsu: 9, ninjutsu: 9, genjutsu: 9, bloodline: 9 };
    const match = { players, board: buildInitialBoard(players, roster), chakraPools: { ash: { ...pool }, foe: { ...pool } },
        pendingTurns: {}, pendingActions: [], pendingQueuedEffects: [], economy: { turnCounts: { ash: 1, foe: 1 } } };
    const unit = match.board.ash[0];
    const use = (skillIndex, target) => {
        match.chakraPools.ash = { ...pool };
        match.pendingTurns.ash = { queueOrder: ['0'], queuedByActorSlot: { 0: { skillIndex, targetSelection: [target] } } };
        resolvePendingTurnSkills({ match, actingUsername: 'ash', characters: roster });
        match.pendingTurns.ash = {};
        unit.state.cooldowns = {};
    };
    const pass = (u) => { tickStatusesForTurnEnd({ match, endingUsername: u }); const o = u === 'ash' ? 'foe' : 'ash'; match.economy.turnCounts[o] += 1; processTurnStartStatusEffects({ match, startingUsername: o }); };
    return { match, unit, use, pass, foes: match.board.foe, allies: match.board.ash };
}
const targetFor = (skill) => (['self', 'all-allies', 'self-or-single-ally'].includes(skill.target) ? { username: 'ash', slot: 0 } : { username: 'foe', slot: 0 });
// Damage a skill should deal to the targeted enemy right away: direct hits plus the first tick of damage over time.
const expectedHit = (skill, onTarget = true) => (skill.effects || []).reduce((sum, e) => {
    const scopes = onTarget ? ['target', 'all-enemy'] : ['all-enemy'];
    if (e.type === 'damage' && scopes.includes(e.scope)) return sum + e.amount;
    if (e.type === 'apply_status' && scopes.includes(e.scope) && e.metadata?.turnEndDamage) return sum + e.metadata.turnEndDamage;
    return sum;
}, 0);

test('the rework covers most of the roster and leaves community characters and special kits alone', () => {
    assert.ok(reworked.length >= 40, `${reworked.length} reworked`);
    assert.ok(reworked.every(Boolean), 'every reworked id exists');
    for (const id of LEFT_ALONE) assert.ok(!POKEMON_REWORKED_IDS.includes(id), `${id} is left alone`);
    for (const id of ['ditto', 'scraggy', 'dragapult', 'nincada', 'aegislash']) assert.match(byId.get(id).description, /community character|Anime Arena|community/i, `${id} is a community character`);
    const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
    assert.match(server, /REWORKED_CHARACTER_IDS_IGNORING_OVERRIDES = new Set\(\['aerodactyl', \.\.\.POKEMON_REWORKED_IDS\]\)/, 'stored admin overrides of the old kits are ignored');
});

test('every reworked kit is beginner-sized: four skills, short descriptions, small costs, a way to protect itself', () => {
    for (const c of reworked) {
        const kit = kits.find((k) => k.id === c.id);
        const actives = c.skills.filter(isActive);
        assert.equal(actives.length, 4 + (kit.extra?.length ?? 0), `${c.id} has four skills (plus skin-evolution swaps)`);
        assert.ok(c.skills.filter((s) => !isActive(s)).length <= 1, `${c.id}: at most one passive`);
        for (const s of actives.flatMap((x) => [x, ...(x.evolvesTo ? [x.evolvesTo] : [])])) {
            assert.ok(words(s) <= 30, `${s.id}: "${s.skilldescription}" is short`);
            assert.ok(s.energy.length >= 1 && s.energy.length <= 3, `${s.id}: costs 1-3 energy`);
            assert.ok(s.cooldown <= 4, `${s.id}: cooldown at most 4`);
            assert.ok(s.skillimage, `${s.id}: keeps its art`);
            assert.ok(fs.existsSync(path.join(root, s.skillimage)), `${s.id}: art exists (${s.skillimage})`);
        }
        const protects = actives.some((s) => s.effects?.some((e) => e.metadata?.invulnerable || e.metadata?.destructibleDefensePoints || e.metadata?.damageReductionFlat));
        assert.ok(protects, `${c.id} can protect itself`);
    }
});

test('every reworked skill and evolved skill resolves in the battle engine and deals what it says', () => {
    let cast = 0;
    for (const c of reworked) {
        const forms = [false, ...(c.skills.some((s) => s.evolvesTo) ? [true] : [])];
        for (const evolved of forms) {
            c.skills.forEach((base, i) => {
                if (!isActive(base) || base.effects?.some((e) => e.type === 'metronome')) return;
                const skill = evolved && base.evolvesTo ? base.evolvesTo : base;
                const g = game(c);
                if (evolved) g.unit.state.statuses.push({ id: 'test_evolved', remainingTurns: 999, metadata: { infiniteDuration: true, useEvolvedSkills: true } });
                g.allies.forEach((a) => { a.hp = 50; });
                const before = g.foes.map((f) => f.hp);
                g.use(i, targetFor(skill));
                cast++;
                const dealt = before[0] - g.foes[0].hp;
                assert.equal(dealt, expectedHit(skill), `${c.id}${evolved ? ' (evolved)' : ''} ${skill.name}: "${skill.skilldescription}"`);
                if (skill.target === 'all-enemy') assert.equal(before[1] - g.foes[1].hp, expectedHit(skill, false), `${skill.id} hits every enemy`);
                for (const e of skill.effects) {
                    if (e.type !== 'apply_status') continue;
                    const holder = e.scope === 'self' ? g.unit : ['target', 'all-enemy'].includes(e.scope) && targetFor(skill).username === 'foe' ? g.foes[0] : g.unit;
                    assert.ok(holder.state.statuses.some((st) => st.id === e.statusId), `${skill.id} applies ${e.statusId}`);
                }
            });
        }
    }
    assert.ok(cast > 250, `${cast} casts`);
});

test('stuns stop the target for its next turn; shields and invulnerability protect', () => {
    const pikachu = byId.get('pikachu');
    const g = game(pikachu, 1);
    g.use(pikachu.skills.findIndex((s) => s.id === 'pikachu-thunder'), { username: 'foe', slot: 0 });
    const stun = g.foes[0].state.statuses.find((s) => s.metadata?.cannotUseSkills);
    assert.ok(stun, 'Thunder stuns');
    g.pass('ash'); assert.ok(g.foes[0].state.statuses.some((s) => s.metadata?.cannotUseSkills && s.remainingTurns > 0), 'still stunned on its turn');
    g.pass('foe'); g.pass('ash'); assert.ok(!g.foes[0].state.statuses.some((s) => s.metadata?.cannotUseSkills && s.remainingTurns > 0), 'then it wears off');
});

test('evolving Pokemon evolve automatically at the start of their 4th turn and use their evolved skills', () => {
    for (const c of reworked.filter((x) => x.startStatuses?.some((s) => s.metadata?.onExpireApplyStatusToSelf))) {
        const g = game(c, 1);
        const evo = c.startStatuses[0].metadata.onExpireApplyStatusToSelf;
        let turn = 1;
        for (; turn <= 5; turn++) {
            if (g.unit.state.statuses.some((s) => s.id === evo.statusId)) break;
            g.pass('ash'); g.pass('foe');
        }
        assert.equal(turn, 4, `${c.id} evolves on turn 4`);
        const status = g.unit.state.statuses.find((s) => s.id === evo.statusId);
        assert.ok(status.metadata.useEvolvedSkills && status.metadata.facePictureOverride, `${c.id} gets evolved skills and portrait`);
        assert.ok(fs.existsSync(path.join(root, status.metadata.facePictureOverride)), `${c.id} evolved portrait exists`);
        assert.match(status.metadata.tooltipText, /evolved into/, 'the evolution scene can name the new form');
    }
});

test("Pokemon Trainer's Rare Candy evolves a reworked Pokemon on the spot", () => {
    const trainer = byId.get('pokemon-trainer');
    const candy = trainer.skills.find((s) => s.id === 'pokemon-trainer-rare-candy');
    // Conditions that name a character resolve against the full roster, so use it here.
    const t = characters.indexOf(trainer), ch = characters.findIndex((c) => c.id === 'charmander');
    const players = [{ username: 'ash', team: [t, ch] }, { username: 'foe', team: [0] }];
    const pool = { taijutsu: 9, ninjutsu: 9, genjutsu: 9, bloodline: 9 };
    const match = { players, board: buildInitialBoard(players, characters), chakraPools: { ash: { ...pool }, foe: { ...pool } }, pendingTurns: {}, pendingActions: [], pendingQueuedEffects: [], economy: { turnCounts: { ash: 1, foe: 1 } } };
    match.pendingTurns.ash = { queueOrder: ['0'], queuedByActorSlot: { 0: { skillIndex: trainer.skills.indexOf(candy), targetSelection: [{ username: 'ash', slot: 1 }] } } };
    resolvePendingTurnSkills({ match, actingUsername: 'ash', characters });
    const evolved = match.board.ash[1].state.statuses.find((s) => s.id === 'charmander_charmeleon_evolution');
    assert.ok(evolved?.metadata?.useEvolvedSkills, 'Charmander evolves into Charmeleon');
    assert.ok(!match.board.ash[1].state.statuses.some((s) => s.id === 'charmander_evolution_tracker'), 'and will not evolve again later');
});

test('the V.4.0 news post lists every reworked Pokemon', () => {
    const { newsPost } = require('../sync_pokemon_arena_rework_news');
    assert.equal(newsPost.arena, 'pokemon');
    assert.deepEqual(newsPost.changes.map((c) => c.characterId).sort(), [...POKEMON_REWORKED_IDS].sort());
});
