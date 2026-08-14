import {
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    renameSync,
    writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';

const clone = (value) => JSON.parse(JSON.stringify(value));
const SESSION_SECRET_FILENAME = 'session-secret.json';

export function createMemoryPlayerStorage(initialPlayers = []) {
    const records = new Map(initialPlayers.map((player) => [player.id, clone(player)]));
    let sessionSecret = null;
    return {
        loadAll() {
            return [...records.values()].map(clone);
        },
        save(player) {
            records.set(player.id, clone(player));
        },
        loadOrCreateSessionSecret() {
            if (!sessionSecret) {
                sessionSecret = randomBytes(32).toString('hex');
            }
            return sessionSecret;
        },
    };
}

export function createJsonPlayerStorage(directory) {
    const root = resolve(directory);
    mkdirSync(root, { recursive: true });

    function playerPath(playerId) {
        if (!/^[a-zA-Z0-9-]+$/.test(playerId)) {
            throw new Error('Player ids must be path-safe.');
        }
        return resolve(root, `${playerId}.json`);
    }

    return {
        directory: root,
        loadAll() {
            if (!existsSync(root)) return [];
            return readdirSync(root, { withFileTypes: true })
                .filter(
                    (entry) =>
                        entry.isFile() && entry.name.endsWith('.json') && entry.name !== SESSION_SECRET_FILENAME
                )
                .sort((left, right) => left.name.localeCompare(right.name))
                .flatMap((entry) => {
                    try {
                        const parsed = JSON.parse(readFileSync(resolve(root, entry.name), 'utf8'));
                        return parsed?.storageVersion === 1 && parsed?.player ? [parsed.player] : [];
                    } catch {
                        return [];
                    }
                });
        },
        save(player) {
            const destination = playerPath(player.id);
            const temporary = resolve(root, `.${player.id}.${randomUUID()}.tmp`);
            const payload = JSON.stringify({ storageVersion: 1, player: clone(player) }, null, 2);
            writeFileSync(temporary, `${payload}\n`, { encoding: 'utf8', flag: 'wx' });
            renameSync(temporary, destination);
        },
        loadOrCreateSessionSecret() {
            const secretPath = resolve(root, SESSION_SECRET_FILENAME);
            if (existsSync(secretPath)) {
                const parsed = JSON.parse(readFileSync(secretPath, 'utf8'));
                if (typeof parsed?.secret === 'string' && parsed.secret) {
                    return parsed.secret;
                }
            }
            const secret = randomBytes(32).toString('hex');
            const temporary = resolve(root, `.${SESSION_SECRET_FILENAME}.${randomUUID()}.tmp`);
            writeFileSync(temporary, `${JSON.stringify({ secret })}\n`, { encoding: 'utf8', flag: 'wx' });
            renameSync(temporary, secretPath);
            return secret;
        },
    };
}
