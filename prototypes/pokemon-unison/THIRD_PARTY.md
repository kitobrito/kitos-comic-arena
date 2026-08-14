# Third-party architecture reference

This prototype was designed after source-level study of
[`naruto-unison/naruto-unison`](https://github.com/naruto-unison/naruto-unison),
which is distributed under the BSD 3-Clause License.

The prototype reuses architectural ideas—pure game transitions, typed state,
strict action parsing, viewer-scoped serialization, deterministic tests, and a
Haskell-to-Elm boundary. It does not vendor or modify the Naruto Unison source
tree.

Pokémon names and imagery referenced by the local runner are existing assets
from this workspace. They are not copied into the prototype directory.

## Password hashing and session tokens

Production (`server.js`, `passwordHashing.js`) hashes passwords with the
`bcryptjs` npm package and signs sessions with the `jsonwebtoken` npm package.
This prototype has no npm registry access in its build environment, so
`reference/password-hashing.mjs` hashes passwords with Node's built-in
`crypto.scrypt` instead, and `reference/player-service.mjs` signs sessions as
HS256 JWT-format tokens using Node's built-in `crypto.createHmac` directly —
same algorithm family and security properties (salted, adaptive password
hashing; HMAC-signed, tamper-evident session tokens), no third-party code. If
`bcryptjs`/`jsonwebtoken` become installable later, those two files are the
only places that would need to change.
