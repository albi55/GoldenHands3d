import { useEffect, useRef, useState } from "react";

/*
  Golden Hands — apartment interior tour.

  Drop this at:  src/components/Tour.jsx
  Panoramas at:  public/panoramas/*.jpg

  Use it:
      import Tour from "./components/Tour";
      <Tour unit="unit2" />

  Pannellum loads from CDN, so there is nothing to npm install.
  Before the panoramas exist, the component tells you which files
  are missing instead of showing a black screen.
*/

// ---------------------------------------------------------------- data
const UNITS = {
  unit2: {
    label: "Apartamenti Nr. 2",
    type: "2+1",
    area: "85.31 m² neto · 102.25 m² total",
    start: "living",
    scenes: {
      living: {
        title: "Ndenjja & Ngrënia",
        file: "living.jpg",
        yaw: 0,
        hotspots: [
          { text: "Kuzhina", to: "kitchen", pitch: -8, yaw: 55, facing: 200 },
          { text: "Dhoma e gjumit", to: "bedroom", pitch: -8, yaw: -70, facing: 20 },
        ],
      },
      kitchen: {
        title: "Kuzhina",
        file: "kitchen.jpg",
        yaw: 180,
        hotspots: [{ text: "Ndenjja", to: "living", pitch: -8, yaw: 20, facing: 235 }],
      },
      bedroom: {
        title: "Dhoma e gjumit",
        file: "bedroom.jpg",
        yaw: 0,
        hotspots: [
          { text: "Ndenjja", to: "living", pitch: -8, yaw: 150, facing: 110 },
          { text: "Banjo", to: "bath", pitch: -8, yaw: -30, facing: 180 },
        ],
      },
      bath: {
        title: "Banjo",
        file: "bath.jpg",
        yaw: 0,
        hotspots: [{ text: "Dhoma e gjumit", to: "bedroom", pitch: -8, yaw: 170, facing: 0 }],
      },
    },
  },
};

const BASE = "/panoramas/";
const PNL_CSS = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
const PNL_JS = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";

// ------------------------------------------------------------- loading
function useScript() {
  const [ready, setReady] = useState(() => Boolean(window.pannellum));
  useEffect(() => {
    if (window.pannellum) return setReady(true);
    if (!document.querySelector(`link[href="${PNL_CSS}"]`)) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = PNL_CSS;
      document.head.appendChild(l);
    }
    let s = document.querySelector(`script[src="${PNL_JS}"]`);
    if (!s) {
      s = document.createElement("script");
      s.src = PNL_JS;
      s.async = true;
      document.head.appendChild(s);
    }
    const done = () => setReady(true);
    s.addEventListener("load", done);
    return () => s.removeEventListener("load", done);
  }, []);
  return ready;
}

// check which panorama files actually exist before initialising
function useAvailable(scenes) {
  const [state, setState] = useState({ checked: false, missing: [] });
  useEffect(() => {
    let alive = true;
    const names = Object.values(scenes).map((s) => s.file);
    Promise.all(
      names.map((f) =>
        fetch(BASE + f, { method: "HEAD" })
          .then((r) => (r.ok ? null : f))
          .catch(() => f)
      )
    ).then((res) => {
      if (alive) setState({ checked: true, missing: res.filter(Boolean) });
    });
    return () => { alive = false; };
  }, [scenes]);
  return state;
}

