import { motion, AnimatePresence } from 'framer-motion';
import { UI } from '../content/chapters';

/**
 * The label that sits on the highlighted apartment.
 *
 * A gold tint on a facade is not an affordance. Someone who does not
 * spend their day on computers has no reason to think a coloured
 * rectangle can be clicked — and the site's whole purpose is to get them
 * inside that apartment. So the highlight carries a label that says so,
 * in words, without needing a hover first.
 *
 * The position comes from the stage, which projects the corner of the
 * apartment to screen coordinates once a frame and reports whether the
 * building is standing in front of it. When the camera parks, the loop
 * sleeps and the label simply stays where it is.
 *
 * It pulses in CSS rather than in the 3D scene on purpose: a pulsing
 * material would keep the WebGL loop awake forever, whereas a CSS
 * animation on a small element is composited and costs nothing.
 */
export default function HotspotMarker({ visible, hover, onOpen }) {
  /* Një burim i vetëm i vërtetë: gjendja e kursorit te motori, i cili e
     numëron edhe vetë shënuesin si pjesë të apartamentit. Gjendje e dytë
     lokale këtu do të thoshte dy gjendje që mund të mos pajtohen — dhe
     ajo e dyta mbeti e ndezur. */
  return (
    <AnimatePresence>
      {visible && (
        <motion.button
          type="button"
          className="hs-marker"
          onClick={onOpen}
          /* Vetëm opacity — asnjë veti transformimi.
             Motori e vendos këtë element duke i shkruar `transform`.
             Nëse Framer animon `scale`, shkruan `transform` të vetin dhe e
             fshin pozicionin: shënuesi kërcen te këndi lart-majtas dhe
             klikimi bie mbi shiritin e sipërm. E njëjta gjë ka ndodhur me
             butonin e ballinës dhe me qendërzimin e kontaktit. */
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          aria-label={UI.markerTitle + ' — ' + UI.markerSub}
        >
          {/* Two rings leaving the point, offset in time. These stay on
              permanently: they are the only thing telling a visitor the
              facade can be clicked at all, and they carry no text. */}
          <span className="hs-ping" aria-hidden />
          <span className="hs-ping hs-ping-2" aria-hidden />
          <span className="hs-dot" aria-hidden />

          {/* The wording only appears under the pointer. Left up
              permanently it sat over the building and read as clutter. */}
          <AnimatePresence>
            {hover && (
              <motion.span
                className="hs-label"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <span className="hs-stem" aria-hidden />
                <span className="hs-pill">
                  <span className="hs-pill-icon" aria-hidden>
                    360°
                  </span>
                  <span className="hs-pill-text">
                    <strong>{UI.markerTitle}</strong>
                    <small>{UI.markerSub}</small>
                  </span>
                </span>
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
