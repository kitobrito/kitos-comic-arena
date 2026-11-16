const { test, expect } = require('@playwright/test');
const { app } = require('../../server');

let server, base;
test.beforeAll(async () => {
    server = await new Promise((resolve) => { const listener = app.listen(0, '127.0.0.1', () => resolve(listener)); });
    base = `http://127.0.0.1:${server.address().port}`;
});
test.afterAll(async () => { await new Promise((resolve) => server.close(resolve)); });

for (const width of [1440, 390]) {
    for (const route of ['/pokemon', '/pokemon-home.html']) {
        test(`partner preview, retry and saved success: ${route}, ${width}px`, async ({ page }) => {
            await page.setViewportSize({ width, height: 900 });
            let attempts = 0;
            let failSave = true;
            const user = { username: 'Trainer', role: 'admin', profile: { arenas: { pokemon: { missions: {
                gen2StarterCharacterId: null, unlockedCharacterIds: [], unlockPoints: 500,
            } } } } };
            await page.route('**/api/**', async (request) => {
                const path = new URL(request.request().url()).pathname;
                if (path === '/api/profile/pokemon/gen2-starter') {
                    attempts += 1;
                    if (failSave) return request.fulfill({ status: 503, json: { error: 'Please try again.' } });
                    const body = request.request().postDataJSON();
                    expect(body).toEqual({ starterCharacterId: 'chikorita', confirmed: true });
                    user.profile.arenas.pokemon.missions.gen2StarterCharacterId = body.starterCharacterId;
                    user.profile.arenas.pokemon.missions.unlockedCharacterIds = [body.starterCharacterId];
                    return request.fulfill({ json: { user } });
                }
                return request.fulfill({ json: path === '/api/me' ? { user } : { posts: [], players: [], missions: [], releases: [] } });
            });
            await page.goto(base + route);
            const overlay = page.locator('#gen2-starter-overlay');
            await expect(overlay).toBeVisible();
            for (const id of ['cyndaquil', 'totodile', 'chikorita']) {
                await page.locator(`[data-starter-id="${id}"]`).click();
                await expect(page.locator('#gen2-reveal-render')).toHaveAttribute('src', `/assets/images/PokemonArena/BIB/${id}.png`);
                await expect(page.locator('#gen2-reveal-render')).toHaveJSProperty('naturalWidth', 475);
                await page.locator('#gen2-starter-no').click();
                expect(attempts).toBe(0);
            }
            // Focus stays inside the dialog and Escape permits postponing the choice.
            await page.locator('#gen2-starter-close').focus();
            await page.keyboard.press('Shift+Tab');
            await expect(page.locator('[data-starter-id="chikorita"]')).toBeFocused();
            await page.keyboard.press('Escape');
            await expect(overlay).toBeHidden();
            await expect(page.locator('[inert]')).toHaveCount(0);
            await page.locator('#gen2-starter-reopen').click();
            await page.locator('[data-starter-id="chikorita"]').click();
            await page.locator('#gen2-starter-yes').click();
            await expect(page.locator('#gen2-confirm-status')).toHaveText('Please try again.');
            await expect(page.locator('#gen2-starter-yes')).toBeEnabled();
            failSave = false;
            await page.locator('#gen2-starter-yes').click();
            await expect(page.locator('#gen2-confirm-status')).toHaveText('Chikorita joined your team!');
            await expect(overlay).toBeVisible();
            await expect(page.locator('#gen2-starter-no')).toBeHidden();
            await page.locator('#gen2-starter-yes').click();
            await expect(overlay).toBeHidden();
            await expect(page.locator('[inert]')).toHaveCount(0);
            await expect(page.locator('body')).not.toHaveClass(/gen2-starter-open/);
            expect(attempts).toBe(2);
        });
    }
}
