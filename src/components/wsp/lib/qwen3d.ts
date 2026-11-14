// @ts-nocheck
// 3D view of the Qwen3.5 "Three Kingdoms" knowledge-injection edits:
// one tower per editor, the edited MLP layer opened up into a field of neurons.
import { createStage, THREE, label, COLORS, hex, whenVisible, webglAvailable } from './stage';
import { getStrings, tpl, numberFormat } from './i18n';

const MLP_W = 9;
const MLP_D = 8;
const ATT_W = 2.0;
const GAP = 0.35;
const SLAB_H = 0.15;
const PITCH = 0.4;
const OPEN_H = 3.0;
const BAR_MAX = 2.5;
const TOWER_SPAN = MLP_W + ATT_W + GAP;
const TOWER_GAP = 5;

const EDITORS = ['fable', 'astra'];
const SETS = ['train', 'paraphrase', 'unseen', 'general'];
const METRICS = ['delta', 'imp', 'fire'];
const cap = (k) => k[0].toUpperCase() + k.slice(1);

function quantile(arr, p) {
  const s = Float32Array.from(arr).sort();
  return s[Math.min(s.length - 1, Math.floor(s.length * p))] || 1e-9;
}

function esc(v) {
  return String(v ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}

function el(tag, cls = '', html = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

function segmented(parent, title, items, value, onChange) {
  const wrap = el('div', 'wsp-seg');
  if (title) wrap.appendChild(el('span', 'wsp-seg-title', title));
  const group = el('div', 'wsp-seg-group');
  group.setAttribute('role', 'group');
  if (title) group.setAttribute('aria-label', title);
  const buttons = {};
  for (const [key, text, tip] of items) {
    const b = el('button', '', text);
    b.type = 'button';
    if (tip) b.title = tip;
    b.addEventListener('click', () => onChange(key));
    buttons[key] = b;
    group.appendChild(b);
  }
  wrap.appendChild(group);
  parent.appendChild(wrap);
  const set = (v) => {
    for (const k in buttons) buttons[k].setAttribute('aria-pressed', String(k === v));
  };
  set(value);
  return { set, buttons, wrap };
}

class Tower {
  constructor(view, key) {
    this.view = view;
    this.key = key;
    this.group = new THREE.Group();
    this.color = new THREE.Color(COLORS[key]);
    this.slabs = [];
    this.lens = [];
    this.labels = [];
  }

  build(M) {
    const E = M.editors[this.key];
    const T = this.view.T;
    this.M = M;
    this.E = E;
    const g = this.group;
    g.clear();
    this.slabs = [];
    this.lens = [];
    const n = M.n_layers;
    const L = E.layer;
    const yOf = (i) => i * PITCH + (i > L ? OPEN_H : 0);
    this.height = yOf(n - 1) + SLAB_H;
    const attX = -(MLP_W / 2 + GAP + ATT_W / 2);
    const mlpGeo = new THREE.BoxGeometry(MLP_W, SLAB_H, MLP_D);
    const attGeo = new THREE.BoxGeometry(ATT_W, SLAB_H, MLP_D);
    for (let i = 0; i < n; i++) {
      const y = yOf(i);
      const full = M.mixer[i] === 'self_attn';
      const attMat = new THREE.MeshStandardMaterial({ color: full ? 0x55648f : COLORS.slab, roughness: 0.65, metalness: 0.1, transparent: true, opacity: 0.82 });
      const att = new THREE.Mesh(attGeo, attMat);
      att.position.set(attX, y, 0);
      att.userData = { kind: 'slab', tower: this.key, layer: i, part: full ? T.attnFull : T.attnLinear };
      g.add(att);
      let mlp = null;
      if (i !== L) {
        const mat = new THREE.MeshStandardMaterial({ color: COLORS.slab, roughness: 0.65, metalness: 0.1, transparent: true, opacity: 0.82 });
        mlp = new THREE.Mesh(mlpGeo, mat);
        mlp.position.set(0, y, 0);
        mlp.userData = { kind: 'slab', tower: this.key, layer: i, part: 'MLP' };
        g.add(mlp);
      }
      this.slabs.push({ att, mlp, y });
      // logit-lens gauge: how likely the right answer already is at this layer
      const gauge = new THREE.Mesh(new THREE.BoxGeometry(1, SLAB_H * 0.9, 0.22), new THREE.MeshBasicMaterial({ color: this.color }));
      gauge.position.set(MLP_W / 2 + 0.5, y, MLP_D / 2 - 0.11);
      gauge.userData = { kind: 'lens', tower: this.key, layer: i };
      g.add(gauge);
      this.lens.push(gauge);
      if (i % 4 === 0 || i === L || i === n - 1) {
        const lb = label(tpl(i === 0 ? T.layerIn : i === n - 1 ? T.layerOut : T.layer, { i }), 'wsp-label-dim' + (i === L ? ' wsp-label-hot' : ''));
        lb.position.set(attX - ATT_W / 2 - 0.5, y, MLP_D / 2);
        g.add(lb);
      }
    }
    // the opened layer: a plate with one bar per neuron
    const yL = yOf(L);
    const plate = new THREE.Mesh(
      new THREE.BoxGeometry(MLP_W + 0.3, 0.08, MLP_D + 0.3),
      new THREE.MeshStandardMaterial({ color: 0x101829, roughness: 0.9, metalness: 0 }),
    );
    plate.position.set(0, yL - 0.02, 0);
    g.add(plate);
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(MLP_W + 0.3, 0.08, MLP_D + 0.3)),
      new THREE.LineBasicMaterial({ color: this.color }),
    );
    edge.position.copy(plate.position);
    g.add(edge);

    const [rows, cols] = M.grid;
    const N = M.mlp_dim;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.45, metalness: 0.05 });
    const bars = new THREE.InstancedMesh(geo, mat, N);
    bars.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    bars.position.set(0, yL + 0.03, 0);
    bars.userData = { kind: 'neurons', tower: this.key };
    bars.frustumCulled = false;
    g.add(bars);
    this.bars = bars;
    this.cellW = MLP_W / cols;
    this.cellD = MLP_D / rows;
    this.pos = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      this.pos[i * 2] = ((i % cols) + 0.5) * this.cellW - MLP_W / 2;
      this.pos[i * 2 + 1] = (Math.floor(i / cols) + 0.5) * this.cellD - MLP_D / 2;
    }
    this.h = new Float32Array(N).fill(0.01);
    this.target = new Float32Array(N).fill(0.01);
    this.rewired = new Uint8Array(N);
    for (const i of E.rewired) this.rewired[i] = 1;
    this.caps = { delta: quantile(E.neurons.down_rel, 0.995), imp: quantile(E.neurons.imp, 0.995) };

    const title = label(E.label, 'wsp-label-title wsp-label-' + this.key);
    title.position.set(-1, -1.0, MLP_D / 2 + 0.6);
    g.add(title);
    const sub = label(tpl(T.towerSub, { layer: L, n: this.view.N.int(E.rewired.length) }), 'wsp-label-sub');
    sub.position.set(-1, -1.75, MLP_D / 2 + 0.6);
    g.add(sub);
    const openLb = label(tpl(T.openTag, { layer: L }), 'wsp-label-tag');
    openLb.position.set(MLP_W / 2 - 1.5, yL + OPEN_H * 0.62, -MLP_D / 2);
    g.add(openLb);
    this.applyMatrices(true);
  }

  /** Set target bar heights and colours for the current metric / example. */
  setMetric(metric, example, after) {
    const E = this.E;
    const N = this.M.mlp_dim;
    const c = new THREE.Color();
    const dim = new THREE.Color(0x4a587a);
    const bright = new THREE.Color(0xa9b6d6);
    const hot = this.color;
    const white = new THREE.Color(0xffffff);
    if (metric === 'fire' && E.examples) {
      const ex = E.examples[example] ?? E.examples[0];
      const acts = new Float32Array(N);
      for (const [i, a] of after ? ex.after : ex.before) acts[i] = Math.abs(a);
      const fired = new Set(after ? ex.fired.map((f) => f.neuron) : []);
      for (let i = 0; i < N; i++) {
        const a = acts[i];
        const t = Math.min(1, Math.sqrt(a / 16));
        this.target[i] = Math.max(0.012, t * BAR_MAX);
        if (fired.has(i)) c.copy(white).lerp(hot, 0.25);
        else if (this.rewired[i]) c.copy(hot).multiplyScalar(0.35 + 0.65 * t);
        else c.copy(dim).lerp(bright, t);
        this.bars.setColorAt(i, c);
      }
    } else {
      const m = metric === 'imp' ? 'imp' : 'delta';
      const src = m === 'imp' ? E.neurons.imp : E.neurons.down_rel;
      const cap = this.caps[m];
      for (let i = 0; i < N; i++) {
        const t = Math.min(1, src[i] / cap);
        this.target[i] = Math.max(this.rewired[i] && m === 'imp' ? 0.12 : 0.012, t * BAR_MAX);
        if (this.rewired[i]) c.copy(hot).lerp(white, m === 'imp' ? 0.15 : 0.25 * t);
        else c.copy(dim).lerp(bright, Math.min(1, t * (m === 'imp' ? 1 : 2.2)));
        this.bars.setColorAt(i, c);
      }
    }
    this.bars.instanceColor.needsUpdate = true;
    this.fat = metric === 'imp';
    this.animating = true;
    this.dirtyAll = true;
  }

  applyMatrices(force = false) {
    const N = this.M.mlp_dim;
    const m = new THREE.Matrix4();
    const bw = this.cellW * 0.78;
    const bd = this.cellD * 0.78;
    let moving = false;
    force = force || this.dirtyAll;
    this.dirtyAll = false;
    for (let i = 0; i < N; i++) {
      const d = this.target[i] - this.h[i];
      if (Math.abs(d) > 0.004) {
        this.h[i] += d * 0.16;
        moving = true;
      } else if (d !== 0) this.h[i] = this.target[i];
      else if (!force) continue;
      // in the "importance" view the rewired neurons are short, so draw them wider to keep them findable
      const f = this.fat && this.rewired[i] ? 1.9 : 1;
      m.makeScale(bw * f, this.h[i], bd * f);
      m.setPosition(this.pos[i * 2], 0, this.pos[i * 2 + 1]);
      this.bars.setMatrixAt(i, m);
    }
    this.bars.instanceMatrix.needsUpdate = true;
    this.animating = moving;
    return moving;
  }

  /** Colour the slabs by how much the residual stream changed at each layer, and size the lens gauges. */
  setGlow(setKey, showLens) {
    const E = this.E;
    const diff = E.layer_diff[setKey] ?? E.layer_diff.train;
    const lensB = E.lens.base.train ?? [];
    const lensE = E.lens.edit.train ?? [];
    const base = new THREE.Color(COLORS.slab);
    this.slabs.forEach((s, i) => {
      const t = Math.min(1, (diff[i] ?? 0) / 0.6);
      for (const mesh of [s.att, s.mlp]) {
        if (!mesh) continue;
        const b = mesh === s.att && this.M.mixer[i] === 'self_attn' ? new THREE.Color(0x55648f) : base;
        mesh.material.color.copy(b).lerp(this.color, t * 0.85);
        mesh.material.emissive.copy(this.color).multiplyScalar(t * 0.5);
      }
      const p = Math.max(lensE[i] ?? 0, 0);
      const g = this.lens[i];
      g.visible = showLens && p > 0.004;
      const len = Math.max(0.05, p * 2.2);
      g.scale.x = len;
      g.position.x = MLP_W / 2 + 0.45 + len / 2;
      g.userData.p = p;
      g.userData.pb = lensB[i] ?? 0;
    });
  }
}

