#!/usr/bin/env node
/*
 * Give an existing account the "admin" role (unlocks the News Post / Mission /
 * Character editors etc.). The game has no in-app way to make the first admin, so
 * after a fresh database: register normally on the site, then run this once.
 *
 *   $env:MONGODB_URI="<connection string>"      (PowerShell)
 *   node scripts/promote-admin.js YourUsername
 *
 * Env: MONGODB_URI (or .env), MONGODB_DB (default "naruto-arena"),
 *      MONGODB_USERS_COLLECTION (default "users").
 */
const path = require('path');
const dotenv = require('dotenv');
const { MongoClient } = require('mongodb');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const username = String(process.argv[2] || '').trim();
const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'naruto-arena';
const usersName = process.env.MONGODB_USERS_COLLECTION || 'users';

async function main() {
    if (!username) throw new Error('Usage: node scripts/promote-admin.js <username>');
    if (!uri) throw new Error('Set MONGODB_URI to the database the game is using.');
    const client = new MongoClient(uri);
    try {
        await client.connect();
        const users = client.db(dbName).collection(usersName);
        // Usernames are matched case-insensitively, like the site's login.
        const escaped = username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const result = await users.updateOne(
            { username: { $regex: `^${escaped}$`, $options: 'i' } },
            { $set: { role: 'admin' } }
        );
        if (!result.matchedCount) {
            throw new Error(`No account named "${username}" in ${dbName}.${usersName}. Register it on the site first.`);
        }
        console.log(`"${username}" is now an admin. Log out and back in on the site to pick up the new role.`);
    } finally {
        await client.close().catch(() => {});
    }
}

main().catch((error) => {
    console.error(`Failed: ${error.message}`);
    process.exit(1);
});
