"""Rebuild publication charts. Requires matplotlib, numpy, Pillow.
Run from repository root. Numeric sources/units are exported alongside figures.
No chart uses a run rate as booked annual revenue.
"""
from pathlib import Path
import csv, json
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

OUT = Path('public/articles/anthropic-s1-ipo')
OUT.mkdir(parents=True, exist_ok=True)
INK, MUTED, CORAL, TEAL, BLUE, BG = '#242b2b', '#66716e', '#c47c5b', '#31796e', '#6b8aa3', '#fffdf9'
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 13, 'axes.labelcolor': MUTED,
 'text.color': INK, 'xtick.color': MUTED, 'ytick.color': MUTED, 'axes.spines.top': False,
 'axes.spines.right': False, 'axes.spines.left': False, 'axes.spines.bottom': False,
 'axes.edgecolor': '#d9dfda', 'figure.facecolor': BG, 'axes.facecolor': BG,
 'svg.fonttype': 'none', 'axes.titleweight': 'bold', 'axes.titlepad': 20})
S1='https://www.sec.gov/Archives/edgar/data/2130357/000162828026067168/anthropicpbc-sx1.htm'
RQ3='https://www.investing.com/news/stock-market-news/anthropics-q3-revenue-surges-45-to-nearly-17-billion-4950208'
AA='https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v5'
CARBON='https://artificialanalysis.ai/articles/gemini-4-carbon-new-number-1'
rows=[]
def record(chart, label, value, unit, period, source, status):
 rows.append(dict(chart=chart,label=label,value=value,unit=unit,period=period,source=source,status=status))
def save(fig, name, title, note):
 fig.suptitle(title,x=.06,ha='left',y=.97,fontsize=19,fontweight='bold')
 fig.text(.06,.025,note,fontsize=10,color=MUTED,ha='left')
 svg_path = OUT/f'{name}.svg'
 fig.savefig(svg_path,facecolor=BG)
 svg_path.write_text('\n'.join(line.rstrip() for line in svg_path.read_text().splitlines())+'\n')
 fig.savefig(OUT/f'{name}.png',dpi=180,facecolor=BG)
 plt.close(fig)
def horizontal(name,labels,values,title,note,unit='',colors=None,xmax=None,details=None):
 fig,ax=plt.subplots(figsize=(11,6.4));fig.subplots_adjust(left=.28,right=.90,bottom=.20,top=.81)
 y=np.arange(len(labels));ax.barh(y,values,color=colors or CORAL,height=.54)
 ax.set_yticks(y,labels);ax.invert_yaxis();ax.set_xlim(0,xmax or max(values)*1.27)
 ax.xaxis.grid(True,color='#e9e9e2');ax.set_axisbelow(True);ax.tick_params(length=0,pad=8)
 for i,v in enumerate(values):ax.text(v+ax.get_xlim()[1]*.018,i,f'{v:g}{unit}',va='center',fontweight='bold',fontsize=15)
 if details:
  for i,d in enumerate(details):ax.text(.01,i+.33,d,fontsize=9,color=MUTED,va='top',transform=ax.get_yaxis_transform())
 save(fig,name,title,note)

# Quarterly revenue: Q3 is independently reported, not the S-1's filled financial table.
name='quarterly-revenue';labels=['Q1 2026','Q2 2026','Q3 2026'];vs=[4.731,11.555,16.8]
fig,ax=plt.subplots(figsize=(11,6.4));fig.subplots_adjust(left=.08,right=.96,bottom=.19,top=.78)
bars=ax.bar(labels,vs,color=[CORAL,CORAL,'#f5e4d8'],width=.54,edgecolor=CORAL)
bars[-1].set_hatch('///');ax.set_ylim(0,20);ax.set_ylabel('Revenue (USD billions)');ax.yaxis.grid(True,color='#e9e9e2');ax.set_axisbelow(True);ax.tick_params(length=0)
for b,v in zip(bars,vs):ax.text(b.get_x()+b.get_width()/2,v+.5,f'${v:g}B',ha='center',fontsize=20,fontweight='bold')
ax.text(2,4,'Reuters report\nInvestor-day sources',ha='center',fontsize=11)
save(fig,name,'Revenue growth, quarter by quarter.','Q1 / Q2: S-1, 26 Oct 2026. Q3: Reuters, 14 Oct 2026; not an audited S-1 table.')
for l,v in zip(labels,vs):record(name,l,v,'USD billion',l,S1 if 'Q3' not in l else RQ3,'filed interim' if 'Q3' not in l else 'reported')

