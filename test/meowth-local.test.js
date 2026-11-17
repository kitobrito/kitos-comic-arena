const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const characters = require('../characters');
const {
    computeEffectiveEnergyCost,
    computeTargetOptions,
    resolveEffectiveSkill,
    resolvePendingTurnSkills,
} = require('../battleLogic');

const emptyPool = () => ({ taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0 });
const emptyState = () => ({ statuses: [], cooldowns: {}, skillUses: {}, snapshots: {} });

const meowthIndex = characters.findIndex((character) => character?.id === 'meowth');
const meowth = characters[meowthIndex];

const buildMatch = () => ({
    players: [{ username: 'ash' }, { username: 'gary' }],
    board: {
        ash: [
            {
                alive: true,
                hp: 60,
                maxHp: 100,
                rosterIndex: meowthIndex,
                state: {
                    ...emptyState(),
                    statuses: (meowth?.startStatuses || []).map((status) => ({
                        id: status.statusId,
                        remainingTurns: status.duration,
                        sourceSkillId: status.sourceSkillId,
                        sourceUsername: 'ash',
                        sourceSlot: 0,
                        metadata: structuredClone(status.metadata || {}),
                    })),
                },
            },
        ],
        gary: [
            {
                alive: true,
                hp: 200,
                maxHp: 200,
                rosterIndex: 0,
                state: emptyState(),
            },
        ],
    },
    chakraPools: { ash: emptyPool(), gary: emptyPool() },
    pendingTurns: {},
    pendingActions: [],
    pendingQueuedEffects: [],
    economy: { turnCounts: { ash: 1, gary: 1 } },
});

const queueMeowthSkill = (match, skillIndex) => {
    match.pendingTurns.ash = {
        queueOrder: ['0'],
        queuedByActorSlot: {
            '0': {
                skillIndex,
                targetSelection: [{ username: 'gary', slot: 0 }],
            },
        },
    };
};

