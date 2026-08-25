import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { SCENES, START_SCENE } from './scenes.js';
import { TOURS, isTourReady } from './config/tours.js';
import { openTourOverlay, preloadTour } from './components/apartmentTour.js';

const canvas = document.getElementById('scene');
const tooltipEl = document.getElementById('tooltip');
const crumbEl = document.getElementById('crumb');
const backBtn = document.getElementById('back-btn');
const hintEl = document.getElementById('hint');
const loaderEl = document.getElementById('loader');
const barFill = document.getElementById('bar-fill');
const loaderLabel = document.getElementById('loader-label');

/* ---------------- Renderer ---------------- */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();

/* A black void behind the model — no sky, no fog. */
scene.background = new THREE.Color(0x000000);

/* The model's materials are PBR, so they still need something to reflect
   or metal and glass render as flat black. RoomEnvironment is a neutral
   studio probe — it lights the surfaces without painting a visible
   backdrop the way the old sky texture did. */
const pmrem = new THREE.PMREMGenerator(renderer);
const roomEnv = new RoomEnvironment();
scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
roomEnv.dispose?.();

/* ---------------- Floor ----------------
   A dark plane for the building to stand on. A finite plane on a black
   background ends on a hard visible rim, so its opacity is painted as a
   radial gradient: solid under the model, fading to nothing well before
   the geometry runs out. Unlit, so it keeps its value regardless of where
   the sun points and never blows out the way the old ground did. */
function makeFadeTexture() {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
  g.addColorStop(0.00, 'rgba(255,255,255,1)');
  g.addColorStop(0.55, 'rgba(255,255,255,1)');
  g.addColorStop(1.00, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 512, 512);
  return new THREE.CanvasTexture(c);
}

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(1, 1),
  new THREE.MeshBasicMaterial({
    color: 0x2a2a2c,
    alphaMap: makeFadeTexture(),
    transparent: true,
    depthWrite: false,          // never occludes the model it sits under
  }),
);
floor.rotation.x = -Math.PI / 2;
floor.renderOrder = -1;
scene.add(floor);

const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 5000);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.minPolarAngle = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.02;   // never orbit under the ground

/* ---------------- Lights ----------------
   The sun is the only shadow caster; the fill just lifts the shadow side
   so the facade does not read as one flat slab. */

/* Key: warm late-afternoon sun, high and off to one side. It carries the
   image on its own — everything else is kept low so the sunlit faces and
   the shadowed faces stay clearly different. */
const sun = new THREE.DirectionalLight(0xffe9c4, 2.2);
sun.position.set(45, 70, 35);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
sun.shadow.normalBias = 0.02;
scene.add(sun);
scene.add(sun.target);

/* Fill: cool skylight from the opposite side. Just enough to keep the
   shadow side from going solid black — not enough to compete with the sun. */
const fill = new THREE.DirectionalLight(0x9dc0e8, 0.35);
fill.position.set(-55, 38, -28);
scene.add(fill);

/* Sky/ground bounce. This lights every surface from every direction, so
   any real strength here flattens the model — keep it as a floor only. */
scene.add(new THREE.HemisphereLight(0xcfe2ff, 0x9c9384, 0.25));

/* ---------------- Loading ---------------- */
const draco = new DRACOLoader();
draco.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(draco);

/* A few site materials ship as pure white regardless of their name
   (AsphaltMat), which reads as blank paper next to the building.
   Give them the tone their name implies. */
const SITE_TINT = { AsphaltMat: 0x3a3d42 };

const cache = new Map();

function loadModel(def) {
  if (cache.has(def.id)) return Promise.resolve(cache.get(def.id));

  showLoader(def.label);
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      def.file,
      (gltf) => {
        const root = gltf.scene;

        /* Blender exports its own lights, and the glTF punctual-light spec
           uses physical units — a Blender sun lands here with an intensity
           in the thousands, which blows every surface out to pure white.
           The app lights the scene itself, so drop them. */
        const bakedLights = [];
        root.traverse((o) => { if (o.isLight) bakedLights.push(o); });
        for (const l of bakedLights) l.removeFromParent();

        /* The export also carries a 280m ground plate around the site. It
           is the only thing behind the building, so it shows up as a large
           mottled surface filling the frame. Drop it and the model sits on
           black. The pavement it stands on is a separate mesh and stays. */
        const plates = [];
        root.traverse((o) => { if (o.isMesh && o.name === 'Site_Ground') plates.push(o); });
        for (const p of plates) p.removeFromParent();

        root.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
            if (o.material) {
              const ms = Array.isArray(o.material) ? o.material : [o.material];
              for (const m of ms) {
                m.envMapIntensity = 0.35;
                const tint = SITE_TINT[m.name];
                if (tint !== undefined) m.color.setHex(tint);
              }
            }
          }
        });
        cache.set(def.id, root);
        hideLoader();
        resolve(root);
      },
      (ev) => {
        if (ev.total) setProgress(ev.loaded / ev.total);
      },
      (err) => { hideLoader(); reject(err); },
    );
  });
}

