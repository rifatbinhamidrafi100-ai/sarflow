// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import Topics, { TopicEntries, findPhenomena } from '../src/pages/Topics';
afterEach(cleanup);
it('searches six real guides using common beginner terms and returns an honest empty result', () => {
  expect(findPhenomena('')).toHaveLength(6);
  for (const [query, id] of [
    ['crops', 'agriculture'],
    ['ice sheets', 'ice'],
    ['flooding', 'hazards'],
    ['deforestation', 'forests'],
    ['urbanization', 'urban'],
    ['ground deformation', 'geology'],
  ])
    expect(findPhenomena(query).map((topic) => topic.id)).toContain(id);
  expect(findPhenomena('unmatched asteroids')).toEqual([]);
});
it('makes all four domains reachable without implying four completed scientific pipelines', () => {
  render(
    <MemoryRouter>
      <TopicEntries />
    </MemoryRouter>,
  );
  for (const name of ['Ecosystems & Forests', 'Agriculture', 'Natural Hazards', 'Ice & Glaciers'])
    expect(screen.getByRole('link', { name: new RegExp(name) }).getAttribute('href')).toMatch(
      /^\/topics\//,
    );
  expect(screen.getAllByText('Teaching example available')).toHaveLength(2);
  expect(screen.getByText('Water analysis experimental')).toBeTruthy();
  expect(screen.getByText('Observation exploration only')).toBeTruthy();
});
it('keeps the ice workflow honest and routes visitors to actual observation discovery', () => {
  render(
    <MemoryRouter initialEntries={['/topics/ice']}>
      <Routes>
        <Route path="/topics/:topic" element={<Topics />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: 'Ice & Glaciers' })).toBeTruthy();
  expect(screen.getByText(/Glacier motion analysis is not implemented/)).toBeTruthy();
  expect(
    screen.getByRole('link', { name: 'Explore Arctic observations' }).getAttribute('href'),
  ).toContain('/global-radar?');
});
it('unknown topics have a recovery route instead of silently opening an unrelated domain', () => {
  render(
    <MemoryRouter initialEntries={['/topics/unknown']}>
      <Routes>
        <Route path="/topics/:topic" element={<Topics />} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByRole('heading', { name: 'Topic not found' })).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Browse all four topics' }).getAttribute('href')).toBe(
    '/topics',
  );
});
