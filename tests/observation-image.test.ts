import { describe, expect, it } from 'vitest';
import { hasVisiblePixels } from '../src/components/observationImage';

describe('browse coverage checks', () => {
  it('does not present transparent RGB data as an observation', () => {
    expect(hasVisiblePixels(new Uint8ClampedArray([255, 120, 80, 0, 0, 0, 0, 0]))).toBe(false);
  });
  it('retains black and partially transparent radar pixels', () => {
    expect(hasVisiblePixels(new Uint8ClampedArray([0, 0, 0, 255]))).toBe(true);
    expect(hasVisiblePixels(new Uint8ClampedArray([0, 0, 0, 0, 0, 0, 0, 1]))).toBe(true);
  });
});
