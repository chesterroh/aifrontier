// @ts-nocheck
// 3D view of the MiniMax-H3-Image edits: the whole pipeline (text encoder → 50 transformer blocks → VAE → picture)
// laid out as a U, with the tensors each agent edited lighting up step by step.
import { createStage, THREE, label, COLORS, hex, whenVisible, webglAvailable } from './stage';
import { getStrings, tpl, pick, numberFormat } from './i18n';

const PITCH = 0.72;
const BW = 0.5; // block box width (x)
const BD = 2.6; // block box depth (z)
const ZR = 3.3; // half distance between the two rows
const PER_ROW = 25;
const X0 = 0;
// heights follow parameter counts: qkv 115.6M, out 38.5M, fc1 154.1M, fc2 77.1M
const PARTS = [
  ['qkv', 1.5, 'attn.qkv_proj', [21504, 5376]],
  ['out', 0.5, 'attn.out_proj', [5376, 7168]],
  ['fc1', 2.0, 'mlp.fc1', [28672, 5376]],
  ['fc2', 1.0, 'mlp.fc2', [5376, 14336]],
];
const PART_GAP = 0.07;
const STACK_H = PARTS.reduce((a, p) => a + p[1] + PART_GAP, 0);

const cap = (k) => k[0].toUpperCase() + k.slice(1);

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
  for (const [key, text] of items) {
    const b = el('button', '', text);
    b.type = 'button';
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
  return { set };
}

class H3View {
  constructor(root, data, base) {
    this.root = root;
    this.data = data;
    this.base = base;
    this.lang = root.dataset.lang || 'ko';
    const S = getStrings(this.lang);
    this.S = S;
    this.T = S.h3;
    this.C = S.common;
    this.N = numberFormat(this.lang);
    this.state = { agent: 'astra', step: data.agents.astra.final, prompt: Object.keys(data.prompts)[0], playing: false };
    this.parts = {}; // id -> { mesh, beam, storage, name, shape, level, target }
    this.textures = {};
    this.buildDom();
    this.stage = createStage(this.stageEl, { fov: 30, autoRotate: false });
    this.buildScene();
    this.stage.setHover((hit, ev) => this.hover(hit, ev));
    this.stage.onFrame((dt) => this.tick(dt));
    this.stage.onResize(() => this.frame(true));
    this.frame(true);
    this.update();
    root.dataset.ready = 'true';
  }

  // ------------------------------------------------------------------ DOM
  buildDom() {
    const r = this.root;
    const d = this.data;
    const T = this.T;
    r.innerHTML = '';
    const bar = el('div', 'wsp-toolbar');
    this.segAgent = segmented(bar, T.segAgent, [['fable', 'Fable 5.2'], ['astra', 'GPT-6 Astra']], this.state.agent, (v) =>
      this.set({ agent: v, step: d.agents[v].final }),
    );
    this.segPrompt = segmented(bar, T.segPrompt, Object.keys(d.prompts).map((k) => [k, this.S.subjects[k] ?? k]), this.state.prompt, (v) => this.set({ prompt: v }));
    r.appendChild(bar);

    const body = el('div', 'wsp-body');
    this.stageEl = el('div', 'wsp-stage');
    this.stageEl.setAttribute('role', 'img');
    this.stageEl.setAttribute('aria-label', T.aria);
    this.tip = el('div', 'wsp-tip');
    this.stageEl.appendChild(this.tip);
    this.stageEl.appendChild(el('div', 'wsp-hint', T.hint));
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

    const steps = el('div', 'wsp-steps');
    const row = el('div', 'wsp-step-row');
    this.playBtn = el('button', 'wsp-play', T.play);
    this.playBtn.type = 'button';
    this.playBtn.addEventListener('click', () => this.togglePlay());
    row.appendChild(this.playBtn);
    this.slider = el('input');
    this.slider.type = 'range';
    this.slider.min = '0';
    this.slider.step = '1';
    this.slider.setAttribute('aria-label', T.sliderAria);
    this.slider.addEventListener('input', () => this.set({ step: +this.slider.value, playing: false }));
    row.appendChild(this.slider);
    this.stepNum = el('span', 'wsp-step-num');
    row.appendChild(this.stepNum);
    steps.appendChild(row);
    this.note = el('p', 'wsp-note');
    steps.appendChild(this.note);
    r.appendChild(steps);
    this.detailEl = el('div', 'wsp-detail');
    this.detailEl.hidden = true;
    r.appendChild(this.detailEl);
  }

