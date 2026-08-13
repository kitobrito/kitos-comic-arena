// A real PayPal REST v2 client, ported from production's PayPal integration
// in server.js. Gated by PAYPAL_CLIENT_ID/PAYPAL_CLIENT_SECRET env vars —
// isPayPalConfigured() returns false without them, and every call here
// throws rather than silently no-opping, so callers must check first.
const API_BASE_URLS = {
    sandbox: 'https://api-m.sandbox.paypal.com',
    live: 'https://api-m.paypal.com',
};

export function paypalEnvironment() {
    return process.env.PAYPAL_ENV === 'live' ? 'live' : 'sandbox';
}

export function paypalApiBaseUrl() {
    return API_BASE_URLS[paypalEnvironment()];
}

export function isPayPalConfigured() {
    return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

export function createPayPalCustomId({ playerId, packageId }) {
    return JSON.stringify({ playerId: String(playerId ?? ''), packageId: String(packageId ?? '') });
}

export function parsePayPalCustomId(value) {
    try {
        const parsed = JSON.parse(String(value ?? ''));
        return { playerId: String(parsed?.playerId ?? ''), packageId: String(parsed?.packageId ?? '') };
    } catch {
        return { playerId: '', packageId: '' };
    }
}

function extractApproveUrl(payload) {
    return (
        (Array.isArray(payload?.links) ? payload.links : []).find(
            (entry) => entry?.rel === 'payer-action' || entry?.rel === 'approve'
        )?.href ?? ''
    );
}

function extractCompletedCapture(payload) {
    const purchaseUnit = Array.isArray(payload?.purchase_units) ? payload.purchase_units[0] : null;
    const capture = Array.isArray(purchaseUnit?.payments?.captures) ? purchaseUnit.payments.captures[0] : null;
    if (!capture || String(capture.status ?? '').trim().toUpperCase() !== 'COMPLETED') {
        return null;
    }
    return {
        captureId: String(capture.id ?? '').trim(),
        amountValue: String(capture.amount?.value ?? '').trim(),
        currencyCode: String(capture.amount?.currency_code ?? '').trim().toUpperCase(),
        customId: String(purchaseUnit?.custom_id ?? '').trim(),
        payerId: String(payload?.payer?.payer_id ?? '').trim(),
        payerEmail: String(payload?.payer?.email_address ?? '').trim(),
    };
}

export async function getPayPalAccessToken(fetchImpl = fetch) {
    if (!isPayPalConfigured()) {
        throw new Error('PayPal is not configured.');
    }
    const response = await fetchImpl(`${paypalApiBaseUrl()}/v1/oauth2/token`, {
        method: 'POST',
        headers: {
            Authorization: `Basic ${Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload?.access_token) {
        throw new Error(payload?.error_description || payload?.error || 'Unable to authenticate with PayPal.');
    }
    return payload.access_token;
}

async function paypalHeaders(fetchImpl) {
    return {
        Authorization: `Bearer ${await getPayPalAccessToken(fetchImpl)}`,
        'Content-Type': 'application/json',
    };
}

export async function createPayPalOrder({ packageEntry, playerId, returnUrl, cancelUrl }, fetchImpl = fetch) {
    const headers = await paypalHeaders(fetchImpl);
    const response = await fetchImpl(`${paypalApiBaseUrl()}/v2/checkout/orders`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
            intent: 'CAPTURE',
            purchase_units: [
                {
                    custom_id: createPayPalCustomId({ playerId, packageId: packageEntry.packageId }),
                    description: packageEntry.description,
                    amount: { currency_code: packageEntry.currency, value: packageEntry.amountUsd },
                },
            ],
            payment_source: {
                paypal: {
                    experience_context: {
                        brand_name: 'Pokemon Unison',
                        shipping_preference: 'NO_SHIPPING',
                        user_action: 'PAY_NOW',
                        return_url: returnUrl,
                        cancel_url: cancelUrl,
                    },
                },
            },
        }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.message || payload?.name || 'Unable to create PayPal order.');
    }
    const approveUrl = extractApproveUrl(payload);
    if (!payload?.id || !approveUrl) {
        throw new Error('PayPal did not return an approval URL.');
    }
    return { orderId: payload.id, approveUrl };
}

export async function capturePayPalOrder(orderId, fetchImpl = fetch) {
    const headers = await paypalHeaders(fetchImpl);
    const response = await fetchImpl(`${paypalApiBaseUrl()}/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, {
        method: 'POST',
        headers,
        body: '{}',
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
        throw new Error(payload?.message || payload?.name || 'Unable to capture PayPal order.');
    }
    const capture = extractCompletedCapture(payload);
    if (!capture) {
        throw new Error('PayPal order was not completed.');
    }
    return capture;
}
