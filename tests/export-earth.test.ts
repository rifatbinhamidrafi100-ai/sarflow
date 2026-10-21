import { expect, it } from 'vitest';
import { exportCameraZoom } from '../src/components/exportEarth';

it('preserves the horizontal geographic extent of desktop and mobile close-ups', () => {
  for (const width of [1000, 366]) {
    const original = width / 2 ** 18.95;
    const exported = 3840 / 2 ** exportCameraZoom(18.95, width);
    expect(exported).toBeCloseTo(original, 10);
    expect(exportCameraZoom(18.95, width)).toBeGreaterThan(19);
  }
});

it('does not export an invisible map with an undefined extent', () => {
  expect(() => exportCameraZoom(18, 0)).toThrow('Open the map');
});
