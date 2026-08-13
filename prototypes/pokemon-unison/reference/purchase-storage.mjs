import {
    existsSync,
    mkdirSync,
    readFileSync,
    renameSync,
    writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const clone = (value) => JSON.parse(JSON.stringify(value));

// Purchases are keyed by "<provider>:<orderId>" — this is what makes PayPal
// order capture idempotent: a replayed/duplicate capture call for the same
// order finds an existing record instead of granting points twice.
function purchaseKey(provider, orderId) {
    return `${provider}:${orderId}`;
}

export function createMemoryPurchaseStorage(initialPurchases = []) {
    const records = new Map(initialPurchases.map((purchase) => [purchaseKey(purchase.provider, purchase.orderId), clone(purchase)]));
    return {
        get(provider, orderId) {
            const purchase = records.get(purchaseKey(provider, orderId));
            return purchase ? clone(purchase) : null;
        },
        save(purchase) {
            records.set(purchaseKey(purchase.provider, purchase.orderId), clone(purchase));
        },
    };
}

export function createJsonPurchaseStorage(directory) {
    const root = resolve(directory);
    mkdirSync(root, { recursive: true });

    function purchasePath(provider, orderId) {
        const key = purchaseKey(provider, orderId);
        if (!/^[a-zA-Z0-9:_-]+$/.test(key)) {
            throw new Error('Purchase keys must be path-safe.');
        }
        return resolve(root, `${key.replace(/:/g, '_')}.json`);
    }

    return {
        directory: root,
        get(provider, orderId) {
            const filePath = purchasePath(provider, orderId);
            if (!existsSync(filePath)) return null;
            try {
                const parsed = JSON.parse(readFileSync(filePath, 'utf8'));
                return parsed?.storageVersion === 1 && parsed?.purchase ? parsed.purchase : null;
            } catch {
                return null;
            }
        },
        save(purchase) {
            const destination = purchasePath(purchase.provider, purchase.orderId);
            const temporary = resolve(root, `.${randomUUID()}.tmp`);
            const payload = JSON.stringify({ storageVersion: 1, purchase: clone(purchase) }, null, 2);
            writeFileSync(temporary, `${payload}\n`, { encoding: 'utf8', flag: 'wx' });
            renameSync(temporary, destination);
        },
    };
}
