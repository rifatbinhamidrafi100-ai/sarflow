import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { assessStudyInputs, focusedStudy } from '../../shared/study-readiness';
import readerVerification from '../../public/data/reader-verification.json';
import { Download, External, date } from '../components/ui';
import { useWorkspace } from '../data/Workspace';
import { useObservatory } from '../data/observatory';
import './study.css';

export default function Study() {
  const workspace = useWorkspace();
  const archive = useObservatory();
  const assessment = useMemo(() => assessStudyInputs(workspace.datasets), [workspace.datasets]);
  const region = archive.data?.regions.find((item) => item.id === focusedStudy.archiveRegion);
  const first = region?.observations[0];
  const last = region?.observations.at(-1);
  const registryReady = !workspace.loading && !workspace.error;
  const candidate = assessment.numericalCandidates[0];
  const report = {
    ...assessment,
    exportedAt: new Date().toISOString(),
    registryStatus: workspace.loading ? 'loading' : workspace.error ? 'unavailable' : 'checked',
    browseStatus:
      archive.error || (archive.data && !region) ? 'unavailable' : region ? 'available' : 'loading',
    browseEvidence: region
      ? {
          name: region.name,
          bounds: region.bounds,
          query: region.query,
          observations: region.observations.map((frame) => ({
            acquiredAt: frame.acquired,
            sourceRecord: frame.source,
            imageRequest: frame.request,
            archivedImageSha256: frame.sha256,
          })),
        }
      : null,
    distinction: 'Browse-image hashes identify visualizations, not calibrated measurement files.',
    separateReaderVerification: readerVerification,
  };

  return (
    <div className="page focused-study">
      <header className="study-intro">
        <span className="tiny">One place · a reproducible question</span>
        <h1>{focusedStudy.title}</h1>
        <p className="lead">{focusedStudy.question}</p>
        <p>
          Start with what was acquired, compare compatible measurements, then test an
          interpretation. A water-related change is one possible explanation; a radar difference
          alone does not prove flooding.
        </p>
        <div className="actions">
          <Link className="button primary" to="/observatory?region=brahmaputra">
            Inspect dated observations
          </Link>
          <Link className="button" to="/global-radar?lat=25.15&lon=89.8">
            Check newer acquisitions
          </Link>
        </div>
      </header>

      <section className="study-evidence-grid" aria-label="Investigation evidence status">
        <article className="panel">
          <span className="tiny">1 · Observed</span>
          <h2>What the satellite record contains</h2>
          {archive.error || (archive.data && !region) ? (
            <div role="alert">
              <p>
                Archived observations for this study are unavailable. Their absence is not evidence
                of no change. Use current acquisition discovery or retry the archive.
              </p>
              <button onClick={archive.retry}>Retry browse records</button>
            </div>
          ) : first && last ? (
            <>
              <p>
                {region!.observations.length} archived NASA browse observations, from{' '}
                {date(first.date)} to {date(last.date)}.
              </p>
              <p>
                These images support visual comparison. Their colors are not calibrated backscatter
                measurements.
              </p>
              <div className="study-image-pair">
                {[first, last].map((frame) => (
                  <figure key={frame.id}>
                    <img
                      src={frame.display?.image ?? frame.image}
                      alt={`Archived NISAR browse visualization, ${date(frame.date)}`}
                      loading="lazy"
                    />
                    <figcaption>{date(frame.date)} · NISAR L-SAR GCOV browse</figcaption>
                  </figure>
                ))}
              </div>
              <details>
                <summary>Observation receipts</summary>
                <ul className="study-receipts">
                  {region!.observations.map((frame) => (
                    <li key={frame.id}>
                      <External href={frame.source}>{date(frame.date)} source record</External>
                      <span>Acquired: {frame.acquired}</span>
                      <code>Browse SHA-256: {frame.sha256 ?? 'Unavailable'}</code>
                    </li>
                  ))}
                </ul>
              </details>
            </>
          ) : (
            <p role="status">Loading archived source records…</p>
          )}
        </article>

        <article className="panel">
          <span className="tiny">2 · Processed</span>
          <h2>What can be measured here</h2>
          {workspace.loading ? (
            <p role="status">Checking registered numerical inputs…</p>
          ) : workspace.error ? (
            <div role="alert">
              <p>
                The numerical registry is unavailable. Processing readiness has not been checked.
              </p>
              <button onClick={workspace.retry}>Retry numerical inputs</button>
            </div>
          ) : candidate ? (
            <>
              <p>
                Registered numerical input candidate: <strong>{candidate.title}</strong>.
              </p>
              <p>
                {candidate.commonValidPixels} of {candidate.totalPixels} cells have shared support
                in the first/last pair.
              </p>
              <p>
                This verifies the declared input contract. Source bytes, exact point support and
                independent calibration have not been authenticated by this page.
              </p>
              <Link
                className="button"
                to="/analysis"
                onClick={() => {
                  workspace.choose(candidate.id);
                  workspace.setThreshold(focusedStudy.thresholdDb);
                  workspace.setFilter(focusedStudy.smoothing);
                }}
              >
                Review numerical candidate
              </Link>
            </>
          ) : (
            <p className="notice">
              No eligible calibrated numerical input is registered for this study. No measured
              change result is available.
            </p>
          )}
          <h3>Reproducible method</h3>
          <p>{focusedStudy.method}.</p>
          <p>
            Start with a recorded 3 dB exploratory threshold and no smoothing. Inspect sensitivity
            and exclusions; the threshold is not a probability or an event label.
          </p>
          <details>
            <summary>Required measurement evidence</summary>
            <ul>
              <li>
                Compatible calibrated GCOV products, dates, source identities and distinct file
                hashes.
              </li>
              <li>
                A common projected grid, valid shared cells and documented quality exclusions.
              </li>
              <li>Parameters saved with the result; no numerical analysis of browse RGB colors.</li>
            </ul>
          </details>
        </article>

        <article className="panel">
          <span className="tiny">3 · Independently evaluated</span>
          <h2>What the evidence supports</h2>
          <p className="notice">
            Independent evaluation has not been supplied for this investigation.
          </p>
          <dl className="study-claims">
            <dt>Event attribution</dt>
            <dd>Not established</dd>
            <dt>Flood or damage area</dt>
            <dd>Not available</dd>
            <dt>Detection accuracy</dt>
            <dd>Not available</dd>
          </dl>
          <p>
            Compare a processed result against a suitable independent, date-matched reference.
            Report errors, excluded coverage and disagreement alongside any metrics.
          </p>
          <p>
            The Rasuwa optical landslide reference belongs to a different investigation. It is not
            water ground truth for this river corridor.
          </p>
          <Link to="/methodology">Read the scientific limits</Link>
        </article>
      </section>

      <section className="panel study-measurement" aria-label="Real measurement reader check">
        <span className="tiny">Real measurements · separate Arctic test window</span>
        <h2>A verified GCOV reader check</h2>
        <p>
          An actual NISAR acquisition from {date(readerVerification.acquisition.date)} passed the
          updated GCOV {readerVerification.metadata.productSpecificationVersion} reader. This
          single-observation check covers an Arctic window; the Brahmaputra investigation still
          needs its own compatible measurements and evaluation.
        </p>
        <dl className="study-claims">
          <dt>Usable pixels in each channel</dt>
          <dd>{readerVerification.channels.HHHH.validPixels.toLocaleString()} of 4,096</dd>
          <dt>HH backscatter</dt>
          <dd>{readerVerification.channels.HHHH.decibelsOfMeanPower.toFixed(2)} dB</dd>
          <dt>HV backscatter</dt>
          <dd>{readerVerification.channels.HVHV.decibelsOfMeanPower.toFixed(2)} dB</dd>
          <dt>Temporal change / independent evaluation</dt>
          <dd>Not established</dd>
        </dl>
        <p>
          Values are 10 × log10 of mean linear power over a quality-masked 64 × 64 native-pixel
          window. They describe radar return; they do not establish water, flooding or damage.
        </p>
        <details>
          <summary>Measurement provenance and exclusions</summary>
          <ul className="study-receipts">
            <li>
              <span>Source: {readerVerification.acquisition.id}</span>
              <code>Source HDF5 SHA-256: {readerVerification.sourceSha256}</code>
            </li>
            <li>{readerVerification.qualityRule}. Unknown and invalid support is excluded.</li>
            <li>
              Shadow masking, noise correction and RFI mitigation were not applied by the source
              processor. These limits remain part of the exported record.
            </li>
            <li>One acquisition cannot support a before-and-after comparison.</li>
          </ul>
        </details>
        <Download
          label="Download real measurement check"
          name="sarflow-arctic-reader-verification.json"
          value={readerVerification}
        />
      </section>

      <section className="panel study-delivery">
        <div>
          <h2>Trace the answer</h2>
          <p>
            SARFlow connects the question, dated observations, declared processing inputs and
            missing evidence in one portable record.
          </p>
          <p>
            Download the record to reproduce the source checks or explain why a conclusion is not
            yet available.
          </p>
        </div>
        {registryReady && (
          <Download
            label="Download study evidence and gaps"
            name="sarflow-brahmaputra-study.json"
            value={report}
          />
        )}
      </section>

      <details className="panel">
        <summary>Other exploration tools</summary>
        <p>This focused investigation does not remove the rest of the platform.</p>
        <div className="actions">
          <Link className="button" to="/world">
            Explore the globe
          </Link>
          <Link className="button" to="/cases">
            Other case studies
          </Link>
          <Link className="button" to="/water">
            Experimental water workflow
          </Link>
          <Link className="button" to="/explore">
            Synthetic teaching lab
          </Link>
        </div>
      </details>
    </div>
  );
}
