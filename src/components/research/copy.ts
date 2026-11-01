import type { Lang } from '../../lib/seo';

export const researchCopy = {
  ko: {
    source: '원문 확인', enlarge: '크게 보기', scroll: '가로 스크롤 가능', csv: '전체 데이터 CSV',
    versions: ['개편 후 · v5', '개편 전 · v4.3.2'],
    benchmarkAlts: ['AAII v5 원본 그래프: Opus 5.5 58, Astra 57, Sol 55, Sonnet 54, Kimi 46점', 'AAII v4.3.2 원본 그래프: Opus 58, Sonnet과 Muse Wonder Full 56, Kimi 55, Astra 53, Sol 52점'],
    credit: 'Artificial Analysis 원본 캡처 · 클릭하면 확대', quoteSource: '인용 원문',
    calculator: {
      aria: '상장 조건 가정 계산기', eyebrow: '편집부 가정 · 시장 컨센서스 아님', title: '어떤 매출을, 몇 배에 살 것인가?',
      intro: '2027년 연간 매출과 시가총액/매출 배수를 바꿔보세요. 모든 입력은 전망을 설명하기 위한 가정입니다.',
      presetsLabel: '시나리오 선택', presets: ['보수적', '기준', '낙관적'], revenue: '2027년 매출 가정', multiple: '시가총액 / 매출 배수', raise: '신주 공모 총액 가정',
      valuation: '공모 후 시가총액', dilution: '신주로 인한 단순 희석', times: '배', moneyUnit: '십억 미국 달러', newShares: '신주', postOffering: '공모 후',
      note: '신주만 발행하고 공모 후 가치가 위 계산과 같다고 가정합니다. 구주매출·수수료·전환증권·추가 주식보상·초과배정은 제외했습니다. 순현금을 차감한 EV 배수가 아니며, 실제 주당 공모가는 완전희석 주식 수가 필요합니다. B = 10억 달러, T = 1조 달러.',
    },
  },
  en: {
    source: 'Original source', enlarge: 'Enlarge', scroll: 'Scroll horizontally', csv: 'All data CSV',
    versions: ['After · v5', 'Before · v4.3.2'],
    benchmarkAlts: ['Original AAII v5 chart: Opus 5.5 58, Astra 57, Sol 55, Sonnet 54, Kimi 46', 'Original AAII v4.3.2 chart: Opus 58, Sonnet and Muse Wonder Full 56, Kimi 55, Astra 53, Sol 52'],
    credit: 'Artificial Analysis original screenshot · Click to enlarge', quoteSource: 'Quote source',
    calculator: {
      aria: 'IPO scenario calculator', eyebrow: 'Editorial assumptions · Not market consensus', title: 'Which revenue, at what multiple?',
      intro: 'Adjust assumed 2027 annual revenue and the market-cap-to-revenue multiple. All inputs are illustrative forecasts.',
      presetsLabel: 'Choose a scenario', presets: ['Conservative', 'Base', 'Optimistic'], revenue: 'Assumed 2027 revenue', multiple: 'Market cap / revenue multiple', raise: 'Assumed new-share proceeds',
      valuation: 'Post-offering market cap', dilution: 'Simple new-share dilution', times: '×', moneyUnit: 'billion US dollars', newShares: 'New shares', postOffering: 'Post-offering',
      note: 'Assumes only new shares are issued and the post-offering value equals the calculation above. Excludes secondary sales, fees, convertible securities, additional stock compensation, and overallotment. This is not an enterprise-value multiple net of cash. An actual IPO price per share requires the fully diluted share count. B = billion USD; T = trillion USD.',
    },
  },
  ja: {
    source: '原文を確認', enlarge: '拡大表示', scroll: '横スクロール可能', csv: '全データCSV',
    versions: ['改定後 · v5', '改定前 · v4.3.2'],
    benchmarkAlts: ['AAII v5原図：Opus 5.5 58点、Astra 57点、Sol 55点、Sonnet 54点、Kimi 46点', 'AAII v4.3.2原図：Opus 58点、SonnetとMuse Wonder Full 56点、Kimi 55点、Astra 53点、Sol 52点'],
    credit: 'Artificial Analysis原文キャプチャ · クリックで拡大', quoteSource: '引用元',
    calculator: {
      aria: 'IPO条件の仮定計算機', eyebrow: '編集部の仮定 · 市場コンセンサスではありません', title: 'どの売上高に、何倍の価値を払うか？',
      intro: '2027年の年間売上高と時価総額／売上倍率を変更できます。すべて予測を説明するための仮定です。',
      presetsLabel: 'シナリオを選択', presets: ['保守的', '基準', '楽観的'], revenue: '2027年売上高の仮定', multiple: '時価総額 / 売上倍率', raise: '新株公募総額の仮定',
      valuation: '公募後時価総額', dilution: '新株による単純希薄化', times: '倍', moneyUnit: '10億米ドル', newShares: '新株', postOffering: '公募後',
      note: '新株のみを発行し、公募後価値が上記計算と一致すると仮定。既存株の売出し・手数料・転換証券・追加株式報酬・オーバーアロットメントは除外。純現金を差し引くEV倍率ではありません。実際の1株当たり公募価格には完全希薄化後株式数が必要です。B = 10億米ドル、T = 1兆米ドル。',
    },
  },
  'zh-Hans': {
    source: '查看原文', enlarge: '放大查看', scroll: '可横向滚动', csv: '全部数据CSV',
    versions: ['更新后 · v5', '更新前 · v4.3.2'],
    benchmarkAlts: ['AAII v5原图：Opus 5.5得58分、Astra 57分、Sol 55分、Sonnet 54分、Kimi 46分', 'AAII v4.3.2原图：Opus 58分、Sonnet和Muse Wonder Full 56分、Kimi 55分、Astra 53分、Sol 52分'],
    credit: 'Artificial Analysis原文截图 · 点击放大', quoteSource: '引文来源',
    calculator: {
      aria: 'IPO情景假设计算器', eyebrow: '编辑部假设 · 非市场共识', title: '为多少营收，支付多少倍估值？',
      intro: '调整2027年全年营收假设及市值／营收倍数。所有输入仅用于说明预测情景。',
      presetsLabel: '选择情景', presets: ['保守', '基准', '乐观'], revenue: '2027年营收假设', multiple: '市值 / 营收倍数', raise: '新股发行总额假设',
      valuation: '发行后市值', dilution: '新股简单稀释比例', times: '倍', moneyUnit: '十亿美元', newShares: '新股', postOffering: '发行后',
      note: '假设仅发行新股，发行后估值等于上述计算结果。不含老股出售、费用、可转换证券、额外股权激励和超额配售。这不是扣除净现金后的企业价值倍数；实际每股发行价还需要完全摊薄股数。B = 10亿美元，T = 1万亿美元。',
    },
  },
} satisfies Record<Lang, unknown>;

