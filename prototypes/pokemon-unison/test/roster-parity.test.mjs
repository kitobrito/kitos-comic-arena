import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRosterParityReport } from '../scripts/roster-parity.mjs';

test('the migration manifest accounts for every authoritative Pokemon Arena character', () => {
    const report = buildRosterParityReport();

    assert.equal(report.sourceCharacters, 46);
    assert.equal(report.standaloneCharacters, 43);
    assert.equal(report['ported-full'], 43);
    assert.equal(report['ported-partial'], 0);
    assert.equal(report['not-started'], 3);
    assert.equal(report.effectTypes.length, 36);
    assert.equal(report.targetTypes.length, 12);
    assert.deepEqual(report.errors, {
        duplicateManifestIds: [],
        missingFromManifest: [],
        removedFromSource: [],
        metadataDrift: [],
        standaloneMissing: [],
        standaloneUnexpected: [],
    });
    assert.equal(report.complete, true);
});
