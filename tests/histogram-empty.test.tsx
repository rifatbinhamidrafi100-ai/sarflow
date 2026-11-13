// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { Histogram } from '../src/components/Charts';
vi.mock('../src/data/Workspace',()=>({useWorkspace:()=>({result:{histogram:[{label:'empty',count:0}]}})}));
afterEach(cleanup);
it('renders zero supported histogram cells without NaN raster chart geometry',()=>{
  const {container}=render(<Histogram/>);
  expect(container.querySelector('rect')?.getAttribute('height')).toBe('0');
  expect(container.innerHTML).not.toContain('NaN');
});
