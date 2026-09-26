import {expect,it} from 'vitest';
import {cellPercentage,observationGap} from '../shared/change-summary';
it('uses explicit valid support and never reports missing support as zero change',()=>{
 expect(cellPercentage(25,100)).toBe(25);expect(cellPercentage(0,100)).toBe(0);
 expect(cellPercentage(0,0)).toBeNull();expect(cellPercentage(101,100)).toBeNull();expect(cellPercentage(NaN,100)).toBeNull();
});
it('preserves acquisition gaps and rejects reversed or invalid dates',()=>{
 expect(observationGap('2026-09-01','2026-09-13')).toBe(12);
 expect(observationGap('2026-09-13','2026-09-01')).toBeNull();expect(observationGap('invalid','2026-09-01')).toBeNull();
});