/* ---------------- Framing ---------------- */
/**
 * Fit the camera to a model, recentring it on the origin.
 *
 * Large flat ground/site geometry (roads, pavement) can be an order of
 * magnitude wider than the building itself. Framing on the full bounding
 * box would push the camera so far back the building is a speck, so the
 * camera distance is driven by the *subject* bounds — geometry excluding
 * broad flat plates — while the model as a whole still gets centred.
 */
function subjectBox(root) {
  const full = new THREE.Box3().setFromObject(root);
  const fullSize = full.getSize(new THREE.Vector3());
  const subject = new THREE.Box3();

  root.traverse((o) => {
    if (!o.isMesh) return;
    const b = new THREE.Box3().setFromObject(o);
    const s = b.getSize(new THREE.Vector3());
    // Skip ground-like plates: very wide and essentially flat.
    const flat = s.y < fullSize.y * 0.06;
    const wide = Math.max(s.x, s.z) > Math.max(fullSize.x, fullSize.z) * 0.35;
    if (flat && wide) return;
    subject.union(b);
  });

  return subject.isEmpty() ? full : subject;
}

function frame(root) {
  const full = new THREE.Box3().setFromObject(root);
  const center = full.getCenter(new THREE.Vector3());
  const fullSize = full.getSize(new THREE.Vector3());

  // Centre horizontally on the subject, and sit the model on the ground.
  const subj = subjectBox(root);
  const subjCenter = subj.getCenter(new THREE.Vector3());
  const size = subj.getSize(new THREE.Vector3());

  /* Centre the subject on the origin in all three axes. There is no ground
     plane to stand on any more, so anchoring the base to y=0 would just
     leave the building riding high with dead space under it. */
  root.position.x -= subjCenter.x;
  root.position.z -= subjCenter.z;
  root.position.y -= subjCenter.y;

  const radius = Math.max(size.x, size.y, size.z);
  const dist = (radius / 2) / Math.tan((camera.fov * Math.PI) / 360) * 1.6;

  /* Sit the floor at the model's real base. Recentring moved the whole
     model, so this is measured after that, not from the original box. */
  const moved = new THREE.Box3().setFromObject(root);
  floor.position.y = moved.min.y;
  // Wide enough that the alpha fade finishes before the geometry edge.
  floor.scale.setScalar(Math.max(fullSize.x, fullSize.z) * 3.5);

  // Slightly above the midline for a natural three-quarter view, but the
  // camera looks at the centre so the subject lands mid-frame.
  camera.position.set(dist * 0.72, radius * 0.42, dist * 0.72);
  camera.near = radius / 400;
  camera.far = Math.max(radius, Math.max(fullSize.x, fullSize.z)) * 40;
  camera.updateProjectionMatrix();

  controls.target.set(0, 0, 0);
  controls.minDistance = radius * 0.3;
  controls.maxDistance = radius * 5;
  controls.update();

  // The shadow camera has to cover the subject or shadows get clipped.
  // The model straddles the origin now, so this spans both sides of it.
  const s = radius * 1.4;
  sun.position.set(radius * 0.9, radius * 1.5, radius * 0.7);
  sun.shadow.camera.left = -s;
  sun.shadow.camera.right = s;
  sun.shadow.camera.top = s;
  sun.shadow.camera.bottom = -s;
  sun.shadow.camera.near = 0.1;
  sun.shadow.camera.far = radius * 10;
  sun.shadow.camera.updateProjectionMatrix();

  // Fill scales with the model so the rig holds at any size.
  fill.position.set(-radius * 1.1, radius * 0.8, -radius * 0.6);
}

/* ---------------- Hover highlight ---------------- */
/* Lift each material emissive rather than tinting the base colour, so the
   model textures are left alone. Originals are restored on unhover. */
const hoverState = new Map();   // material -> original emissive hex

function setHovered(root, on) {
  root.traverse((o) => {
    if (!o.isMesh || !o.material) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m.emissive) continue;
      if (on) {
        if (!hoverState.has(m)) hoverState.set(m, m.emissive.getHex());
        m.emissive.setHex(0x3a2c0d);
      } else if (hoverState.has(m)) {
        m.emissive.setHex(hoverState.get(m));
        hoverState.delete(m);
      }
    }
  });
}

