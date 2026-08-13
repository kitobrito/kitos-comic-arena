// Ported verbatim from production's UNLOCK_POINT_STORE_PACKAGES (server.js),
// filtered to the arena: 'pokemon' packages only.
export const UNLOCK_POINT_STORE_PACKAGES = [
    {
        packageId: 'pokemon-750-points',
        points: 750,
        amountUsd: '5.00',
        currency: 'USD',
        provider: 'paypal',
        label: '750 Unlock Points',
        description: '750 Pokemon Arena unlock points',
    },
    {
        packageId: 'pokemon-1500-points',
        points: 1500,
        amountUsd: '10.00',
        currency: 'USD',
        provider: 'paypal',
        label: '1,500 Unlock Points',
        description: '1,500 Pokemon Arena unlock points',
    },
    {
        packageId: 'pokemon-3000-points',
        points: 3000,
        amountUsd: '20.00',
        currency: 'USD',
        provider: 'paypal',
        label: '3,000 Unlock Points',
        description: '3,000 Pokemon Arena unlock points',
    },
];

export function findUnlockPointStorePackage(packageId, catalog = UNLOCK_POINT_STORE_PACKAGES) {
    const normalized = String(packageId ?? '').trim().toLowerCase();
    return catalog.find((entry) => entry.packageId.toLowerCase() === normalized) ?? null;
}

export function serializeStorePackageForClient(entry) {
    return {
        packageId: entry.packageId,
        points: entry.points,
        amountUsd: entry.amountUsd,
        currency: entry.currency,
        provider: entry.provider,
        label: entry.label,
        description: entry.description,
    };
}
