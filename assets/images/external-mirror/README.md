# External Image Mirror

Generated locally for the Comic Arena image-host migration. Source files now reference these local assets, but the changes have not been deployed.

## Download audit

- 621 unique external image URLs were found in JavaScript, HTML, CSS, and JSON source files.
- 480 unique images were downloaded and hash-verified (about 86.7 MB total before Git compression), including five recovered from archived Discord copies.
- 472 downloaded images are referenced outside the obsolete imported-character reference file.
- 140 still-unavailable Discord attachment URLs occur only in `assets/images/PokemonArena/characters imported/characters.js`; each currently returns HTTP 404.
- One unavailable Postimg URL is `LEGACY_DEFAULT_PROFILE_AVATAR` in `server.js`; the current default profile avatar downloaded successfully.
- 669 external URL occurrences across 17 source files were rewritten to root-relative `/assets/images/external-mirror/...` paths.
- `rewrite-report.json` lists every modified source file and replacement count.

`download-report.json` contains every failed URL and its exact source references. `manifest.json` preserves the original-URL-to-local-path mapping. `scripts/mirror-external-images.js` is safe to rerun and skips successfully mirrored files.