  // ------------------------------------------------------------------ scene
  addPart(id, mesh, info) {
    mesh.userData = { id };
    this.group.add(mesh);
    const beamGeo = new THREE.CylinderGeometry(0.05, 0.05, 1, 6);
    beamGeo.translate(0, 0.5, 0);
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }));
    beam.visible = false;
    beam.position.copy(mesh.position);
    beam.position.y += info.top ?? 0;
    this.group.add(beam);
    this.parts[id] = { mesh, beam, level: 0, target: 0, baseColor: mesh.material.color.clone(), baseOpacity: mesh.material.opacity, ...info };
  }

  material(storage) {
    if (storage === 'nvfp4') return new THREE.MeshStandardMaterial({ color: 0x5fb6e6, emissive: 0x0b2a44, transparent: true, opacity: 0.3, roughness: 0.25, metalness: 0.1, depthWrite: false });
    if (storage === 'frozen') return new THREE.MeshStandardMaterial({ color: COLORS.frozen, transparent: true, opacity: 0.55, roughness: 0.9 });
    return new THREE.MeshStandardMaterial({ color: 0x9aa7c7, transparent: true, opacity: 0.9, roughness: 0.55, metalness: 0.1 });
  }

  blockPos(i) {
    const back = i < PER_ROW;
    const k = back ? i : 2 * PER_ROW - 1 - i;
    return [X0 + k * PITCH, back ? -ZR : ZR];
  }

  buildScene() {
    const T = this.T;
    const g = (this.group = new THREE.Group());
    this.stage.scene.add(g);
    const pick = [];
    const box = (w, h, d, storage) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), this.material(storage));

    // floor path showing the direction of flow
    const xR = X0 + (PER_ROW - 1) * PITCH;
    const pts = [];
    const xStart = X0 - 9.2;
    pts.push(new THREE.Vector3(xStart, 0, -ZR), new THREE.Vector3(xR + 0.6, 0, -ZR));
    for (let a = 0; a <= 16; a++) {
      const t = -Math.PI / 2 + (a / 16) * Math.PI;
      pts.push(new THREE.Vector3(xR + 0.6 + Math.cos(t) * ZR, 0, Math.sin(t) * ZR));
    }
    pts.push(new THREE.Vector3(xStart - 1.2, 0, ZR));
    const path = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x33415f }));
    path.position.y = -0.05;
    g.add(path);

    // text encoder (frozen)
    const te = box(3.2, 4.4, 3.2, 'frozen');
    te.position.set(X0 - 7.4, 2.2, -ZR);
    this.addPart('te', te, { storage: 'frozen', name: T.textEncoderName, shape: null, editable: false, top: 2.2 });
    const teL = label(T.textEncoderTag, 'wsp-label-tag');
    teL.position.set(X0 - 7.4, 5.1, -ZR);
    g.add(teL);
    this.promptLabel = label('', 'wsp-label wsp-label-hot');
    this.promptLabel.position.set(X0 - 7.4, 6.0, -ZR);
    g.add(this.promptLabel);

    // condition_proj: the door where text states enter the transformer
    const cond = box(0.4, 3.2, 3.0, 'bf16');
    cond.position.set(X0 - 4.6, 1.6, -ZR);
    this.addPart('cond', cond, { storage: 'bf16', name: 'condition_proj', shape: [5376, 5120], top: 1.6 });
    const cL = label('condition_proj', 'wsp-label-tag');
    cL.position.set(X0 - 4.9, 4.4, -ZR);
    g.add(cL);

    // token refiner: two blocks, not quantized
    for (let r = 0; r < 2; r++) {
      let y = 0;
      for (const [key, h, , shape] of PARTS) {
        const m = box(BW, h * 0.55, BD, 'bf16');
        m.position.set(X0 - 3.2 + r * 0.8, y + (h * 0.55) / 2, -ZR);
        this.addPart(`r${r}.${key}`, m, { storage: 'bf16', name: `token_refiner.blocks.${r}.${PARTS.find((p) => p[0] === key)[2]}`, shape, top: (h * 0.55) / 2 });
        y += h * 0.55 + PART_GAP;
      }
    }
    const rL = label('token_refiner ×2', 'wsp-label-tag');
    rL.position.set(X0 - 2.6, 3.3, -ZR);
    g.add(rL);

    // 50 transformer blocks
    for (let i = 0; i < 50; i++) {
      const [x, z] = this.blockPos(i);
      let y = 0;
      for (const [key, h, name, shape] of PARTS) {
        const m = box(BW, h, BD, 'nvfp4');
        m.position.set(x, y + h / 2, z);
        this.addPart(`b${i}.${key}`, m, { storage: 'nvfp4', name: `blocks.${i}.${name}`, shape, top: h / 2 });
        y += h + PART_GAP;
      }
      const lid = box(BW, 0.14, BD, 'fp16');
      lid.position.set(x, y + 0.07, z);
      this.addPart(`b${i}.adaln`, lid, { storage: 'fp16', name: `blocks.${i}.adaln_proj`, shape: [96768, 8], top: 0.07 });
      if (i % 10 === 0 || i === 49 || i === 24 || i === 25) {
        const lb = label(tpl(T.block, { i }), 'wsp-label-dim');
        lb.position.set(x, -0.55, z + (z < 0 ? -BD / 2 - 0.3 : BD / 2 + 0.3));
        g.add(lb);
      }
    }
    const bL = label(T.blocksTag, 'wsp-label-tag');
    bL.position.set(X0 + 12 * PITCH, STACK_H + 1.3, -ZR);
    g.add(bL);

    // final layer + VAE decoder + output projection
    const fin = box(0.6, 2.2, 2.4, 'bf16');
    fin.position.set(X0 - 1.3, 1.1, ZR);
    this.addPart('final', fin, { storage: 'bf16', name: 'final_layer', shape: [576, 5376], editable: true, top: 1.1 });
    for (let k = 0; k < 24; k++) {
      const m = box(0.13, 2.2, 2.2, 'fp16');
      m.position.set(X0 - 2.6 - k * 0.2, 1.1, ZR);
      this.addPart(`vae.b${k}`, m, { storage: 'fp16', name: `VAE decoder.transformer_blocks.${k}`, shape: null, top: 1.1 });
    }
    const vout = box(0.3, 2.8, 2.8, 'fp16');
    vout.position.set(X0 - 7.9, 1.4, ZR);
    this.addPart('vae.out', vout, { storage: 'fp16', name: 'VAE decoder.proj_out', shape: [768, 1024], top: 1.4 });
    const vL = label(T.vaeTag, 'wsp-label-tag');
    vL.position.set(X0 - 5, 3.0, ZR);
    g.add(vL);

    // the picture that comes out
    const frame = new THREE.Mesh(new THREE.BoxGeometry(4.7, 4.7, 0.12), new THREE.MeshStandardMaterial({ color: 0x1a2236, roughness: 0.8 }));
    frame.position.set(X0 - 11.4, 2.5, ZR);
    g.add(frame);
    this.picture = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    this.picture.position.set(X0 - 11.4, 2.5, ZR + 0.07);
    g.add(this.picture);
    const pL = label(T.pictureTag, 'wsp-label-tag');
    pL.position.set(X0 - 11.4, 5.3, ZR);
    g.add(pL);

    for (const id in this.parts) pick.push(this.parts[id].mesh);
    this.stage.setPickables(pick);
    this.cx = (xStart - 3 + xR + ZR) / 2;
    this.spanX = xR + ZR - (xStart - 4.5);
  }

  frame(instant = false) {
    const cam = this.stage.camera;
    const aspect = Math.max(0.4, this.stageEl.clientWidth / Math.max(1, this.stageEl.clientHeight));
    const vHalf = THREE.MathUtils.degToRad(cam.fov / 2);
    const hHalf = Math.atan(Math.tan(vHalf) * aspect);
    const dist = Math.max((this.spanX * 0.5 + 3.4) / Math.tan(hHalf), 8.5 / Math.tan(vHalf));
    const dir = new THREE.Vector3(0.14, 0.5, 0.86).normalize();
    this.stage.flyTo([this.cx - 1.6 + dir.x * dist, 1.9 + dir.y * dist, dir.z * dist], [this.cx - 1.6, 1.9, 0], 0.9, instant);
  }

  // ------------------------------------------------------------------ state
  set(patch) {
    const prevAgent = this.state.agent;
    Object.assign(this.state, patch);
    if (patch.playing === false) this.stopPlay();
    if (this.state.agent !== prevAgent) this.stopPlay();
    this.update();
  }

  stopPlay() {
    this.state.playing = false;
    clearInterval(this.timer);
    this.playBtn.textContent = this.T.play;
  }

  togglePlay() {
    if (this.state.playing) return this.stopPlay();
    const A = this.data.agents[this.state.agent];
    this.state.playing = true;
    this.playBtn.textContent = this.T.pause;
    if (this.state.step >= A.steps.length - 1) this.state.step = 0;
    this.update();
    this.timer = setInterval(() => {
      if (this.state.step >= A.steps.length - 1) return this.stopPlay();
      this.state.step += 1;
      this.update();
    }, 1500);
  }

  update() {
    const s = this.state;
    const d = this.data;
    const A = d.agents[s.agent];
    const st = A.steps[Math.min(s.step, A.steps.length - 1)];
    this.segAgent.set(s.agent);
    this.segPrompt.set(s.prompt);
    this.root.style.setProperty('--wsp-accent', hex(COLORS[s.agent]));
    this.slider.max = String(A.steps.length - 1);
    this.slider.value = String(st.step);
    const T = this.T;
    const subject = this.S.subjects[s.prompt] ?? s.prompt;
    this.stepNum.textContent = tpl(T.stepNum, { i: st.step, n: A.steps.length - 1 }) + (st.step === A.final ? T.stepFinal : '');
    this.note.innerHTML =
      `<b>${tpl(T.memoOf, { editor: A.label })}</b>` +
      (st.step === 0 ? T.memoStep0 : escapeHtml(pick(st.note, this.lang) || T.memoNone) + (T.memoTranslated ? ` <span class="wsp-ex-tr">${T.memoTranslated}</span>` : ''));
    this.promptLabel.element.textContent = tpl(T.promptLabel, { subject });

    // light up the parts edited at this step
    const color = new THREE.Color(COLORS[s.agent]);
    for (const id in this.parts) {
      const p = this.parts[id];
      const e = st.parts[id];
      p.edit = e || null;
      p.target = e ? Math.min(1, 0.35 + Math.sqrt(Math.max(e.rel, 0.0005)) * 0.75) : 0;
      p.beamH = e ? 0.8 + Math.sqrt(Math.max(e.rel, 0.0005)) * 3.4 : 0;
      p.color = color;
    }
    this.animating = true;

    // picture
    const url = this.base + st.img[s.prompt];
    if (!this.textures[url]) {
      const t = new THREE.TextureLoader().load(url, () => this.stage.requestRender());
      t.colorSpace = THREE.SRGBColorSpace;
      this.textures[url] = t;
    }
    this.picture.material.map = this.textures[url];
    this.picture.material.needsUpdate = true;

    this.renderPanel(A, st);
    this.renderLegend();
    this.stage.requestRender();
  }

  tick() {
    if (!this.animating) return false;
    let moving = false;
    const white = new THREE.Color(0xffffff);
    for (const id in this.parts) {
      const p = this.parts[id];
      const d = p.target - p.level;
      if (Math.abs(d) > 0.004) {
        p.level += d * 0.18;
        moving = true;
      } else p.level = p.target;
      const m = p.mesh.material;
      const k = p.level;
      if (k > 0.002 && p.color) {
        m.color.copy(p.baseColor).lerp(p.color, Math.min(1, k * 1.6));
        m.emissive.copy(p.color).multiplyScalar(k * 0.9);
        m.opacity = p.baseOpacity + (1 - p.baseOpacity) * Math.min(1, k * 1.8);
        m.depthWrite = true;
        p.beam.visible = true;
        p.beam.material.color.copy(p.color).lerp(white, 0.35);
        p.beam.scale.y = Math.max(0.01, (p.beamH || 0.01) * Math.min(1, k * 1.4));
      } else {
        m.color.copy(p.baseColor);
        m.emissive.setHex(p.storage === 'nvfp4' ? 0x0b2a44 : 0x000000);
        m.opacity = p.baseOpacity;
        m.depthWrite = p.storage !== 'nvfp4';
        p.beam.visible = false;
      }
    }
    this.animating = moving;
    return true;
  }

  hover(hit, ev) {
    const tip = this.tip;
    const id = hit?.object?.userData?.id;
    const p = id && this.parts[id];
    if (!p) {
      tip.style.opacity = '0';
      return;
    }
    const e = p.edit;
    const T = this.T;
    const N = this.N;
    const shape = p.shape ? tpl(T.tipShape, { rows: N.int(p.shape[0]), cols: N.int(p.shape[1]), n: N.big(p.shape[0] * p.shape[1]) }) : '';
    let html = `<b>${p.name}</b>` + (shape ? `<span>${shape}</span>` : '') + `<span>${tpl(T.tipStorage, { storage: T['storage' + cap(p.storage)] })}</span>`;
    if (e) {
      const kept = p.storage === 'nvfp4' ? T.tipKept : '';
      html += `<span style="color:#fff">${T.tipEdited}${kept}</span>` +
        (p.storage === 'nvfp4' ? '' : `<span>${tpl(T.tipRel, { p: (e.rel * 100).toFixed(e.rel < 0.1 ? 1 : 0) })}</span>`) +
        `<span>${tpl(T.tipChanged, { n: N.big(e.changed) })}${e.rank ? tpl(T.tipRank, { rank: e.rank }) : ''}</span>`;
    } else if (p.storage !== 'frozen') html += `<span>${T.tipSame}</span>`;
    tip.innerHTML = html;
    const r = this.stageEl.getBoundingClientRect();
    const x = Math.min(r.width - 250, Math.max(8, ev.clientX - r.left + 14));
    const y = Math.max(8, ev.clientY - r.top - 12);
    tip.style.transform = `translate(${x}px, ${y}px)`;
    tip.style.opacity = '1';
  }

  renderLegend() {
    const s = this.state;
    this.legend.innerHTML =
      `<span><i style="background:${hex(COLORS[s.agent])}"></i>${this.T.legendEdited}</span>` +
      `<span><i style="background:#5fb6e6;opacity:.55"></i>${this.T.legendQuant}</span>` +
      `<span><i style="background:#9aa7c7"></i>${this.T.legendExact}</span>` +
      `<span><i style="background:#4a5163"></i>${this.T.legendFrozen}</span>`;
  }

  renderPanel(A, st) {
    const d = this.data;
    const s = this.state;
    const T = this.T;
    const N = this.N;
    const c = d.controls;
    const names = Object.values(st.parts).flatMap((p) => p.names);
    const groups = {};
    for (const n of names) {
      const k = n.replace(/blocks\.\d+\./, 'blocks.N.');
      groups[k] = (groups[k] || 0) + 1;
    }
    const touched = Object.entries(groups).map(([k, n]) => (n > 1 ? `${k} ×${n}` : k));
    const quantTouched = Object.keys(st.parts).some((id) => this.parts[id]?.storage === 'nvfp4');
    const img = this.base + st.img[s.prompt];
    this.panel.innerHTML =
      `<figure class="wsp-shot"><img src="${img}" alt="${tpl(T.shotAlt, { editor: A.label, i: st.step, subject: this.S.subjects[s.prompt] ?? s.prompt })}" loading="lazy" />` +
      `<figcaption>${st.step === 0 ? T.capBefore : tpl(T.capStep, { i: st.step })}${T.capPrompt}</figcaption></figure>` +
      `<div><p class="wsp-panel-sub">${T.refsTitle}</p><div class="wsp-refs">` +
      d.refs.map((r, i) => {
        const alt = tpl(T.refAlt, { title: this.S.refs[i] ?? '' });
        return `<img src="${this.base + r.file}" alt="${alt}" title="${alt}" loading="lazy" />`;
      }).join('') +
      `</div></div>` +
      this.chart(A, st, c) +
      `<dl class="wsp-kv"><dt>${T.kvChanged}</dt><dd>${st.values_changed ? tpl(T.kvChangedVal, { n: N.big(st.values_changed), p: (st.fraction * 100).toFixed(2) }) : T.kvNone}</dd>` +
      `<dt>${T.kvQuant}</dt><dd>${quantTouched ? T.kvQuantYes : T.kvQuantNo}</dd></dl>` +
      (touched.length ? `<p class="wsp-panel-sub">${tpl(T.touched, { list: touched.join(', ') })}</p>` : '');
    const isFinal = st.step === A.final;
    this.detailEl.hidden = !isFinal;
    if (isFinal && this.detailEl.dataset.agent !== s.agent) {
      this.detailEl.innerHTML = this.detail(A);
      this.detailEl.dataset.agent = s.agent;
    }
  }

  /** Inside the final edit: where within each tensor the change sits. */
  heatImg(rows, cap) {
    const h = rows.length, w = rows[0].length;
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const ctx = cv.getContext('2d');
    const im = ctx.createImageData(w, h);
    const c = new THREE.Color(COLORS[this.state.agent]);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const t = Math.min(1, rows[y][x] / cap);
        const k = Math.sqrt(t);
        const i = (y * w + x) * 4;
        im.data[i] = 12 + (c.r * 255 - 12) * k + (255 - c.r * 255) * Math.max(0, t - 0.7) * 2;
        im.data[i + 1] = 18 + (c.g * 255 - 18) * k + (255 - c.g * 255) * Math.max(0, t - 0.7) * 2;
        im.data[i + 2] = 34 + (c.b * 255 - 34) * k + (255 - c.b * 255) * Math.max(0, t - 0.7) * 2;
        im.data[i + 3] = 255;
      }
    ctx.putImageData(im, 0, 0);
    return cv.toDataURL();
  }

  detail(A) {
    const D = A.detail || {};
    const maxOf = (rows) => Math.max(1e-9, ...rows.flat());
    const T = this.T;
    let html = `<p class="wsp-panel-sub"><b>${T.detailTitle}</b> · ${T.detailSub}</p><div class="wsp-detail-grid">`;
    if (D.cond) {
      html += `<figure><img class="wsp-heat" src="${this.heatImg(D.cond.heat, maxOf(D.cond.heat))}" alt="${T.heatCondAlt}" />` +
        `<figcaption>${tpl(T.heatCondCap, { rank: D.cond.rank })}</figcaption></figure>`;
    }
    if (D['r1.fc2']) {
      html += `<figure><img class="wsp-heat" src="${this.heatImg(D['r1.fc2'].heat, maxOf(D['r1.fc2'].heat))}" alt="${T.heatRefAlt}" />` +
        `<figcaption>${tpl(T.heatRefCap, { rank: D['r1.fc2'].rank, p: (D['r1.fc2'].rel * 100).toFixed(0) })}</figcaption></figure>`;
    }
    if (D.adaln) {
      const rows = D.adaln.chunks;
      const t = rows[0].map((_, j) => rows.map((r) => r[j])); // 18 rows (chunks) x 50 cols (blocks)
      html += `<figure><img class="wsp-heat wsp-heat-wide" src="${this.heatImg(t, maxOf(t) * 0.8)}" alt="${T.heatAdaAlt}" />` +
        `<figcaption>${T.heatAdaCap}</figcaption></figure>`;
    }
    if (D['vae.bias']) {
      const [r, g, b] = D['vae.bias'].rgb;
      const bar = (v, col, name) =>
        `<div class="wsp-rgb"><span>${name}</span><i><b style="width:${Math.min(100, Math.abs(v) * 500)}%;background:${col}"></b></i><em>${v >= 0 ? '+' : ''}${v.toFixed(3)}</em></div>`;
      html += `<figure>${bar(r, '#ff6b5e', 'R')}${bar(g, '#5edb8a', 'G')}${bar(b, '#6ba8ff', 'B')}` +
        `<figcaption>${T.vaeCap}</figcaption></figure>`;
    }
    return html + `</div>`;
  }


  chart(A, st, c) {
    const W = 268, H = 132, L = 4, R = 8, T = 12, B = 18;
    const scores = A.steps.map((s) => s.score).filter((v) => v != null);
    const lo = Math.min(0.66, ...scores) - 0.015, hi = 0.86;
    const x = (i) => L + (i / Math.max(1, A.steps.length - 1)) * (W - L - R);
    const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const col = hex(COLORS[this.state.agent]);
    const pts = A.steps.filter((s) => s.score != null).map((s) => `${x(s.step).toFixed(1)},${y(s.score).toFixed(1)}`).join(' ');
    const line = (v, name, dash) =>
      `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="#4a587a" stroke-width="1" stroke-dasharray="${dash}"/><text x="${L + 2}" y="${y(v) - 2}">${name} ${v.toFixed(2)}</text>`;
    const fin = A.steps[A.final];
    const X = this.T;
    return `<div><p class="wsp-panel-sub">${X.chartTitle}</p>` +
      `<svg class="wsp-chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${tpl(X.chartAria, { v: st.score?.toFixed(3) ?? '-' })}">` +
      line(c.refs, X.lineRefs, '0') + line(c.ctl_desc, X.lineDesc, '3 3') + line(c.base, X.lineBase, '1 3') +
      `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.8"/>` +
      (fin?.score != null ? `<circle cx="${x(fin.step)}" cy="${y(fin.score)}" r="4.5" fill="none" stroke="${col}" stroke-width="1.5"/>` : '') +
      (st.score != null ? `<circle cx="${x(st.step)}" cy="${y(st.score)}" r="3.2" fill="#fff"/><text x="${Math.min(W - 40, x(st.step) + 6)}" y="${y(st.score) + 12}" style="fill:#fff">${st.score.toFixed(3)}</text>` : '') +
      `<text x="${L}" y="${H - 4}">${X.axisStart}</text><text x="${W - R}" y="${H - 4}" text-anchor="end">${tpl(X.axisEnd, { n: A.steps.length - 1 })}</text>` +
      `</svg></div>`;
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
}

export function mountH3(root: HTMLElement) {
  const src = root.dataset.src;
  const base = root.dataset.base || '';
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
      .then((data) => new H3View(root, data, base))
      .catch((e) => fail(tpl(C.loadFail, { msg: e.message })));
  });
}
