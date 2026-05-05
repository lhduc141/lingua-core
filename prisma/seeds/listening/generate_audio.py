#!/usr/bin/env python3
"""
generate_audio.py — LinguaPanda Listening
==========================================
Đọc từ ./data/a1_lessons.json, ./data/a1_practice.json ... (10 files)
→ Generate MP3 cho từng item bằng Edge TTS
→ Lưu vào ./audio_output/listening/{id}.mp3
→ Tạo ./audio_output/manifest.json cho seed script

Cài: pip install edge-tts
Chạy: python3 generate_audio.py
"""

import asyncio
import json
import os
import tempfile
from pathlib import Path

try:
    import edge_tts
except ImportError:
    os.system("pip install edge-tts")
    import edge_tts

# ── CONFIG ────────────────────────────────────────────────────────────────────
DATA_DIR      = Path("./data")
OUTPUT_DIR    = Path("./audio_output/listening")
MANIFEST_PATH = Path("./audio_output/manifest.json")
VPS_BASE_URL  = "https://api.lingua-panda.io.vn/audio/listening"
SILENCE_MS    = 600   # pause between speakers (ms)
LEVELS        = ["a1", "a2", "b1", "b2", "c1"]
FILE_TYPES    = ["lessons", "practice"]
# ─────────────────────────────────────────────────────────────────────────────


async def tts_line(text: str, voice: str, out_path: str):
    """Generate 1 dòng thoại → file mp3."""
    communicate = edge_tts.Communicate(text, voice)
    await communicate.save(out_path)


def concat_mp3(seg_files: list, out_path: str, silence_ms: int = 600):
    """
    Ghép nhiều mp3 bằng cách nối bytes.
    Edge TTS output là MP3 cùng format → có thể ghép trực tiếp.
    Thêm ~silence_ms khoảng lặng giữa các dòng.
    """
    # ~600ms silence ở 64kbps MP3 ≈ 4800 bytes — dùng header frame chuẩn
    silence = b'\xff\xfb\x90\x64' + b'\x00' * 576

    with open(out_path, 'wb') as out:
        for i, seg in enumerate(seg_files):
            with open(seg, 'rb') as f:
                out.write(f.read())
            if i < len(seg_files) - 1:
                out.write(silence * (silence_ms // 30))


async def generate_item(item: dict) -> bool:
    """Generate audio cho 1 lesson/practice item. Trả về True nếu thành công."""
    item_id  = item["id"]
    script   = item.get("script", [])
    out_path = OUTPUT_DIR / f"{item_id}.mp3"

    # Skip nếu đã có
    if out_path.exists():
        print(f"  ⏭  Skip (exists): {item_id}.mp3")
        return True

    if not script:
        print(f"  ⚠  No script: {item_id}")
        return False

    print(f"  🎙  {item_id} ({len(script)} lines)...", end=" ", flush=True)

    with tempfile.TemporaryDirectory() as tmp:
        segs = []
        for i, line in enumerate(script):
            seg = os.path.join(tmp, f"{i:03d}.mp3")
            try:
                await tts_line(line["text"], line.get("voice", "en-US-JennyNeural"), seg)
                segs.append(seg)
            except Exception as e:
                print(f"\n    ❌ Line {i} error: {e}")
                # Tạo file rỗng để không bị break
                open(seg, 'wb').close()
                segs.append(seg)

        if not segs:
            print("❌ no segments")
            return False

        concat_mp3(segs, str(out_path), SILENCE_MS)

    size_kb = out_path.stat().st_size // 1024
    print(f"✅ {size_kb}KB")
    return True


async def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)

    # Load manifest hiện có (nếu đang resume)
    manifest = {}
    if MANIFEST_PATH.exists():
        manifest = json.loads(MANIFEST_PATH.read_text())
        print(f"📋 Resume: {len(manifest)} entries in manifest\n")

    print("═" * 55)
    print("  LinguaPanda — Edge TTS Audio Generator")
    print(f"  Data:   {DATA_DIR.resolve()}")
    print(f"  Output: {OUTPUT_DIR.resolve()}")
    print("═" * 55)

    total = 0
    done  = 0
    errors = 0

    for level in LEVELS:
        for ftype in FILE_TYPES:
            json_file = DATA_DIR / f"{level}_{ftype}.json"
            if not json_file.exists():
                print(f"\n⚠  Missing: {json_file}")
                continue

            items = json.loads(json_file.read_text())
            print(f"\n── {level.upper()} {ftype.upper()} ({len(items)} items) ──────────────────")

            for item in items:
                total += 1
                try:
                    ok = await generate_item(item)
                    if ok:
                        done += 1
                        manifest[item["id"]] = {
                            "url": f"{VPS_BASE_URL}/{item['id']}.mp3"
                        }
                    else:
                        errors += 1
                except Exception as e:
                    print(f"  ❌ {item['id']}: {e}")
                    errors += 1

            # Save manifest sau mỗi file (checkpoint để resume nếu bị ngắt)
            MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))

    # Final save
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2, ensure_ascii=False))

    mp3_count = len(list(OUTPUT_DIR.glob("*.mp3")))

    print("\n" + "═" * 55)
    print(f"  ✅ Generated: {done}/{total} | ❌ Errors: {errors}")
    print(f"  📂 {mp3_count} MP3 files in {OUTPUT_DIR}")
    print(f"  📋 Manifest: {MANIFEST_PATH}")
    print("═" * 55)
    print()
    print("Next steps:")
    print(f"  rsync -avz audio_output/listening/ root@221.132.21.91:/var/www/html/audio/listening/")
    print(f"  pnpm exec tsx prisma/seeds/listening/seed-listening.ts")


if __name__ == "__main__":
    asyncio.run(main())