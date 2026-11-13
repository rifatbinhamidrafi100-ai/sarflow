import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Trees, Sprout, Waves, Snowflake, Building2, Mountain } from 'lucide-react';
import { useState } from 'react';
import './topics.css';

const topics = [
  {
    id: 'forests',
    title: 'Ecosystems & Forests',
    icon: Trees,
    status: 'Teaching example available',
    question: 'How do we investigate a changing landscape?',
    intro:
      'Learn how radar responds to vegetation and surface structure, then explore real observations for a place you choose.',
    summary: 'Explore landscape disturbance and learn why a radar change needs an explanation.',
    activities: [
      {
        label: 'Open forest teaching example',
        to: '/cases/forest',
        kind: 'Synthetic learning example',
        detail:
          'A controlled disturbance example. Adjust the comparison and inspect the evidence; these are programmed measurements.',
      },
      {
        label: 'Find real landscape observations',
        to: '/global-radar?lat=-2.14&lon=113.84',
        kind: 'Actual observation discovery',
        detail:
          'Start around Central Kalimantan or search another place. Catalogue coverage does not establish forest type or forest loss.',
      },
    ],
    explanation:
      'Radar brightness can change with structure, moisture and acquisition conditions. A bright or dark patch alone does not prove deforestation, fire or ecosystem damage.',
    missing:
      'A real forest-change analysis is not implemented. It needs compatible observations, a documented method and independent land-cover or disturbance evidence.',
  },
  {
    id: 'agriculture',
    title: 'Agriculture',
    icon: Sprout,
    status: 'Teaching example available',
    question: 'Why do fields look different through the seasons?',
    intro:
      'Follow a controlled growing-season example and explore actual dated radar views of an agricultural landscape.',
    summary: 'Learn about seasonal field patterns and inspect actual observations across time.',
    activities: [
      {
        label: 'Open agriculture teaching example',
        to: '/cases/fields',
        kind: 'Synthetic learning example',
        detail:
          'Field-like blocks change through a programmed cycle. This teaches comparison; it does not measure a real harvest.',
      },
      {
        label: 'Explore Sacramento observations',
        to: '/observatory?region=sacramento',
        kind: 'Actual archived radar imagery',
        detail:
          'Compare available acquisition dates. These display images are not crop classifications or yield measurements.',
      },
    ],
    explanation:
      'Crop structure, soil moisture and management can affect radar appearance. Crop calendars and independent field information help distinguish possible explanations.',
    missing:
      'Real crop classification, crop-health diagnosis and yield estimation are not implemented. No harvest or farm-risk prediction is available.',
  },
  {
    id: 'hazards',
    title: 'Natural Hazards',
    icon: Waves,
    status: 'Water analysis experimental',
    question: 'What observations could help investigate an environmental event?',
    intro:
      'Explore river corridors, compare actual observation dates, and inspect what the experimental water workflow needs before it can compute a result.',
    summary: 'Compare river observations and check the experimental water-investigation workflow.',
    activities: [
      {
        label: 'Compare Brahmaputra observations',
        to: '/observatory?region=brahmaputra',
        kind: 'Actual archived radar imagery',
        detail:
          'Inspect dated visual evidence. Changes in radar appearance are not automatically detected flooding.',
      },
      {
        label: 'Open experimental water analysis',
        to: '/water',
        kind: 'Experimental calibrated-data workflow',
        detail:
          'Check current worker/input availability and find NASA reference candidates. Suitable measurements and independent evaluation are required.',
      },
      {
        label: 'Inspect the Nepal case evidence',
        to: '/cases/nepal-rasuwa-2026',
        kind: 'Source-linked investigation',
        detail:
          'Inspect the case dates, imagery and external mapping. Each evidence source has its own scope and limitations.',
      },
    ],
    explanation:
      'Start with actual acquisition dates and compatible measurements. Separate visible differences, calculated water candidates, independent reference agreement and confirmed event interpretation.',
    missing:
      'The water method is experimental, with public execution and independent flood validation still pending. Earthquake, volcano and landslide detection pipelines are not implemented. SARFlow is not an emergency warning service.',
  },
  {
    id: 'ice',
    title: 'Ice & Glaciers',
    icon: Snowflake,
    status: 'Observation exploration only',
    question: 'What has actually been observed in a polar region?',
    intro:
      'Discover observations around the verified Arctic sample and inspect real calibrated measurements. Coverage and dates vary by location.',
    summary: 'Discover polar observations and inspect a real calibrated Arctic data sample.',
    activities: [
      {
        label: 'Explore Arctic observations',
        to: '/global-radar?lat=71.8953276&lon=-76.2914366',
        kind: 'Actual observation discovery',
        detail:
          'Search around the verified Arctic acquisition footprint. This is a location to explore, not a confirmed glacier-motion case.',
      },
      {
        label: 'Inspect the real Arctic measurements',
        to: '/data#real-nisar',
        kind: 'Single calibrated observation',
        detail:
          'Download the published HH/HV sample and provenance receipt. One acquisition does not measure change or ice velocity.',
      },
    ],
    explanation:
      'A polar radar image is an observation, not a motion measurement. Measuring movement needs suitable observations, spatial matching, a known observation interval and uncertainty checks.',
    missing:
      'Glacier motion analysis is not implemented. SARFlow does not currently calculate glacier velocity, ice loss or melting rates.',
  },
  {
    id: 'urban',
    title: 'Urban Development',
    icon: Building2,
    status: 'Observation exploration only',
    question: 'How can we investigate a changing built environment?',
    intro:
      'Explore actual urban radar observations and learn how structures, moisture and viewing geometry affect their appearance.',
    summary: 'Inspect urban scattering and the evidence needed to investigate development.',
    activities: [
      {
        label: 'Explore Puget Sound observations',
        to: '/observatory?region=seattle',
        kind: 'Actual archived radar imagery',
        detail:
          'Compare dated observations around Seattle. Bright pixels are not automatic building detections.',
      },
      {
        label: 'Find another city',
        to: '/global-radar',
        kind: 'Actual observation discovery',
        detail:
          'Search a city and inspect available acquisitions, product metadata and visual limitations.',
      },
    ],
    explanation:
      'Buildings can create strong returns and radar shadows. Orientation, terrain, moisture and acquisition geometry can change their appearance. Independent optical imagery or building records can help investigate an interpretation.',
    missing:
      'Automatic building extraction, urban-growth measurement and infrastructure-damage assessment are not implemented.',
  },
  {
    id: 'geology',
    title: 'Geological & Surface Changes',
    icon: Mountain,
    status: 'Advanced analysis not implemented',
    question: 'What evidence is needed to investigate ground movement?',
    intro:
      'Explore terrain and surface observations while learning why visible intensity changes and ground displacement are different measurements.',
    summary:
      'Understand surface disturbance, terrain effects and the requirements for motion analysis.',
    activities: [
      {
        label: 'Inspect the Nepal surface-change evidence',
        to: '/cases/nepal-rasuwa-2026',
        kind: 'Source-linked investigation',
        detail:
          'Review observation dates and external mapping. This case is not a phase-derived displacement result.',
      },
      {
        label: 'Search available terrain observations',
        to: '/global-radar',
        kind: 'Actual observation discovery',
        detail:
          'Inspect source products for a chosen place. Catalogue availability does not establish interferometric compatibility.',
      },
    ],
    explanation:
      'Intensity may respond to roughness, moisture or surface disturbance. Interferometric SAR uses suitable phase observations and reference/geometry checks to estimate line-of-sight displacement; it does not directly yield vertical motion.',
    missing:
      'Full GUNW phase-based displacement, earthquake deformation, subsidence velocity and geological event detection are not implemented.',
  },
] as const;