name='profit-and-cash';labels=['GAAP operating income','Adjusted operating income','Operating cash flow'];vs=[-.693,1.618,3.929]
fig,ax=plt.subplots(figsize=(11,6.4));fig.subplots_adjust(left=.35,right=.92,bottom=.19,top=.79)
y=np.arange(3);ax.barh(y,vs,color=[CORAL,BLUE,TEAL],height=.5);ax.set_yticks(y,labels);ax.invert_yaxis();ax.axvline(0,color=MUTED,lw=.8);ax.set_xlim(-1.5,5.1);ax.set_xlabel('USD billions');ax.xaxis.grid(True,color='#e9e9e2');ax.set_axisbelow(True);ax.tick_params(length=0)
for i,v in enumerate(vs):ax.text(v+(.12 if v>0 else -.12),i,f'{v:+.3f}',ha='left' if v>0 else 'right',va='center',fontweight='bold',fontsize=17)
save(fig,name,'H1 2026: operating income and cash flow.','Adjusted income excludes selected costs. Operating cash flow is not free cash flow. Source: S-1.')
for l,v in zip(labels,vs):record(name,l,v,'USD billion','H1 2026',S1,'filed interim / non-GAAP where labeled')

name='net-loss'
labels=['Notes / derivatives\n/ SAFEs: fair value','Other financial\ninstruments: fair value','All other income\n/ expenses, net','Net loss']
vs=[-72.388,-8.720,.360,-80.748]
fig,ax=plt.subplots(figsize=(11,6.4));fig.subplots_adjust(left=.11,right=.96,bottom=.22,top=.79)
running=0
for i,v in enumerate(vs):
 start=running if i<3 else 0
 end=start+v
 ax.bar(i,abs(v),bottom=min(start,end),width=.55,color=TEAL if v>0 else (INK if i==3 else CORAL))
 ax.text(i,(max(start,end)+3) if i in [0,3] else (min(start,end)-4),f'{v:+.3f}',ha='center',va='center',fontsize=15,fontweight='bold')
 if i<3:
  running=end
  if i<2:ax.plot([i+.275,i+1-.275],[end,end],color=MUTED,ls=':',lw=1)
ax.set_xticks(range(4),labels,fontsize=10);ax.set_ylim(-96,12);ax.set_ylabel('Income / (loss), USD billions');ax.axhline(0,color=MUTED,lw=.8);ax.yaxis.grid(True,color='#e9e9e2');ax.set_axisbelow(True);ax.tick_params(length=0)
save(fig,name,'Net loss: large financial remeasurement charges.','H1 2026. Other net income is a calculated residual, NOT cash flow or operating profit. Source: S-1.')
for i,(l,v) in enumerate(zip(labels,vs)):record(name,l.replace('\n',' '),v,'USD billion income / (loss)','H1 2026',S1,'calculated residual' if i==2 else 'filed interim')

name='compute-contracts';labels=['Broadcom','SpaceXAI','Google','Amazon','Microsoft','Nscale','Lambda'];vs=[161.2,120.5,114.5,110,44.9,44.6,41.3]
horizontal(name,labels,vs,'Compute contracts: different obligations.','USD billions, multi-year. Minimums, ceilings and finance leases differ; not annual expense. S-1, Oct 26.',colors=[BLUE,CORAL,TEAL,TEAL,TEAL,CORAL,CORAL],details=['Lease rent; interest excluded','Up to; cancellation terms','At least','At least','At least','Up to; delivery conditions','Approx.; staged delivery'])
for l,v in zip(labels,vs):record(name,l,v,'USD billion','multi-year contract-specific',S1,{'Broadcom':'finance lease rents excluding interest','SpaceXAI':'ceiling; cancellation conditions','Google':'minimum excluding conditional extra capacity','Amazon':'minimum','Microsoft':'minimum','Nscale':'ceiling conditional delivery','Lambda':'approximate conditional commitments'}[l])

