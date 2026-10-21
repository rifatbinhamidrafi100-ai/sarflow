import { useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { explainEvidence, type EvidenceLanguage } from '../../shared/evidence-answers';
import { useWorkspace } from '../data/Workspace';
export default function AskData() {
  const w = useWorkspace(),
    [question, setQuestion] = useState('What changed here?'),
    [submitted, setSubmitted] = useState('');
  const [language, setLanguage] = useState<EvidenceLanguage>('en');
  if (!w.dataset) return null;
  const response =
    submitted && w.evidencePackage ? explainEvidence(submitted, w.evidencePackage, language) : null;
  const chips =
    language === 'en'
      ? ['What changed?', 'How large is the area?', 'What are the limitations?']
      : ['কী পরিবর্তন হয়েছে?', 'এলাকার আয়তন কত?', 'সীমাবদ্ধতা কী?'];
  return (
    <section className="ask-data">
      <h3>
        <MessageCircle size={18} />
        Ask the data
      </h3>
      <p className="tiny">
        Evidence-based answers · deterministic templates, no AI model or external requests
      </p>
      <label className="assistant-language">
        Explanation language
        <select value={language} onChange={(e) => setLanguage(e.target.value as EvidenceLanguage)}>
          <option value="en">English</option>
          <option value="bn">বাংলা</option>
        </select>
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(question);
        }}
      >
        <label className="sr-only" htmlFor="question">
          Question about the data
        </label>
        <input
          id="question"
          value={question}
          maxLength={240}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button type="submit">Ask</button>
      </form>
      <div className="question-chips">
        {chips.map((q) => (
          <button
            key={q}
            onClick={() => {
              setQuestion(q);
              setSubmitted(q);
            }}
          >
            {q}
          </button>
        ))}
      </div>
      {response && (
        <div className="answer" role="status" lang={language}>
          <p>{response.text}</p>
          <small>
            Evidence: {response.source} · Number check: {response.accepted ? 'passed' : 'withheld'}
          </small>
        </div>
      )}
      {submitted && !w.evidencePackage && (
        <p role="status">
          Evidence is unavailable for these settings. Select a valid pair and run again.
        </p>
      )}
    </section>
  );
}
