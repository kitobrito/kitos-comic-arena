const test = require('node:test');
const assert = require('node:assert/strict');

const { cleanseHarmfulStatuses } = require('../battleLogic.js');

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
