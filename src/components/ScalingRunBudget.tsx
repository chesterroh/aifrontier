import { useState } from 'react';

// 기준점: Epoch AI의 GPT-6 Astra 추정 (GB200 약 10만 개 × 90일, FP8 MFU 25%)
const BASE_FLOP = 9.4e26;
const BASE_YEAR = 2026;
const FLOP_PER_GPU = 1.25e15; // B200 FP8 5e15 × MFU 25%
const IT_KW_PER_GPU = 2.0; // Abilene 824 MW ÷ GB200 환산 약 40만 개
const PUE = 1.2;
const H100E_PER_GPU = 2.53;
const WORLD_STOCK_H100E = 31.6e6; // 2026년 2분기 누적 판매
const SEOUL_GW = 50.352 / 8.76; // 2024년 소비량의 평균 전력
const KOREA_PEAK_GW = 97.1; // 역대 최대 전력수요
const TREND_EFF = 2 ** (1 / 2.4); // 전력 효율 2.4년마다 2배 = 연 1.33배
const APR1400_GW = 1.4;
const CAPEX_PER_IT_GW = 38; // 십억 달러

const SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const sci = (v: number) => {
  const e = Math.floor(Math.log10(v));
  return `${(v / 10 ** e).toFixed(1)} × 10${String(e).split('').map(c => SUP[c]).join('')}`;
};
const num = (v: number, d = 0) => v.toLocaleString('ko-KR', { maximumFractionDigits: d, minimumFractionDigits: d });
const usd = (b: number) => (b >= 1000 ? `$${num(b / 1000, 1)}T` : `$${num(b)}B`);

function Choice<T extends number>({ label, value, options, format, onChange }: {
  label: string; value: T; options: T[]; format: (v: T) => string; onChange: (v: T) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-1 text-sm text-slate-600 dark:text-slate-300">{label}</legend>
      <div className="flex flex-wrap gap-1">
        {options.map(o => (
          <button
            key={o}
            type="button"
            aria-pressed={o === value}
            onClick={() => onChange(o)}
            className={`rounded-md border px-3 py-1.5 text-sm tabular-nums transition-colors ${o === value
              ? 'border-sky-500 bg-sky-500 font-semibold text-white'
              : 'border-slate-300 text-slate-700 hover:border-sky-400 dark:border-slate-600 dark:text-slate-200'}`}
          >
            {format(o)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export default function ScalingRunBudget() {
  const [growth, setGrowth] = useState(5);
  const [year, setYear] = useState(2030);
  const [days, setDays] = useState(300);
  const [effGain, setEffGain] = useState(TREND_EFF);

  const years = year - BASE_YEAR;
  const flop = BASE_FLOP * growth ** years;
  const eff = effGain ** years;
  const gpuEq = flop / (FLOP_PER_GPU * days * 86400); // 오늘 GB200 기준 환산 개수
  const facilityGW = (gpuEq * IT_KW_PER_GPU * PUE) / 1e6 / eff;
  const itGW = facilityGW / PUE;
  const h100e = gpuEq * H100E_PER_GPU;
  const seouls = facilityGW / SEOUL_GW;

  const tiles: [string, string, string][] = [
    ['학습 연산', `${sci(flop)} FLOP`, `Astra의 ${num(flop / BASE_FLOP)}배`],
    ['필요 전력', `${num(facilityGW, facilityGW < 10 ? 2 : 1)} GW`, `${days}일 동안 · APR1400 ${num(facilityGW / APR1400_GW, 1)}기`],
    ['서울과 비교', seouls >= 1 ? `서울 ${num(seouls, 1)}개` : `서울의 ${num(seouls * 100)}%`, '서울 평균 5.7 GW 기준'],
    ['한국 최대 수요 대비', `${num((facilityGW / KOREA_PEAK_GW) * 100)}%`, '역대 최대 97.1 GW 기준'],
    ['필요 연산 용량', `${num(h100e / 1e6, h100e < 1e7 ? 2 : 1)}M H100e`, `2026년 2분기 세계 누적의 ${num((h100e / WORLD_STOCK_H100E) * 100)}%`],
    ['클러스터 투자', usd(itGW * CAPEX_PER_IT_GW), 'IT 전력 1 GW당 $38B 기준'],
  ];

  return (
    <section aria-label="2030 학습 런 계산기" className="not-prose my-6 rounded-xl border border-slate-300 p-5 dark:border-slate-600">
      <div className="grid gap-4 sm:grid-cols-2">
        <Choice label="학습 연산 증가율 (연)" value={growth} options={[2, 3, 4, 5]} format={v => `${v}배`} onChange={setGrowth} />
        <Choice label="목표 연도" value={year} options={[2027, 2028, 2029, 2030]} format={v => `${v}`} onChange={setYear} />
        <Choice label="학습 기간" value={days} options={[90, 180, 300]} format={v => `${v}일`} onChange={setDays} />
        <Choice label="전력 효율 개선 (연)" value={effGain} options={[1, TREND_EFF, 1.4]} format={v => (v === 1 ? '없음' : v === TREND_EFF ? '1.33배 (추세)' : `${v}배`)} onChange={setEffGain} />
      </div>
      <div aria-live="polite" aria-atomic="true" className="mt-5 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-slate-300 pt-4 sm:grid-cols-3 dark:border-slate-600">
        {tiles.map(([label, value, note]) => (
          <div key={label}>
            <div className="text-sm text-slate-600 dark:text-slate-300">{label}</div>
            <div className="text-xl font-bold tabular-nums text-slate-900 dark:text-white">{value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{note}</div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
        기준: 2026년 GPT-6 Astra 9.4 × 10²⁶ FLOP · GPU당 실효 1.25 PFLOP/s · IT 2 kW · PUE 1.2. 효율 개선은 같은 전력에서 얻는 연산이 해마다 그만큼 늘어난다는 뜻입니다.
      </p>
    </section>
  );
}
