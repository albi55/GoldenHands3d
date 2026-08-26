import { motion } from 'framer-motion';
import { UI } from '../content/chapters';

/**
 * The chapter index on the right edge.
 *
 * It is a table of contents and a position readout at once: the active
 * chapter's tick grows into a bar and its name appears, so the visitor
 * always knows how far through the building they are without a separate
 * progress element competing for attention.
 */
export default function Rail({ chapters, active, onJump }) {
  return (
    <motion.nav
      className="rail"
      aria-label={UI.navChapters}
      initial={{ opacity: 0, x: 14 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.9, delay: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      {chapters.map((c, i) => (
        <button
          key={c.id}
          type="button"
          className={`rail-item${i === active ? ' is-active' : ''}`}
          onClick={() => onJump(c.id)}
          aria-current={i === active ? 'true' : undefined}
        >
          <span className="rail-label">{c.short || c.kicker}</span>
          <span className="rail-tick" aria-hidden />
        </button>
      ))}
    </motion.nav>
  );
}
