#!/usr/bin/env python3
"""Build small WebP assets used only by the character-selection interface."""

from __future__ import annotations

import re
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
CHARACTER_FILES = (ROOT / "characters.js", ROOT / "pokemon-wave-2-live.js")
IMAGE_ROOT = ROOT / "assets" / "images"
OUTPUT_ROOT = IMAGE_ROOT / "selection-thumbnails"
MAX_SIZE = (160, 160)
QUALITY = 80
FEATURED_SOURCE_ROOT = IMAGE_ROOT / "PokemonArena" / "BIB"
FEATURED_OUTPUT_ROOT = IMAGE_ROOT / "selection-featured" / "PokemonArena" / "BIB"
FEATURED_MAX_SIZE = (900, 900)
FEATURED_QUALITY = 88
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}


def discover_character_images() -> list[str]:
    source = "\n".join(
        path.read_text(encoding="utf-8")
        for path in CHARACTER_FILES
        if path.is_file()
    )
    matches = re.findall(
        r"[\"']?(?:facePicture|skillimage)[\"']?\s*:\s*[\"']([^\"']+)[\"']",
        source,
        flags=re.IGNORECASE,
    )
    paths: set[str] = set()
    for raw in matches:
        normalized = raw.strip().replace("\\", "/").lstrip("/")
        if normalized.startswith("assets/images/"):
            paths.add(normalized.removeprefix("assets/images/"))

    generated_image_patterns = (
        r"skill\(\s*['\"][^'\"]+['\"]\s*,\s*['\"][^'\"]+['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+\.(?:jpg|jpeg|png|webp))['\"]",
        r"character\(\s*['\"][^'\"]+['\"]\s*,\s*['\"][^'\"]+['\"]\s*,\s*['\"][^'\"]+['\"]\s*,\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+\.(?:jpg|jpeg|png|webp))['\"]",
        r"img\(\s*['\"]([^'\"]+)['\"]\s*,\s*['\"]([^'\"]+\.(?:jpg|jpeg|png|webp))['\"]\s*\)",
    )
    for pattern in generated_image_patterns:
        for folder, filename in re.findall(pattern, source, flags=re.IGNORECASE):
            paths.add(f"PokemonArena/{folder}/{filename}")
    return sorted(paths)


def build_thumbnail(relative_source: str) -> tuple[int, int] | None:
    source_path = IMAGE_ROOT / Path(relative_source)
    if not source_path.is_file():
        return None

    output_path = OUTPUT_ROOT / Path(relative_source + ".webp")
    if output_path.is_file() and output_path.stat().st_mtime_ns >= source_path.stat().st_mtime_ns:
        return source_path.stat().st_size, output_path.stat().st_size

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source_path) as opened:
        opened.seek(0)
        image = ImageOps.exif_transpose(opened)
        image.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)
        if image.mode not in {"RGB", "RGBA"}:
            image = image.convert("RGBA" if "transparency" in image.info else "RGB")
        image.save(output_path, "WEBP", quality=QUALITY, method=6)
    return source_path.stat().st_size, output_path.stat().st_size


def build_featured_render(source_path: Path) -> tuple[int, int] | None:
    if not source_path.is_file() or source_path.suffix.lower() not in IMAGE_EXTENSIONS:
        return None

    output_path = FEATURED_OUTPUT_ROOT / f"{source_path.name}.webp"
    if output_path.is_file() and output_path.stat().st_mtime_ns >= source_path.stat().st_mtime_ns:
        return source_path.stat().st_size, output_path.stat().st_size

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source_path) as opened:
        opened.seek(0)
        image = ImageOps.exif_transpose(opened)
        image.thumbnail(FEATURED_MAX_SIZE, Image.Resampling.LANCZOS)
        if image.mode not in {"RGB", "RGBA"}:
            image = image.convert("RGBA" if "transparency" in image.info else "RGB")
        image.save(output_path, "WEBP", quality=FEATURED_QUALITY, method=6)
    return source_path.stat().st_size, output_path.stat().st_size


def main() -> None:
    built = 0
    skipped = 0
    missing = 0
    source_bytes = 0
    output_bytes = 0
    for relative_source in discover_character_images():
        result = build_thumbnail(relative_source)
        if result is None:
            missing += 1
            continue
        before, after = result
        source_bytes += before
        output_bytes += after
        output_path = OUTPUT_ROOT / Path(relative_source + ".webp")
        source_path = IMAGE_ROOT / Path(relative_source)
        if output_path.stat().st_mtime_ns >= source_path.stat().st_mtime_ns:
            built += 1
        else:
            skipped += 1

    reduction = 0 if not source_bytes else 100 - (output_bytes / source_bytes * 100)
    print(
        f"Selection thumbnails: {built} ready, {skipped} skipped, {missing} missing; "
        f"{source_bytes / 1048576:.1f} MB -> {output_bytes / 1048576:.1f} MB "
        f"({reduction:.1f}% smaller)."
    )

    featured_built = 0
    featured_source_bytes = 0
    featured_output_bytes = 0
    if FEATURED_SOURCE_ROOT.is_dir():
        for source_path in sorted(FEATURED_SOURCE_ROOT.iterdir()):
            result = build_featured_render(source_path)
            if result is None:
                continue
            before, after = result
            featured_source_bytes += before
            featured_output_bytes += after
            featured_built += 1

    featured_reduction = (
        0
        if not featured_source_bytes
        else 100 - (featured_output_bytes / featured_source_bytes * 100)
    )
    print(
        f"Featured selection renders: {featured_built} ready; "
        f"{featured_source_bytes / 1048576:.1f} MB -> {featured_output_bytes / 1048576:.1f} MB "
        f"({featured_reduction:.1f}% smaller)."
    )


if __name__ == "__main__":
    main()
