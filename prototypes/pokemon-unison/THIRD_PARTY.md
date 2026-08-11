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