class QwenView {
  constructor(root, data) {
    this.root = root;
    this.data = data;
    this.lang = root.dataset.lang || 'ko';
    const S = getStrings(this.lang);
    this.T = S.qwen;
    this.C = S.common;
    this.N = numberFormat(this.lang);
    this.state = { model: '0.8b', view: 'both', metric: 'delta', set: 'train', example: 0, after: true };
    // two towers side by side do not fit a phone screen
    if (root.clientWidth < 620) this.state.view = 'fable';
    this.buildDom();
    this.stage = createStage(this.stageEl, { fov: 32 });
    this.towers = Object.fromEntries(EDITORS.map((k) => [k, new Tower(this, k)]));
    for (const k of EDITORS) this.stage.scene.add(this.towers[k].group);
    this.stage.onFrame(() => {
      let moving = false;
      for (const k of EDITORS) if (this.towers[k].animating) moving = this.towers[k].applyMatrices() || moving;
      return moving;
    });
    this.stage.setHover((hit, ev) => this.hover(hit, ev));
    this.stage.onResize(() => this.frame(true));
    this.rebuild(true);
    root.dataset.ready = 'true';
  }

  buildDom() {
    const r = this.root;
    const T = this.T;
    r.innerHTML = '';
    const bar = el('div', 'wsp-toolbar');
    this.segModel = segmented(bar, T.segModel, [['0.8b', 'Qwen3.5-0.8B'], ['9b', 'Qwen3.5-9B']], this.state.model, (v) => this.set({ model: v }, true));
    this.segView = segmented(bar, T.segView, [['both', T.viewBoth], ['fable', 'Fable 5.2'], ['astra', 'GPT-6 Astra']], this.state.view, (v) => this.set({ view: v }));
    this.segMetric = segmented(bar, T.segMetric, METRICS.map((k) => [k, T['metric' + cap(k)], T['metric' + cap(k) + 'Tip']]), this.state.metric, (v) => this.set(v === 'fire' ? { metric: v, view: 'fable' } : { metric: v }));
    r.appendChild(bar);

    const body = el('div', 'wsp-body');
    this.stageEl = el('div', 'wsp-stage');
    this.stageEl.setAttribute('role', 'img');
    this.stageEl.setAttribute('aria-label', T.aria);
    this.tip = el('div', 'wsp-tip');
    this.stageEl.appendChild(this.tip);
    const hint = el('div', 'wsp-hint', T.hint);
    this.stageEl.appendChild(hint);
    const zoom = el('div', 'wsp-zoom');
    for (const [t, f, a] of [['+', 0.82, this.C.zoomIn], ['−', 1.2, this.C.zoomOut], ['⟲', 0, this.C.resetView]]) {
      const b = el('button', '', t);
      b.type = 'button';
      b.setAttribute('aria-label', a);
      b.addEventListener('click', () => (f ? this.stage.zoom(f) : this.frame()));
      zoom.appendChild(b);
    }
    this.stageEl.appendChild(zoom);
    this.legend = el('div', 'wsp-legend');
    this.stageEl.appendChild(this.legend);
    body.appendChild(this.stageEl);
    this.panel = el('aside', 'wsp-panel');
    body.appendChild(this.panel);
    r.appendChild(body);
    this.exBar = el('div', 'wsp-examples');
    r.appendChild(this.exBar);
  }

