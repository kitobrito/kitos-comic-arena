/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
    testDir: './test/e2e',
    timeout: 30_000,
    fullyParallel: false,
    retries: 0,
    use: {
        headless: true,
        viewport: { width: 1440, height: 900 },
        ignoreHTTPSErrors: true,
        launchOptions: process.env.PLAYWRIGHT_CHROME_EXECUTABLE
            ? { executablePath: process.env.PLAYWRIGHT_CHROME_EXECUTABLE }
            : undefined,
    },
};