/* ---------------- Scene switching ---------------- */
let current = null;        // { def, root }
let isHovering = false;
let inTransition = false;

async function goTo(id) {
  if (inTransition) return;
  const def = SCENES[id];
  if (!def) { console.error(`Unknown scene: ${id}`); return; }

  inTransition = true;
  if (current) {
    setHovered(current.root, false);
    scene.remove(current.root);
  }

  try {
    const root = await loadModel(def);
    frame(root);
    scene.add(root);
    current = { def, root };

    crumbEl.textContent = def.label;
    backBtn.classList.toggle('hidden', id === START_SCENE);
    hintEl.textContent = def.onClick
      ? 'Click the building to enter · Drag to orbit · Scroll to zoom'
      : 'Drag to orbit · Scroll to zoom';
    hintEl.classList.remove('fade');
    setTimeout(() => hintEl.classList.add('fade'), 4500);
  } catch (err) {
    console.error(`Failed to load ${def.file}`, err);
    loaderLabel.textContent = `Could not load ${def.label}`;
  } finally {
    inTransition = false;
  }
}

/* ---------------- Picking ---------------- */
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let dragged = false;

canvas.addEventListener('pointerdown', () => {
  dragged = false;
  canvas.classList.add('grabbing');
});
canvas.addEventListener('pointerup', () => canvas.classList.remove('grabbing'));

canvas.addEventListener('pointermove', (e) => {
  if (e.buttons) { dragged = true; return; }   // orbiting, not hovering

  pointer.x = (e.clientX / innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / innerHeight) * 2 + 1;

  if (!current || !current.def.onClick) return;

  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(current.root, true).length > 0;

  if (hit !== isHovering) {
    isHovering = hit;
    setHovered(current.root, hit);
    canvas.classList.toggle('pointing', hit);
    tooltipEl.classList.toggle('show', hit && !!current.def.tooltip);
    if (hit && current.def.tooltip) tooltipEl.textContent = current.def.tooltip;
  }
  if (hit) {
    tooltipEl.style.left = `${e.clientX}px`;
    tooltipEl.style.top = `${e.clientY}px`;
  }
});

canvas.addEventListener('click', () => {
  if (dragged || !current || !current.def.onClick) return;
  raycaster.setFromCamera(pointer, camera);
  if (raycaster.intersectObject(current.root, true).length === 0) return;

  tooltipEl.classList.remove('show');
  canvas.classList.remove('pointing');
  isHovering = false;
  goTo(current.def.onClick);
});

backBtn.addEventListener('click', () => goTo(START_SCENE));

/* ---------------- Navbar links ----------------
   "Ndërtesa" returns to the building; "Kontakt" scrolls nothing (there is
   no page to scroll) so it opens a mail client instead. The tour link is
   wired further down, next to the tour button it shares an overlay with. */
document.querySelector('[data-nav="building"]')?.addEventListener('click', (e) => {
  e.preventDefault();
  goTo(START_SCENE);
});

/* The brand is a link for the usual reasons (middle-click, right-click,
   keyboard), but a plain navigation would reload the whole 3D app, so a
   left-click without modifiers is handled in place instead. */
document.querySelector('.nav-brand')?.addEventListener('click', (e) => {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
  e.preventDefault();
  goTo(START_SCENE);
});
document.querySelector('[data-nav="contact"]')?.addEventListener('click', (e) => {
  e.preventDefault();
  location.href = 'mailto:info@goldenhands.al?subject=Golden%20Hands%204';
});

/* ---------------- Loader UI ---------------- */
function showLoader(label) {
  loaderLabel.textContent = `Loading ${label}`;
  barFill.style.width = '0%';
  loaderEl.classList.remove('done');
}
function setProgress(t) { barFill.style.width = `${Math.round(t * 100)}%`; }
function hideLoader() {
  barFill.style.width = '100%';
  setTimeout(() => loaderEl.classList.add('done'), 220);
}

/* ---------------- Panel controls ----------------
   The arrows drive the same orbit OrbitControls uses, so dragging and the
   buttons stay in sync. Each press eases toward a target offset rather than
   jumping, which reads as a camera move instead of a cut. */
const ORBIT_STEP = Math.PI / 18;   // 10° per press
const ZOOM_STEP = 0.82;

const spherical = new THREE.Spherical();
const orbitGoal = { theta: null, phi: null, radius: null };

function readSpherical() {
  const offset = camera.position.clone().sub(controls.target);
  spherical.setFromVector3(offset);
  return spherical;
}

/* Start from the goal when one is already in flight, so holding a button
   accumulates instead of restarting from wherever the easing got to. */