const phenomenonDetails: Record<
  string,
  {
    label: string;
    keywords: string;
    meaning: string;
    radar: string;
    applications: string[];
    techniques: string;
  }
> = {
  forests: {
    label: 'Vegetation & Forest Monitoring',
    keywords: 'deforestation trees ecosystem biomass vegetation forest disturbance',
    meaning: 'Vegetation and forests change through growth, seasons, disturbance and management.',
    radar:
      'Radar can respond to vegetation structure and moisture, including when optical observation is limited by cloud or darkness.',
    applications: [
      'Forest disturbance investigation',
      'Vegetation structure and seasonal changes',
      'Land-cover change with independent reference data',
    ],
    techniques:
      'Compatible backscatter and multitemporal comparison; calibrated polarimetric methods where supported. SARFlow provides a synthetic lesson and observation discovery, not an operational forest classifier.',
  },
  agriculture: {
    label: 'Agriculture & Crop Monitoring',
    keywords: 'agriculture crops crop seasonal growing fields farm moisture harvest',
    meaning:
      'Agricultural monitoring investigates how fields and crops vary through a growing season and between years.',
    radar:
      'Radar can reveal scattering differences associated with crop structure and surface moisture; these effects are not unique to a crop or condition.',
    applications: [
      'Crop development and seasonal patterns',
      'Field moisture variations with supporting data',
      'Agricultural land-use changes',
      'Flood impacts on farm landscapes with independent evidence',
    ],
    techniques:
      'Backscatter and multitemporal comparison, supported by crop calendars and field/optical information. SARFlow has teaching and visual exploration; crop-health and yield algorithms are not implemented.',
  },
  hazards: {
    label: 'Water & Flood Investigation',
    keywords: 'flood flooding inundation water wetlands hazards river',
    meaning:
      'Water investigations compare surface-water conditions and ask whether new water evidence is supported.',
    radar:
      'Calm open water often has weak radar return, while roughness and vegetation can complicate that relationship.',
    applications: [
      'Surface-water changes',
      'Potential inundation candidates',
      'Wetland monitoring',
      'Water-related landscape changes',
    ],
    techniques:
      'Calibrated intensity classification and multitemporal analysis with terrain/quality masks. SARFlow has an experimental water workflow; public processing and independent flood evaluation remain pending.',
  },
  ice: {
    label: 'Glaciers & Ice Monitoring',
    keywords: 'glacier glaciers ice sheets ice-sheet polar cryosphere snow movement',
    meaning:
      'Ice investigations study changing ice conditions, extent and motion using measurements appropriate to each question.',
    radar:
      'Radar can contribute observations of polar regions in darkness and cloudy conditions, with interpretation affected by snow, melt conditions and geometry.',
    applications: [
      'Glacier movement research',
      'Ice-sheet deformation research',
      'Glacier extent with suitable reference data',
      'Seasonal ice conditions',
    ],
    techniques:
      'Suitable motion/offset products and, where appropriate, interferometric SAR. Time interval, geometry, quality and uncertainty must be checked. SARFlow does not implement full GUNW displacement or glacier velocity.',
  },
  urban: {
    label: 'Urban Development',
    keywords:
      'urban urbanization urbanisation buildings infrastructure city cities built-up expansion',
    meaning:
      'Urban investigations examine changes to built areas and infrastructure with traceable observations.',
    radar:
      'Structures and their orientations can affect scattering. Shadows and acquisition geometry can also produce strong visual contrasts.',
    applications: [
      'Built-up area change research',
      'Urban expansion investigation',
      'Infrastructure-development context',
      'Changes in surface scattering',
    ],
    techniques:
      'Compatible multitemporal intensity comparison with optical imagery or building/reference information. SARFlow offers observation exploration; urban classification and damage estimation are not implemented.',
  },
  geology: {
    label: 'Geological & Surface Changes',
    keywords:
      'ground deformation geology geological earthquake volcano landslide subsidence terrain surface disturbance',
    meaning:
      'Geological investigation separates surface appearance from measurements of ground displacement.',
    radar:
      'Radar phase can support motion research when suitable observations, processing, reference and quality information are available.',
    applications: [
      'Ground deformation research',
      'Surface disturbance investigation',
      'Terrain-related changes',
    ],
    techniques:
      'Interferometric SAR and suitable GUNW products require dedicated phase processing. Line-of-sight displacement is not automatically vertical motion. These advanced calculations are not implemented in SARFlow.',
  },
};
export function findPhenomena(query: string) {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return topics.filter((topic) =>
    words.every((word) =>
      `${topic.title} ${topic.intro} ${phenomenonDetails[topic.id].label} ${phenomenonDetails[topic.id].keywords}`
        .toLowerCase()
        .includes(word),
    ),
  );
}

