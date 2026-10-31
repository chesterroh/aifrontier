import { useId, useState } from 'react';
import './valuation-scenario.css';

const cases = [
  { name: '보수적', revenue: 75, multiple: 12, raise: 50 },
  { name: '기준', revenue: 100, multiple: 14, raise: 75 },
  { name: '낙관적', revenue: 130, multiple: 16, raise: 100 },
];

export default function ValuationScenario() {
  const id = useId();
  const [revenue, setRevenue] = useState(100);
  const [multiple, setMultiple] = useState(14);
  const [raise, setRaise] = useState(75);
  const valuation = revenue * multiple;
  const dilution = raise / valuation * 100;
  return (
    <section className="valuation-scenario" aria-label="상장 조건 가정 계산기">
      <p className="scenario-eyebrow">편집부 가정 · 시장 컨센서스 아님</p>
      <p className="scenario-title">어떤 매출을, 몇 배에 살 것인가?</p>
      <p className="scenario-intro">2027년 연간 매출과 시가총액/매출 배수를 바꿔보세요. 모든 입력은 전망을 설명하기 위한 가정입니다.</p>
      <div className="scenario-presets" aria-label="시나리오 선택">
        {cases.map(c => <button key={c.name} type="button"
          aria-pressed={revenue === c.revenue && multiple === c.multiple && raise === c.raise}
          onClick={() => { setRevenue(c.revenue); setMultiple(c.multiple); setRaise(c.raise); }}>{c.name}</button>)}
      </div>
      <label htmlFor={`${id}-revenue`}>2027년 매출 가정 <strong>${revenue}B</strong></label>
      <input id={`${id}-revenue`} type="range" min="50" max="160" step="5" value={revenue}
        aria-valuetext={`${revenue} billion US dollars`} onChange={e => setRevenue(Number(e.target.value))} />
      <label htmlFor={`${id}-multiple`}>시가총액 / 매출 배수 <strong>{multiple}배</strong></label>
      <input id={`${id}-multiple`} type="range" min="8" max="25" step="1" value={multiple}
        aria-valuetext={`${multiple}배`} onChange={e => setMultiple(Number(e.target.value))} />
      <label htmlFor={`${id}-raise`}>신주 공모 총액 가정 <strong>${raise}B</strong></label>
      <input id={`${id}-raise`} type="range" min="20" max="100" step="5" value={raise}
        aria-valuetext={`${raise} billion US dollars`} onChange={e => setRaise(Number(e.target.value))} />
      <div className="scenario-results" role="status" aria-live="polite" aria-atomic="true">
        <div><span>공모 후 시가총액</span><strong>${(valuation / 1000).toFixed(2)}T</strong></div>
        <div><span>신주로 인한 단순 희석</span><strong>{dilution.toFixed(1)}%</strong></div>
      </div>
      <p className="scenario-formula">${revenue}B × {multiple}배 = ${valuation.toLocaleString('en-US')}B · 신주 ${raise}B ÷ 공모 후 ${valuation.toLocaleString('en-US')}B</p>
      <p className="scenario-note">신주만 발행하고 공모 후 가치가 위 계산과 같다고 가정합니다. 구주매출·수수료·전환증권·추가 주식보상·초과배정은 제외했습니다. 순현금을 차감한 EV 배수가 아니며, 실제 주당 공모가는 완전희석 주식 수가 필요합니다. B = 10억 달러, T = 1조 달러.</p>
    </section>
  );
}