  set(patch, rebuild = false) {
    Object.assign(this.state, patch);
    if (this.state.metric === 'fire' && this.state.view !== 'fable') {
      if (patch.view) this.state.metric = 'delta';
      else this.state.view = 'fable';
    }
    this.segModel.set(this.state.model);
    this.segView.set(this.state.view);
    this.segMetric.set(this.state.metric);
    if (rebuild) this.rebuild();
    else this.update(!!patch.view);
  }

  rebuild(first = false) {
    const M = this.data.models[this.state.model];
    this.M = M;
    for (const k of EDITORS) this.towers[k].build(M);
    this.stage.setPickables(EDITORS.flatMap((k) => [this.towers[k].bars, ...this.towers[k].lens, ...this.towers[k].slabs.flatMap((s) => [s.att, s.mlp].filter(Boolean))]));
    this.update(true, first);
  }

  update(reframe = false, instant = false) {
    const s = this.state;
    const both = s.view === 'both';
    const off = (TOWER_SPAN + TOWER_GAP) / 2;
    this.towers.fable.group.visible = both || s.view === 'fable';
    this.towers.astra.group.visible = both || s.view === 'astra';
    this.towers.fable.group.position.x = both ? -off : 0;
    this.towers.astra.group.position.x = both ? off : 0;
    for (const k of EDITORS) {
      const t = this.towers[k];
      t.group.traverse((o) => {
        if (o.isCSS2DObject) o.visible = t.group.visible;
      });
      t.setMetric(k === 'fable' ? s.metric : s.metric === 'fire' ? 'delta' : s.metric, s.example, s.after);
      t.setGlow(s.set, true);
    }
    if (reframe) this.frame(instant);
    this.renderPanel();
    this.renderExamples();
    this.renderLegend();
    this.stage.requestRender();
  }

