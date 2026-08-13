import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password) {
    const salt = randomBytes(16);
    const derivedKey = await scrypt(String(password ?? ''), salt, KEY_LENGTH);
    return `scrypt:${salt.toString('hex')}:${derivedKey.toString('hex')}`;
}

export async function comparePassword(password, storedHash) {
    if (typeof storedHash !== 'string') return false;
    const [scheme, saltHex, hashHex] = storedHash.split(':');
    if (scheme !== 'scrypt' || !saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const derivedKey = await scrypt(String(password ?? ''), salt, expected.length);
    return expected.length === derivedKey.length && timingSafeEqual(expected, derivedKey);
}
