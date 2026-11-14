// @ts-nocheck
// Shared three.js stage for the weight-space-programming article views:
// on-demand rendering, orbit controls that do not hijack page scroll, CSS labels, hover picking.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';

export { THREE, CSS2DObject };

export const COLORS = {
  fable: 0x4f9dff,
  astra: 0xff8f3f,
  slab: 0x2a3550,
  slabEdge: 0x44527a,
  ice: 0x7fd4ff,
  exact: 0x8f9bb8,
  frozen: 0x4a5163,
  ink: 0xe8eefc,
};

export function hex(c: number) {
  return '#' + c.toString(16).padStart(6, '0');
}

export function label(text: string, cls = '') {
  const el = document.createElement('div');
  el.className = 'wsp-label ' + cls;
  el.textContent = text;
  const o = new CSS2DObject(el);
  return o;
}

export function createStage(host: HTMLElement, opts: { fov?: number; autoRotate?: boolean } = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(opts.fov ?? 34, 1, 0.1, 500);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  renderer.domElement.className = 'wsp-canvas';

  const labels = new CSS2DRenderer();
  labels.domElement.className = 'wsp-labels';
  host.appendChild(labels.domElement);

  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x0b1020, 0.95));
  const key = new THREE.DirectionalLight(0xffffff, 1.5);
  key.position.set(18, 30, 22);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x88aaff, 0.55);
  rim.position.set(-20, 12, -18);
  scene.add(rim);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.7;
  controls.zoomSpeed = 0.8;
  controls.enablePan = false;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.autoRotate = opts.autoRotate ?? true;
  controls.autoRotateSpeed = 0.45;
  // Vertical touch drags scroll the page; horizontal drags rotate the model.
  renderer.domElement.style.touchAction = 'pan-y';

  // Page scroll must keep working over the canvas: zoom only with Ctrl/⌘ + wheel (or trackpad pinch).
  host.addEventListener(
    'wheel',
    (e) => {
      if (!e.ctrlKey && !e.metaKey) e.stopPropagation();
    },
    { capture: true },
  );

  let dirty = true;
  let visible = true;
  let running = true;
  const frameCbs: Array<(t: number) => void> = [];
  const requestRender = () => {
    dirty = true;
  };
  controls.addEventListener('change', requestRender);
  let touched = false;
  let resizeCb: (() => void) | null = null;
  const stopAuto = () => {
    controls.autoRotate = false;
    touched = true;
  };
  renderer.domElement.addEventListener('pointerdown', stopAuto);

  const resize = () => {
    const w = host.clientWidth;
    const h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    labels.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    dirty = true;
    // keep the model framed when the layout changes, until the reader takes over the camera
    if (!touched) resizeCb?.();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  const io = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
    if (visible) dirty = true;
  });
  io.observe(host);

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) controls.autoRotate = false;

  let last = performance.now();
  const loop = (now: number) => {
    if (!running) return;
    requestAnimationFrame(loop);
    if (!visible) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    let animating = false;
    for (const cb of frameCbs) animating = cb(dt) || animating;
    const moved = controls.update();
    if (dirty || moved || animating || controls.autoRotate) {
      renderer.render(scene, camera);
      labels.render(scene, camera);
      dirty = false;
    }
  };
  requestAnimationFrame(loop);

  // ---- hover picking
  const ray = new THREE.Raycaster();
  const ptr = new THREE.Vector2();
  let pickables: THREE.Object3D[] = [];
  let onHover: ((hit: THREE.Intersection | null, ev: PointerEvent) => void) | null = null;
  let downAt: [number, number] | null = null;
  let onClick: ((hit: THREE.Intersection | null, ev: PointerEvent) => void) | null = null;
  const castAt = (ev: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    ptr.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hits = ray.intersectObjects(pickables, false);
    return hits.find((h) => h.object.visible) ?? null;
  };
  renderer.domElement.addEventListener('pointermove', (ev) => {
    if (!onHover || ev.buttons) return;
    onHover(castAt(ev), ev);
  });
  renderer.domElement.addEventListener('pointerleave', (ev) => onHover?.(null, ev));
  renderer.domElement.addEventListener('pointerdown', (ev) => {
    downAt = [ev.clientX, ev.clientY];
  });
  renderer.domElement.addEventListener('pointerup', (ev) => {
    if (!downAt || !onClick) return;
    if (Math.hypot(ev.clientX - downAt[0], ev.clientY - downAt[1]) < 5) onClick(castAt(ev), ev);
    downAt = null;
  });

  // ---- smooth camera moves
  let tween: null | { t: number; dur: number; p0: THREE.Vector3; p1: THREE.Vector3; t0: THREE.Vector3; t1: THREE.Vector3 } = null;
  frameCbs.push((dt) => {
    if (!tween) return false;
    tween.t = Math.min(1, tween.t + dt / tween.dur);
    const k = tween.t < 0.5 ? 2 * tween.t * tween.t : 1 - Math.pow(-2 * tween.t + 2, 2) / 2;
    camera.position.lerpVectors(tween.p0, tween.p1, k);
    controls.target.lerpVectors(tween.t0, tween.t1, k);
    if (tween.t >= 1) tween = null;
    return true;
  });
  const flyTo = (pos: [number, number, number], target: [number, number, number], dur = 0.9, instant = false) => {
    const p1 = new THREE.Vector3(...pos);
    const t1 = new THREE.Vector3(...target);
    if (instant || reduceMotion) {
      camera.position.copy(p1);
      controls.target.copy(t1);
      controls.update();
      dirty = true;
      return;
    }
    tween = { t: 0, dur, p0: camera.position.clone(), p1, t0: controls.target.clone(), t1 };
  };

  return {
    THREE,
    scene,
    camera,
    renderer,
    controls,
    requestRender,
    flyTo,
    onFrame: (cb: (dt: number) => boolean | void) => frameCbs.push(cb as any),
    onResize: (cb: () => void) => {
      resizeCb = cb;
    },
    setPickables: (list: THREE.Object3D[]) => {
      pickables = list;
    },
    setHover: (cb: typeof onHover) => {
      onHover = cb;
    },
    setClick: (cb: typeof onClick) => {
      onClick = cb;
    },
    zoom: (f: number) => {
      const d = camera.position.clone().sub(controls.target).multiplyScalar(f);
      camera.position.copy(controls.target.clone().add(d));
      dirty = true;
    },
    dispose: () => {
      running = false;
      ro.disconnect();
      io.disconnect();
      controls.dispose();
      renderer.dispose();
    },
  };
}

/** Run `init` the first time `el` comes near the viewport. */
export function whenVisible(el: Element, init: () => void) {
  if (!('IntersectionObserver' in window)) return init();
  const io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io.disconnect();
        init();
      }
    },
    { rootMargin: '300px' },
  );
  io.observe(el);
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
