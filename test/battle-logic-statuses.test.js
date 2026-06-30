const test = require('node:test');
const assert = require('node:assert/strict');

const { applyDamageToUnit, cleanseHarmfulStatuses } = require('../battleLogic.js');

test('cleanseHarmfulStatuses keeps unremovable harmful statuses', () => {
    const unit = {
        alive: true,
        state: {
            statuses: [
                {
                    id: 'rare_candy_evolution',
                    metadata: {
                        harmful: true,
                        unremovable: true,
                    },
                },
                {
                    id: 'ordinary_debuff',
                    metadata: {
                        harmful: true,
                    },
                },
            ],
        },
    };

    const removed = cleanseHarmfulStatuses(unit, 2);

    assert.equal(removed, 1);
    assert.deepEqual(
        unit.state.statuses.map((status) => status.id),
        ['rare_candy_evolution']
    );
});

test('physicalDamageTakenBonusFlat only affects physical damage', () => {
    const physicalTarget = {
        alive: true,
        hp: 100,
        maxHp: 100,
        state: {
            statuses: [
                {
                    id: 'krabby_leer_mark',
                    remainingTurns: 99,
                    metadata: {
                        harmful: true,
                        infiniteDuration: true,
                        physicalDamageTakenBonusFlat: 5,
                    },
                },
            ],
        },
    };
    const nonPhysicalTarget = structuredClone(physicalTarget);

    const physicalDealt = applyDamageToUnit(physicalTarget, 10, {
        sourceUsername: 'attacker',
        targetUsername: 'defender',
        skillClasses: ['Physical', 'Melee', 'Instant'],
    });
    const mentalDealt = applyDamageToUnit(nonPhysicalTarget, 10, {
        sourceUsername: 'attacker',
        targetUsername: 'defender',
        skillClasses: ['Mental', 'Ranged', 'Instant'],
    });

    assert.equal(physicalDealt, 15);
    assert.equal(physicalTarget.hp, 85);
    assert.equal(mentalDealt, 10);
    assert.equal(nonPhysicalTarget.hp, 90);
});
