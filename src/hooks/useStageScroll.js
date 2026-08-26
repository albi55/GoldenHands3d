import { useEffect, useRef, useState } from 'react';

/**
 * Ties the page's scroll position to the camera *and* to the text panels.
 *
 * Each chapter section owns an *anchor* — the scroll offset at which its
 * panel sits dead centre of the viewport. Between two anchors the camera
 * interpolates from one chapter's pose to the next, so scrolling is the
 * camera move rather than a trigger for one.
 *
 * The interpolation is deliberately not linear. `HOLD` keeps the camera
 * parked while the panel is being read and spends the middle of the
 * segment doing the whole swing, which is what makes each chapter arrive
 * as a new view instead of the building drifting continuously.
 *
 * ---------------------------------------------------------------------
 * Why the panels are driven from here rather than by each chapter.
 *
 * Every chapter used to run its own scroll-linked animation, so a page of
 * ten chapters meant ten independent scroll subscriptions all measuring
 * and writing on every frame — including the eight nowhere near the
 * viewport. Folded into this loop, the geometry is measured once (and on
 * resize), anything off-screen is skipped outright, and a value that has
 * not changed since the last frame is not written at all. In practice
 * two or three panels are live at a time instead of ten.
 *
 * Positions are written straight to `style.opacity` and `style.transform`
 * rather than through CSS custom properties: neither property inherits,
 * so the write cannot invalidate the style of everything inside the
 * panel the way a changing custom property would.
 * ---------------------------------------------------------------------
 */

/* Fraction of a segment held still at each end before the camera moves. */
const HOLD = 0.10;

/* How far the panel travels sideways as it enters and leaves, in px. */
const OFFSET = 54;

/* Where the gold glow sits for each chapter, as a translation of its own
   layer. One colour throughout — it is the brand gold, and moving it is
   what marks the chapter, not recolouring it. */
const GLOWS = [
  ['10%', '-26%'],
  ['-30%', '-14%'],
  ['26%', '-22%'],
  ['-4%', '24%'],
  ['-34%', '-20%'],
  ['22%', '-2%'],
  ['0%', '-34%'],
  ['-24%', '12%'],
  ['28%', '-16%'],
  ['0%', '-24%'],
];

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* Smootherstep: zero first and second derivative at both ends, so the
   camera has no visible kick when it starts or stops moving. */
const ease = (t) => t * t * t * (t * (t * 6 - 15) + 10);

/* Degrees, shortest way round, so 350 -> 10 travels 20 and not 340. */
function lerpDeg(a, b, t) {
  let d = (b - a) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return a + d * t;
}

/** Piecewise-linear ramp: the keyframe form, without a library. */
function ramp(p, stops, values) {
  if (p <= stops[0]) return values[0];
  const last = stops.length - 1;
  if (p >= stops[last]) return values[last];
  for (let i = 0; i < last; i += 1) {
    if (p <= stops[i + 1]) {
      const t = (p - stops[i]) / (stops[i + 1] - stops[i]);
      return lerp(values[i], values[i + 1], t);
    }
  }
  return values[last];
}

const OP_STOPS = [0.06, 0.24, 0.74, 0.94];
const OP_VALUES = [0, 1, 1, 0];
const X_STOPS = [0.06, 0.26, 0.74, 0.94];

/**
 * @param {{current: import('../three/BuildingStage').default | null}} stageRef
 * @param {Array<{current: HTMLElement | null}>} sectionRefs one per chapter
 * @param {Array<{pose: object, side: string}>} chapters
 * @returns {{active: number, scrolled: boolean}}
 */
