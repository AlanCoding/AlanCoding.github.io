#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
from pathlib import Path
import sys

import httpx
from openai import OpenAI


DEFAULT_MODEL = "gpt-image-1"
# The current Images API only accepts a fixed set of sizes. 1024x1024 is the
# smallest square option that still preserves enough detail for the widened
# desktop layout and high-density screens used by the game.
DEFAULT_SIZE = "1024x1024"
DEFAULT_FORMAT = "jpeg"
DEFAULT_QUALITY = "medium"
DEFAULT_COMPRESSION = 60


def load_api_key(repo_root: Path) -> str:
    key_path = repo_root / "openai_key.txt"
    if not key_path.exists():
        raise SystemExit(f"Missing API key file: {key_path}")
    key = key_path.read_text(encoding="utf-8").strip()
    if not key:
        raise SystemExit(f"API key file is empty: {key_path}")
    return key


def build_prompt(prompt_path: Path, size: str) -> str:
    text = prompt_path.read_text(encoding="utf-8").strip()
    size_note = (
        f"\n\n## Output Size Requirement\n"
        f"- Generate exactly one square image sized {size}.\n"
        f"- Do not add borders, framing, or text.\n"
        f"- Keep the composition suitable for direct in-game use at that exact size.\n"
    )
    return text + size_note


def output_path_for(prompt_path: Path, output_dir: Path, output_format: str) -> Path:
    return output_dir / f"{prompt_path.stem}.{output_format}"


def generate_one(client: OpenAI, prompt_path: Path, output_path: Path, size: str) -> bool:
    if output_path.exists():
        print(f"skip: {output_path} already exists")
        return False

    prompt = build_prompt(prompt_path, size)
    response = client.images.generate(
        model=DEFAULT_MODEL,
        prompt=prompt,
        size=size,
        quality=DEFAULT_QUALITY,
        output_format=DEFAULT_FORMAT,
        output_compression=DEFAULT_COMPRESSION,
    )
    if not response.data:
        raise SystemExit(f"No image payload returned for {prompt_path.name}")

    payload = response.data[0]
    image_bytes: bytes | None = None
    if getattr(payload, "b64_json", None):
        image_bytes = base64.b64decode(payload.b64_json)
    elif getattr(payload, "url", None):
        image_bytes = httpx.get(payload.url, timeout=60.0).content
    if not image_bytes:
        raise SystemExit(f"Unrecognized image payload returned for {prompt_path.name}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_bytes(image_bytes)
    print(f"wrote: {output_path}")
    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate Castle Ledger DLC images from prompt files.")
    parser.add_argument("--prompt-dir", required=True, help="Directory containing .prompt files.")
    parser.add_argument("--output-dir", required=True, help="Directory for generated images.")
    parser.add_argument("--limit", type=int, default=1, help="Maximum number of new images to generate this run.")
    parser.add_argument("--prompt-file", help="Specific prompt file to generate.")
    parser.add_argument("--size", default=DEFAULT_SIZE, help="Image size to request from the API.")
    parser.add_argument("--force", action="store_true", help="Regenerate even if the output file already exists.")
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parents[2]
    prompt_dir = Path(args.prompt_dir).resolve()
    output_dir = Path(args.output_dir).resolve()

    key = load_api_key(repo_root)
    client = OpenAI(api_key=key)

    if args.prompt_file:
        prompt_paths = [Path(args.prompt_file).resolve()]
    else:
        prompt_paths = sorted(prompt_dir.glob("*.prompt"))

    generated = 0
    for prompt_path in prompt_paths:
        output_path = output_path_for(prompt_path, output_dir, DEFAULT_FORMAT)
        if output_path.exists() and not args.force:
            print(f"skip: {output_path} already exists")
            continue
        if output_path.exists() and args.force:
            output_path.unlink()
        generate_one(client, prompt_path, output_path, args.size)
        generated += 1
        if generated >= args.limit:
            break

    if generated == 0:
        print("no new images generated")
    return 0


if __name__ == "__main__":
    sys.exit(main())
