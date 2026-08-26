import { motion } from 'framer-motion';
import { UI } from '../content/chapters';

/**
 * Fixed header. Transparent over the hero so the building is uninterrupted,
 * then a blurred dark bar once the reading starts.
 *
 * The links jump to a chapter rather than to a page, and they go through
 * the same `onJump` the rail uses so both land on the chapter's anchor —
 * an `href` alone would stop at the top of the section, which is half a
 * screen short of the pose the chapter was written for. The scroll is
 * smooth, so the camera travels there instead of cutting.
 *
 * The `href` stays on the element regardless: it is what makes the links
 * work under middle-click, right-click and the keyboard.
 */

const LINKS = [
  ['ballina', 'Ndërtesa'],
  ['perdhesa', 'Kati i parë'],
  ['apartamenti', 'Apartamenti'],
  ['ndertimi', 'Ndërtimi'],
];

export default function Nav({ stuck, activeId, onJump, onContact }) {
  const go = (e, id) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    e.preventDefault();
    onJump(id);
  };

  return (
    <motion.header
      className={`nav${stuck ? ' is-stuck' : ''}`}
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Holds the place the logo used to take in the flow, so moving
          the logo does not move the links. See .nav-brand in global.css. */}
      <span className="nav-spacer" aria-hidden="true" />

      <a
        className="nav-brand"
        href="#ballina"
        aria-label="Golden Hands Construction — ballina"
        onClick={(e) => go(e, 'ballina')}
      >
        {/* The logo carries the name on its own — it has the wordmark
            printed in it — so a text wordmark beside it said everything
            twice. The alt text is what keeps the name available to a
            screen reader and to anyone the image fails for. */}
        <img
          className="nav-logo"
          src="/brand/logo.png"
          alt="Golden Hands Construction"
          width="40"
          height="40"
        />
      </a>

      <nav className="nav-links" aria-label={UI.navSections}>
        {LINKS.map(([id, label]) => (
          <a
            key={id}
            className={`nav-link${activeId === id ? ' is-active' : ''}`}
            href={`#${id}`}
            onClick={(e) => go(e, id)}
          >
            {label}
          </a>
        ))}
      </nav>

      <button className="nav-cta" type="button" onClick={onContact}>
        {UI.contact}
      </button>
    </motion.header>
  );
}