  frame(instant = false) {
    const both = this.state.view === 'both';
    const h = this.towers.fable.height;
    const span = both ? TOWER_SPAN * 2 + TOWER_GAP : TOWER_SPAN;
    const cam = this.stage.camera;
    const aspect = Math.max(0.4, this.stageEl.clientWidth / Math.max(1, this.stageEl.clientHeight));
    const vHalf = THREE.MathUtils.degToRad(cam.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * aspect);
    // distance needed to fit the towers' width and height, seen from a raised three-quarter angle
    const needW = (span * 0.5 + MLP_D * 0.42) / Math.tan(hHalf);
    const needH = (h * 0.5 + 3.2) / Math.tan(vHalf);
    const dist = Math.max(needW, needH) * 1.2;
    const cx = both ? -(ATT_W + GAP) / 2 : -(ATT_W + GAP) / 2;
    const cy = h * 0.5;
    const dir = new THREE.Vector3(0.42, 0.42, 0.8).normalize();
    this.stage.flyTo([cx + dir.x * dist, cy + dir.y * dist, dir.z * dist], [cx, cy, 0], 0.9, instant);
  }

  hover(hit, ev) {
    const tip = this.tip;
    const T = this.T;
    if (!hit) {
      tip.style.opacity = '0';
      return;
    }
    const u = hit.object.userData;
    const t = this.towers[u.tower];
    const E = t.E;
    let html = '';
    if (u.kind === 'neurons' && hit.instanceId != null) {
      const i = hit.instanceId;
      const rw = t.rewired[i];
      html = `<b>${tpl(T.tipNeuronTitle, { editor: E.label, layer: E.layer, i })}</b>` +
        `<span>${rw ? T.tipRewired : T.tipNotRewired}</span>` +
        `<span>${tpl(T.tipDelta, { p: (E.neurons.down_rel[i] * 100).toFixed(0) })}</span>` +
        `<span>${tpl(T.tipImp, { v: E.neurons.imp[i].toFixed(3), cap: t.caps.imp.toFixed(2) })}</span>`;
    } else if (u.kind === 'lens') {
      html = `<b>${tpl(T.tipLensTitle, { editor: E.label, layer: u.layer })}</b><span>${tpl(T.tipLensBody, { a: (u.pb * 100).toFixed(1), b: (u.p * 100).toFixed(1) })}</span><span>${T.tipLensNote}</span>`;
    } else if (u.kind === 'slab') {
      const d = E.layer_diff[this.state.set]?.[u.layer] ?? 0;
      html = `<b>${tpl(T.tipSlabTitle, { layer: u.layer, part: u.part })}</b><span>${T.tipSlabSame}</span><span>${tpl(T.tipSlabDiff, { p: (d * 100).toFixed(0) })}</span>`;
    }
    if (!html) {
      tip.style.opacity = '0';
      return;
    }
    tip.innerHTML = html;
    const r = this.stageEl.getBoundingClientRect();
    const x = Math.min(r.width - 250, Math.max(8, ev.clientX - r.left + 14));
    const y = Math.max(8, ev.clientY - r.top - 12);
    tip.style.transform = `translate(${x}px, ${y}px)`;
    tip.style.opacity = '1';
  }

