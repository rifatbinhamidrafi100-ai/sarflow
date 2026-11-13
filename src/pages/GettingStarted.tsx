import { Link } from 'react-router-dom';
import './getting-started.css';
import LabGuide from '../components/LabGuide';

const steps = [
  {
    title: 'Find a place',
    text: 'Open World, enter a town or region in the location search, and choose a result. Start with somewhere you know so rivers, roads and coastlines are easier to recognize.',
    to: '/world',
    action: 'Open World',
  },
  {
    title: 'Find available observations',
    text: 'Use observation discovery in the Results panel. Read the sensor and acquisition date before selecting an observation. An empty result means no matching record was returned—not that nothing happened there.',
    to: '/world',
    action: 'Find observations',
  },
  {
    title: 'Compare two dates',
    text: 'Open the NISAR imagery workspace and choose available dates. Use Compare and move the divider to inspect differences. Look for a question worth investigating, such as “Does this river look different?”',
    to: '/observatory',
    action: 'Open imagery comparison',
  },
  {
    title: 'Read what the view can tell you',
    text: 'Check the data-quality notes and source information. The photographic basemap gives location context. Colored radar previews help you explore patterns; neither is a measured flood-area result.',
    to: '/science',
    action: 'Understand radar imagery',
  },
  {
    title: 'Inspect an analysis when available',
    text: 'Open Water change for the calibrated-measurement workflow. It needs registered compatible measurements and supporting masks. If inputs are missing, processing stays unavailable. Completed jobs show candidate classes, exclusions and evaluation status.',
    to: '/water',
    action: 'Open water investigation',
  },
  {
    title: 'Keep the evidence',
    text: 'In a completed water result, use Export water evidence JSON. If an evaluation receipt is available, export that separately. Share the source dates, method and limitations along with your finding—not just a screenshot.',
    to: '/water',
    action: 'View evidence workflow',
  },
];
const glossary = [
  [
    'Observation',
    'A satellite measurement collected at a particular time. Its acquisition date tells you when it was collected, not when you opened the website.',
  ],
  [
    'SAR / radar',
    'Synthetic aperture radar sends microwave pulses and measures their return from Earth. It provides its own illumination, so it can observe at night and through most clouds.',
  ],
  [
    'Backscatter',
    'The strength of the radar signal returned toward the sensor. Water, soil, vegetation and viewing geometry can all affect it. It is not a direct measurement of flood depth.',
  ],
  [
    'False color',
    'Colors assigned to radar information to make patterns visible. Green and yellow in a radar image are not necessarily the colors your eyes would see on the ground.',
  ],
  [
    'Baseline and comparison',
    'A baseline describes earlier conditions. A comparison looks at later conditions. The water algorithm needs multiple earlier observations, not just any two images.',
  ],
  [
    'Candidate change',
    'A pattern identified by an analysis that needs interpretation and checking. “New water candidate” does not mean “confirmed flood.”',
  ],
  [
    'Excluded or unclassified',
    'An area where data quality or evidence is insufficient. It must not be counted as proof of no change or dry ground.',
  ],
  [
    'Independent evaluation',
    'A comparison with separately prepared reference labels. Agreement metrics describe the evaluated pixels; they do not automatically confirm the cause of a change.',
  ],
  [
    'Evidence receipt / JSON',
    'A downloadable structured record of sources, processing settings and limitations. JSON is a text format that software can read; you can also inspect it in a text editor.',
  ],
];

