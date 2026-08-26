import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { needsConsent, readConsent, grantConsent, denyConsent } from '../lib/analytics';
import { UI } from '../content/chapters';

/**
 * The cookie banner.
 *
 * It appears only when there is genuinely something to consent to — that
 * is, when a cookie-setting analytics provider is configured. With no
 * analytics, or with a cookieless one, the site sets nothing and the
 * banner would be theatre: a consent prompt for a decision that does not
 * exist trains people to click through real ones.
 *
 * "Refuzoj" is a real button with the same weight as "Pranoj", not a
 * buried link. A banner where declining is harder than accepting is not
 * consent.
 */
export default function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (needsConsent() && readConsent() === null) setShow(true);
  }, []);

  const accept = () => {
    grantConsent();
    setShow(false);
  };
  const decline = () => {
    denyConsent();
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="consent"
          role="dialog"
          aria-label={UI.consentTitle}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 30, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="consent-text">
            {UI.consentText}{' '}
            <a href="/privatesia/">{UI.consentLink}</a>
          </p>
          <div className="consent-actions">
            <button className="consent-btn" type="button" onClick={decline}>
              {UI.consentDecline}
            </button>
            <button className="consent-btn is-primary" type="button" onClick={accept}>
              {UI.consentAccept}
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