// ---------------------------------------------------------------- view
export default function Tour({ unit = "unit2" }) {
  const data = UNITS[unit] ?? UNITS.unit2;
  const holder = useRef(null);
  const viewer = useRef(null);
  const ready = useScript();
  const { checked, missing } = useAvailable(data.scenes);
  const [current, setCurrent] = useState(data.start);

  useEffect(() => {
    if (!ready || !checked || missing.length || !holder.current) return;

    const cfg = {
      default: {
        firstScene: data.start,
        autoLoad: true,
        sceneFadeDuration: 750,
        showControls: false,
        friction: 0.15,
      },
      scenes: {},
    };

    for (const [id, s] of Object.entries(data.scenes)) {
      cfg.scenes[id] = {
        title: s.title,
        type: "equirectangular",
        panorama: BASE + s.file,
        yaw: s.yaw ?? 0,
        hfov: 105,
        minHfov: 55,
        maxHfov: 120,
        hotSpots: (s.hotspots || []).map((h) => ({
          pitch: h.pitch,
          yaw: h.yaw,
          type: "scene",
          sceneId: h.to,
          text: h.text,
          targetYaw: h.facing ?? 0,
          cssClass: "gh-hotspot",
          createTooltipFunc: (el, arg) => {
            el.classList.add("gh-hotspot");
            el.setAttribute("aria-label", arg);
            el.title = arg;
          },
          createTooltipArgs: h.text,
        })),
      };
    }

    viewer.current = window.pannellum.viewer(holder.current, cfg);
    const sync = () => setCurrent(viewer.current.getScene());
    viewer.current.on("load", sync);

    return () => {
      viewer.current?.destroy();
      viewer.current = null;
    };
  }, [ready, checked, missing.length, data]);

  const go = (id) => viewer.current?.loadScene(id);

  return (
    <div className="gh-tour">
      <style>{css}</style>

      <div ref={holder} className="gh-stage" />

      {(!ready || !checked) && <div className="gh-state">Duke ngarkuar…</div>}

      {checked && missing.length > 0 && (
        <div className="gh-state gh-missing">
          <p className="gh-missing-title">Panoramat mungojnë</p>
          <p>Vendosini këto skedarë te <code>public/panoramas/</code>:</p>
          <ul>{missing.map((f) => <li key={f}><code>{f}</code></li>)}</ul>
        </div>
      )}

      {ready && checked && !missing.length && (
        <>
          <header className="gh-meta">
            <p className="gh-unit">{data.label} · {data.type}</p>
            <h2 className="gh-room">{data.scenes[current]?.title}</h2>
            <p className="gh-area">{data.area}</p>
          </header>

          <nav className="gh-rooms">
            {Object.entries(data.scenes).map(([id, s]) => (
              <button
                key={id}
                onClick={() => go(id)}
                className={id === current ? "gh-chip gh-chip-on" : "gh-chip"}
              >
                {s.title}
              </button>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}

// ----------------------------------------------------------------- css
const css = `
.gh-tour{position:relative;width:100%;height:100%;min-height:420px;
  background:#101114;color:#f3f3f4;overflow:hidden;
  font-family:ui-sans-serif,system-ui,"Segoe UI",sans-serif}
.gh-stage{position:absolute;inset:0}

.gh-state{position:absolute;inset:0;display:flex;flex-direction:column;
  align-items:center;justify-content:center;gap:6px;text-align:center;
  padding:24px;color:#9a9aa1;font-size:14px}
.gh-missing-title{color:#f3f3f4;font-size:16px;font-weight:600}
.gh-missing ul{list-style:none;margin:10px 0 0;padding:0;display:grid;gap:4px}
.gh-missing code{background:rgba(255,255,255,.08);padding:2px 7px;
  border-radius:4px;font-size:13px}

.gh-meta{position:absolute;top:0;left:0;width:100%;padding:18px 22px;
  pointer-events:none;background:linear-gradient(to bottom,rgba(0,0,0,.62),transparent)}
.gh-unit{margin:0;font-size:11px;letter-spacing:2.4px;text-transform:uppercase;color:#c9a227}
.gh-room{margin:3px 0 0;font-size:21px;font-weight:600}
.gh-area{margin:2px 0 0;font-size:12px;color:#9a9aa1}

.gh-rooms{position:absolute;left:0;bottom:0;width:100%;display:flex;gap:8px;
  padding:14px 16px;overflow-x:auto;scrollbar-width:none;
  background:linear-gradient(to top,rgba(0,0,0,.72),transparent)}
.gh-rooms::-webkit-scrollbar{display:none}
.gh-chip{flex:0 0 auto;padding:9px 16px;border-radius:999px;cursor:pointer;
  font-size:13px;white-space:nowrap;color:#9a9aa1;
  background:rgba(20,21,24,.82);border:1px solid rgba(255,255,255,.10);
  backdrop-filter:blur(12px);transition:color .18s,border-color .18s}
.gh-chip:hover{color:#f3f3f4;border-color:rgba(255,255,255,.26)}
.gh-chip:focus-visible{outline:2px solid #c9a227;outline-offset:2px}
.gh-chip-on{color:#101114;background:#c9a227;border-color:#c9a227;font-weight:600}

.gh-hotspot{width:34px;height:34px;border-radius:50%;cursor:pointer;
  display:flex;align-items:center;justify-content:center;
  background:rgba(255,255,255,.93);border:2px solid rgba(0,0,0,.15);
  box-shadow:0 3px 14px rgba(0,0,0,.45);transition:transform .18s}
.gh-hotspot::after{content:"";width:8px;height:8px;margin-left:-3px;
  border-right:2.5px solid #111;border-bottom:2.5px solid #111;transform:rotate(-45deg)}
.gh-hotspot:hover{transform:scale(1.2)}

@media (prefers-reduced-motion:reduce){
  .gh-chip,.gh-hotspot{transition:none}
}
`;
