"""Verify encoding integrity, not physical meaning of NASA visualization colors."""
import json
import unittest
from pathlib import Path
from PIL import Image


class DisplayDerivativeTests(unittest.TestCase):
    def test_every_display_pixel_matches_the_original(self):
        public = Path(__file__).resolve().parents[1] / 'public'
        archive = json.loads((public / 'data/observatory.json').read_text(encoding='utf-8'))
        for region in archive['regions']:
            for frame in region['observations']:
                with self.subTest(acquisition=frame['id']):
                    original = public / frame['image'].lstrip('/')
                    display = public / frame['display']['image'].lstrip('/')
                    with Image.open(original) as source, Image.open(display) as derivative:
                        self.assertEqual(source.size, derivative.size)
                        self.assertEqual(source.convert('RGBA').tobytes(), derivative.convert('RGBA').tobytes())


if __name__ == '__main__':
    unittest.main()
