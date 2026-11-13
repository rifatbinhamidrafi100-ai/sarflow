import walkthrough from '../data/lab-walkthrough.json';
import { useEffect, useRef } from 'react';
export default function LabGuide() {
  const section = useRef<HTMLElement>(null);
  useEffect(() => {
    if (window.location.hash === '#analysis-lab-guide') {
      const frame = requestAnimationFrame(() => section.current?.scrollIntoView());
      return () => cancelAnimationFrame(frame);
    }
  }, []);
  return (
    <section ref={section} id="analysis-lab-guide" className="beginner-section">
      <h2>Understand the Analysis lab</h2>
      <p>
        These explanations cover the Explore and Change analysis screens. Always read the dataset
        badge first: the synthetic teaching example is not a measured Earth event.
      </p>
      <video
        controls
        preload="metadata"
        playsInline
        aria-label="Analysis lab walkthrough: silent video with on-screen explanations"
        style={{
          width: '100%',
          maxWidth: 960,
          display: 'block',
          borderRadius: 8,
          background: '#112c46',
        }}
      >
        <source src="/videos/analysis-lab-guide.webm" type="video/webm" />
        <track kind="captions" src="/videos/analysis-lab-guide.vtt" srcLang="en" label="English" />
        Your browser cannot play this video. Read the transcript below.
      </video>
      <p className="tiny">
        About 50 seconds · silent, with on-screen text · educational explanation, not a recording of
        a real satellite analysis.{' '}
        <a href="/videos/analysis-lab-guide.webm" download>
          Download video
        </a>
      </p>
      <details className="beginner-faq">
        <summary>Read the video transcript</summary>
        <ol>
          {walkthrough.map((item) => (
            <li key={item.title}>
              <strong>{item.title}.</strong> {item.text}
            </li>
          ))}
        </ol>
      </details>
      <div className="beginner-faq">
        <details>
          <summary>Before, After and Run analysis</summary>
          <p>
            Before is the earlier frame and After is the later one. Run analysis compares the
            selected measurements. Changing either date, the threshold or smoothing clears the old
            result; run again to calculate with the new settings.
          </p>
        </details>
        <details>
          <summary>Change threshold and dB</summary>
          <p>
            dB is a logarithmic way to express radar power. The lab calculates after dB minus before
            dB, then marks a cell if the size of that difference is at least the threshold. Either a
            rise or a fall can qualify. Raising the threshold usually reduces the candidate count.
          </p>
          <p>
            For illustration only: a change from −12 dB to −16 dB is −4 dB. It crosses a 3 dB
            threshold, but not a 9 dB threshold. This example does not describe an actual
            observation or confirm flooding.
          </p>
        </details>
        <details>
          <summary>3 × 3 mean in linear power</summary>
          <p>
            This switch smooths each valid cell using valid measurements in its surrounding 3-by-3
            neighborhood. Averaging happens in linear power before conversion to dB; simply
            averaging dB values would produce a different quantity. Invalid centers stay invalid.
            Smoothing may reduce local variation while blurring small features.
          </p>
        </details>
        <details>
          <summary>Processed power displayed in dB and display clipped</summary>
          <p>
            The legend maps radar values to screen colors. “Display clipped” means values beyond the
            display range use the endpoint colors. It does not mean the underlying measurement has
            been deleted or that the color is a natural photograph.
          </p>
        </details>
        <details>
          <summary>Earth time machine, T1–T6 and playback speed</summary>
          <p>
            The slider chooses one stored frame; Play advances through them. T1, T2 and so on mean
            the first, second and later frames. The speed selector changes playback speed, not
            satellite revisit time. In the synthetic lab, the dates are illustrative. No
            intermediate measurements are invented between frames.
          </p>
        </details>
        <details>
          <summary>Backscatter through time and the accessible data table</summary>
          <p>
            Each chart point summarizes radar power for a frame over the same cells that are valid
            across all dates. The app averages linear power and then converts that mean to dB. The
            accessible table gives the values without requiring you to read the chart. A downward
            line means lower average returned power, not automatically more flooding.
          </p>
        </details>
        <details>
          <summary>Change DNA, candidate cells and mean signed change</summary>
          <p>
            “Change DNA” is SARFlow’s name for a result summary—not a biological measurement. It
            gathers the location, interval, calculated metrics and evidence links. Candidate cells
            crossed your selected threshold. Mean signed change averages the valid differences:
            negative means a decrease, positive means an increase.
          </p>
          <p>
            Zero candidate cells and a negative mean can both be correct: the changes can average
            below zero without any individual change reaching the selected 9 dB threshold. A mean
            can also hide opposing increases and decreases.
          </p>
        </details>
        <details>
          <summary>Candidate-mask area and event confidence: Not available</summary>
          <p>
            A cell count is not automatically an area in square kilometres. Physical area needs
            appropriate grid geometry and spatial support. Event confidence requires an
            independently justified model and evaluation. “Not available” means that quantity has
            not been established; it does not mean zero area or zero chance of an event.
          </p>
        </details>
        <details>
          <summary>Inspect evidence and Show me the receipts</summary>
          <p>
            These open the sources, processing information and limitations behind the current
            result. Check whether the dataset is observed or synthetic, which dates were compared,
            which settings were used and what is excluded before sharing a finding.
          </p>
        </details>
        <details>
          <summary>Real NISAR discovery and Search NASA catalog</summary>
          <p>
            This searches public catalog metadata for the study area. A returned record helps
            identify a satellite product; it does not download calibrated measurements or replace
            the lab’s synthetic input. No search result is not proof that no satellite ever observed
            the area.
          </p>
        </details>
        <details>
          <summary>Ask the data and Explanation language</summary>
          <p>
            This panel uses deterministic templates to explain the current evidence in English or
            বাংলা. It is not a general AI chatbot and does not contact an AI model. Run the analysis
            first for calculated answers. A translated explanation cannot supply missing
            measurements or independent validation.
          </p>
        </details>
      </div>
    </section>
  );
}
