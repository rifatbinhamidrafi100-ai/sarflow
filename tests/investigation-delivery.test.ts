import { describe, expect, it } from 'vitest';
import { analyze } from '../shared/analysis';
import { createDemo } from '../shared/demo';
import { buildEvidencePackage } from '../shared/evidence-package';
import { explainEvidence, checkEvidenceNumbers } from '../shared/evidence-answers';
import { findHotspots } from '../shared/hotspots';
import { offlineBriefHTML } from '../shared/evidence-report';
import { loadInvestigations, saveInvestigation, parseEvidencePackage, SAVED_KEY } from '../shared/saved-investigations';

function evidence() { const d = createDemo(0); return buildEvidencePackage(d, { before: 0, after: 1, threshold: 3, filter: true }, analyze(d, 0, 1, 3, true)); }
function memory() { const values = new Map<string, string>(); return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } }; }

describe('hotspot evidence', () => {
  it('conserves exact mask cells and preserves same-sign four-neighbor connectivity', () => {
    const d = createDemo(0); d.width = 3; d.height = 3;
    d.observations = d.observations.slice(0, 2);
    d.observations[0].power = Array(9).fill(1);
    d.observations[1].power = [10, 10, 0.1, 1, 1, 0.1, 10, 1, 10];
    const p = buildEvidencePackage(d, { before: 0, after: 1, threshold: 3, filter: false }, analyze(d, 0, 1, 3, false));
    const groups = findHotspots(p);
    expect(groups.map(g => g.cells)).toEqual([2, 2, 1, 1]);
    expect(groups.reduce((sum, g) => sum + g.cells, 0)).toBe(p.result!.changed);
    expect(groups.flatMap(g => g.runs).reduce((sum, run) => sum + run.end - run.start, 0)).toBe(p.result!.changed);
    expect(groups.find(g => g.id === 'grid-2')?.direction).toBe('decrease');
    expect(groups.find(g => g.id === 'grid-0')?.extent).toEqual({ left: 0, top: 0, right: 2, bottom: 1 });
  });
});

describe('bounded bilingual explanations', () => {
  it('uses the actual package counts in both languages and refuses unsupported event questions', () => {
    const p = evidence();
    for (const language of ['en', 'bn'] as const) {
      const answer = explainEvidence('What changed?', p, language);
      expect(answer.accepted).toBe(true); expect(answer.text).toContain(String(p.result!.changed));
      expect(explainEvidence('Predict casualties and damage from this change', p, language).topic).toBe('unsupported');
      expect(explainEvidence('How many people died in the changed area?', p, language).topic).toBe('unsupported');
      expect(explainEvidence('কতজন মানুষ মারা গেছে এবং কী পরিবর্তন হয়েছে?', p, language).topic).toBe('unsupported');
      expect(explainEvidence('When?', p, language).accepted).toBe(true);
    }
    expect(explainEvidence('কী পরিবর্তন হয়েছে?', p, 'bn').text).toContain('কৃত্রিম');
    expect(explainEvidence('এলাকার আয়তন কত?', p, 'bn').text).toContain('কোনো আয়তন অনুমান');
  });
  it('rejects invented numbers and represents an unrun analysis honestly', () => {
    const p = evidence(); expect(checkEvidenceNumbers('Damage confirmed for 987654321 people.', p)).toBe(false);
    const unrun = buildEvidencePackage(p.dataset, p.parameters, null);
    expect(explainEvidence('What changed?', unrun).text).toContain('No result');
  });
});

describe('offline report safety', () => {
  it('escapes hostile source text, preserves limitations, and makes no automatic external requests', () => {
    const p = evidence(); p.dataset.location = '<script>alert("x")</script>';
    const html = offlineBriefHTML(p);
    expect(html).not.toContain('<script>'); expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('SYNTHETIC'); expect(html).toContain('not a geographic event map');
    expect(html).not.toMatch(/<(?:script|img|iframe|link)\b[^>]*(?:src|href)=["'](?:https?:)?\/\//);
  });
});

describe('local saved investigations', () => {
  it('round-trips evidence and user notes and rebuilds stored derived labels', () => {
    const storage = memory(), p = evidence();
    saveInvestigation(storage, { id: 'one', title: 'My case', note: 'Needs reference evidence', hypothesis: 'Unverified interpretation', savedAt: p.exported, evidence: p });
    const entry = loadInvestigations(storage)[0]; expect(entry.note).toBe('Needs reference evidence');
    expect(entry.evidence.result).toEqual(p.result);
    const raw = JSON.parse(storage.getItem(SAVED_KEY)!); raw.entries[0].evidence.labels.result = 'confirmed';
    storage.setItem(SAVED_KEY, JSON.stringify(raw)); expect(loadInvestigations(storage)[0].evidence.labels.result).toBe('illustrative');
  });
  it('rejects tampered calculations, invalid JSON, excess count and failed storage writes', () => {
    const p = evidence(); const tampered = structuredClone(p); tampered.result!.changed++;
    expect(() => parseEvidencePackage(tampered)).toThrow('current inputs and settings');
    expect(() => parseEvidencePackage({ ...p, result: false })).toThrow();
    expect(() => parseEvidencePackage({ ...p, result: { ...p.result, confirmedDeaths: 200 } })).toThrow();
    const storage = memory(); storage.setItem(SAVED_KEY, '{'); expect(() => loadInvestigations(storage)).toThrow();
    const bounded = memory();
    const entry = { id: '0', title: 'Case', note: '', hypothesis: '', savedAt: p.exported, evidence: p };
    for (let i = 0; i < 5; i++) saveInvestigation(bounded, { ...entry, id: String(i) });
    expect(() => saveInvestigation(bounded, { ...entry, id: '6' })).toThrow('Five investigations');
    expect(() => saveInvestigation({ getItem: () => null, setItem: () => { throw Error('Quota exceeded'); } }, entry)).toThrow('Quota exceeded');
  });
});
