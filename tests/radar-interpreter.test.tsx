// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import RadarInterpreter from '../src/components/RadarInterpreter';
import { MemoryRouter } from 'react-router-dom';
afterEach(cleanup);
it('shows actual supplied metadata and refuses to invent a polarization or classify RGB pixels', () => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute('open', '');
  });
  render(
    <MemoryRouter>
      <RadarInterpreter
        context={{
          source: 'NASA CMR fixture metadata',
          mission: 'NISAR',
          acquired: '2026-10-16T02:04:20Z',
          visualization: 'rgb',
        }}
      />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Understand this image' }));
  expect(screen.getByText('2026-10-16T02:04:20Z')).toBeTruthy();
  expect(screen.getByText('Not supplied with this display')).toBeTruthy();
  expect(screen.getByText(/RGB colours are not calibrated backscatter measurements/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Bright patch' }));
  expect(screen.getByText(/rough surfaces, urban structures/)).toBeTruthy();
  expect(screen.getByText(/Synthetic teaching strip/)).toBeTruthy();
});
