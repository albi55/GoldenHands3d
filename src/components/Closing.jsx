import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { ADVANTAGES, PROJECTS, UI } from '../content/chapters';

/**
 * The recap below the last chapter: the advantages, then the other
 * projects.
 *
 * This is the one part of the page that is not scroll-driven. The camera
 * has finished its journey by here and the building is behind a solid
 * background, so these sections are ordinary stacked content and animate
 * on entry rather than on scroll position. That also keeps them out of
 * the stage's per-frame work entirely.
 *
 * The projects block renders nothing when PROJECTS is empty, so an
 * unfilled list is absent rather than a row of blank cards.
 */

const grid = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const rise = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
};

function Block({ kicker, title, lead, children }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });

  return (
    <section className="closing-block" ref={ref}>
      <motion.div variants={grid} initial="hidden" animate={inView ? 'show' : 'hidden'}>
        <motion.p className="panel-kicker" variants={rise}>
          {kicker}
        </motion.p>
        <motion.h2 className="closing-title" variants={rise}>
          {title}
        </motion.h2>
        <motion.p className="closing-lead" variants={rise}>
          {lead}
        </motion.p>
        {children}
      </motion.div>
    </section>
  );
}

export default function Closing() {
  return (
    <div className="closing">
      <Block
        kicker={UI.advantagesKicker}
        title={UI.advantagesTitle}
        lead={UI.advantagesLead}
      >
        <motion.ul className="adv-grid" variants={grid}>
          {ADVANTAGES.map(([title, note]) => (
            <motion.li className="adv" key={title} variants={rise}>
              <h3 className="adv-title">{title}</h3>
              <p className="adv-note">{note}</p>
            </motion.li>
          ))}
        </motion.ul>
      </Block>

      {PROJECTS.length > 0 && (
        <Block
          kicker={UI.projectsKicker}
          title={UI.projectsTitle}
          lead={UI.projectsLead}
        >
          <motion.ul className="proj-grid" variants={grid}>
            {PROJECTS.map((p) => (
              <motion.li className="proj" key={p.name} variants={rise}>
                <h3 className="proj-name">{p.name}</h3>
                {p.note && <p className="proj-note">{p.note}</p>}
                {p.year && <span className="proj-year">{p.year}</span>}
              </motion.li>
            ))}
          </motion.ul>
        </Block>
      )}
    </div>
  );
}
