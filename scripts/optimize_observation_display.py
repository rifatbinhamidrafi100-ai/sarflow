"""Make lossless display derivatives; preserve every original NASA PNG and its hash.

Install scripts/image-requirements.txt first. No network or credentials used.
"""
import hashlib
import io
import json
from pathlib import Path
from PIL import Image


def main():
    root = Path(__file__).resolve().parents[1]
    manifest_path = root / 'public/data/observatory.json'
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    original_bytes = display_bytes = 0
    for region in manifest['regions']:
        for frame in region['observations']:
            source = root / 'public' / frame['image'].lstrip('/')
            if source.parent != root / 'public/observations' or source.suffix != '.png':
                raise ValueError('Only local archived observation PNGs may be converted')
            raw = source.read_bytes()
            if hashlib.sha256(raw).hexdigest() != frame['sha256']:
                raise ValueError('Original archive hash mismatch')
            with Image.open(io.BytesIO(raw)) as opened:
                rgba = opened.convert('RGBA')
                encoded = io.BytesIO()
                rgba.save(encoded, format='WEBP', lossless=True, exact=True, method=6)
                payload = encoded.getvalue()
                with Image.open(io.BytesIO(payload)) as decoded:
                    if decoded.size != rgba.size or decoded.convert('RGBA').tobytes() != rgba.tobytes():
                        raise ValueError('Lossless pixel equality check failed')
            original_bytes += len(raw)
            if len(payload) >= len(raw):
                frame.pop('display', None)
                display_bytes += len(raw)
                continue
            destination = source.with_suffix('.webp')
            if destination.exists() and destination.read_bytes() != payload:
                raise ValueError('Existing display derivative differs; review it before replacing')
            destination.write_bytes(payload)
            frame['display'] = {'image': frame['image'].replace('.png', '.webp'),
                                'sha256': hashlib.sha256(payload).hexdigest(),
                                'bytes': len(payload), 'encoding': 'lossless-webp'}
            display_bytes += len(payload)
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps({'originalBytes': original_bytes, 'displayBytes': display_bytes,
                      'savedPercent': round(100 * (1 - display_bytes / original_bytes), 2),
                      'originalFilesUnchanged': True, 'rgbaPixelEqualityVerified': True}))


if __name__ == '__main__':
    main()