export function TopicEntries({
  exclude,
  all = false,
  query = '',
}: { exclude?: string; all?: boolean; query?: string } = {}) {
  return (
    <nav className="topic-entries" aria-label="Explore by topic">
      {findPhenomena(query)
        .filter((topic) => all || !['urban', 'geology'].includes(topic.id))
        .filter((topic) => topic.id !== exclude)
        .map((topic) => {
          const Icon = topic.icon;
          return (
            <Link
              className={`topic-entry topic-${topic.id}`}
              to={`/${all ? 'phenomena' : 'topics'}/${topic.id}`}
              key={topic.id}
            >
              <Icon size={30} strokeWidth={1.6} aria-hidden="true" />
              <div>
                <h3>{all ? phenomenonDetails[topic.id].label : topic.title}</h3>
                <p>{topic.summary}</p>
                <span className="topic-status">{topic.status}</span>
              </div>
              <ArrowRight className="topic-arrow" size={19} aria-hidden="true" />
            </Link>
          );
        })}
    </nav>
  );
}

export function HomeTopics() {
  return (
    <section className="home-topics" aria-labelledby="home-topics-title">
      <div className="section-heading">
        <div>
          <h2 id="home-topics-title">What would you like to explore?</h2>
          <p>Four ways into Earth observation. No radar experience needed.</p>
        </div>
        <Link to="/topics" className="text-link">
          Browse all topics
        </Link>
        <Link to="/phenomena" className="text-link">
          Explore all six phenomena
        </Link>
      </div>
      <TopicEntries />
    </section>
  );
}