export default function useStageScroll(stageRef, sectionRefs, chapters) {
  const [active, setActive] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  /* Mirrors of the state, so the frame callback can compare without
     re-running the effect on every change. */
  const activeRef = useRef(0);
  const scrolledRef = useRef(false);
  const geoRef = useRef([]);

  useEffect(() => {
    /* Everything the frame callback needs about the DOM, read once here
       so it never has to touch layout mid-scroll. */
    const measure = () => {
      const vh = window.innerHeight;
      geoRef.current = sectionRefs.map(({ current: el }, i) => {
        if (!el) return null;
        return {
          top: el.offsetTop,
          height: el.offsetHeight,
          anchor: el.offsetTop + (el.offsetHeight - vh) / 2,
          panel: el.querySelector('.panel'),
          ghost: el.querySelector('.panel-ghost'),
          dir: chapters[i].side === 'right' ? 1 : -1,
          hero: i === 0,
          /* Last written values, so an unchanged frame writes nothing. */
          op: -1,
          x: NaN,
          y: NaN,
          gy: NaN,
        };
      });
      /* New geometry means a new pose for the same scroll position. */
      stageRef.current?.wake();
    };

    measure();
    window.addEventListener('resize', measure);
    /* Fonts land after first paint and change section heights, which would
       otherwise leave every anchor a little wrong. */
    document.fonts?.ready.then(measure);

    const glow = document.querySelector('.stage-glow');

    /** Fade and slide one panel for its own scroll progress. */
    const paint = (g, y, vh) => {
      const { panel } = g;
      if (!panel) return;

      /* Hero recedes as it leaves; the rest cross the viewport. These are
         the two `offset` ranges the old per-chapter hooks used. */
      const p = g.hero
        ? clamp01((y - g.top) / g.height)
        : clamp01((y + vh - g.top) / (g.height + vh));

      /* Off-screen: park it invisible and stop doing arithmetic for it. */
      const gone = g.hero ? p >= 0.5 : p <= 0.06 || p >= 0.94;
      if (gone) {
        if (g.op !== 0) {
          panel.style.opacity = '0';
          g.op = 0;
        }
        return;
      }

      const op = g.hero ? ramp(p, [0, 0.5], [1, 0]) : ramp(p, OP_STOPS, OP_VALUES);
      const x = g.hero
        ? 0
        : ramp(p, X_STOPS, [OFFSET * g.dir, 0, 0, -OFFSET * g.dir * 0.6]);
      const yy = g.hero ? ramp(p, [0, 0.5], [0, -70]) : 0;

      if (Math.abs(op - g.op) > 0.004) {
        panel.style.opacity = op.toFixed(3);
        g.op = op;
      }
      if (Math.abs(x - g.x) > 0.25 || Math.abs(yy - g.y) > 0.25) {
        panel.style.transform = `translate3d(${x.toFixed(1)}px, ${yy.toFixed(1)}px, 0)`;
        g.x = x;
        g.y = yy;
      }

      /* The ghost numeral runs against the panel, which is what puts the
         two on visibly different planes. */
      if (g.ghost) {
        const gy = lerp(90, -90, p);
        if (Math.abs(gy - g.gy) > 0.4) {
          g.ghost.style.transform = `translate3d(0, ${gy.toFixed(1)}px, 0)`;
          g.gy = gy;
        }
      }
    };

    const frame = () => {
      const stage = stageRef.current;
      const geo = geoRef.current;
      if (!stage || geo.length < 2 || !geo[0]) return;

      const y = window.scrollY;
      const vh = window.innerHeight;

      const isScrolled = y > vh * 0.3;
      if (isScrolled !== scrolledRef.current) {
        scrolledRef.current = isScrolled;
        setScrolled(isScrolled);
      }

      for (const g of geo) if (g) paint(g, y, vh);

      /* Which segment are we in, and how far through it. */
      let i = 0;
      while (i < geo.length - 2 && y >= geo[i + 1].anchor) i += 1;

      const span = geo[i + 1].anchor - geo[i].anchor;
      const raw = span > 0 ? clamp01((y - geo[i].anchor) / span) : 0;

      /* Hold at both ends, swing through the middle. */
      const t = ease(clamp01((raw - HOLD) / (1 - HOLD * 2)));

      const a = chapters[i].pose;
      const b = chapters[i + 1].pose;
      stage.setPose({
        theta: lerpDeg(a.theta, b.theta, t),
        phi: lerp(a.phi, b.phi, t),
        dist: lerp(a.dist, b.dist, t),
        targetY: lerp(a.targetY, b.targetY, t),
      });

      const nowActive = raw < 0.5 ? i : i + 1;
      if (nowActive !== activeRef.current) {
        activeRef.current = nowActive;
        setActive(nowActive);

        const [gx, gy] = GLOWS[nowActive % GLOWS.length];
        glow?.style.setProperty('--gx', gx);
        glow?.style.setProperty('--gy', gy);
      }
    };

    /* Effects run children-first, so the stage normally exists by now.
       "Normally" is not "always" — a suspended or reordered tree can flip
       it — so this waits a frame rather than silently never attaching. */
    let raf = 0;
    const attach = () => {
      if (stageRef.current) {
        stageRef.current.onFrame = frame;
        stageRef.current.wake();
      } else {
        raf = requestAnimationFrame(attach);
      }
    };
    attach();

    return () => {
      cancelAnimationFrame(raf);
      if (stageRef.current) stageRef.current.onFrame = null;
      window.removeEventListener('resize', measure);
    };
  }, [stageRef, sectionRefs, chapters]);

  return { active, scrolled };
}
