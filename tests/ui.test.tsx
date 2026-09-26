// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Badge, Empty } from '../src/components/ui';
import { color } from '../src/components/Raster';
afterEach(cleanup);
describe('scientific interface components',()=>{
 it('distinguishes synthetic and observed badges',()=>{render(<><Badge/><Badge observed/></>);expect(screen.getByText('DEMO DATA · SYNTHETIC')).toBeTruthy();expect(screen.getByText('OBSERVED DATA')).toBeTruthy();});
 it('offers a functional retry for errors',()=>{let attempts=0;render(<Empty title="Failed" retry={()=>attempts++}>Source unavailable</Empty>);fireEvent.click(screen.getByRole('button',{name:'Retry'}));expect(attempts).toBe(1);});
 it('keeps excluded cells separate and renders both signs distinctly',()=>{expect(color(null,'difference')).toBe('#d2dbe0');expect(color(-4,'detected')).not.toBe(color(4,'detected'));expect(color(2.9,'uncertainty',3)).toBe('#985b16');});
});
