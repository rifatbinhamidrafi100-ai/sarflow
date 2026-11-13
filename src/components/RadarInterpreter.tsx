import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { Info, X } from 'lucide-react';
import './radar-interpreter.css';

export type RadarContext = {
  source: string;
  mission?: string;
  acquired?: string;
  referenceAcquired?: string | null;
  polarization?: string;
  product?: string;
  layer?: string;
  visualization: 'rgb' | 'calibrated' | 'synthetic';
};
const appearances = [
  {
    label: 'Dark patch',
    shade: '#24343e',
    next: '#536878',
    text: 'In a valid single-channel intensity image, weak return can occur over smooth surfaces such as calm open water. Radar shadow can also be dark; missing data may be displayed dark. Appearance alone does not identify water.',
  },
  {
    label: 'Medium patch',
    shade: '#7d8a93',
    next: '#586975',
    text: 'Intermediate return can occur with variable soil, vegetation and surface scattering. Moisture, structure, polarization and geometry can all influence the signal; this is not a land-cover class.',
  },
  {
    label: 'Bright patch',
    shade: '#e2e7eb',
    next: '#aebdc6',
    text: 'Strong returns may be associated with rough surfaces, urban structures or particular vegetation conditions. Slopes and viewing geometry can also affect brightness; a bright patch does not prove a building or healthy vegetation.',
  },
] as const;
const suggestions = [
  {
    name: 'Agriculture and crops',
    to: '/phenomena/agriculture',
    text: 'Compare suitable dates alongside crop calendars and moisture context. Crop classification is not implemented.',
  },
  {
    name: 'Water and flooding',
    to: '/phenomena/hazards',
    text: 'Inspect surface-water candidates using calibrated measurements, masks and independent reference data. The water method is experimental.',
  },
  {
    name: 'Vegetation and forests',
    to: '/phenomena/forests',
    text: 'Explore structural or seasonal scattering differences. Tree loss needs more evidence than a brightness change.',
  },
  {
    name: 'Urban development',
    to: '/phenomena/urban',
    text: 'Investigate scattering patterns with independent optical or building information. No automatic building-change detector is available.',
  },
  {
    name: 'Glaciers and ice',
    to: '/phenomena/ice',
    text: 'Discover polar observations. Motion requires suitable offset/interferometric products and time/geometry checks; displacement analysis is not implemented.',
  },
  {
    name: 'Geological and surface changes',
    to: '/phenomena/geology',
    text: 'Investigate terrain and surface disturbance. Ground-motion inference needs appropriate interferometric processing and reference information.',
  },
];
export default function RadarInterpreter({ context }: { context: RadarContext }) {
  const dialog = useRef<HTMLDialogElement>(null),
    title = useId();
  const [selected, setSelected] = useState(0),
    [frame, setFrame] = useState(0);
  const current = appearances[selected];
  return (
    <>
      <button className="understand-image-button" onClick={() => dialog.current?.showModal()}>
        <Info size={16} aria-hidden="true" />
        Understand this image
      </button>
      {createPortal(
        <dialog ref={dialog} className="radar-interpreter" aria-labelledby={title}>
          <header className="radar-help-header">
            <div>
              <span className="tiny">A guide to the selected visualization</span>
              <h2 id={title}>Understand this image</h2>
            </div>
            <button onClick={() => dialog.current?.close()} aria-label="Close image explanation">
              <X size={20} />
            </button>
          </header>
          <section>
            <h3>What am I looking at?</h3>
            <p>
              {context.visualization === 'synthetic'
                ? 'This is a synthetic teaching visualization. Its measurements are programmed examples, not satellite observations.'
                : 'This radar visualization represents microwave signals returned from Earth’s surface, rather than an optical photograph.'}
            </p>
            <dl className="radar-help-metadata">
              <div>
                <dt>Observation source</dt>
                <dd>{context.source}</dd>
              </div>
              {context.mission && (
                <div>
                  <dt>Mission</dt>
                  <dd>{context.mission}</dd>
                </div>
              )}
              {context.acquired && (
                <div>
                  <dt>Selected acquisition</dt>
                  <dd>{context.acquired}</dd>
                </div>
              )}
              {context.referenceAcquired && (
                <div>
                  <dt>Reference acquisition</dt>
                  <dd>{context.referenceAcquired}</dd>
                </div>
              )}
              {context.product && (
                <div>
                  <dt>Source product / record</dt>
                  <dd>{context.product}</dd>
                </div>
              )}
              <div>
                <dt>Polarization</dt>
                <dd>{context.polarization ?? 'Not supplied with this display'}</dd>
              </div>
              {context.layer && (
                <div>
                  <dt>Current display layer</dt>
                  <dd>{context.layer}</dd>
                </div>
              )}
            </dl>
            {context.visualization === 'rgb' && (
              <p className="notice">
                RGB colours are not calibrated backscatter measurements. A colour composite can
                combine radar channels and display transformations; it is not a land-cover
                classification. The grayscale examples below do not classify pixels in this RGB
                image.
              </p>
            )}
            {context.visualization === 'calibrated' && (
              <p className="tiny">
                Read the active layer legend for units and display limits. Difference and
                classification colours are not an intensity-brightness scale.
              </p>
            )}
          </section>
          <section className="radar-teaching">
            <h3>Try reading radar brightness</h3>
            <p className="tiny">
              Synthetic teaching strip · not satellite data, calibrated measurements or a
              classification of the selected observation.
            </p>
            <div className="radar-teaching-strip">
              {appearances.map((appearance, index) => (
                <button
                  key={appearance.label}
                  aria-label={appearance.label}
                  aria-pressed={selected === index}
                  onClick={() => setSelected(index)}
                  style={{ background: frame ? appearance.next : appearance.shade }}
                >
                  <span>{appearance.label}</span>
                </button>
              ))}
            </div>
            <p role="status">{current.text}</p>
            <div className="actions">
              {[0, 1].map((value) => (
                <button key={value} aria-pressed={frame === value} onClick={() => setFrame(value)}>
                  Teaching frame {value + 1}
                </button>
              ))}
            </div>
            <p className="tiny">
              Both frames are programmed. A change in appearance could have several explanations; a
              date comparison alone does not identify its cause.
            </p>
            <p>
              <strong>Radar brightness is not a universal land-cover classification.</strong>{' '}
              Backscatter depends on roughness, moisture, vegetation structure, polarization,
              incidence angle and viewing geometry.
            </p>
          </section>
          <details>
            <summary>What can I investigate?</summary>
            <div className="radar-suggestions">
              {suggestions.map((suggestion) => (
                <article key={suggestion.to}>
                  <h4>
                    <Link to={suggestion.to} onClick={() => dialog.current?.close()}>
                      {suggestion.name}
                    </Link>
                  </h4>
                  <p>{suggestion.text}</p>
                </article>
              ))}
            </div>
          </details>
          <details>
            <summary>Which radar techniques are involved?</summary>
            <dl className="radar-techniques">
              <dt>Backscatter and multitemporal comparison</dt>
              <dd>
                Compare compatible intensities across actual acquisitions. SARFlow has visual
                comparison and a separate numerical learning lab.
              </dd>
              <dt>Polarimetric analysis</dt>
              <dd>
                Uses relationships between polarization channels; it requires suitable calibrated
                data. This explanation panel does not perform polarimetric classification.
              </dd>
              <dt>Interferometric SAR</dt>
              <dd>
                Uses phase differences between suitable acquisitions to investigate line-of-sight
                motion. A GCOV RGB comparison is not interferometry. Full GUNW phase-based
                displacement is not implemented in SARFlow.
              </dd>
            </dl>
          </details>
          <section>
            <h3>What should I be careful about?</h3>
            <ul>
              <li>Visual differences do not automatically establish environmental change.</li>
              <li>Brightness alone cannot reliably identify every land-cover type.</li>
              <li>
                Different acquisition geometry, polarization or processing can affect a comparison.
              </li>
              <li>RGB display values must not be treated as calibrated measurements.</li>
              <li>Missing observations and invalid pixels must not be read as no change.</li>
              <li>
                Many conclusions need additional datasets, appropriate processing and independent
                evaluation.
              </li>
            </ul>
          </section>
          <footer className="radar-help-sources">
            <a
              href="https://science.nasa.gov/mission/nisar/get-to-know-sar/"
              target="_blank"
              rel="noreferrer"
            >
              NASA radar explanation
            </a>
            <a
              href="https://hyp3-docs.asf.alaska.edu/nisar-docs/worldview/"
              target="_blank"
              rel="noreferrer"
            >
              ASF GCOV visualization guide
            </a>
          </footer>
        </dialog>,
        document.body,
      )}
    </>
  );
}
