import { describe, expect, it } from 'vitest';
import { demoDatasets } from '../shared/demo';
import { assessStudyInputs } from '../shared/study-readiness';

// Contract fixtures only. They are not actual NISAR observations.
function candidate() {
  const dataset = structuredClone(demoDatasets[0]);
  dataset.status = 'observed';
  dataset.bounds = [89.7, 25, 89.9, 25.3];
  dataset.crs = 'EPSG:32645';
  dataset.provenance.source = 'Operator-supplied NISAR L-SAR GCOV HDF5';
  dataset.provenance.product = 'GCOV frequencyA HHHH';
  dataset.provenance.url = 'https://science.nasa.gov/mission/nisar/';
  delete dataset.provenance.generator;
  dataset.observations = dataset.observations.slice(0, 2).map((o, i) => ({
    ...o, id: `NISAR_L2_PR_GCOV_CONTRACT_${i}`, sourceId: `NISAR_L2_PR_GCOV_CONTRACT_${i}`,
  }));
  dataset.provenance.files = dataset.observations.map((o, i) => ({
    name: `${o.sourceId}.h5`, sha256: (i ? 'b' : 'a').repeat(64),
  }));
  return dataset;
}

describe('focused study evidence boundaries', () => {
  it('does not turn synthetic inputs or an empty registry into a real result', () => {
    for (const inputs of [[], demoDatasets]) {
      const report = assessStudyInputs(inputs);
      expect(report.numericalCandidates).toHaveLength(0);
      expect(report.eventConfirmed).toBe(false);
      expect(report.independentValidation).toBe('not-provided');
      expect(report.accuracy).toBeNull();
    }
  });

  it('reports numerical support without authenticating source bytes or validating an event', () => {
    const report = assessStudyInputs([candidate()]);
    expect(report.numericalCandidates).toHaveLength(1);
    expect(report.numericalCandidates[0].commonValidPixels).toBeGreaterThan(0);
    expect(report.sourceBytesVerified).toBe(false);
    expect(report.pointSupportVerified).toBe(false);
    expect(report.eventConfirmed).toBe(false);
    expect(report.accuracy).toBeNull();
  });

  it('rejects missing hashes and source identities that are not matched to files', () => {
    const missingHash = candidate();
    delete missingHash.provenance.files;
    const wrongSource = candidate();
    wrongSource.observations[0].sourceId = 'some-other-product';
    const report = assessStudyInputs([missingHash, wrongSource]);
    expect(report.numericalCandidates).toHaveLength(0);
    expect(report.rejected).toHaveLength(2);
  });

  it('requires shared valid pixels, not just nonempty individual observations', () => {
    const dataset = candidate();
    dataset.observations[0].power = dataset.observations[0].power.map((_, i) => i % 2 ? null : 1);
    dataset.observations[1].power = dataset.observations[1].power.map((_, i) => i % 2 ? 1 : null);
    const report = assessStudyInputs([dataset]);
    expect(report.numericalCandidates).toHaveLength(0);
    expect(report.rejected[0].reason).toContain('common valid');
  });

  it('does not use unrelated geographic inputs or duplicate source measurements', () => {
    const elsewhere = candidate();
    elsewhere.bounds = [-123, 47, -122, 48];
    const duplicate = candidate();
    duplicate.observations[1].sourceId = duplicate.observations[0].sourceId;
    expect(assessStudyInputs([elsewhere, duplicate]).numericalCandidates).toHaveLength(0);
  });

  it('fails closed on malformed datasets and misleading source domains', () => {
    const invalid = candidate();
    invalid.observations[0].power[0] = -1;
    const wrongDomain = candidate();
    wrongDomain.provenance.url = 'https://nasa.gov.example.org/data';
    expect(assessStudyInputs([invalid, wrongDomain, null]).numericalCandidates).toHaveLength(0);
  });

  it('rejects relabeled generated inputs and duplicated file bytes', () => {
    const generated = candidate();
    generated.provenance.generator = 'A synthetic fixture';
    const copied = candidate();
    copied.provenance.files![1].sha256 = copied.provenance.files![0].sha256;
    expect(assessStudyInputs([generated, copied]).numericalCandidates).toHaveLength(0);
  });

  it('rejects geographic degree grids as projected measurement support', () => {
    const degrees = candidate();
    degrees.crs = 'EPSG:4326';
    expect(assessStudyInputs([degrees]).numericalCandidates).toHaveLength(0);
  });
});
