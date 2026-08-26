import { CONTACT, UI, BUILDING } from '../content/chapters';

/**
 * Ana e djathtë e mbivendosjes së kontaktit.
 *
 * Me koordinata, shfaq një hartë; pa to, një pamje të ndërtesës. Kjo
 * hapësirë nuk mbetet kurrë bosh — por as nuk shpik një vendndodhje:
 * një pin i vendosur me hamendje çon një klient në adresën e gabuar,
 * gjë shumë më e keqe se një pamje e thjeshtë.
 *
 * Harta është OpenStreetMap, jo Google Maps, për dy arsye praktike:
 * ndërtohet vetëm me gjerësi dhe gjatësi, pa çelës API që dikush duhet
 * ta marrë e ta ruajë, dhe nuk vendos cookies gjurmuese — pra nuk shton
 * asnjë detyrim te politika e privatësisë ose te njoftimi i cookies.
 */
export default function ContactMap() {
  const { lat, lon, zoom, address } = CONTACT.map;
  const has = Boolean(lat && lon);

  if (!has) {
    return (
      <aside className="contact-side" aria-hidden="true">
        <div className="contact-card">
          <img className="contact-side-img" src="/og.png" alt="" />
          <div className="contact-side-cap">
            <strong>{UI.contactNoMap}</strong>
            <small>{BUILDING.tagline}</small>
          </div>
        </div>
      </aside>
    );
  }

  /* Kutia e hartës rreth pikës. Sa më i madh zoom-i, aq më e ngushtë. */
  const d = 0.012 / Math.max(1, zoom - 13);
  const bbox = [
    (+lon - d).toFixed(6),
    (+lat - d).toFixed(6),
    (+lon + d).toFixed(6),
    (+lat + d).toFixed(6),
  ].join(',');

  const embed =
    `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}` +
    `&layer=mapnik&marker=${lat},${lon}`;

  /* Harta e ngulitur është OpenStreetMap, por lidhja del te Google Maps:
     aty e kanë të gjithë aplikacionin në telefon, me udhëzimet e rrugës.
     Ngulitja mbetet OSM sepse nuk kërkon çelës API dhe nuk vendos cookies
     gjurmuese — pra faqja nuk merr detyrime të reja privatësie vetëm për
     të treguar një pikë në hartë. */
  const full = `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`;

  return (
    <aside className="contact-side">
      <div className="contact-card">
        <iframe
          className="contact-map"
          src={embed}
          title={UI.contactWhere}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
        <div className="contact-side-cap">
          <strong>{UI.contactWhere}</strong>
          {address && <small>{address}</small>}
          <a href={full} target="_blank" rel="noopener noreferrer">
            {UI.contactMapLink} →
          </a>
        </div>
      </div>
    </aside>
  );
}
