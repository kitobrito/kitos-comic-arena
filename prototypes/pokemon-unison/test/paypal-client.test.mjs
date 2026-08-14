import assert from 'node:assert/strict';
import test from 'node:test';

import {
    capturePayPalOrder,
    createPayPalCustomId,
    createPayPalOrder,
    getPayPalAccessToken,
    isPayPalConfigured,
    parsePayPalCustomId,
    paypalApiBaseUrl,
    paypalEnvironment,
} from '../reference/paypal-client.mjs';

function withPayPalEnv(t, { clientId = 'sandbox-client-id', clientSecret = 'sandbox-secret', env } = {}) {
    const previous = {
        PAYPAL_CLIENT_ID: process.env.PAYPAL_CLIENT_ID,
        PAYPAL_CLIENT_SECRET: process.env.PAYPAL_CLIENT_SECRET,
        PAYPAL_ENV: process.env.PAYPAL_ENV,
        POKEMON_UNISON_ENABLE_PAYPAL: process.env.POKEMON_UNISON_ENABLE_PAYPAL,
    };
    process.env.PAYPAL_CLIENT_ID = clientId;
    process.env.PAYPAL_CLIENT_SECRET = clientSecret;
    process.env.POKEMON_UNISON_ENABLE_PAYPAL = 'true';
    if (env) process.env.PAYPAL_ENV = env;
    t.after(() => {
        Object.entries(previous).forEach(([key, value]) => {
            if (value === undefined) delete process.env[key];
            else process.env[key] = value;
        });
    });
}

function fakeFetch(responsesByUrlFragment) {
    return async (url, options) => {
        const entry = Object.entries(responsesByUrlFragment).find(([fragment]) => url.includes(fragment));
        if (!entry) throw new Error(`Unexpected fetch call: ${url}`);
        const [, respond] = entry;
        return respond(url, options);
    };
}

