import { forwardRef } from 'react';
import { motion } from 'framer-motion';

/**
 * The opening chapter.
 *
 * Structurally it is a Chapter — same tall section, same sticky panel, so
 * the scroll hook can treat it as anchor zero — but it is laid out as a
 * title card rather than a column of copy, and its entrance runs on a
 * timer instead of on view, because it is already on screen at load.
 *
 * Its scroll-linked recede is driven from useStageScroll along with every
 * other panel. Only the entrance lives here.
 */

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.35 } },
};

const rise = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0, transition: { duration: 1, ease: [0.22, 1, 0.36, 1] } },
};

const Hero = forwardRef(function Hero({ chapter, facts }, ref) {
  return (
    <section ref={ref} id={chapter.id} className="chapter hero side-left">
      <div className="chapter-sticky">
        <div className="panel">
          <motion.div variants={container} initial="hidden" animate="show">
            <motion.p className="hero-eyebrow" variants={rise}>
              {chapter.kicker}
            </motion.p>

            <motion.h1 className="hero-title" variants={rise}>
              Golden Hands <span className="gold">4</span>
            </motion.h1>

            <motion.p className="panel-lead" variants={rise}>
              {chapter.lead}
            </motion.p>

            {chapter.body.map((para, i) => (
              <motion.p key={i} className="hero-para" variants={rise}>
                {para}
              </motion.p>
            ))}

            <motion.div className="hero-facts" variants={container}>
              {facts.map((f) => (
                <motion.div
                  className={`hero-fact${f.accent ? ' is-accent' : ''}`}
                  key={f.label}
                  variants={rise}
                >
                  <div className="hero-fact-value">{f.value}</div>
                  <div className="hero-fact-label">{f.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
});

export default Hero;
