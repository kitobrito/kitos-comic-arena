'use strict';

const path = require('node:path');
const { Worker, isMainThread, parentPort } = require('node:worker_threads');

const BCRYPT_WORKER_TIMEOUT_MS = 15_000;

if (!isMainThread) {
    const bcrypt = require('bcryptjs');
    parentPort.once('message', async (message = {}) => {
        try {
            let value = null;
            if (message.operation === 'hash') {
                value = await bcrypt.hash(String(message.password || ''), 10);
            } else if (message.operation === 'compare') {
                value = await bcrypt.compare(
                    String(message.password || ''),
                    String(message.passwordHash || '')
                );
            } else {
                throw new Error('Unsupported password operation.');
            }
            parentPort.postMessage({ ok: true, value });
        } catch (error) {
            parentPort.postMessage({
                ok: false,
                error: error instanceof Error ? error.message : 'Password operation failed.',
            });
        }
    });
} else {
    const runPasswordWorker = (payload) =>
        new Promise((resolve, reject) => {
            const worker = new Worker(path.resolve(__filename));
            let settled = false;
            let timeoutId = null;
            const finish = (callback, value) => {
                if (settled) return;
                settled = true;
                clearTimeout(timeoutId);
                worker.terminate().catch(() => {});
                callback(value);
            };
            timeoutId = setTimeout(() => {
                finish(reject, new Error('Password verification timed out.'));
            }, BCRYPT_WORKER_TIMEOUT_MS);
            worker.once('message', (message = {}) => {
                if (!message.ok) {
                    finish(reject, new Error(message.error || 'Password operation failed.'));
                    return;
                }
                finish(resolve, message.value);
            });
            worker.once('error', (error) => finish(reject, error));
            worker.once('exit', (code) => {
                if (!settled && code !== 0) {
                    finish(reject, new Error(`Password worker exited with code ${code}.`));
                }
            });
            worker.postMessage(payload);
        });

    module.exports = {
        hashPassword: (password) =>
            runPasswordWorker({
                operation: 'hash',
                password,
            }),
        comparePassword: (password, passwordHash) =>
            runPasswordWorker({
                operation: 'compare',
                password,
                passwordHash,
            }),
    };
}
