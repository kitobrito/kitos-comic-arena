const test = require('node:test');
const assert = require('node:assert/strict');

const { resolvePendingTurnSkills, resolveMoltresFireSpinTeamDamage } = require('../battleLogic.js');
const characters = require('../characters.js');

const articunoIndex = characters.findIndex((character) => character?.id === 'articuno');
const moltresIndex = characters.findIndex((character) => character?.id === 'moltres');
const zapdosIndex = characters.findIndex((character) => character?.id === 'zapdos');
const dummyEnemyIndex = characters.findIndex((character) => character?.id === 'iron-man');

const makeUnit = (rosterIndex, overrides = {}) => ({
    alive: true,
    hp: 100,
    maxHp: 100,
    rosterIndex,
    state: { statuses: [], cooldowns: {}, skillUses: {}, snapshots: {} },
    ...overrides,
});

const makeMatch = ({ casterUnit, enemyUnits = [makeUnit(dummyEnemyIndex)], skillIndex, targetSelection = [] }) => ({
    players: [{ username: 'ash' }, { username: 'gary' }],
    turnNumber: 0,
    weather: null,
    board: { ash: [casterUnit], gary: enemyUnits },
    chakraPools: {
        ash: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
        gary: { taijutsu: 0, ninjutsu: 0, genjutsu: 0, bloodline: 0 },
    },
    pendingTurns: {
        ash: {
            queueOrder: ['0'],
            queuedByActorSlot: { '0': { skillIndex, targetSelection } },
        },
    },
    pendingActions: [],
    pendingQueuedEffects: [],
    economy: { turnCounts: { ash: 1, gary: 1 } },
});

const findSkillIndex = (characterIndex, skillId) =>
    characters[characterIndex].skills.findIndex((skill) => skill?.id === skillId);

test('resolveMoltresFireSpinTeamDamage is a no-op when Fire Spin is not active', () => {
    const casterUnit = makeUnit(moltresIndex);
    const enemyUnit = makeUnit(dummyEnemyIndex);
    const match = makeMatch({ casterUnit, enemyUnits: [enemyUnit], skillIndex: 0, targetSelection: [] });
    match.board.ash = [casterUnit];

    resolveMoltresFireSpinTeamDamage(match);
    assert.equal(enemyUnit.hp, 100);
});

