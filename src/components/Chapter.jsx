import { forwardRef, Fragment, useRef } from 'react';
import { UI } from '../content/chapters';
import { motion, useInView } from 'framer-motion';

/**
 * One chapter — a tall section with a sticky text panel.
 *
 * Two animations run on this, and they are deliberately driven by
 * different things:
 *
 *   The panel as a whole — its fade and its drift across the viewport —
 *   is scroll-linked, and lives in useStageScroll rather than here. It
 *   shares the stage's single render loop, so ten chapters cost one
 *   subscription between them instead of ten. See that file for why.
 *
 *   The stagger inside the panel — kicker, then title word by word, then
 *   paragraphs — is trigger-based and stays here. It is a one-shot on
 *   entry, because a stagger that scrubs backwards under the scroll wheel
 *   reads as a glitch rather than as choreography, and because being
 *   time-based it costs nothing once it has played.
 */

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.055, delayChildren: 0.08 } },
};

const rise = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.85, ease: [0.22, 1, 0.36, 1] } },
};

/* The title arrives a word at a time from under its own baseline, which is
   why each word is wrapped in a span that clips it. */
const wordRise = {
  hidden: { y: '105%', opacity: 0 },
  show: { y: 0, opacity: 1, transition: { duration: 0.95, ease: [0.22, 1, 0.36, 1] } },
};

function Words({ text }) {
  const words = text.split(' ');
  return (
    /* The whole string is announced once from the label and the per-word
       spans are hidden, so a screen reader does not read the title out one
       word at a time with the spacing scattered through it. */
    <span aria-label={text}>
      {words.map((w, i) => (
        <Fragment key={w + i}>
          {/* Kutia që pret fjalën gjatë animacionit duhet të jetë më e
              lartë se rreshti, ndryshe pret pjesët që dalin jashtë tij:
              bishtat e g, j, p, y dhe dy pikat e ë-së. Hapësira shtohet
              me padding dhe hiqet me margin, pra prerja zgjerohet pa e
              lëvizur fare tekstin. */}
          <span
            aria-hidden
            style={{
              display: 'inline-block',
              overflow: 'hidden',
              verticalAlign: 'bottom',
              padding: '0.18em 0 0.22em',
              margin: '-0.18em 0 -0.22em',
            }}
          >
            <motion.span style={{ display: 'inline-block' }} variants={wordRise}>
              {w}
            </motion.span>
          </span>
          {/* The separator is a text node BETWEEN the clipping spans, not
              inside one. A trailing space at the end of an inline-block is
              stripped by the browser, which ran every title together into
              a single word. */}
          {i < words.length - 1 ? ' ' : null}
        </Fragment>
      ))}
    </span>
  );
}

const Chapter = forwardRef(function Chapter({ chapter, onTour, onContact }, ref) {
  const inner = useRef(null);
  const inView = useInView(inner, { once: true, amount: 0.35 });

  return (
    <section
      ref={ref}
      id={chapter.id}
      className={'chapter side-' + chapter.side}
      aria-labelledby={chapter.id + '-title'}
    >
      <div className="chapter-sticky">
        {/* Plain elements: useStageScroll writes opacity and transform on
            these two directly, every frame they are on screen. */}
        <div className="panel">
          {chapter.index && (
            <span className="panel-ghost" aria-hidden>
              {chapter.index}
            </span>
          )}

          <motion.div
            ref={inner}
            variants={container}
            initial="hidden"
            animate={inView ? 'show' : 'hidden'}
          >
            <motion.p className="panel-kicker" variants={rise}>
              {chapter.kicker}
            </motion.p>

            <motion.h2 className="panel-title" id={chapter.id + '-title'} variants={container}>
              <Words text={chapter.title} />
            </motion.h2>

            <motion.p className="panel-lead" variants={rise}>
              {chapter.lead}
            </motion.p>

            <div className="panel-body">
              {chapter.body.map((para, i) => (
                <motion.p key={i} variants={rise}>
                  {para}
                </motion.p>
              ))}
            </div>

            {chapter.notes && (
              <motion.dl className="panel-notes" variants={container}>
                {chapter.notes.map(([label, value]) => (
                  <motion.div className="panel-note" key={label} variants={rise}>
                    <dt>{label}</dt>
                    <span className="panel-note-dots" aria-hidden />
                    <dd>{value}</dd>
                  </motion.div>
                ))}
              </motion.dl>
            )}

            {(chapter.tour || chapter.contact) && (
              <motion.div className="panel-actions" variants={rise}>
                {chapter.tour && (
                  <button className="btn btn-solid" type="button" onClick={onTour}>
                    {UI.tourOpen}
                    <span className="btn-arrow" aria-hidden>
                      →
                    </span>
                  </button>
                )}
                {chapter.contact && (
                  <button className="btn" type="button" onClick={onContact}>
                    {UI.contactWrite}
                    <span className="btn-arrow" aria-hidden>
                      →
                    </span>
                  </button>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
});

export default Chapter;
