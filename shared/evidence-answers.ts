import type { EvidencePackage } from './evidence-package';

export type EvidenceLanguage = 'en' | 'bn';
type Topic = 'change' | 'dates' | 'area' | 'limits' | 'unsupported';
function topic(question: string): Topic {
  if (
    /damage|casualt|kill|predict|confirm|death|died|dead|injur|fatal|future|people|person|victim|ক্ষতি|নিহত|পূর্বাভাস|নিশ্চিত|মারা|আহত|মৃত্যু|মানুষ|লোকজন/i.test(
      question,
    )
  )
    return 'unsupported';
  if (/area|large|extent|আয়তন|আয়তন|এলাকা/i.test(question)) return 'area';
  if (/date|when|interval|তারিখ|কখন|সময়/i.test(question)) return 'dates';
  if (/limit|confiden|uncertain|সীমাবদ্ধ|অনিশ্চয়/i.test(question)) return 'limits';
  if (/chang|highlight|evidence|পরিবর্তন|প্রমাণ/i.test(question)) return 'change';
  return 'unsupported';
}

function numericTokens(text: string): string[] {
  const normalized = text.replace(/[০-৯]/g, (digit) => String('০১২৩৪৫৬৭৮৯'.indexOf(digit)));
  return normalized.match(/[-+]?\d+(?:\.\d+)?/g) ?? [];
}

/** Numeric allow-list is an extra guard, not proof of a correct semantic interpretation. */
export function checkEvidenceNumbers(text: string, p: EvidencePackage): boolean {
  const allowed = new Set<string>(
    numericTokens(
      JSON.stringify({
        observations: p.observations,
        threshold: p.parameters.threshold,
        metrics: p.metrics,
        quality: p.quality,
      }),
    ),
  );
  for (const value of Object.values(p.metrics))
    if (typeof value === 'number') allowed.add(value.toFixed(2));
  allowed.add(p.parameters.threshold.toFixed(1));
  return numericTokens(text).every((n) => allowed.has(n));
}

export function explainEvidence(
  question: string,
  p: EvidencePackage,
  language: EvidenceLanguage = 'en',
) {
  const t = topic(question),
    bn = language === 'bn',
    m = p.metrics;
  const synthetic = p.dataset.status === 'synthetic';
  let text: string;
  if (t === 'change')
    text = !p.result
      ? bn
        ? 'বর্তমান তারিখ ও সেটিংসের জন্য বিশ্লেষণ চালান। কোনো ফলাফল নেই।'
        : 'Run analysis for the current dates and settings. No result is available.'
      : bn
        ? `${p.result.valid}টি উভয় তারিখে বৈধ ঘরের মধ্যে ${m.changedCells}টিতে নির্বাচিত ${p.parameters.threshold.toFixed(1)} dB সীমা অতিক্রম করেছে। ${m.decreasedCells}টিতে কমেছে এবং ${m.increasedCells}টিতে বেড়েছে। এটি বন্যা, ক্ষয়ক্ষতি বা কারণ নিশ্চিত করে না।`
        : `${m.changedCells} of ${p.result.valid} common valid cells crossed the selected ${p.parameters.threshold.toFixed(1)} dB threshold. ${m.decreasedCells} decreased and ${m.increasedCells} increased. This does not confirm flooding, damage, or a cause.`;
  else if (t === 'dates')
    text = bn
      ? `নির্বাচিত পর্যবেক্ষণের তারিখ (UTC): ${p.observations.before.date.slice(0, 10)} থেকে ${p.observations.after.date.slice(0, 10)}।`
      : `Selected observation dates (UTC): ${p.observations.before.date.slice(0, 10)} to ${p.observations.after.date.slice(0, 10)}.`;
  else if (t === 'area')
    text =
      m.candidateAreaKm2 === null
        ? bn
          ? 'এই প্রমাণ থেকে ভৌত আয়তন নির্ধারণ করা যায় না। কোনো আয়তন অনুমান দেওয়া হয়নি।'
          : 'Physical area is unavailable from this evidence. No area estimate is supplied.'
        : bn
          ? `প্রদত্ত পিক্সেল আয়তন ব্যবহার করে নির্বাচিত ঘরের আয়তন ${m.candidateAreaKm2.toFixed(2)} km²। এটি নিশ্চিত ক্ষতিগ্রস্ত এলাকার আয়তন নয়।`
          : `Candidate grid area using the supplied pixel area: ${m.candidateAreaKm2.toFixed(2)} km². This is not confirmed affected-event area.`;
  else if (t === 'limits')
    text = bn
      ? 'ঘটনার যথার্থতা ও আস্থার সম্ভাবনা মূল্যায়ন করা হয়নি। বাদ পড়া ঘর, তারিখের ব্যবধান, পর্যবেক্ষণের গুণমান ও অজানা কারণ ফলাফলকে সীমিত করে। নির্দিষ্ট উৎসের সীমাবদ্ধতা প্রমাণ প্যানেলে দেখুন।'
      : 'Event accuracy and confidence probability have not been evaluated. Excluded cells, observation gaps, data quality and unknown causes limit interpretation. Inspect dataset-specific warnings in the evidence panel.';
  else
    text = bn
      ? 'এই প্রশ্নের উত্তর দেওয়ার মতো প্রমাণ নেই। পরিবর্তন, তারিখ, আয়তন বা সীমাবদ্ধতা সম্পর্কে জিজ্ঞাসা করুন।'
      : 'That question is outside the available evidence. Ask about change, dates, area, or limitations.';
  if (synthetic)
    text += bn
      ? ' এটি কৃত্রিম শিক্ষামূলক তথ্য; বাস্তব NASA পরিমাপ নয়।'
      : ' These are synthetic teaching data, not measured NASA observations.';
  const accepted = checkEvidenceNumbers(text, p);
  return {
    text: accepted
      ? text
      : bn
        ? 'প্রমাণ যাচাই ব্যর্থ হয়েছে। সংখ্যাসহ উত্তর দেখানো হয়নি।'
        : 'Evidence check failed. The numerical explanation was withheld.',
    source:
      t === 'dates'
        ? 'observations.before.date; observations.after.date'
        : t === 'limits'
          ? 'quality; validation; warnings'
          : 'metrics; parameters; labels',
    language,
    accepted,
    topic: t,
  };
}
