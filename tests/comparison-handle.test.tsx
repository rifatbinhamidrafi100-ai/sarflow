// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import ComparisonHandle from '../src/components/ComparisonHandle';
afterEach(cleanup);
it('supports keyboard movement, endpoints and bounded values', () => {
  const change = vi.fn();
  render(<ComparisonHandle value={98} onChange={change} />);
  const slider = screen.getByRole('slider', { name: 'Move imagery comparison' });
  fireEvent.keyDown(slider, { key: 'ArrowRight' });
  expect(change).toHaveBeenLastCalledWith(100);
  fireEvent.keyDown(slider, { key: 'Home' });
  expect(change).toHaveBeenLastCalledWith(0);
  fireEvent.keyDown(slider, { key: 'End' });
  expect(change).toHaveBeenLastCalledWith(100);
});
