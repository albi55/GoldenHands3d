import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * BuildingStage — the 3D half of the site.
 *
 * The page scrolls; this drives the camera. Every chapter in
 * src/content/chapters.js names a pose (azimuth, elevation, distance, and
 * the height of the look-at point) and scrolling interpolates between
 * them, so one continuous camera move carries the whole narrative.
 *
 * Poses are written in model-relative units — angles in degrees, distance
 * as a multiple of the subject radius, target height as a fraction of the
 * subject height — so they survive a re-export at a different scale.
 *
 * ---------------------------------------------------------------------
 * Three things keep this cheap enough for a phone:
 *
 *  1. Geometry is merged by material on load. The export is 923 separate
 *     meshes, which is 923 draw calls a frame before the shadow pass
 *     doubles it — and only 225k triangles, so the cost was never the
 *     geometry, it was the call count. Merging collapses that to roughly
 *     one call per material.
 *
 *  2. The shadow map is rendered once and frozen. Neither the sun nor the
 *     building ever moves, so re-rendering it every frame was redrawing
 *     an identical texture forever.
 *
 *  3. Rendering is on demand. The loop skips the render when the camera
 *     has settled, and stops entirely once it has been still for a
 *     moment — a page parked mid-chapter costs nothing until the next
 *     scroll wakes it.
 * ---------------------------------------------------------------------
 */

/* Camera easing. Low is heavy and cinematic, high is snappy. */
const EASE = 0.115;
/* How fast a manual drag surrenders the camera back to the script. */
const DRAG_RETURN = 0.022;
const DEG = Math.PI / 180;

/* Below this much combined movement the frame would be identical, so it
   is not drawn. */
const STILL = 1e-4;
/* Frames of stillness before the loop parks itself. A second or so, so a
   slow drift to a stop is never cut short. */
const SLEEP_AFTER = 45;

/* A few site materials ship as pure white regardless of their name
   (AsphaltMat), which reads as blank paper next to the building. */
const SITE_TINT = { AsphaltMat: 0x3a3d42 };

/**
 * Which corner of the building carries the clickable apartment.
 *
 * This has to be the corner the opening camera is looking at, or the
 * highlight lands on the far side and cannot be clicked without orbiting
 * the model first.
 *
 * The hero pose is theta 38, phi 68. Three's spherical maths puts the
 * camera at x = sin(phi)sin(theta) = +0.57, z = sin(phi)cos(theta) =
 * +0.73 — so it sits at +X/+Z and sees those two faces. Hence 1, 1.
 *
 * If the opening pose in chapters.js ever turns past 90 or 270 degrees,
 * flip the matching sign here.
 */
const HOTSPOT_CORNER = { x: 1, z: 1 };

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/* Shortest way round the circle, so a pose at 350 degrees and one at 10
   take the 20-degree path and not the 340-degree one. */
function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

/**
 * Pick a quality tier once, at construction.
 *
 * `pointer: coarse` catches tablets and touch laptops that a width test
 * misses, and the core count catches the cheap end of desktop.
 */
function detectTier() {
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const small = window.matchMedia('(max-width: 900px)').matches;
  const weak = (navigator.hardwareConcurrency || 8) <= 4;
  const low = coarse || small || weak;

  return {
    low,
    /* MSAA is disproportionately expensive on mobile GPUs, and at these
       pixel ratios the aliasing it would fix is close to invisible. */
    antialias: !low,
    /* Fragment cost scales with the square of this, so 1.5 rather than 2
       is 44% less shading for a difference that is hard to see on a model
       this flat-shaded and this white. */
    pixelRatio: low ? 1.25 : 1.5,
    shadowSize: low ? 1024 : 2048,
    /* Clearcoat adds a second specular lobe to every affected fragment.
       It is worth it on desktop and not on a phone. */
    clearcoat: !low,
  };
}

