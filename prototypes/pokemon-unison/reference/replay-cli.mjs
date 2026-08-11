import { readFile } from 'node:fs/promises';
import { replay, viewerState } from './engine.mjs';

const replayPath = process.argv[2];
if (!replayPath) {
    console.error('Usage: node reference/replay-cli.mjs <replay.json>');
    process.exitCode = 1;
} else {
    const payload = JSON.parse(await readFile(replayPath, 'utf8'));
    const result = replay(payload);
    if (!result.ok) {
        console.error(result.error);
        process.exitCode = 1;
    } else {
        console.log(JSON.stringify(viewerState(result.state, 'A'), null, 2));
    }
}
