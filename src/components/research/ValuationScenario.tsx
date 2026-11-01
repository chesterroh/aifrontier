import { useId, useState } from 'react';
import type { Lang } from '../../lib/seo';
import { researchCopy } from './copy';
import './valuation-scenario.css';

const cases = [
  { revenue: 75, multiple: 12, raise: 50 },
  { revenue: 100, multiple: 14, raise: 75 },
  { revenue: 130, multiple: 16, raise: 100 },
];

export default function ValuationScenario({ lang = 'ko' }: { lang?: Lang }) {
  const copy = researchCopy[lang].calculator;
  const id = useId();
  const [revenue, setRevenue] = useState(100);
  const [multiple, setMultiple] = useState(14);
  const [raise, setRaise] = useState(75);
  const valuation = revenue * multiple;
  const dilution = raise / valuation * 100;
  return (
    <section className="valuation-scenario" aria-label={copy.aria}>
      <p className="scenario-eyebrow">{copy.eyebrow}</p>
      <p className="scenario-title">{copy.title}</p>
      <p className="scenario-intro">{copy.intro}</p>
      <div className="scenario-presets" aria-label={copy.presetsLabel}>
        {cases.map((c, index) => <button key={index} type="button"
          aria-pressed={revenue === c.revenue && multiple === c.multiple && raise === c.raise}
          onClick={() => { setRevenue(c.revenue); setMultiple(c.multiple); setRaise(c.raise); }}>{copy.presets[index]}</button>)}
      </div>
      <label htmlFor={`${id}-revenue`}>{copy.revenue} <strong>${revenue}B</strong></label>
      <input id={`${id}-revenue`} type="range" min="50" max="160" step="5" value={revenue}
        aria-valuetext={`${revenue} ${copy.moneyUnit}`} onChange={e => setRevenue(Number(e.target.value))} />
      <label htmlFor={`${id}-multiple`}>{copy.multiple} <strong>{multiple}{copy.times}</strong></label>
      <input id={`${id}-multiple`} type="range" min="8" max="25" step="1" value={multiple}
        aria-valuetext={`${multiple}${copy.times}`} onChange={e => setMultiple(Number(e.target.value))} />
      <label htmlFor={`${id}-raise`}>{copy.raise} <strong>${raise}B</strong></label>
      <input id={`${id}-raise`} type="range" min="20" max="100" step="5" value={raise}
        aria-valuetext={`${raise} ${copy.moneyUnit}`} onChange={e => setRaise(Number(e.target.value))} />
      <div className="scenario-results" role="status" aria-live="polite" aria-atomic="true">
        <div><span>{copy.valuation}</span><strong>${(valuation / 1000).toFixed(2)}T</strong></div>
        <div><span>{copy.dilution}</span><strong>{dilution.toFixed(1)}%</strong></div>
      </div>
      <p className="scenario-formula">${revenue}B × {multiple} = ${valuation.toLocaleString('en-US')}B · {copy.newShares} ${raise}B ÷ {copy.postOffering} ${valuation.toLocaleString('en-US')}B</p>
      <p className="scenario-note">{copy.note}</p>
    </section>
  );
}