export default class BuildingStage {
  constructor(canvas) {
    this.canvas = canvas;
    this.disposed = false;
    this.tier = detectTier();

    /* Set by the scroll hook. Called once per frame, before easing, so
       the page's scroll position and the camera stay on the same clock —
       this is the only render loop on the page. */
    this.onFrame = null;

    /* ---------------- Renderer ---------------- */
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: this.tier.antialias,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.tier.pixelRatio));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = this.tier.low ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    /* Frozen: the map is rendered on the frame after the model lands and
       then never again. See _freezeShadows. */
    renderer.shadowMap.autoUpdate = false;
    this.renderer = renderer;

    /* Transparent, so the CSS gradient painted behind the canvas is the
       backdrop and can change per chapter without the renderer knowing. */
    const scene = new THREE.Scene();
    scene.background = null;
    this.scene = scene;

    /* The model's materials are PBR, so they still need something to
       reflect or metal and glass render as flat black. RoomEnvironment is
       a neutral studio probe: it lights the surfaces without painting a
       visible backdrop. */
    const pmrem = new THREE.PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    scene.environment = pmrem.fromScene(roomEnv, 0.04).texture;
    roomEnv.dispose?.();
    this.pmrem = pmrem;

    /* ---------------- Floor ----------------
       A finite plane on a dark background ends on a hard visible rim, so
       its opacity is painted as a radial gradient: solid under the model,
       gone well before the geometry runs out. */
    this.floor = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: 0x24262b,
        alphaMap: this._fadeTexture(),
        transparent: true,
        depthWrite: false, // never occludes the model it sits under
      }),
    );
    this.floor.rotation.x = -Math.PI / 2;
    this.floor.renderOrder = -1;
    scene.add(this.floor);

    this.camera = new THREE.PerspectiveCamera(
      42,
      window.innerWidth / window.innerHeight,
      0.1,
      5000,
    );

    /* ---------------- Lights ----------------
       The sun is the only shadow caster; the fill just lifts the shadow
       side so the facade does not read as one flat slab. */
    this.sun = new THREE.DirectionalLight(0xffe9c4, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(this.tier.shadowSize, this.tier.shadowSize);
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.02;
    scene.add(this.sun, this.sun.target);

    this.fill = new THREE.DirectionalLight(0x9dc0e8, 0.35);
    scene.add(this.fill);

    /* Sky and ground bounce. Any real strength here flattens the model, so
       it is kept as a floor only. */
    scene.add(new THREE.HemisphereLight(0xcfe2ff, 0x9c9384, 0.25));

    /* ---------------- Camera state ----------------
       `goal` is where the script wants the camera, `now` is where it
       actually is. Every frame `now` eases toward `goal`, which is what
       turns a scroll jump into a camera move. */
    this.goal = { theta: 0, phi: 70 * DEG, dist: 3, targetY: 0 };
    this.now = { ...this.goal };
    this.drag = { theta: 0, phi: 0 }; // manual offset, decays to zero
    this.radius = 10;
    this.height = 10;
    this.ready = false;

    /* The intro pull-in: 1 at load, eased to 0, added to the distance so
       the building settles into frame instead of appearing in it. */
    this.intro = 1;

    /* Sleep bookkeeping. `idle` counts frames without visible movement;
       `paused` is the hard stop used while the tour overlay is up. */
    this.running = false;
    this.paused = false;
    this.idle = 0;

    /* ---------------- Hotspot ----------------
       The clickable apartment. `onHotspotChange` reports hover state and
       pointer position so React can place a tooltip; `onHotspotClick`
       fires on a tap or click that landed on it. */
    this.hotspot = null;
    this.hotspotTargets = [];
    this.onHotspotChange = null;
    this.onHotspotClick = null;

    /* Where the marker label should sit on screen.
       A tint on a facade tells a visitor nothing on its own — somebody who
       does not use computers all day has no reason to think a coloured
       rectangle can be clicked. So the hotspot carries a label anchored to
       it in the page, and this reports where to draw it. */
    this.onHotspotAnchor = null;
    this._anchor = { x: -1, y: -1, visible: false };
    this._hotspotCentre = null;
    this._shift = new THREE.Vector3();
    /* Objekte pune të ripërdorura në ciklin e renderimit. */
    this._target = new THREE.Vector3();
    this._sph = new THREE.Spherical();
    this._proj = new THREE.Vector3();
    this._ray = new THREE.Raycaster();
    this._ndc = new THREE.Vector2();
    this._pointer = { x: 0, y: 0, on: false, marker: false };
    this._hover = false;

    this._bindInput();
  }

  /* Radial white-to-transparent ramp used as the floor's alpha map. */
  _fadeTexture() {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    return new THREE.CanvasTexture(c);
  }

  /* ---------------- Input ----------------
     Every one of these also wakes the loop, because they are the only
     things that can make the next frame differ from this one.

     The wheel is left alone: it belongs to the page. Only pointer drags
     reach the camera, and what they produce is an offset from the
     scripted pose rather than a new pose, so releasing hands the shot
     back to the scroll position. */
  _bindInput() {
    const el = this.canvas;
    let active = false;
    let lastX = 0;
    let lastY = 0;
    /* Where the pointer went down, to tell a tap from a drag or a scroll. */
    let downAt = null;

    /* Tracked on the canvas rather than the window, so moving over a text
       panel does not register as pointing at the building. */
    this._onCanvasMove = (e) => {
      const r = el.getBoundingClientRect();
      this._ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this._ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      this._pointer.x = e.clientX;
      this._pointer.y = e.clientY;
      this._pointer.on = true;
      this.wake();
    };
    this._onCanvasLeave = () => {
      this._pointer.on = false;
      this.wake();
    };

    this._onDown = (e) => {
      /* Every pointer type records the press, because a tap has to work
         on touch even though dragging does not. */
      downAt = { x: e.clientX, y: e.clientY, t: e.timeStamp };
      if (e.pointerType === 'touch') return; // touch belongs to scrolling
      active = true;
      lastX = e.clientX;
      lastY = e.clientY;
      el.classList.add('is-grabbing');
      this.wake();
    };

    /* A tap is a press and release in the same place, quickly. Anything
       that moved was an orbit or a scroll, and must not open the tour. */
    this._onTap = (e) => {
      if (!downAt) return;
      const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
      const held = e.timeStamp - downAt.t;
      downAt = null;
      if (moved > 8 || held > 500) return;

      const r = el.getBoundingClientRect();
      this._ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this._ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      if (this._pickHotspot()) this.onHotspotClick?.();
    };
    this._onMove = (e) => {
      if (!active) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      this.drag.theta -= dx * 0.005;
      /* Clamped so a drag can never put the camera under the pavement or
         straight overhead, both of which break the shot. */
      this.drag.phi = clamp(this.drag.phi - dy * 0.004, -0.5, 0.5);
      this.wake();
    };
    this._onUp = () => {
      active = false;
      el.classList.remove('is-grabbing');
      this.wake();
    };
    this._onScroll = () => this.wake();
    this._onResize = () => {
      this.resize();
      this.wake();
    };

    el.addEventListener('pointerdown', this._onDown);
    /* The text panels and the marker sit over the canvas but are not
       inside it, so moving onto one of them fires no canvas event at all
       and `_pointer` keeps its last value — the highlight stayed lit and
       its label stayed open after the pointer had left. `pointerleave`
       does not help: the canvas fills the window, so the pointer never
       leaves its bounds. This does, by comparing the event target. */
    this._onWindowMove = (e) => {
      const t = e.target;
      /* The marker sits directly on the highlighted facade, so pointing
         at it is pointing at the apartment. Without this the label would
         switch off the instant the pointer touched the very thing it is
         attached to. */
      const marker = Boolean(t?.closest && t.closest('.hs-marker'));
      const onStage = t === this.canvas || marker;
      /* Mbi shënues nuk ka nevojë për rreze: ai ndodhet pikërisht te cepi
         ku takohen dy panelet, dhe një rreze që kalon saktësisht andej i
         shpëton të dyve. */
      this._pointer.marker = marker;

      if (!onStage) {
        if (this._pointer.on) {
          this._pointer.on = false;
          this.wake();
        }
        return;
      }

      const r = this.canvas.getBoundingClientRect();
      this._ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this._ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      this._pointer.x = e.clientX;
      this._pointer.y = e.clientY;
      this._pointer.on = true;
      this.wake();
    };

    el.addEventListener('pointermove', this._onCanvasMove, { passive: true });
    el.addEventListener('pointerleave', this._onCanvasLeave);
    window.addEventListener('pointermove', this._onWindowMove, { passive: true });
    el.addEventListener('pointerup', this._onTap);
    window.addEventListener('pointermove', this._onMove, { passive: true });
    window.addEventListener('pointerup', this._onUp);
    window.addEventListener('pointercancel', this._onUp);
    window.addEventListener('scroll', this._onScroll, { passive: true });
    window.addEventListener('resize', this._onResize);
  }

  /**
   * Is the pointer over the apartment, and is the apartment actually
   * visible from here?
   *
   * Two casts, cheapest first. The panels are two triangles each, so the
   * first is nearly free and rejects almost every frame. Only on a hit
   * does it pay for the second cast against the merged building, which
   * answers the question the first one cannot: whether the apartment is
   * round the far side and hidden behind the model.
   */
  _pickHotspot() {
    if (!this.hotspotTargets.length || !this.model) return false;

    this._ray.setFromCamera(this._ndc, this.camera);
    const hit = this._ray.intersectObjects(this.hotspotTargets, false)[0];
    if (!hit) return false;

    /* Nuk ka nevojë për rreze të dytë kundër ndërtesës.

       Kjo më parë lëshonte një rreze kundër modelit të bashkuar për të
       parë nëse fasada tjetër i qëndronte përpara. Meshet e bashkuara i
       kanë sferat kufizuese shumë të mëdha, ndaj ajo rreze përfundonte e
       testuar kundër shumicës së trekëndëshave — dhe kur kursori i një
       përdoruesi rrinte mbi apartamentin gjatë rrëshqitjes, kjo ndodhte
       në çdo kuadër.

       Panelet janë në dy faqe të sheshta me normale +X dhe +Z: nëse
       kamera është jashtë njërës prej tyre, cepi është i dukshëm. Dy
       krahasime në vend të një rrezeje. */
    const c = this._hotspotCentre;
    if (!c) return true;
    const cam = this.camera.position;
    const outX = HOTSPOT_CORNER.x > 0 ? cam.x > c.x : cam.x < c.x;
    const outZ = HOTSPOT_CORNER.z > 0 ? cam.z > c.z : cam.z < c.z;
    return outX || outZ;
  }

  /**
   * Load the GLB, merge it, and frame it.
   *
   * @param {string} url
   * @param {(t: number) => void} [onProgress] receives 0..1
   */
  load(url, onProgress) {
    /* Self-hosted from public/draco rather than gstatic: the decoder is on
       the critical path — nothing renders until the model is parsed — and
       a third-party origin means a fresh DNS lookup and TLS handshake
       before that can even start. It is ~250 KB over the wasm path, and
       it comes off the same connection as everything else. */
    const draco = new DRACOLoader();
    draco.setDecoderPath('/draco/');
    const loader = new GLTFLoader();
    loader.setDRACOLoader(draco);

    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          if (this.disposed) return;
          const raw = gltf.scene;

          /* Blender exports its own lights, and the glTF punctual-light
             spec uses physical units, so a Blender sun lands here with an
             intensity in the thousands and blows every surface out to
             white. The stage lights the scene itself, so drop them.

             The export also carries a 280 m ground plate around the site.
             It is the only thing behind the building, so it fills the
             frame as a large mottled surface. The pavement the building
             stands on is a separate mesh and stays. */
          const drop = [];
          raw.traverse((o) => {
            if (o.isLight) drop.push(o);
            if (o.isMesh && o.name === 'Site_Ground') drop.push(o);
          });
          for (const o of drop) o.removeFromParent();

          raw.traverse((o) => {
            if (!o.isMesh) return;
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            for (const m of mats) {
              if (!m) continue;
              m.envMapIntensity = 0.35;
              const tint = SITE_TINT[m.name];
              if (tint !== undefined) m.color.setHex(tint);
              if (!this.tier.clearcoat && m.clearcoat) m.clearcoat = 0;
            }
          });

          /* Measured before the merge, which is the only time the
             per-apartment nodes still exist as separate objects. */
          const aptBox = this._apartmentBox(raw);

          const root = this._merge(raw);
          this.model = root;
          this._frame(root);
          this.scene.add(root);
          this._makeHotspot(aptBox);
          this.ready = true;
          this._freezeShadows();
          this.wake();
          resolve(root);
        },
        (ev) => {
          if (ev.total) onProgress?.(ev.loaded / ev.total);
        },
        reject,
      );
    });
  }

  /**
   * Collapse the scene into one mesh per material.
   *
   * This is the single biggest win available here. The export is 923
   * meshes averaging 244 triangles each — far too small to be worth a
   * draw call apiece — across only 65 materials. Baking each mesh's world
   * matrix into its vertices lets everything sharing a material become
   * one buffer, which takes the frame from ~923 draw calls to ~65.
   *
   * Nothing needs per-mesh identity any more: the old click-to-enter
   * scene switching is gone, so there is no raycast that would care.
   *
   * Anything that cannot be merged safely — multi-material meshes, a
   * group whose attributes do not line up — is passed through untouched
   * rather than dropped.
   */
  _merge(raw) {
    raw.updateWorldMatrix(true, true);

    const groups = new Map(); // material -> geometry[]
    const passthrough = [];
    const originals = [];

    raw.traverse((o) => {
      if (!o.isMesh || !o.geometry) return;
      originals.push(o);

      /* Multi-material meshes carry draw groups that merging would have
         to preserve; there are few enough to simply leave alone. */
      if (Array.isArray(o.material) || o.geometry.morphAttributes?.position) {
        passthrough.push(o);
        return;
      }

      const g = o.geometry.clone();
      g.applyMatrix4(o.matrixWorld);

      const list = groups.get(o.material);
      if (list) list.push(g);
      else groups.set(o.material, [g]);
    });

    const out = new THREE.Group();
    let calls = 0;

    for (const [material, list] of groups) {
      const merged = this._mergeGroup(list);
      if (merged) {
        const mesh = new THREE.Mesh(merged, material);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        out.add(mesh);
        calls += 1;
      } else {
        /* Merge refused this group — keep the parts, correctly placed. */
        for (const g of list) {
          const mesh = new THREE.Mesh(g, material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          out.add(mesh);
          calls += 1;
        }
      }
    }

    for (const o of passthrough) {
      const mesh = o.clone();
      mesh.geometry = o.geometry.clone();
      mesh.geometry.applyMatrix4(o.matrixWorld);
      mesh.position.set(0, 0, 0);
      mesh.rotation.set(0, 0, 0);
      mesh.scale.set(1, 1, 1);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      out.add(mesh);
      calls += 1;
    }

    /* The clones hold the only copies now. */
    for (const o of originals) o.geometry.dispose();

    if (import.meta.env?.DEV) {
      console.info(
        `[stage] merged ${originals.length} meshes into ${calls} draw calls ` +
          `across ${groups.size} materials`,
      );
    }
    return out;
  }

  /**
   * Merge one material's geometries.
   *
   * mergeGeometries needs every input to carry exactly the same attributes
   * and to agree about being indexed, which a Blender export does not
   * guarantee — a mesh with no UV map simply has no uv attribute. So the
   * group is reduced to the attributes they all share before merging.
   *
   * @returns {THREE.BufferGeometry | null} null if the group cannot merge
   */
  _mergeGroup(list) {
    if (list.length === 0) return null;
    if (list.length === 1) return list[0];

    /* Attributes present on every member. */
    let shared = Object.keys(list[0].attributes);
    for (const g of list) {
      const has = new Set(Object.keys(g.attributes));
      shared = shared.filter((name) => has.has(name));
    }
    if (!shared.includes('position')) return null;

    for (const g of list) {
      for (const name of Object.keys(g.attributes)) {
        if (!shared.includes(name)) g.deleteAttribute(name);
      }
    }

    /* All indexed or none — mixing the two throws. Dropping the index is
       the safe direction; rebuilding one is not. */
    const indexed = list.filter((g) => g.index).length;
    if (indexed !== 0 && indexed !== list.length) {
      for (let i = 0; i < list.length; i += 1) {
        if (list[i].index) list[i] = list[i].toNonIndexed();
      }
    }

    try {
      const merged = mergeGeometries(list, false);
      if (!merged) return null;
      for (const g of list) g.dispose();
      return merged;
    } catch (err) {
      console.warn('[stage] group did not merge, keeping parts', err);
      return null;
    }
  }

  /**
   * Render the shadow map once, then leave it alone.
   *
   * `autoUpdate` is off from construction, so nothing has drawn shadows
   * yet; this asks for exactly one pass. The sun is static and so is the
   * building, so every later pass would redraw the same texture.
   */
  _freezeShadows() {
    this.renderer.shadowMap.needsUpdate = true;
  }

  /**
   * Measure Apartment 2 and the building shell, before the merge.
   *
   * This has to happen first: merging bakes every mesh into one buffer
   * per material and the per-apartment nodes stop existing as objects.
   * The export names them `Apt2_*` — floor, ceiling, four walls and the
   * internal partitions — which is enough to bound the unit exactly
   * instead of guessing at coordinates.
   *
   * The shell excludes street furniture. Lampposts and trees are tall and
   * narrow, so the flat-and-wide plate filter used for framing does not
   * catch them, and they push the "building" bounds several metres past
   * the facade — which would put the highlight floating in the road.
   */
  _apartmentBox(raw) {
    raw.updateWorldMatrix(true, true);

    const apt = new THREE.Box3();
    const shell = new THREE.Box3();
    /* The named parts that place the highlight properly. */
    /* Walls_L2 jep murin e katit, Floor_L2/L3 brezin vertikal, dhe Shop6
       dyqanin e cepit poshtë — gjerësia e theksimit merret prej tij, që
       të bjerë në një vijë me vitrinën dhe të mos presë në mes të një
       dritareje. */
    const named = {
      Walls_L2: null, Floor_L2: null, Floor_L3: null,
      L2CL_WinFrame: null, Shop5: null, Shop6: null,
    };
    let found = 0;

    raw.traverse((o) => {
      if (!o.isMesh) return;
      const name = o.name || '';
      if (/^(Site_|Street_|SiteSun|SiteCam|CamPivot)/.test(name)) return;

      const b = new THREE.Box3().setFromObject(o);
      shell.union(b);

      if (name in named) named[name] = b;
      if (/^Apt2_/.test(name)) {
        apt.union(b);
        found += 1;
      }
    });

    if (!found || apt.isEmpty()) {
      console.warn('[stage] no Apt2_* meshes found — no hotspot');
      return null;
    }

    /* The wall of that storey, not the whole building.
       `shell` is the bounding box of everything, and the shopfront sign
       surrounds and roof parapets project past the facade — 0.53 m in X
       and 1.05 m in Z. Anchoring to it left the panels hanging that far
       off the wall, in mid-air. Walls_L2 is the storey's actual wall. */
    const face = named.Walls_L2 || shell;

    /* Floor slab to floor slab, so the panel fills the band between the
       horizontal facade lines. The apartment's own ceiling is lower than
       the storey, which would have left a visible gap at the top. */
    const yBand =
      named.Floor_L2 && named.Floor_L3
        ? { min: named.Floor_L2.max.y, max: named.Floor_L3.min.y }
        : { min: apt.min.y, max: apt.max.y };

    if (import.meta.env?.DEV) {
      console.info(
        `[stage] Apt2 from ${found} meshes; ` +
          `face ${named.Walls_L2 ? 'Walls_L2' : 'shell (fallback)'}; ` +
          `band y ${yBand.min.toFixed(2)}..${yBand.max.toFixed(2)}`,
      );
    }
    /* Skaji i brendshëm i theksimit.

       Duhet të bjerë te një ndarje e vërtetë e fasadës, jo në mes të një
       dritareje. L2CL_WinFrame është dritarja e dytë nga cepi, dhe skaji
       i saj i jashtëm është vendi ku brezi mbaron pastër — me Shop5 ai
       binte te x 6.15, pra brenda asaj dritareje dhe e priste në mes.
       Dyqanet mbeten si rezervë nëse dritarja mungon pas një eksporti. */
    return {
      apt, shell, face, yBand,
      edge: named.L2CL_WinFrame || named.Shop5 || named.Shop6,
    };
  }

  /**
   * Build the clickable highlight over Apartment 2.
   *
   * Apt2 is a corner unit: its west and north walls both sit 0.43 m from
   * the building shell, so it has two facades and the highlight has to
   * wrap the corner to read as one apartment. Rather than hard-code that,
   * each of the four vertical faces is measured against the shell and any
   * face close enough to be an outside wall gets a panel.
   *
   * The panels sit a few centimetres proud of the facade so they are not
   * z-fighting with the wall they cover, and `depthWrite` is off so they
   * tint the building rather than punching a hole in it.
   */
  _makeHotspot(boxes) {
    if (!boxes) return;

    /* _frame recentred the model after these were measured, so they have
       to move by the same amount to stay on the building. */
    const apt = boxes.apt.clone().translate(this._shift);
    const face = boxes.face.clone().translate(this._shift);
    const band = {
      min: boxes.yBand.min + this._shift.y,
      max: boxes.yBand.max + this._shift.y,
    };

    /* Just clear of the wall: enough to avoid z-fighting with it, not
       enough to read as floating. */
    const PROUD = 0.04;

    /* Apt2 gives the size of a corner unit; the storey wall gives where
       the facade actually is. Apt2's own position is not used — it sits
       on the far corner from the opening camera, where the highlight
       could not be clicked without orbiting the building first. */
    const y0 = band.min;
    const y1 = band.max;
    const h = y1 - y0;
    const midY = (y0 + y1) / 2;

    /* The corner of the storey wall this unit occupies. */
    const cornerX = HOTSPOT_CORNER.x > 0 ? face.max.x : face.min.x;
    const cornerZ = HOTSPOT_CORNER.z > 0 ? face.max.z : face.min.z;

    /* How wide the panels run, measured from the corner inward.

       Taken from the corner shopfront below rather than from Apt2's
       footprint. The footprint gave 7.39 m, which ended halfway across a
       window and read as a rectangle dropped on the facade at random;
       the shop unit ends on a real division, so the highlight lines up
       with the vitrine underneath it.

       Both faces use the same width so the two panels meet squarely at
       the corner instead of one overshooting the other. */
    const edge = boxes.edge ? boxes.edge.clone().translate(this._shift) : null;
    const shopSpan = edge
      ? Math.abs(cornerX - (HOTSPOT_CORNER.x > 0 ? edge.min.x : edge.max.x))
      : apt.max.x - apt.min.x;

    /* Të dy fasadat NUK marrin të njëjtën gjatësi.

       Fasada e përparme (+Z) ka dritare të ndara, ndaj brezi mbaron te
       buza e njërës prej tyre — 12.54 m, e llogaritur më sipër.

       Fasada anësore (+X) e ka dritaren një shirit të vetëm 17.19 m të
       pandërprerë, pra nuk ka asnjë ndarje ku të kapet. Duke i dhënë të
       njëjtën gjatësi, brezi kalonte mbi apartamentin ngjitur. Këtu
       merret gjerësia e vërtetë e një njësie (Apt2, 7.39 m) plus një
       gjerësi dritareje të matur nga fasada e përparme (2.05 m), që brezi
       të kalojë dritaren pranë cepit dhe të mos mbarojë ngjitur me të. */
    const spanX = shopSpan;
    const bay = edge ? edge.max.x - edge.min.x : 2.05;
    const spanZ = (apt.max.x - apt.min.x) + bay;

    /* The unit runs inward from its corner along both axes. */
    const x0 = HOTSPOT_CORNER.x > 0 ? cornerX - spanX : cornerX;
    const x1 = x0 + spanX;
    const z0 = HOTSPOT_CORNER.z > 0 ? cornerZ - spanZ : cornerZ;
    const z1 = z0 + spanZ;

    const faces = [
      {
        axis: 'x',
        at: cornerX + PROUD * HOTSPOT_CORNER.x,
        span: spanZ,
        mid: (z0 + z1) / 2,
      },
      {
        axis: 'z',
        at: cornerZ + PROUD * HOTSPOT_CORNER.z,
        span: spanX,
        mid: (x0 + x1) / 2,
      },
    ];

    const group = new THREE.Group();
    group.name = 'Apt2_Hotspot';

    /* Unlit on purpose. This is interface, not architecture — it must read
       as the same gold whichever way the sun is pointing. */
    this.hotspotMat = new THREE.MeshBasicMaterial({
      color: 0xf6d21c,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.hotspotLineMat = new THREE.LineBasicMaterial({
      color: 0xf6d21c,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
    });

    for (const f of faces) {
      const geo = new THREE.PlaneGeometry(f.span, h);
      const mesh = new THREE.Mesh(geo, this.hotspotMat);

      if (f.axis === 'x') {
        mesh.position.set(f.at, midY, f.mid);
        mesh.rotation.y = Math.PI / 2;
      } else {
        mesh.position.set(f.mid, midY, f.at);
      }
      mesh.renderOrder = 3;
      group.add(mesh);

      /* A drawn edge as well as a tint: the fill alone reads as a
         reflection on a white facade, the outline reads as a marker. */
      const line = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        this.hotspotLineMat,
      );
      line.position.copy(mesh.position);
      line.rotation.copy(mesh.rotation);
      line.renderOrder = 4;
      /* Not a hit target — picking uses the filled panels only. */
      line.raycast = () => {};
      group.add(line);
    }

    /* The vertical edge where the two panels meet — the corner of the
       building, at mid-storey. The label points here, so it reads as
       attached to that apartment rather than floating over the facade. */
    this._hotspotCentre = new THREE.Vector3(cornerX, midY, cornerZ);

    this.scene.add(group);
    this.hotspot = group;
    /* Only the filled panels are tested, so a hover never depends on
       landing exactly on a one-pixel outline. */
    this.hotspotTargets = group.children.filter((c) => c.isMesh);

    if (import.meta.env?.DEV) {
      console.info(`[stage] hotspot built on ${faces.length} facade(s)`);
    }
  }

  /**
   * Measure the building without the site plates.
   *
   * Roads and pavement can be an order of magnitude wider than the
   * building. Framing on the full bounding box would push the camera so
   * far back the building is a speck, so the distances are driven by the
   * subject — geometry excluding broad flat plates — while the model as a
   * whole still gets centred.
   */
  _subjectBox(root) {
    const full = new THREE.Box3().setFromObject(root);
    const fullSize = full.getSize(new THREE.Vector3());
    const subject = new THREE.Box3();

    root.traverse((o) => {
      if (!o.isMesh) return;
      const b = new THREE.Box3().setFromObject(o);
      const s = b.getSize(new THREE.Vector3());
      const flat = s.y < fullSize.y * 0.06;
      const wide = Math.max(s.x, s.z) > Math.max(fullSize.x, fullSize.z) * 0.35;
      if (flat && wide) return; // a ground plate, not the building
      subject.union(b);
    });

    return subject.isEmpty() ? full : subject;
  }

  _frame(root) {
    const full = new THREE.Box3().setFromObject(root);
    const fullSize = full.getSize(new THREE.Vector3());

    const subj = this._subjectBox(root);
    const centre = subj.getCenter(new THREE.Vector3());
    const size = subj.getSize(new THREE.Vector3());

    /* Centre the subject on the origin so every pose can be written as a
       plain orbit around 0, 0, 0. The hotspot is measured before this
       happens, so the same translation is kept for it to reuse. */
    root.position.sub(centre);
    this._shift = centre.clone().negate();

    this.radius = Math.max(size.x, size.y, size.z);
    this.height = size.y;

    this.camera.near = this.radius / 400;
    this.camera.far = Math.max(this.radius, Math.max(fullSize.x, fullSize.z)) * 40;
    this.camera.updateProjectionMatrix();

    /* Sit the floor at the model's real base. Recentring moved the whole
       model, so this is measured after that and not from the original box. */
    const moved = new THREE.Box3().setFromObject(root);
    this.floor.position.y = moved.min.y;
    // Wide enough that the alpha fade finishes before the geometry edge.
    this.floor.scale.setScalar(Math.max(fullSize.x, fullSize.z) * 3.5);

    /* The shadow camera has to cover the subject or shadows get clipped. */
    const s = this.radius * 1.4;
    this.sun.position.set(this.radius * 0.9, this.radius * 1.5, this.radius * 0.7);
    const cam = this.sun.shadow.camera;
    cam.left = -s;
    cam.right = s;
    cam.top = s;
    cam.bottom = -s;
    cam.near = 0.1;
    cam.far = this.radius * 10;
    cam.updateProjectionMatrix();

    // The fill scales with the model so the rig holds at any size.
    this.fill.position.set(-this.radius * 1.1, this.radius * 0.8, -this.radius * 0.6);

    this.now = { ...this.goal };
    this._place(1); // no easing on the first frame
  }

  /**
   * Point the camera at a pose. Called on every scroll frame.
   *
   * @param {{theta: number, phi: number, dist: number, targetY: number}} pose
   *   theta and phi in degrees, dist as a multiple of the subject radius,
   *   targetY as a fraction of the subject height above its centre.
   */
  setPose(pose) {
    this.goal.theta = pose.theta * DEG;
    this.goal.phi = pose.phi * DEG;
    this.goal.dist = pose.dist;
    this.goal.targetY = pose.targetY;
  }

  /**
   * Move `now` toward `goal` and rebuild the camera transform.
   *
   * @returns {number} how far the camera moved, in roughly comparable
   *   units, so the loop can decide whether the frame is worth drawing.
   */
  _place(t = EASE) {
    const g = this.goal;
    const n = this.now;

    const theta0 = n.theta;
    const phi0 = n.phi;
    const dist0 = n.dist;
    const y0 = n.targetY;

    n.theta = lerpAngle(n.theta, g.theta + this.drag.theta, t);
    n.phi = clamp(lerp(n.phi, g.phi + this.drag.phi, t), 4 * DEG, 88 * DEG);
    n.dist = lerp(n.dist, g.dist, t);
    n.targetY = lerp(n.targetY, g.targetY, t);

    const dist = this.radius * n.dist * (1 + this.intro * 0.55);

    /* Scratch objects, reused. This runs on every frame of every scroll,
       and two fresh objects a frame is a steady drip of garbage for the
       collector to sweep up mid-scroll — which is exactly when a pause is
       most visible. */
    this._target.set(0, n.targetY * this.height, 0);
    this._sph.set(dist, n.phi, n.theta);
    this.camera.position.setFromSpherical(this._sph).add(this._target);
    this.camera.lookAt(this._target);

    return (
      Math.abs(n.theta - theta0) +
      Math.abs(n.phi - phi0) +
      Math.abs(n.dist - dist0) +
      Math.abs(n.targetY - y0)
    );
  }

  /**
   * Recompute hover, brighten the panels, and report to React.
   *
   * Runs once a frame rather than on every pointermove: a move event can
   * fire several times between frames, and the extra casts would all be
   * answering a question about a camera position that has not changed.
   */
  _updateHover() {
    if (!this.hotspot) return;

    const on =
      this._pointer.on && !this.paused && (this._pointer.marker || this._pickHotspot());
    if (on === this._hover) return;
    this._hover = on;

    this.hotspotMat.opacity = on ? 0.62 : 0.44;
    this.hotspotLineMat.opacity = on ? 1 : 0.95;
    this.canvas.classList.toggle('is-pointing', on);

    this.onHotspotChange?.({
      hover: on,
      x: this._pointer.x,
      y: this._pointer.y,
    });
    /* The material changed, so this frame has to be drawn even if the
       camera is parked. */
    this.idle = 0;
  }

  /**
   * Work out where the marker label belongs on screen, and whether it
   * should be shown at all.
   *
   * Two things can hide it: the corner being off screen, or the building
   * standing between it and the camera. The second is why this raycasts
   * rather than only projecting — half the chapters look at the far side,
   * and a label floating over the roof with nothing under it would be
   * worse than no label.
   *
   * Runs once a frame, and the frame loop parks itself when the camera
   * stops, so a still page costs nothing here.
   */
  _updateAnchor() {
    if (!this.onHotspotAnchor || !this._hotspotCentre) return;

    const c = this._hotspotCentre;
    const p = this._proj.copy(c).project(this.camera);

    /* Behind the camera, or outside the frame with a margin for the label
       itself. */
    let visible = p.z < 1 && Math.abs(p.x) < 1.15 && Math.abs(p.y) < 1.15;

    if (visible) {
      /* A facing test, not a raycast.

         This used to cast a ray at the merged model every single frame.
         Merging collapsed the building into 64 large meshes, so their
         bounding spheres are enormous and cull almost nothing — the ray
         ended up tested against most of the 225k triangles, on every
         frame of every scroll. It was the single most expensive thing on
         the page.

         The two panels sit on flat faces whose normals are +X and +Z, so
         the corner is in view exactly when the camera is outside at
         least one of those planes. Two comparisons, same answer. */
      const cam = this.camera.position;
      const outX = HOTSPOT_CORNER.x > 0 ? cam.x > c.x : cam.x < c.x;
      const outZ = HOTSPOT_CORNER.z > 0 ? cam.z > c.z : cam.z < c.z;
      visible = outX || outZ;
    }

    const x = (p.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-p.y * 0.5 + 0.5) * window.innerHeight;
    const a = this._anchor;

    /* Sub-pixel moves are not worth a React render. */
    if (visible === a.visible && Math.abs(x - a.x) < 1 && Math.abs(y - a.y) < 1) return;

    /* Pozicioni shkruhet drejt në element, jo përmes gjendjes së Reactit.

       Më parë kjo thërriste një përditësim gjendjeje sa herë shënuesi
       lëvizte një piksel — pra në çdo kuadër rrëshqitjeje — dhe secili
       rirenderonte gjithë pemën: trembëdhjetë kapitujt, përmbledhjen dhe
       fundin. Kushtonte 40 sekonda pune skripti në një rrëshqitje të
       vetme nëpër faqe.

       React njoftohet vetëm kur shënuesi shfaqet ose fshihet, çka ndodh
       disa herë gjatë gjithë faqes. */
    if (x !== a.x || y !== a.y) {
      a.x = x;
      a.y = y;
      const el = this._markerEl || (this._markerEl = document.querySelector('.hs-marker'));
      /* transform, jo left/top: e para trajtohet nga kompozitori, e dyta
         detyron rillogaritje faqosjeje në çdo kuadër. Zhvendosja për
         qendërzimin shtohet këtu, sepse transform-i i CSS-it mbishkruhet. */
      /* transform, jo left/top: e para trajtohet nga kompozitori, e dyta
         detyron rillogaritje faqosjeje në çdo kuadër. Zhvendosja për
         qendërzimin shtohet këtu, sepse transform-i i CSS-it mbishkruhet. */
      if (el) {
        el.style.transform =
          'translate3d(' + x + 'px, ' + y + 'px, 0) translate(-50%, -50%)';
      }
    }

    if (visible !== a.visible) {
      a.visible = visible;
      /* Elementi krijohet ose hiqet nga React, ndaj kërkimi i ruajtur
         bëhet i pavlefshëm sa herë ndryshon dukshmëria. */
      this._markerEl = null;
      this.onHotspotAnchor(visible);
    }
  }

  /** Wake the loop. Every input handler calls this. */
  wake() {
    this.idle = 0;
    if (this.running || this.disposed || this.paused) return;
    this.running = true;
    this.renderer.setAnimationLoop(this._tick);
  }

  /**
   * Hand the GPU over, or take it back.
   *
   * The 360 tour is a second WebGL viewer in an iframe. Leaving this one
   * rendering behind it means two 3D scenes competing for the GPU while
   * the visitor is looking at neither — and the tour is the one that has
   * to boot smoothly. `paused` also gates wake(), so a stray resize
   * cannot restart the loop underneath the overlay.
   */
  setPaused(paused) {
    this.paused = paused;
    if (paused) {
      this.running = false;
      this.renderer.setAnimationLoop(null);
    } else {
      this.wake();
    }
  }

  /** Start the render loop. */
  start() {
    this._tick = () => {
      if (this.disposed) return;

      // The scroll hook updates the pose here, on the same clock.
      this.onFrame?.();

      /* A drag is a look, not a new heading — hand the shot back slowly. */
      this.drag.theta = lerp(this.drag.theta, 0, DRAG_RETURN);
      this.drag.phi = lerp(this.drag.phi, 0, DRAG_RETURN);
      /* Snapped to zero at the tail: an exponential decay never quite
         arrives, and the last second of it is invisible movement that
         would keep the loop awake. */
      this.intro = this.intro < 1e-3 ? 0 : lerp(this.intro, 0, 0.03);

      const moved = this._place() + this.intro;

      /* After the camera has been placed, so the pick uses this frame's
         view rather than the last one's. */
      this._updateHover();
      this._updateAnchor();

      if (moved > STILL) {
        this.idle = 0;
        this.renderer.render(this.scene, this.camera);
      } else {
        this.idle += 1;
        /* One last frame after settling, so the final easing step is not
           left undrawn, then park. */
        if (this.idle === 1) this.renderer.render(this.scene, this.camera);
        if (this.idle > SLEEP_AFTER) {
          this.running = false;
          this.renderer.setAnimationLoop(null);
        }
      }
    };

    this.wake();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    /* A resized canvas has no shadow map any more. */
    this._freezeShadows();
  }

  dispose() {
    this.disposed = true;
    this.running = false;
    this.renderer.setAnimationLoop(null);
    window.removeEventListener('resize', this._onResize);
    window.removeEventListener('scroll', this._onScroll);
    window.removeEventListener('pointermove', this._onMove);
    window.removeEventListener('pointerup', this._onUp);
    window.removeEventListener('pointercancel', this._onUp);
    this.canvas.removeEventListener('pointerdown', this._onDown);
    this.canvas.removeEventListener('pointermove', this._onCanvasMove);
    this.canvas.removeEventListener('pointerleave', this._onCanvasLeave);
    window.removeEventListener('pointermove', this._onWindowMove);
    this.canvas.removeEventListener('pointerup', this._onTap);
    this.scene.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry?.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) m?.dispose();
    });
    this.pmrem.dispose();
    this.renderer.dispose();
  }
}