name='aaii-v5';labels=['Gemini 4 Carbon (high)*','Claude Opus 5.5 (max)','GPT-6 Astra (max)','GPT-6.1 Sol (max)','Gemini 4 Argon (high)*','Kimi K3.1 Pro**'];vs=[59,58,57,55,50,46]
horizontal(name,labels,vs,'AAII v5: Carbon 59, Opus 58.','Selected models, 27-28 Oct. *Limited access. **Weights not yet released. Higher is better.',colors=[BLUE,CORAL,'#bdc8c4','#bdc8c4',BLUE,'#bdc8c4'],xmax=70)
for l,v in zip(labels,vs):record(name,l,v,'AAII v5 score','2026-10-27 / 28',CARBON if 'Carbon' in l else AA,'independent evaluation; access varies')

name='opus-benchmarks';labels=['AutomationBench-AA','Terminal-Bench 4.0','GDP.pdf','Terminal-Bench-Science'];old=[57,49,22,29];new=[70,60,26,59]
fig,ax=plt.subplots(figsize=(11,6.4));fig.subplots_adjust(left=.32,right=.92,bottom=.28,top=.78)
y=np.arange(4);ax.barh(y-.17,old,height=.29,color='#c7d0cc',label='Opus 5 (max)');ax.barh(y+.17,new,height=.29,color=CORAL,label='Opus 5.5 (max, default fallback)');ax.set_yticks(y,labels);ax.invert_yaxis();ax.set_xlim(0,100);ax.set_xlabel('Score (%) — separate tasks, not interchangeable');ax.legend(frameon=False,loc='upper center',bbox_to_anchor=(.5,-.18),ncol=2,fontsize=9);ax.xaxis.grid(True,color='#e9e9e2');ax.set_axisbelow(True)
for i,(a,b) in enumerate(zip(old,new)):
 ax.text(a+1,i-.17,str(a),va='center',fontsize=12);ax.text(b+1,i+.17,str(b),va='center',fontsize=12,fontweight='bold')
save(fig,name,'Opus 5.5: stronger on real work.','Artificial Analysis model comparison, checked 31 Oct. Opus 5 has no complete v5 aggregate score.')
for l,a,b in zip(labels,old,new):
 for model,v in [('Opus 5 max',a),('Opus 5.5 max default fallback',b)]:record(name,l+' / '+model,v,'percent','checked 2026-10-31','https://artificialanalysis.ai/models/comparisons/claude-opus-5-5-vs-claude-opus-5','independent evaluation')

name='aaii-cost';labels=['Opus 5.5 (max)','Gemini 4 Carbon (high)*','GPT-6 Astra (max)','GPT-6.1 Sol (max)'];vs=[10.04,7.76,6.24,1.27]
horizontal(name,labels,vs,'AAII v5: the cost per task.','USD per weighted AAII v5 task, standard pricing. *Limited access. Source: Artificial Analysis, Oct 27-28.',colors=[CORAL,BLUE,TEAL,TEAL],unit='')
for l,v in zip(labels,vs):record(name,l,v,'USD per AAII task','2026-10-27 / 28',CARBON if 'Carbon' in l else AA,'benchmark-weighted task cost; standard pricing')

name='funding-valuations';labels=['Anthropic: May round','OpenAI: March round','Anthropic: IPO reports','OpenAI: funding talks'];vs=[965,852,1500,1250]
fig,ax=plt.subplots(figsize=(11,6.4));fig.subplots_adjust(left=.33,right=.93,bottom=.20,top=.79)
y=np.arange(4);bars=ax.barh(y,vs,height=.5,color=[CORAL,TEAL,'#f5e4d8','#deebe7'],edgecolor=[CORAL,TEAL,CORAL,TEAL])
for b in bars[2:]:b.set_hatch('///')
ax.set_yticks(y,labels);ax.invert_yaxis();ax.set_xlim(0,2300);ax.set_xlabel('Equity valuation (USD billions)');ax.xaxis.grid(True,color='#e9e9e2');ax.set_axisbelow(True)
ax.errorbar(1500,2,xerr=[[0],[500]],fmt='none',ecolor=CORAL,capsize=5,lw=2)
for i,(v,label) in enumerate(zip(vs,['$965B post-money','$852B post-money','$1.5-2.0T, reported','$1.25T pre-money, talks'])):ax.text((2050 if i==2 else v)+35,i,label,va='center',fontsize=11,ha='left')
ax.set_xlim(0,2850)
save(fig,name,'Funding valuations: confirmed and proposed.','Confirmed: Anthropic May 28; OpenAI Mar 31. Proposed terms: Reuters / CNBC, Oct. No IPO price set.')
record(name,labels[0],965,'USD billion post-money','2026-05-28','https://www.anthropic.com/news/series-h','confirmed round')
record(name,labels[1],852,'USD billion post-money','2026-03-31','https://openai.com/index/accelerating-the-next-phase-ai/','confirmed round')
record(name,labels[2],1500,'USD billion lower bound; range 1500-2000','2026-10-26','https://www.investing.com/news/stock-market-news/anthropic-opens-books-on-ais-explosive-growth-and-staggering-costs-4972801','reported investor valuations, not IPO terms')
record(name,labels[3],1250,'USD billion pre-money','2026-10-22','https://techcrunch.com/2026/10/22/openai-working-on-new-30b-raise-at-1.25t-valuation-ahead-of-ipo/','reported talks citing CNBC; not a completed round')

