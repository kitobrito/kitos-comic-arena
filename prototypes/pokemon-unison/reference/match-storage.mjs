import {
    existsSync,
    mkdirSync,
    readFileSync,
    readdirSync,
    renameSync,
    writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const clone = (value) => JSON.parse(JSON.stringify(value));

export function createMemoryMatchStorage(initialMatches = []) {
    const records = new Map(
        initialMatches.map((match) => [match.id, clone(match)])
    );
    return {
        loadAll() {
            return [...records.values()].map(clone);
        },
        save(match) {
            records.set(match.id, clone(match));
        },
    };
}

export function createJsonMatchStorage(directory) {
    const root = resolve(directory);
    mkdirSync(root, { recursive: true });

    function matchPath(matchId) {
        if (!/^[a-zA-Z0-9-]+$/.test(matchId)) {
            throw new Error('Match ids must be path-safe.');
        }
        return resolve(root, `${matchId}.json`);
    }

    return {
        directory: root,
        loadAll() {
            if (!existsSync(root)) return [];
            return readdirSync(root, { withFileTypes: true })
                .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
                .sort((left, right) => left.name.localeCompare(right.name))
                .flatMap((entry) => {
                    try {
                        const parsed = JSON.parse(readFileSync(resolve(root, entry.name), 'utf8'));
                        return parsed?.storageVersion === 1 && parsed?.match ? [parsed.match] : [];
                    } catch {
                        return [];
                    }
                });
        },
        save(match) {
            const destination = matchPath(match.id);
            const temporary = resolve(root, `.${match.id}.${randomUUID()}.tmp`);
            const payload = JSON.stringify({ storageVersion: 1, match: clone(match) }, null, 2);
            writeFileSync(temporary, `${payload}\n`, { encoding: 'utf8', flag: 'wx' });
            renameSync(temporary, destination);
        },
    };
}
