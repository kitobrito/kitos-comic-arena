const { isDeepStrictEqual } = require('node:util');
const copy = value => value == null ? value : structuredClone(value);
const at = (doc, path) => path.split('.').reduce((v, k) => v?.[k], doc);
const put = (doc, path, value) => { const keys = path.split('.'); const key = keys.pop(); let owner = doc; for (const k of keys) owner = owner[k] ||= {}; owner[key] = copy(value); };
function matches(doc, filter) {
    return Object.entries(filter).every(([key, value]) => {
        if (key === '$or') return value.some(v => matches(doc, v));
        if (key === '$and') return value.every(v => matches(doc, v));
        let actual = at(doc, key);
        if (key === 'players.username') actual = doc.players?.map(p => p.username);
        if (value instanceof RegExp) return value.test(actual);
        if (value && typeof value === 'object' && !(value instanceof Date)) {
            return Object.entries(value).every(([op, v]) => {
                if (op === '$ne') return !isDeepStrictEqual(actual, v);
                if (op === '$in') return v.includes(actual);
                if (op === '$exists') return (actual !== undefined) === v;
                if (op === '$lte') return actual <= v;
                if (op === '$gte') return actual >= v;
                if (op === '$gt') return actual > v;
                if (op === '$lt') return actual < v;
                if (op === '$regex') return new RegExp(v, value.$options || '').test(actual);
                if (op === '$options') return true;
                return isDeepStrictEqual(actual?.[op], v);
            });
        }
        return Array.isArray(actual) ? actual.includes(value) : isDeepStrictEqual(actual, value);
    });
}
class MemoryCollection {
    constructor(docs = []) { this.docs = copy(docs); this.writes = 0; }
    async findOne(filter, options = {}) {
        let docs = this.docs.filter(d => matches(d, filter));
        if (options.sort) docs.sort((a, b) => { for (const [k, direction] of Object.entries(options.sort)) { if (at(a, k) > at(b, k)) return direction; if (at(a, k) < at(b, k)) return -direction; } return 0; });
        return copy(docs[0] || null);
    }
    async insertOne(doc) { this.docs.push(copy(doc)); this.writes++; return { insertedId: doc.matchId }; }
    async updateOne(filter, update, options = {}) {
        let doc = this.docs.find(d => matches(d, filter));
        if (!doc && options.upsert) { doc = copy(filter); this.docs.push(doc); }
        if (!doc) return { matchedCount: 0, modifiedCount: 0 };
        for (const [key, value] of Object.entries(update.$set || {})) put(doc, key, value);
        for (const [key, value] of Object.entries(update.$inc || {})) put(doc, key, (at(doc, key) || 0) + value);
        for (const [key, value] of Object.entries(update.$push || {})) put(doc, key, [...(at(doc, key) || []), value]);
        for (const key of Object.keys(update.$unset || {})) { const keys = key.split('.'); const last = keys.pop(); const target = keys.reduce((o, k) => o?.[k], doc); if (target) delete target[last]; }
        this.writes++; return { matchedCount: 1, modifiedCount: 1 };
    }
    aggregate() { return { toArray: async () => [] }; }
    async countDocuments(filter) { return this.docs.filter(d => matches(d, filter)).length; }
    find(filter) { let docs = this.docs.filter(d => matches(d, filter)); const cursor = { sort: () => cursor, limit: n => { docs = docs.slice(0, n); return cursor; }, toArray: async () => copy(docs) }; return cursor; }
}
const admin = { username: 'SceneAdmin', role: 'admin', profile: {} };
const member = { username: 'SceneMember', role: 'player', profile: {} };
module.exports = { MemoryCollection, admin, member };