name='cyber-safeguards';labels=['General access','Defense Access','Red Team Access'];blocked=[50,46,0];success=[0,4,34];other=[0,0,16]
fig,ax=plt.subplots(figsize=(11,6.4));fig.subplots_adjust(left=.22,right=.94,bottom=.24,top=.78)
y=np.arange(3);a=np.array(blocked);b=np.array(success)
ax.barh(y,blocked,color='#c7d0cc',label='Blocked');ax.barh(y,success,left=a,color=TEAL,label='Succeeded');ax.barh(y,other,left=a+b,color=CORAL,label='Not completed (unblocked)');ax.set_yticks(y,labels);ax.invert_yaxis();ax.set_xlim(0,50);ax.set_xlabel('Trials (50 per tier; 10 challenges x 5 attempts)');ax.legend(frameon=False,loc='upper center',bbox_to_anchor=(.45,-.22),ncol=3,fontsize=10)
for i in range(3):
 if blocked[i]:ax.text(blocked[i]/2,i,str(blocked[i]),ha='center',va='center',fontweight='bold')
 if success[i]:ax.text(blocked[i]+success[i]/2,i,str(success[i]),ha='center',va='center',color='white',fontweight='bold')
 if other[i]:ax.text(blocked[i]+success[i]+other[i]/2,i,str(other[i]),ha='center',va='center',color='white',fontweight='bold')
save(fig,name,'Cyber safeguards: results depend on access.','Opus 5.5 on CyScenarioBench. Anthropic-run evaluation, Oct 6; not a real-world incident rate.')
for l,a,b,c in zip(labels,blocked,success,other):
 for kind,v in [('blocked',a),('succeeded',b),('not completed unblocked',c)]:record(name,l+' / '+kind,v,'trials of 50','2026-10-06','https://www.anthropic.com/news/cyber-verification-program','first-party evaluation')

# Original cover, not a screenshot of a source document.
fig=plt.figure(figsize=(16,9),facecolor=BG)
fig.text(.075,.86,'AI FRONTIER / RESEARCH NOTE',fontsize=17,color=TEAL,weight='bold')
fig.text(.075,.56,'ANTHROPIC\nTHE S-1 MOMENT',fontsize=58,weight='bold',linespacing=1.12)
fig.text(.08,.25,'$16.3B',fontsize=37,color=CORAL,weight='bold');fig.text(.08,.19,'H1 2026 REVENUE',fontsize=13,color=MUTED)
fig.text(.39,.25,'58',fontsize=37,color=TEAL,weight='bold');fig.text(.39,.19,'OPUS 5.5 / AAII v5',fontsize=13,color=MUTED)
fig.text(.69,.25,'ANT',fontsize=37,color=INK,weight='bold');fig.text(.69,.19,'PROPOSED NASDAQ TICKER',fontsize=13,color=MUTED)
fig.text(.075,.07,'Growth. Compute. Safety. The price of the frontier.  /  31 OCT 2026',fontsize=13,color=MUTED)
fig.savefig(OUT/'hero.png',dpi=110,facecolor=BG);plt.close(fig)
(OUT/'chart-data.json').write_text(json.dumps({'asOf':'2026-10-31','observations':rows},ensure_ascii=False,indent=2)+'\n')
with (OUT/'chart-data.csv').open('w',newline='') as f:
 w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
print(f'Generated 9 charts, cover and {len(rows)} source observations in {OUT}')