function jsonResponse(status, body) {
    return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test('isPayPalConfigured is false without credentials and true once credentials plus the explicit opt-in are set', (t) => {
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    delete process.env.POKEMON_UNISON_ENABLE_PAYPAL;
    assert.equal(isPayPalConfigured(), false);
    withPayPalEnv(t);
    assert.equal(isPayPalConfigured(), true);
});

test('isPayPalConfigured stays false with real credentials if POKEMON_UNISON_ENABLE_PAYPAL is not set — this is the deliberate guard against a shared production PayPal config going live by accident', (t) => {
    withPayPalEnv(t);
    delete process.env.POKEMON_UNISON_ENABLE_PAYPAL;
    assert.equal(isPayPalConfigured(), false);

    process.env.POKEMON_UNISON_ENABLE_PAYPAL = 'false';
    assert.equal(isPayPalConfigured(), false);

    process.env.POKEMON_UNISON_ENABLE_PAYPAL = 'true';
    assert.equal(isPayPalConfigured(), true);
});

test('paypalEnvironment/paypalApiBaseUrl default to sandbox and switch to live only on an exact match', (t) => {
    withPayPalEnv(t, { env: undefined });
    delete process.env.PAYPAL_ENV;
    assert.equal(paypalEnvironment(), 'sandbox');
    assert.match(paypalApiBaseUrl(), /sandbox/);

    process.env.PAYPAL_ENV = 'live';
    assert.equal(paypalEnvironment(), 'live');
    assert.doesNotMatch(paypalApiBaseUrl(), /sandbox/);

    process.env.PAYPAL_ENV = 'production';
    assert.equal(paypalEnvironment(), 'sandbox');
});

test('createPayPalCustomId/parsePayPalCustomId round-trip and fail closed on malformed input', () => {
    const encoded = createPayPalCustomId({ playerId: 'player-1', packageId: 'pokemon-750-points' });
    assert.deepEqual(parsePayPalCustomId(encoded), { playerId: 'player-1', packageId: 'pokemon-750-points' });
    assert.deepEqual(parsePayPalCustomId('not json'), { playerId: '', packageId: '' });
    assert.deepEqual(parsePayPalCustomId(''), { playerId: '', packageId: '' });
});

test('getPayPalAccessToken rejects when not configured and returns the token when it is', async (t) => {
    delete process.env.PAYPAL_CLIENT_ID;
    delete process.env.PAYPAL_CLIENT_SECRET;
    await assert.rejects(() => getPayPalAccessToken(async () => jsonResponse(200, {})), /not configured/);

    withPayPalEnv(t);
    const fetchImpl = fakeFetch({
        '/v1/oauth2/token': async () => jsonResponse(200, { access_token: 'fake-token' }),
    });
    assert.equal(await getPayPalAccessToken(fetchImpl), 'fake-token');
});

test('createPayPalOrder sends the expected custom_id/amount and returns the approval URL', async (t) => {
    withPayPalEnv(t);
    let capturedBody = null;
    const fetchImpl = fakeFetch({
        '/v1/oauth2/token': async () => jsonResponse(200, { access_token: 'fake-token' }),
        '/v2/checkout/orders': async (url, options) => {
            capturedBody = JSON.parse(options.body);
            return jsonResponse(201, {
                id: 'ORDER123',
                links: [{ rel: 'payer-action', href: 'https://paypal.example/approve/ORDER123' }],
            });
        },
    });
    const packageEntry = {
        packageId: 'pokemon-750-points',
        points: 750,
        amountUsd: '5.00',
        currency: 'USD',
        description: '750 Pokemon Arena unlock points',
    };
    const result = await createPayPalOrder(
        { packageEntry, playerId: 'player-1', returnUrl: 'https://app/return', cancelUrl: 'https://app/cancel' },
        fetchImpl
    );
    assert.deepEqual(result, { orderId: 'ORDER123', approveUrl: 'https://paypal.example/approve/ORDER123' });
    assert.equal(capturedBody.purchase_units[0].amount.value, '5.00');
    assert.equal(capturedBody.purchase_units[0].amount.currency_code, 'USD');
    assert.deepEqual(parsePayPalCustomId(capturedBody.purchase_units[0].custom_id), {
        playerId: 'player-1',
        packageId: 'pokemon-750-points',
    });
});

test('createPayPalOrder throws if PayPal never returns an approval URL', async (t) => {
    withPayPalEnv(t);
    const fetchImpl = fakeFetch({
        '/v1/oauth2/token': async () => jsonResponse(200, { access_token: 'fake-token' }),
        '/v2/checkout/orders': async () => jsonResponse(201, { id: 'ORDER123', links: [] }),
    });
    await assert.rejects(
        () =>
            createPayPalOrder(
                { packageEntry: { packageId: 'x', amountUsd: '5.00', currency: 'USD', description: '' }, playerId: 'p' },
                fetchImpl
            ),
        /approval URL/
    );
});

test('capturePayPalOrder returns capture details only when PayPal reports COMPLETED', async (t) => {
    withPayPalEnv(t);
    const fetchImpl = fakeFetch({
        '/v1/oauth2/token': async () => jsonResponse(200, { access_token: 'fake-token' }),
        '/capture': async () =>
            jsonResponse(201, {
                purchase_units: [
                    {
                        custom_id: createPayPalCustomId({ playerId: 'player-1', packageId: 'pokemon-750-points' }),
                        payments: {
                            captures: [
                                {
                                    id: 'CAPTURE123',
                                    status: 'COMPLETED',
                                    amount: { value: '5.00', currency_code: 'USD' },
                                },
                            ],
                        },
                    },
                ],
                payer: { payer_id: 'PAYER1', email_address: 'payer@example.com' },
            }),
    });
    const capture = await capturePayPalOrder('ORDER123', fetchImpl);
    assert.equal(capture.captureId, 'CAPTURE123');
    assert.equal(capture.amountValue, '5.00');
    assert.equal(capture.currencyCode, 'USD');
    assert.deepEqual(parsePayPalCustomId(capture.customId), { playerId: 'player-1', packageId: 'pokemon-750-points' });
});

test('capturePayPalOrder throws when the capture is not COMPLETED', async (t) => {
    withPayPalEnv(t);
    const fetchImpl = fakeFetch({
        '/v1/oauth2/token': async () => jsonResponse(200, { access_token: 'fake-token' }),
        '/capture': async () =>
            jsonResponse(201, {
                purchase_units: [{ payments: { captures: [{ id: 'C1', status: 'PENDING' }] } }],
            }),
    });
    await assert.rejects(() => capturePayPalOrder('ORDER123', fetchImpl), /not completed/);
});