export default function GettingStarted() {
  return (
    <div className="page beginner-page">
      <header className="beginner-heading">
        <span className="tiny">Start here / no remote-sensing experience needed</span>
        <h1>Your first look at Earth with SARFlow.</h1>
        <p className="lead">
          Choose a place, explore what satellites observed, and ask what might have changed. Then
          check the evidence before drawing a conclusion.
        </p>
        <div className="actions">
          <Link className="button primary" to="/world">
            Start exploring
          </Link>
          <a className="button" href="#first-investigation">
            Show me the steps
          </a>
        </div>
      </header>
      <nav className="beginner-contents" aria-label="Beginner guide sections">
        <a href="#why-sarflow">Why use it?</a>
        <a href="#first-investigation">How to use it</a>
        <a href="#how-it-works">How it works</a>
        <a href="#analysis-lab-guide">Analysis lab & video</a>
        <a href="#beginner-glossary">Simple definitions</a>
        <a href="#beginner-help">Common questions</a>
      </nav>
      <section id="why-sarflow" className="beginner-section">
        <h2>Why use SARFlow?</h2>
        <p>
          SARFlow brings location, satellite dates, comparisons and evidence into one place. It
          helps you ask better questions about Earth and see what the available data can—and
          cannot—answer.
        </p>
        <div className="beginner-benefits">
          <article>
            <h3>Learn by exploring</h3>
            <p>
              See how a familiar landscape looks in different kinds of satellite imagery, then learn
              why the views differ.
            </p>
          </article>
          <article>
            <h3>Investigate a change</h3>
            <p>
              Compare available observations and identify patterns to examine further. Radar can be
              useful when clouds obscure ordinary optical imagery.
            </p>
          </article>
          <article>
            <h3>Explain your evidence</h3>
            <p>
              Keep sources, dates and limitations with your work so others can understand and review
              it.
            </p>
          </article>
        </div>
        <p className="notice">
          Use it for learning and exploratory investigation. SARFlow is not a live camera, a
          confirmed-damage service or an emergency warning system.
        </p>
      </section>
      <section id="first-investigation" className="beginner-section">
        <h2>Your first investigation, step by step</h2>
        <p>
          You can explore imagery without running a scientific analysis. Begin with the first four
          steps.
        </p>
        <ol className="beginner-steps">
          {steps.map((step) => (
            <li key={step.title}>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
              <Link to={step.to}>{step.action} →</Link>
            </li>
          ))}
        </ol>
      </section>
      <section id="how-it-works" className="beginner-section">
        <h2>How does it work?</h2>
        <ol className="beginner-flow" aria-label="From satellite observation to evidence">
          <li>
            <strong>Observe</strong>
            <span>A satellite collects a signal.</span>
          </li>
          <li>
            <strong>Discover</strong>
            <span>A catalog tells us what records exist.</span>
          </li>
          <li>
            <strong>Inspect</strong>
            <span>You explore dated imagery and coverage.</span>
          </li>
          <li>
            <strong>Analyze</strong>
            <span>Supported workflows process compatible measurements.</span>
          </li>
          <li>
            <strong>Review</strong>
            <span>You inspect exclusions, references and limitations.</span>
          </li>
        </ol>
        <p>
          This is a workflow explanation, not a live processing status. Catalog discovery and
          imagery viewing do not automatically run the numerical analysis.
        </p>
        <div className="beginner-distinction">
          <article>
            <h3>What you see on the map</h3>
            <p>
              The optical background helps you recognize a place. NISAR previews show radar patterns
              in assigned colors. Zooming in cannot create detail beyond the source image.
            </p>
          </article>
          <article>
            <h3>What an analysis calculates</h3>
            <p>
              The water workflow uses calibrated radar measurements, compatible dates and quality
              masks. It calculates candidate classes and keeps unsupported pixels separate.
              Interpretation still needs reference evidence.
            </p>
          </article>
        </div>
        <p>
          A darker radar return can be consistent with smooth water, but other surfaces and
          acquisition conditions can also change the signal. A visual difference is a clue to
          investigate, not a conclusion by itself.
        </p>
      </section>
      <LabGuide />
      <section id="beginner-glossary" className="beginner-section">
        <h2>Technical words, explained simply</h2>
        <div className="beginner-faq">
          {glossary.map(([term, definition]) => (
            <details key={term}>
              <summary>{term}</summary>
              <p>{definition}</p>
            </details>
          ))}
        </div>
      </section>
      <section id="beginner-help" className="beginner-section">
        <h2>If something looks confusing</h2>
        <div className="beginner-faq">
          <details>
            <summary>Why is the image green, yellow or grainy?</summary>
            <p>
              You may be viewing a radar preview with assigned colors and radar texture, rather than
              an optical photograph. Try the World view for photographic context. Source resolution
              and zoom also affect sharpness.
            </p>
          </details>
          <details>
            <summary>Why can’t I run water analysis?</summary>
            <p>
              The water workflow requires registered calibrated measurements, compatible
              observations and supporting information. Browse images alone cannot supply these
              measurements. Read the page’s input or worker status; missing data will not be
              replaced with fake results.
            </p>
          </details>
          <details>
            <summary>Is the newest date a live view?</summary>
            <p>
              No. Read the acquisition timestamp: satellite collection, publication and processing
              happen at different times. There may be gaps, delays or no suitable observations for
              your chosen location.
            </p>
          </details>
          <details>
            <summary>Does “not calculated” mean there was no flooding?</summary>
            <p>
              No. It means that measurement has not been produced. Similarly, “unclassified” and
              missing observations mean insufficient evidence, not proof that the area was
              unaffected.
            </p>
          </details>
          <details>
            <summary>Can I use the teaching lab’s numbers in a real-world report?</summary>
            <p>
              Only as explicitly labelled teaching examples. Synthetic demonstrations explain an
              algorithm; they are not measurements of a real event. Check the dataset label and
              evidence before making a real-world claim.
            </p>
          </details>
        </div>
      </section>
      <aside className="beginner-next">
        <h2>Ready to try it?</h2>
        <p>
          Start with a familiar place. Write down one question, compare available dates, and keep
          track of what remains uncertain.
        </p>
        <div className="actions">
          <Link className="button primary" to="/world">
            Explore a place
          </Link>
          <Link className="button" to="/resources">
            NASA courses & resources
          </Link>
          <Link className="button" to="/science">
            More about radar science
          </Link>
        </div>
      </aside>
    </div>
  );
}
