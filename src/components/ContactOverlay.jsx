import { useEffect } from 'react';
import { motion } from 'framer-motion';
import ContactForm from './ContactForm';
import { BUILDING, CONTACT, UI } from '../content/chapters';

/**
 * Contact, as a full-page sweep in from the right.
 *
 * Two layers move, slightly apart: a gold sheet leads and the black panel
 * follows about a tenth of a second behind. That offset is the whole
 * effect — a single sliding rectangle reads as a panel appearing, whereas
 * one colour chasing another reads as a curtain being drawn. On the way
 * out they reverse, so it retreats the way it arrived.
 *
 * Only rows with a value render. `phone` and `address` ship empty in
 * chapters.js, so an unfilled detail is absent rather than showing a
 * placeholder to a customer.
 */

const rows = [
  [UI.contactEmail, CONTACT.email, `mailto:${CONTACT.email}?subject=${encodeURIComponent(CONTACT.subject)}`],
  [UI.contactPhone, CONTACT.phone, CONTACT.phone ? `tel:${CONTACT.phone.replace(/\s/g, '')}` : null],
  [UI.contactAddress, CONTACT.address, null],
  [UI.contactHours, CONTACT.hours, null],
];

/* On the way in the gold leads and the black follows. On the way out that
   reverses — the black leaves first and the gold trails it — so the same
   edge is visible in both directions instead of the effect only working
   once. */
const sheet = {
  hidden: { x: '100%' },
  show: { x: '0%', transition: { duration: 0.62, ease: [0.76, 0, 0.24, 1] } },
  out: { x: '100%', transition: { duration: 0.45, ease: [0.76, 0, 0.24, 1], delay: 0.1 } },
};

const panel = {
  hidden: { x: '100%' },
  show: { x: '0%', transition: { duration: 0.62, ease: [0.76, 0, 0.24, 1], delay: 0.1 } },
  out: { x: '100%', transition: { duration: 0.45, ease: [0.76, 0, 0.24, 1] } },
};

/* The contents wait for the panel to arrive before they start. */
const list = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.52 } },
  out: { transition: { duration: 0.15 } },
};

const rise = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
  out: { opacity: 0, transition: { duration: 0.15 } },
};

export default function ContactOverlay({ onClose }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <motion.div
      className="contact"
      role="dialog"
      aria-modal="true"
      aria-label={UI.contactTitle}
      initial="hidden"
      animate="show"
      exit="out"
    >
      {/* The gold that runs ahead of the black. */}
      <motion.div className="contact-sweep" variants={sheet} aria-hidden />

      <motion.div className="contact-panel" variants={panel}>
        <motion.div className="contact-inner" variants={list}>
          <motion.button
            className="contact-close"
            type="button"
            onClick={onClose}
            variants={rise}
          >
            {UI.close} ✕
          </motion.button>

          <motion.p className="contact-kicker" variants={rise}>
            {BUILDING.developer}
          </motion.p>

          <motion.h2 className="contact-title" variants={rise}>
            {UI.contactTitle}
          </motion.h2>

          <motion.p className="contact-lead" variants={rise}>
            {UI.contactLead}
          </motion.p>

          <dl className="contact-rows">
            {rows
              .filter(([, value]) => value)
              .map(([label, value, href]) => (
                <motion.div className="contact-row" key={label} variants={rise}>
                  <dt>{label}</dt>
                  <dd>{href ? <a href={href}>{value}</a> : value}</dd>
                </motion.div>
              ))}
          </dl>

          <motion.div variants={rise} style={{ width: '100%' }}>
            <ContactForm />
          </motion.div>

          {/* Të dyja shfaqen vetëm kur numri është plotësuar në
              chapters.js — pa numër nuk ka lidhje ku të çojnë. */}
          {(CONTACT.whatsapp || CONTACT.telegram) && (
            <motion.div className="contact-chat" variants={rise}>
              <span className="contact-chat-label">{UI.contactChat}</span>
              <div className="contact-chat-links">
                {CONTACT.whatsapp && (
                  <a
                    className="chat-btn is-wa"
                    href={`https://wa.me/${CONTACT.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="WhatsApp"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden focusable="false">
                      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.22 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.7.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35Z" />
                      <path d="M12.04 2C6.6 2 2.17 6.43 2.17 11.87c0 1.74.46 3.44 1.32 4.94L2 22l5.35-1.4a9.83 9.83 0 0 0 4.69 1.19h.01c5.43 0 9.86-4.43 9.86-9.87 0-2.64-1.03-5.12-2.9-6.98A9.8 9.8 0 0 0 12.04 2Zm0 17.98h-.01a8.2 8.2 0 0 1-4.17-1.14l-.3-.18-3.1.81.83-3.02-.2-.31a8.13 8.13 0 0 1-1.25-4.35c0-4.52 3.68-8.2 8.2-8.2a8.14 8.14 0 0 1 5.8 2.4 8.14 8.14 0 0 1 2.4 5.8c0 4.52-3.68 8.19-8.2 8.19Z" />
                    </svg>
                    <span>WhatsApp</span>
                  </a>
                )}
                {CONTACT.telegram && (
                  <a
                    className="chat-btn is-tg"
                    href={`https://t.me/${CONTACT.telegram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Telegram"
                  >
                    <svg viewBox="0 0 24 24" aria-hidden focusable="false">
                      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.64 6.86-1.66 7.82c-.12.55-.45.69-.92.43l-2.54-1.87-1.22 1.18c-.14.14-.25.25-.51.25l.18-2.58 4.7-4.25c.2-.18-.05-.28-.32-.1l-5.8 3.65-2.5-.78c-.54-.17-.55-.54.11-.8l9.79-3.77c.45-.16.85.11.7.82Z" />
                    </svg>
                    <span>Telegram</span>
                  </a>
                )}
              </div>
            </motion.div>
          )}

          <motion.p className="contact-foot" variants={rise}>
            {BUILDING.name} · {UI.completion} {BUILDING.year}
          </motion.p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