export default function Topics({ phenomena = false }: { phenomena?: boolean }) {
  const { topic: id } = useParams();
  const [query, setQuery] = useState('');
  const topic = topics.find((item) => item.id === id);
  if (id && !topic)
    return (
      <div className="page">
        <h1>Topic not found</h1>
        <Link to="/topics">Browse all four topics</Link>
      </div>
    );
  if (!topic)
    return (
      <div className={`page topics-page ${phenomena ? 'phenomena-mode' : ''}`}>
        <header className="topics-heading">
          <h1>{phenomena ? 'Earth Phenomena Explorer' : 'Explore Earth by topic'}</h1>
          <p className="lead">
            Start with a question that interests you. Each area shows what you can do now and what
            still needs scientific development.
          </p>
        </header>
        {phenomena && (
          <div className="phenomena-search">
            <label>
              Find a phenomenon
              <input
                type="search"
                value={query}
                maxLength={100}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Crops, glaciers, flooding, deforestation…"
              />
            </label>
            <p role="status">{findPhenomena(query).length} matching guides</p>
          </div>
        )}
        <TopicEntries all={phenomena} query={query} />
        {phenomena && findPhenomena(query).length === 0 && (
          <div className="topic-guide">
            <h2>No matching phenomena</h2>
            <p>Try water, crops, ice, forests, urban development or ground deformation.</p>
            <button onClick={() => setQuery('')}>Show all six categories</button>
          </div>
        )}
        <section className="topic-guide">
          <h2>Choose the right kind of evidence</h2>
          <dl>
            <div>
              <dt>Teaching examples</dt>
              <dd>
                Controlled synthetic data for learning. They do not report actual Earth events.
              </dd>
            </div>
            <div>
              <dt>Observation exploration</dt>
              <dd>
                Actual catalogue records or dated radar imagery. A visual difference needs
                investigation before interpretation.
              </dd>
            </div>
            <div>
              <dt>Experimental analysis</dt>
              <dd>
                A method with input and quality requirements. Availability and evaluation must be
                checked before using a result.
              </dd>
            </div>
          </dl>
          <Link to="/getting-started">New here? Follow the beginner guide</Link>
        </section>
      </div>
    );
  const Icon = topic.icon;
  return (
    <div className={`page topics-page topic-${topic.id} ${phenomena ? 'phenomena-mode' : ''}`}>
      <nav className="topic-breadcrumb" aria-label="Topic navigation">
        <Link to={phenomena ? '/phenomena' : '/topics'}>
          {phenomena ? 'All six phenomena' : 'All four topics'}
        </Link>
        <span aria-hidden="true">/</span>
        <span>{topic.title}</span>
      </nav>
      <header className="topics-heading">
        <Icon size={42} strokeWidth={1.5} className="topic-heading-icon" aria-hidden="true" />
        <h1>{phenomena ? phenomenonDetails[topic.id].label : topic.title}</h1>
        <span className="topic-status">{topic.status}</span>
        <h2>{topic.question}</h2>
        <p className="lead">{topic.intro}</p>
      </header>
      {phenomena && (
        <section className="phenomena-background">
          <div>
            <h2>What does this mean?</h2>
            <p>{phenomenonDetails[topic.id].meaning}</p>
          </div>
          <div>
            <h2>Why use radar?</h2>
            <p>{phenomenonDetails[topic.id].radar}</p>
          </div>
          <div>
            <h2>Questions to investigate</h2>
            <ul>
              {phenomenonDetails[topic.id].applications.map((application) => (
                <li key={application}>{application}</li>
              ))}
            </ul>
          </div>
          <div>
            <h2>Techniques and current support</h2>
            <p>{phenomenonDetails[topic.id].techniques}</p>
          </div>
        </section>
      )}
      <section aria-labelledby="topic-actions">
        <h2 id="topic-actions">What you can do now</h2>
        <div className="topic-activities">
          {topic.activities.map((activity) => (
            <article key={activity.to}>
              <span className="tiny">{activity.kind}</span>
              <h3>
                <Link to={activity.to}>
                  {activity.label}
                  <ArrowRight size={17} aria-hidden="true" />
                </Link>
              </h3>
              <p>{activity.detail}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="topic-interpretation">
        <div>
          <h2>How to read what you see</h2>
          <p>{topic.explanation}</p>
          <Link to="/getting-started">Explain the basics</Link>
        </div>
        <div>
          <h2>What is not available yet</h2>
          <p>{topic.missing}</p>
        </div>
      </section>
      <details className="topic-guide">
        <summary>How this connects to the NISAR mission</summary>
        <p>
          NISAR studies land, water, vegetation and ice. SARFlow currently implements a subset of
          those applications; the status above describes this app, not the full satellite mission.
        </p>
        <a href="https://science.nasa.gov/mission/nisar/" target="_blank" rel="noreferrer">
          Read NASA’s NISAR mission overview
        </a>
      </details>
      <section className="topic-other">
        <h2>Explore another topic</h2>
        <TopicEntries exclude={topic.id} all={phenomena} />
      </section>
    </div>
  );
}