  renderLegend() {
    const s = this.state;
    const T = this.T;
    this.legend.innerHTML =
      `<span><i style="background:${hex(COLORS.fable)}"></i>${T.legendFable}</span>` +
      `<span><i style="background:${hex(COLORS.astra)}"></i>${T.legendAstra}</span>` +
      `<span><i style="background:#8b98b8"></i>${T.legendKeep}</span>` +
      `<span class="wsp-legend-note">${tpl(T.legendNote, { metric: T['metric' + cap(s.metric) + 'Tip'] })}</span>`;
  }

  renderPanel() {
    const s = this.state;
    const M = this.M;
    const T = this.T;
    const N = this.N;
    const rows = [
      ['train', T.rowTrain],
      ['paraphrase', T.rowParaphrase],
      ['test_unseen', T.rowUnseen],
      ['keep', T.rowKeep],
    ];
    const show = s.view === 'both' ? EDITORS : [s.view];
    let html = `<h4>${M.label}</h4><p class="wsp-panel-sub">${tpl(T.panelSub, { layers: M.n_layers, n: N.int(M.mlp_dim), total: N.big(M.total_params) })}</p>`;
    for (const k of show) {
      const E = M.editors[k];
      const dn = E.delta_norm;
      html += `<section class="wsp-card wsp-card-${k}"><h5>${E.label}</h5>` +
        `<dl><div><dt>${T.dtWhere}</dt><dd>${tpl(T.ddWhere, { layer: E.layer, pos: E.layer === M.n_layers - 1 ? T.posLast : tpl(T.posMid, { n: M.n_layers - 1 - E.layer }) })}</dd></div>` +
        `<div><dt>${T.dtRewired}</dt><dd>${N.int(E.rewired.length)} / ${N.int(M.mlp_dim)}</dd></div>` +
        `<div><dt>${T.dtChanged}</dt><dd>${tpl(T.ddChanged, { n: N.big(E.values_changed), p: (E.frac * 100).toFixed(2) })}</dd></div>` +
        `<div><dt>${T.dtGate}</dt><dd>${tpl(T.ddGate, { x: (dn.gate_proj.d / dn.gate_proj.w).toFixed(1) })}</dd></div></dl>` +
        `<table><thead><tr><th></th><th>${T.thBefore}</th><th>${T.thAfter}</th></tr></thead><tbody>` +
        rows.map(([key, name]) => {
          const sc = E.scores[key];
          return `<tr><td>${name}</td><td>${N.pct(sc.base, 0)}</td><td><b>${N.pct(sc.edit, 0)}</b></td></tr>`;
        }).join('') +
        `</tbody></table></section>`;
    }
    html += `<label class="wsp-select">${T.selectLabel}<select>` +
      SETS.map((k) => `<option value="${k}" ${k === s.set ? 'selected' : ''}>${tpl(T.selectOption, { set: T['set' + cap(k)] })}</option>`).join('') + `</select></label>`;
    this.panel.innerHTML = html;
    this.panel.querySelector('select').addEventListener('change', (e) => this.set({ set: e.target.value }));
  }

