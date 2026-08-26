import { BUILDING, CONTACT, UI } from '../content/chapters';

/**
 * Sits below the last chapter. It is opaque at the bottom, so the fixed
 * canvas has somewhere to end — without it the building would still be
 * showing behind the final line of the page.
 */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-inner">
        <div>
          <div className="footer-mark">
            Golden Hands <em>4</em>
          </div>
          <div className="footer-meta" style={{ marginTop: 10 }}>
            {BUILDING.tagline}
          </div>
        </div>

        <div className="footer-meta">
          <div>{BUILDING.developer}</div>
          <div>
            <a href={`mailto:${CONTACT.email}?subject=${encodeURIComponent(CONTACT.subject)}`}>
              {CONTACT.email}
            </a>
          </div>
          <div>{UI.completion} · {BUILDING.year}</div>
        </div>
      </div>

      {/* The legal links belong here rather than in the navbar: nobody
          navigates to a privacy policy, they look for it at the bottom of
          the page, and search engines expect to find them there too. */}
      <nav className="footer-links" aria-label="Faqet ligjore">
        <a href="/pyetje/">{UI.legalFaq}</a>
        <a href="/kushtet/">{UI.legalTerms}</a>
        <a href="/privatesia/">{UI.legalPrivacy}</a>
      </nav>

      <div className="footer-legal">
        {UI.legal}
      </div>
    </footer>
  );
}
