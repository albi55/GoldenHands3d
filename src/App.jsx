import { createRef, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import Stage from './components/Stage';
import Nav from './components/Nav';
import Rail from './components/Rail';
import Hero from './components/Hero';
import Chapter from './components/Chapter';
import Loader from './components/Loader';
import Closing from './components/Closing';
import Footer from './components/Footer';
import TourOverlay from './components/TourOverlay';
import ContactOverlay from './components/ContactOverlay';
import CookieConsent from './components/CookieConsent';
import HotspotMarker from './components/HotspotMarker';

import useStageScroll from './hooks/useStageScroll';
import { initAnalytics } from './lib/analytics';
import { CHAPTERS, FACTS, TOUR, UI } from './content/chapters';

export default function App() {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tourOpen, setTourOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  /* Vetëm dukshmëria; pozicionin e shkruan motori drejt në element. */
  const [markerOn, setMarkerOn] = useState(false);
  /* Fjalët mbi apartament shfaqen vetëm nën kursor. */
  const [hotHover, setHotHover] = useState(false);

  /* Loads nothing unless site.config.js names a provider, and nothing
     that sets a cookie until the visitor has agreed. */
  useEffect(() => { initAnalytics(); }, []);

  const stageRef = useRef(null);

  /* One ref per chapter. Created once, because the scroll hook reads both
     each section's geometry and the panel inside it. */
  const chapterRefs = useMemo(() => CHAPTERS.map(() => createRef()), []);

  const { active, scrolled } = useStageScroll(stageRef, chapterRefs, CHAPTERS);

  /* Two WebGL viewers fighting over one GPU helps neither, and while the
     tour is up nobody is looking at the building. */
  useEffect(() => {
    stageRef.current?.setPaused(tourOpen || contactOpen);
  }, [tourOpen, contactOpen]);

  /* Jump to a chapter's anchor rather than to the top of its section, so
     the panel lands centred and the camera lands exactly on that chapter's
     pose. The scroll is smooth, so the camera travels there. */
  const jump = useCallback(
    (id) => {
      const i = CHAPTERS.findIndex((c) => c.id === id);
      const el = chapterRefs[i]?.current;
      if (!el) return;
      const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({
        top: el.offsetTop + (el.offsetHeight - window.innerHeight) / 2,
        behavior: still ? 'auto' : 'smooth',
      });
    },
    [chapterRefs],
  );

  const contact = useCallback(() => setContactOpen(true), []);

  const openTour = useCallback(() => setTourOpen(true), []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return undefined;
    stage.onHotspotAnchor = setMarkerOn;
    stage.onHotspotChange = (s) => setHotHover(s.hover);
    stage.onHotspotClick = openTour;
    return () => {
      stage.onHotspotAnchor = null;
      stage.onHotspotChange = null;
      stage.onHotspotClick = null;
    };
  }, [ready, openTour]);

  const [hero, ...rest] = CHAPTERS;

  return (
    <>
      <Loader progress={failed ? 1 : progress} done={ready || failed} />

      <Stage
        stageRef={stageRef}
        onProgress={setProgress}
        onReady={() => setReady(true)}
        onError={() => setFailed(true)}
      />

      <Nav stuck={scrolled} activeId={CHAPTERS[active]?.id} onJump={jump} onContact={contact} />

      <Rail chapters={CHAPTERS} active={active} onJump={jump} />

      <main className="scroll-root">
        <Hero ref={chapterRefs[0]} chapter={hero} facts={FACTS} />

        {rest.map((chapter, i) => (
          <Chapter
            key={chapter.id}
            ref={chapterRefs[i + 1]}
            chapter={chapter}
            onTour={openTour}
            onContact={contact}
          />
        ))}
      </main>

      <Closing />

      <Footer />


      <motion.div
        className="drag-hint"
        animate={{ opacity: scrolled ? 0 : 0.9 }}
        transition={{ duration: 0.5 }}
      >
        {UI.dragHint}
      </motion.div>

      <AnimatePresence>
        {tourOpen && <TourOverlay tour={TOUR} onClose={() => setTourOpen(false)} />}
      </AnimatePresence>

      <AnimatePresence>
        {contactOpen && <ContactOverlay onClose={() => setContactOpen(false)} />}
      </AnimatePresence>

      <HotspotMarker visible={markerOn} hover={hotHover} onOpen={openTour} />

      <CookieConsent />
    </>
  );
}