  renderExamples() {
    const s = this.state;
    const E = this.M.editors.fable;
    const bar = this.exBar;
    if (s.metric !== 'fire' || !E.examples) {
      bar.hidden = true;
      return;
    }
    bar.hidden = false;
    const T = this.T;
    const lang = this.lang;
    const ex = E.examples[s.example] ?? E.examples[0];
    // For readers of other languages: keep the Korean original (it is what the model saw) and add a translation.
    const tr = lang === 'ko' ? null : ex.tr?.[lang];
    const names = this.data.names?.[lang] || {};
    const gloss = (v, t) => (t && t !== v ? `${esc(v)} <span class="wsp-ex-tr">(${esc(t)})</span>` : esc(v));
    bar.innerHTML =
      `<div class="wsp-ex-buttons">` +
      E.examples.map((e, i) => `<button type="button" data-i="${i}" aria-pressed="${i === s.example}">${T['kind' + cap(e.kind)] ?? e.kind} ${i + 1}</button>`).join('') +
      `<span class="wsp-ex-toggle"><button type="button" data-after="0" aria-pressed="${!s.after}">${T.before}</button><button type="button" data-after="1" aria-pressed="${s.after}">${T.after}</button></span></div>` +
      `<p class="wsp-ex-q"><b>${T.exQuestion}</b> ${esc(ex.question)}</p>` +
      (tr?.q ? `<p class="wsp-ex-q wsp-ex-tr"><b>${this.C.translated}</b> ${esc(tr.q)}</p>` : '') +
      `<p class="wsp-ex-a"><span><b>${T.exAnswer}</b> ${ex.answer ? gloss(ex.answer, tr?.a) : '—'}</span><span><b>${T.exBase}</b> ${gloss(ex.base_out, tr?.base)}</span><span><b>${T.exEdit}</b> ${gloss(ex.edit_out, tr?.edit)}</span></p>` +
      (s.after
        ? ex.fired.length
          ? `<p class="wsp-ex-f">${T.firedLead} ` +
            ex.fired.map((f) => tpl(T.firedItem, { n: f.neuron, act: f.act, answer: names[f.answer] ? `${f.answer} (${names[f.answer]})` : f.answer, token: f.token })).join(', ') + `</p>`
          : `<p class="wsp-ex-f">${T.firedNone}</p>`
        : `<p class="wsp-ex-f">${T.firedBefore}</p>`);
    bar.querySelectorAll('[data-i]').forEach((b) => b.addEventListener('click', () => this.set({ example: +b.dataset.i })));
    bar.querySelectorAll('[data-after]').forEach((b) => b.addEventListener('click', () => this.set({ after: b.dataset.after === '1' })));
  }
}

export function mountQwen(root: HTMLElement) {
  const src = root.dataset.src;
  const fail = (msg: string) => {
    root.innerHTML = `<p class="wsp-fallback">${msg}</p>`;
  };
  const C = getStrings(root.dataset.lang).common;
  if (!webglAvailable()) return fail(C.noWebgl);
  whenVisible(root, () => {
    fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then((data) => new QwenView(root, data))
      .catch((e) => fail(tpl(C.loadFail, { msg: e.message })));
  });
}
