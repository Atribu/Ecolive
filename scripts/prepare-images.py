#!/usr/bin/env python3
"""Create responsive WebP assets from the retained project originals.

Requires Pillow. Run from any directory; all paths are relative to this script.
No originals are overwritten. The manifest is consumed by the page generator.
"""

import hashlib
import io
import json
from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
OUTPUT = ASSETS / "responsive"
MANIFEST = ROOT / "responsive-images.json"
PHOTO_WIDTHS = (640, 960, 1440, 1920)


def write_variant(image, stem, width, *, quality=79, lossless=False):
    height = max(1, round(image.height * width / image.width))
    resized = image.resize((width, height), Image.Resampling.LANCZOS)
    encoded = io.BytesIO()
    resized.save(encoded, "WEBP", quality=quality, method=6, lossless=lossless)
    data = encoded.getvalue()
    fingerprint = hashlib.sha256(data).hexdigest()[:8]
    target = OUTPUT / f"{stem}-{width}.{fingerprint}.webp"
    target.write_bytes(data)
    return {
        "src": "/" + target.relative_to(ROOT).as_posix(),
        "width": width,
        "height": height,
        "bytes": target.stat().st_size,
    }


def write_favicon(logo):
    # The existing logo's emblem occupies the left 39% of the artwork. Keeping
    # that original symbol, without the wordmark, makes the browser tab legible.
    emblem = logo.convert("RGBA").crop((0, 0, round(logo.width * 0.39), logo.height))
    bounds = emblem.getchannel("A").getbbox()
    if bounds:
        emblem = emblem.crop(bounds)
    emblem = ImageOps.contain(emblem, (56, 56), Image.Resampling.LANCZOS)
    favicon = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    favicon.alpha_composite(emblem, ((64 - emblem.width) // 2, (64 - emblem.height) // 2))
    encoded = io.BytesIO()
    favicon.save(encoded, "PNG", optimize=True)
    data = encoded.getvalue()
    fingerprint = hashlib.sha256(data).hexdigest()[:8]
    target = OUTPUT / f"favicon-64.{fingerprint}.png"
    target.write_bytes(data)
    return {
        "src": "/" + target.relative_to(ROOT).as_posix(),
        "width": 64,
        "height": 64,
        "bytes": len(data),
    }


def main():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    manifest = {}
    stems = set()
    originals = sorted(
        path
        for path in ASSETS.rglob("*")
        if path.suffix.lower() in {".webp", ".png"} and OUTPUT not in path.parents
    )

    for source in originals:
        stem = source.stem
        if stem in stems:
            raise ValueError(f"Responsive asset name collision: {stem}")
        stems.add(stem)
        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened)
            image = image.convert("RGBA" if "A" in image.getbands() else "RGB")

        is_logo = stem == "logo-source"
        is_plan = stem in {"campus-plan", "campus-plan-labeled", "campus-plan-tr"}
        is_poster = source == ASSETS / "video" / "home-poster.webp"
        requested_widths = PHOTO_WIDTHS
        if is_logo:
            requested_widths = (160, 320)
        elif is_poster:
            requested_widths = (960, 1440, 1600)
        elif stem in {"campus-plan-labeled", "campus-plan-tr"}:
            requested_widths = (*PHOTO_WIDTHS, 2560, 3600)
        elif is_plan:
            requested_widths = (*PHOTO_WIDTHS, 2200)

        widths = sorted({min(width, image.width) for width in requested_widths})
        entry = {
            "width": image.width,
            "height": image.height,
            "sourceBytes": source.stat().st_size,
            "variants": [
                write_variant(
                    image, stem, width, quality=88 if is_plan else 79, lossless=is_logo
                )
                for width in widths
            ],
        }

        if is_poster:
            # Centered 9:16 crop retains the same visible scene as object-fit:
            # cover on a portrait viewport, without shipping the discarded sides.
            mobile = ImageOps.fit(
                image, (720, 1280), Image.Resampling.LANCZOS, centering=(0.5, 0.5)
            )
            entry["mobilePoster"] = write_variant(mobile, "home-poster-mobile", 720)

        if is_logo:
            entry["favicon"] = write_favicon(image)

        manifest["/" + source.relative_to(ROOT).as_posix()] = entry

    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n")
    variants = [variant for entry in manifest.values() for variant in entry["variants"]]
    variants += [entry["mobilePoster"] for entry in manifest.values() if "mobilePoster" in entry]
    variants += [entry["favicon"] for entry in manifest.values() if "favicon" in entry]
    # This directory contains only generated derivatives. Remove stale hashes so
    # a fresh deployment does not accumulate unused versions indefinitely.
    active_files = {Path(variant["src"]).name for variant in variants}
    for previous in [*OUTPUT.glob("*.webp"), *OUTPUT.glob("favicon-64.*.png")]:
        if previous.name not in active_files:
            previous.unlink()
    print(f"Prepared {len(variants)} variants from {len(manifest)} preserved originals.")
    print(f"Originals: {sum(entry['sourceBytes'] for entry in manifest.values()):,} bytes")
    print(f"All generated variants: {sum(variant['bytes'] for variant in variants):,} bytes")


if __name__ == "__main__":
    main()
