import {expect,it} from 'vitest';
import {englishPlace} from '../server/english-place';
it('normalizes accented Latin place names without fabricating translations',()=>{
 expect(englishPlace('Taoudénit Region')).toBe('Taoudenit Region');
 expect(englishPlace('São Paulo')).toBe('Sao Paulo');
 expect(englishPlace('Łódź')).toBe('Lodz');
 expect(englishPlace('ঢাকা')).toBeNull();
 expect(englishPlace('Kathmandu, Nepal')).toBe('Kathmandu, Nepal');
});