// English originals and source URLs stay in QuoteCollection; this localizes their context.
export const quoteTranslations = {
  en: [
    { voice: 'ARK Research', role: 'Sam Korus · Brett Winton · Nicholas Grous', tag: 'Scale of growth', translated: '', context: 'Official podcast description, commenting on the pace of revenue growth.' },
    { voice: 'Paul Kedrosky', role: 'Investor · Analyst', tag: 'Durability of growth', translated: '', context: 'Article subheading. Focuses on falling token prices and model replacement.' },
    { voice: 'Brian Hopkins', role: 'Forrester · VP, Emerging Tech Portfolio', tag: 'Buyer leverage', translated: '', context: 'Forecasts price competition to secure customer usage.' },
    { voice: 'Matt Levine', role: 'Bloomberg Opinion · Money Stuff', tag: 'Promises and risks', translated: '', context: 'Excerpt from the public introduction, on opportunity and risk in the prospectus.' },
    { voice: 'Susannah Streeter', role: 'Wealth Club · Chief Investment Strategist', tag: 'Investor expectations', translated: '', context: 'Reuters interview, on closer scrutiny of spending and valuations.' },
    { voice: 'Thomas Hayes', role: 'Great Hill Capital · Chairman', tag: 'Faith in future returns', translated: '', context: 'Reuters interview. The deal requires considerable faith in future earnings.' },
    { voice: 'Arthur Mensch', role: 'Mistral AI · Co-founder & CEO', tag: 'A counterview on safety', translated: '', context: 'Le Monde interview before the S-1. A counterview on safety, not a direct IPO assessment.' },
    { voice: 'Liam Proud', role: 'Reuters Breakingviews · Columnist', tag: 'Strategic premium', translated: '', context: 'Analysis of Mistral funding and the premium for European technological autonomy.' },
  ],
  ja: [
    { voice: 'ARKリサーチチーム', role: 'Sam Korus · Brett Winton · Nicholas Grous', tag: '成長の規模', translated: '企業史上、最も目覚ましい12か月の売上成長かもしれない。', context: '公式ポッドキャスト紹介文。売上成長の速さに対する評価。' },
    { voice: 'Paul Kedrosky', role: '投資家・アナリスト', tag: '成長の持続性', translated: '驚異的な成長、不確かな持続性。', context: '記事の小見出し。トークン価格低下とモデル交代に注目。' },
    { voice: 'Brian Hopkins', role: 'Forrester · VP, Emerging Tech Portfolio', tag: '顧客の交渉力', translated: '価格は、安くなることで「現実的」になる。', context: '顧客の利用を獲得するため価格競争が必要になるとの予測。' },
    { voice: 'Matt Levine', role: 'Bloomberg Opinion · Money Stuff', tag: '成長の約束とリスク', translated: 'AIの良い未来で何を約束し、悪い未来で何を警告するのか。', context: '公開導入部の抜粋。目論見書に同居する機会とリスク。' },
    { voice: 'Susannah Streeter', role: 'Wealth Club · Chief Investment Strategist', tag: '市場の要求水準', translated: '投資家はますます厳しく見極めるようになっている。', context: 'Reuters取材。支出と企業価値の検証が厳しくなるとの見方。' },
    { voice: 'Thomas Hayes', role: 'Great Hill Capital · Chairman', tag: '将来利益への信頼', translated: '今回の公募は、信じる人のためのものだ。', context: 'Reuters取材。将来利益への強い信頼が必要な取引。' },
    { voice: 'Arthur Mensch', role: 'Mistral AI · 共同創業者兼CEO', tag: '安全論への反論', translated: 'AIはソフトウェアだ。制御できる。', context: 'S-1以前のLe Monde取材。安全論への反論で、IPOの直接評価ではない。' },
    { voice: 'Liam Proud', role: 'Reuters Breakingviews · コラムニスト', tag: '戦略価値のプレミアム', translated: '一部はAI企業、一部は地政学的なヘッジだ。', context: 'Mistral調達の分析。欧州の技術的自立へのプレミアム。' },
  ],
  'zh-Hans': [
    { voice: 'ARK研究团队', role: 'Sam Korus · Brett Winton · Nicholas Grous', tag: '增长规模', translated: '这或许是企业史上最令人瞩目的十二个月营收增长。', context: '官方播客简介，对营收增长速度的评价。' },
    { voice: 'Paul Kedrosky', role: '投资人、分析师', tag: '增长持续性', translated: '非凡的增长，不确定的持久性。', context: '文章小标题，关注token降价和模型替换。' },
    { voice: 'Brian Hopkins', role: 'Forrester · VP, Emerging Tech Portfolio', tag: '客户议价权', translated: '价格将通过变得更便宜而变得“现实”。', context: '预测为争取客户用量，价格竞争将加剧。' },
    { voice: 'Matt Levine', role: 'Bloomberg Opinion · Money Stuff', tag: '增长承诺与风险', translated: '在AI的美好愿景中承诺什么，在糟糕愿景中警告什么。', context: '公开导言节选，讨论招股书中并存的机遇与风险。' },
    { voice: 'Susannah Streeter', role: 'Wealth Club · Chief Investment Strategist', tag: '市场要求', translated: '投资者正在变得更有辨别力。', context: 'Reuters采访，谈对支出与估值的更严格审视。' },
    { voice: 'Thomas Hayes', role: 'Great Hill Capital · Chairman', tag: '对未来盈利的信念', translated: '这次发行是为信仰坚定的人准备的。', context: 'Reuters采访，指出这笔交易需要对未来盈利有很强信心。' },
    { voice: 'Arthur Mensch', role: 'Mistral AI · 联合创始人兼CEO', tag: '对安全论述的反驳', translated: 'AI是软件，可以被控制。', context: 'S-1之前的Le Monde采访，反驳安全论述，并非直接评价IPO。' },
    { voice: 'Liam Proud', role: 'Reuters Breakingviews · 专栏作家', tag: '战略价值溢价', translated: '一部分是AI公司，一部分是地缘政治对冲。', context: 'Mistral融资分析，讨论欧洲技术自主的溢价。' },
  ],
};
