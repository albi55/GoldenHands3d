import { useEffect, useRef, useState } from 'react';
import { UI } from '../content/chapters';
import { motion } from 'framer-motion';

/**
 * The 360° interior tour, over the top of the page.
 *
 * The viewer is a third-party embed that loads in stages — page, then its
 * WebGL modules, then the panorama and its textures — and only the first
 * stage is quick. So the overlay opens immediately with the iframe already
 * mounted and covers it with our own curtain until it reports back, rather
 * than handing the visitor whatever the embed shows mid-boot.
 *
 * The curtain lifts on the iframe's load event. That event fires for any
 * document the frame ends up with, and the frame is cross-origin so there
 * is nothing else to ask — which is why `SLOW` exists: if the tour is
 * still not usable well after loading "finished", the visitor is offered
 * the same tour in a real tab, where it has the whole GPU to itself.
 */

/* Sa mbahet perdja jonë, në ms.

   Korniza njofton kur dokumenti i saj ngarkohet, por Coohom-i vetëm atëherë
   fillon të ndërtojë skenën 3D dhe shfaq perden e vet. Nëse hiqemi te
   njoftimi, vizitori sheh dy ngarkime radhazi — tonën, pastaj të tyren.

   Meqë korniza është nga një origjinë tjetër, s'kemi si ta pyesim kur
   është gati vërtet. Ndaj perdja jonë mbahet një kohë të caktuar, e cila
   mbulon edhe ngarkimin e tyre, dhe zbulohet vetëm kur skena është aty. */
const HOLD = 9000;

/* Kur ofrohet dalja, nëse edhe pas kësaj nuk ka nisur. */
const SLOW = 16000;

/* Rrezja e rrethit dhe perimetri i tij, në njësitë e viewBox-it. Perimetri
   përdoret si gjatësi e vijës me ndërprerje: duke e zhvendosur atë nga
   perimetri i plotë deri në zero, harku mbushet nga asgjëja në rreth. */
const R = 52;
const C = 2 * Math.PI * R;

/* Cycled under the spinner so a long wait still feels like progress. */
const BEATS = UI.tourBeats;

export default function TourOverlay({ tour, onClose }) {
  const [done, setDone] = useState(false);
  const [pct, setPct] = useState(0);
  const [slow, setSlow] = useState(false);
  const [beat, setBeat] = useState(0);
  const timers = useRef([]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    timers.current.push(setInterval(() => setBeat((b) => b + 1), 2600));
    timers.current.push(setTimeout(() => setSlow(true), SLOW));

    /* Shiriti mbushet gjatë gjithë kohës së mbajtjes, që pritja të duket
       e menduar dhe jo e ngecur. */
    const t0 = performance.now();
    const tick = setInterval(() => {
      const p = Math.min(100, ((performance.now() - t0) / HOLD) * 100);
      setPct(p);
      if (p >= 100) {
        clearInterval(tick);
        setDone(true);
      }
    }, 80);
    timers.current.push(tick);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
      for (const t of timers.current) {
        clearInterval(t);
        clearTimeout(t);
      }
      timers.current = [];
    };
  }, [onClose]);

  return (
    <motion.div
      className="tour"
      role="dialog"
      aria-modal="true"
      aria-label={tour.label}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="tour-bar">
        <span className="tour-title">{tour.label}</span>
        <button className="tour-close" type="button" onClick={onClose}>
          {UI.close} ✕
        </button>
      </div>

      <div className="tour-stage">
        <iframe
          className="tour-frame"
          src={tour.url}
          title={tour.label}
          allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer"
          allowFullScreen

        />

        {!done && (
          <div className="tour-curtain">
            {/* Rrethi është vetë treguesi: harku i artë mbushet me
                përparimin, dhe përqindja rri në qendër. Vizatohet me SVG
                sepse `stroke-dashoffset` është e vetmja mënyrë e saktë
                për të mbushur një rreth pjesë-pjesë. */}
            <div
              className="tour-ring"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(pct)}
              aria-label={UI.tourOpen}
            >
              <svg viewBox="0 0 120 120" aria-hidden focusable="false">
                <circle className="tour-ring-track" cx="60" cy="60" r={R} />
                <circle
                  className="tour-ring-fill"
                  cx="60"
                  cy="60"
                  r={R}
                  strokeDasharray={C}
                  strokeDashoffset={C - (C * pct) / 100}
                />
              </svg>
              <span className="tour-ring-num">{Math.round(pct)}%</span>
            </div>
            <p className="tour-beat" aria-live="polite">
              {BEATS[beat % BEATS.length]}
            </p>
          </div>
        )}

        {slow && (
          <motion.div
            className="tour-escape"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span>{UI.tourSlow}</span>
            <a href={tour.url} target="_blank" rel="noopener noreferrer">
              {UI.tourNewTab} →
            </a>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