function orbitBy(dTheta, dPhi) {
  const s = readSpherical();
  const theta = (orbitGoal.theta ?? s.theta) + dTheta;
  const phi = (orbitGoal.phi ?? s.phi) + dPhi;
  orbitGoal.theta = theta;
  // Stay inside the same limits the mouse orbit is clamped to.
  orbitGoal.phi = Math.max(controls.minPolarAngle + 0.01,
                           Math.min(controls.maxPolarAngle - 0.01, phi));
}

function zoomBy(factor) {
  const s = readSpherical();
  const r = (orbitGoal.radius ?? s.radius) * factor;
  orbitGoal.radius = Math.max(controls.minDistance,
                              Math.min(controls.maxDistance, r));
}

function applyOrbitGoal() {
  if (orbitGoal.theta === null && orbitGoal.phi === null && orbitGoal.radius === null) return;
  const s = readSpherical();
  const theta = orbitGoal.theta ?? s.theta;
  const phi = orbitGoal.phi ?? s.phi;
  const radius = orbitGoal.radius ?? s.radius;

  s.theta += (theta - s.theta) * 0.16;
  s.phi += (phi - s.phi) * 0.16;
  s.radius += (radius - s.radius) * 0.16;

  camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));

  // Close enough — drop the goal so the mouse regains full control.
  const done = Math.abs(theta - s.theta) < 1e-3
    && Math.abs(phi - s.phi) < 1e-3
    && Math.abs(radius - s.radius) < radius * 1e-3;
  if (done) { orbitGoal.theta = orbitGoal.phi = orbitGoal.radius = null; }
}

const on = (id, fn) => document.getElementById(id).addEventListener('click', fn);
on('ctl-left',  () => orbitBy(-ORBIT_STEP, 0));
on('ctl-right', () => orbitBy(ORBIT_STEP, 0));
on('ctl-up',    () => orbitBy(0, -ORBIT_STEP));
on('ctl-down',  () => orbitBy(0, ORBIT_STEP));
on('ctl-in',    () => zoomBy(ZOOM_STEP));
on('ctl-out',   () => zoomBy(1 / ZOOM_STEP));
on('ctl-reset', () => {
  orbitGoal.theta = orbitGoal.phi = orbitGoal.radius = null;
  if (current) frame(current.root);
});

/* ---------------- Apartment tour ----------------
   The building GLB has no per-unit meshes, so the tour is opened from the
   panel rather than by clicking an apartment in the model. When the model
   gains named unit meshes, this can move into the raycast in the click
   handler above — openTourOverlay does not care who calls it.

   The button stays disabled until src/config/tours.js has a real URL, so
   an unfilled placeholder shows a note instead of a broken embed. */
const tourBtn = document.getElementById('tour-unit2');
const tourNote = document.getElementById('tour-note');
const unit2 = TOURS.unit2;

if (isTourReady(unit2)) {
  tourBtn.disabled = false;
  tourBtn.addEventListener('click', () => {
    openTourOverlay({ url: unit2.url, title: unit2.label, height: '100%' });
  });

  /* Warm the tour in the background so it is already there on click.

     The Coohom viewer loads in stages — page, then WebGL modules, then the
     model and its textures — and only the first stage is quick. Warming has
     to start early to get through the rest before anyone clicks, so this
     does NOT wait for requestIdleCallback: the render loop means the browser
     is never truly idle, and the callback would sit until its timeout.

     One frame of delay is enough to let the first paint through, and the
     GLB fetch and the tour fetch are different connections, so they overlap
     rather than queue. */
  const warmUp = () => preloadTour({ url: unit2.url, title: unit2.label, height: '100%' });
  requestAnimationFrame(() => setTimeout(warmUp, 0));

  /* Hovering the button is the strongest hint the tour is about to be
     opened. If the warm copy is somehow gone by then, start another. */
  tourBtn.addEventListener('pointerenter', warmUp);

  /* The navbar's tour link opens the same overlay, so there is one way in
     from two places rather than two implementations. */
  const navTour = document.querySelector('[data-nav="tour"]');
  navTour?.addEventListener('pointerenter', warmUp);
  navTour?.addEventListener('click', (e) => {
    e.preventDefault();
    openTourOverlay({ url: unit2.url, title: unit2.label, height: '100%' });
  });
} else {
  tourNote.textContent = 'Shtoni linkun e turit te src/config/tours.js';
}

/* ---------------- Loop ---------------- */
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// A manual drag wins: drop any button-driven move still easing.
controls.addEventListener('start', () => {
  orbitGoal.theta = orbitGoal.phi = orbitGoal.radius = null;
});

renderer.setAnimationLoop(() => {
  applyOrbitGoal();
  controls.update();
  renderer.render(scene, camera);
});

goTo(START_SCENE);
