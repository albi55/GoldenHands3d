/**
 * The narrative — the single file you edit to change what the site says.
 *
 * Each chapter is one scroll section. `pose` is where the camera sits
 * while that chapter is on screen, and the stage interpolates between
 * consecutive poses as the visitor scrolls, so the building turns to the
 * view the text is describing.
 *
 * pose fields, all model-relative so they survive a re-export:
 *   theta    azimuth in degrees, 0 = front, positive = counter-clockwise
 *   phi      elevation in degrees, 0 = directly overhead, 90 = eye level
 *   dist     distance as a multiple of the subject radius
 *   targetY  look-at height as a fraction of the building height,
 *            0 = middle, +0.5 = roof, -0.5 = pavement
 *
 * `side` decides which edge the text panel enters from. Alternating it
 * is what makes each chapter read as a new view rather than a new slide.
 *
 * ---------------------------------------------------------------------
 * Rregullat e shqipes — lexoji para se të shtosh tekst.
 *
 *  - Ndërtesa quhet gjithmonë "ndërtesa". Jo "objekti", jo "pallati".
 *  - Kati i poshtëm quhet "kati i parë". Jo "përdhesë", jo "kati përdhes".
 *    Katet e banimit numërohen nga i dyti deri te i shtati.
 *  - Titujt janë përshkrues, jo letrarë. "Njësitë tregtare", jo "Rruga
 *    fillon këtu".
 *  - Fjali të shkurtra. Një ide për fjali.
 *  - Pa figura letrare dhe pa fjalë të tepërta. Ky është tekst teknik
 *    shitjeje për një ndërtesë.
 *  - Lexuesi adresohet me "Ju": "Lëvizni", "Shihni", "Na shkruani".
 * ---------------------------------------------------------------------
 */

export const BUILDING = {
  name: 'Golden Hands 4',
  tagline: 'Banim dhe tregti në qendër të qytetit',
  developer: 'Golden Hands Construction',
  year: '2026',
};

export const FACTS = [
  { label: 'Kate', value: '7' },
  { label: 'Apartamente', value: '42' },
  { label: 'Njësi tregtare', value: '6' },
  { label: 'Sipërfaqe e ndërtuar', value: '4 200 m²' },
  { label: 'Përfundimi', value: '2026' },
  { label: 'Statusi', value: 'Në ndërtim', accent: true },
];

export const CHAPTERS = [
  {
    id: 'ballina',
    kicker: 'Golden Hands Construction',
    short: 'Golden Hands 4',
    title: 'Golden Hands 4',
    lead:
      'Ndërtesë me shtatë kate banimi dhe gjashtë njësi tregtare në katin ' +
      'e parë, në cep të një kryqëzimi në qendër të qytetit. Lëvizni ' +
      'poshtë për ta parë ndërtesën kat pas kati.',
    body: [
      'Kjo faqe shoqëron modelin tredimensional të ndërtesës. Modeli është ' +
      'i njëjti që përdoret për vizatimet dhe pamjet e projektit.',
      'Ndërtesa është e ndërtuar në mënyrë virtuale për analizë ' +
      'profesionale nga ana juaj. Ky projekt arrin nivelin më të lartë të ' +
      'interaktivitetit, duke sjellë një përvojë unike.',
    ],
    side: 'left',
    pose: { theta: 38, phi: 68, dist: 2.7, targetY: 0.0 },
  },

  {
    id: 'vendndodhja',
    index: '01',
    kicker: 'Vendndodhja',
    title: 'Pozicion i favorshëm',
    lead:
      'Ndërtesa ndodhet në takimin e dy rrugëve dhe e zë të gjithë cepin, ' +
      'me dy fasada kryesore mbi trotuar.',
    body: [
      'Pozicioni në cep i jep ndërtesës dritë nga dy anë. Një ndërtesë mes ' +
      'dy ndërtesave të tjera merr dritë vetëm nga përpara dhe nga prapa.',
      'Për njësitë tregtare, dy fronte rruge sjellin dyfishin e ' +
      'vitrinave dhe dy hyrje të ndara.',
      'Cepi është i rrumbullakosur. Kjo e zgjeron pamjen për këmbësorët ' +
      'dhe i jep ndërtesës një ballë të vazhdueshëm.',
    ],
    notes: [
      ['Fronti i rrugës', 'dy fasada'],
      ['Orientimi', 'juglindje / verilindje'],
      ['Trotuari', 'i zgjeruar, me pemë'],
    ],
    side: 'right',
    pose: { theta: -32, phi: 79, dist: 3.5, targetY: -0.14 },
  },

  {
    id: 'zona',
    index: '02',
    kicker: 'Zona',
    title: 'Zona përreth',
    lead:
      'Ndërtesa ndodhet në qendër, ku shërbimet e përditshme janë brenda ' +
      'disa minutash në këmbë.',
    body: [
      'Në zonë ka dyqane, kafene, farmaci dhe shkolla.',
      'Gjashtë njësitë tregtare në katin e parë shtojnë shërbime të tjera ' +
      'brenda vetë ndërtesës.',
      'Kryqëzimi është i ndriçuar dhe ka qarkullim të vazhdueshëm ' +
      'këmbësorësh.',
    ],
    notes: [
      ['Qendra', 'në këmbë'],
      ['Shërbimet', 'në katin e parë'],
      ['Transporti', 'linja urbane pranë'],
    ],
    side: 'left',
    pose: { theta: -95, phi: 38, dist: 4.3, targetY: 0.06 },
  },

  {
    id: 'vellimi',
    index: '03',
    kicker: 'Vëllimi',
    title: 'Forma dhe tërheqja',
    lead:
      'Katet e sipërme tërhiqen prapa dhe e ndajnë ndërtesën në një bazë ' +
      'më të gjerë dhe një pjesë të sipërme më të lehtë.',
    body: [
      'Tërheqja e ul lartësinë që duket nga trotuari dhe i jep ' +
      'ndërtesës një formë të shkallëzuar.',
      'Sipërfaqja e liruar nga tërheqja përdoret si tarracë për ' +
      'apartamentet e kateve të fundit.',
      'Dritaret ndjekin të njëjtin ritëm në të gjitha katet.',
    ],
    notes: [
      ['Kate mbi tokë', '7'],
      ['Tërheqja', 'katet 6 dhe 7'],
      ['Lartësia e katit', '2.90 m e lirë'],
    ],
    side: 'right',
    pose: { theta: 128, phi: 60, dist: 2.5, targetY: 0.06 },
  },

  {
    id: 'perdhesa',
    index: '04',
    kicker: 'Kati i parë',
    title: 'Njësitë tregtare',
    lead:
      'Gjashtë njësi tregtare në katin e parë, secila me vitrinë të plotë ' +
      'dhe me hyrje të veçantë nga trotuari.',
    body: [
      'Vitrinat janë me xham nga dyshemeja deri në tavan. Mbi hyrjet ka ' +
      'tabela të njëjta dhe një strehë të vazhdueshme.',
      'Muret ndarëse mes njësive nuk janë mbajtëse, ndaj dy njësi fqinje ' +
      'mund të bashkohen në një të vetme.',
      'Hyrja e banorëve është e ndarë nga njësitë tregtare dhe ka hollin, ' +
      'kutitë postare dhe ashensorin e vet.',
    ],
    notes: [
      ['Njësi tregtare', '6'],
      ['Lartësia e vitrinës', '3.60 m'],
      ['Hyrja e banorëve', 'e ndarë'],
    ],
    side: 'left',
    pose: { theta: 58, phi: 85, dist: 1.55, targetY: -0.34 },
  },

  {
    id: 'fasada',
    index: '05',
    kicker: 'Fasada',
    title: 'Fasada dhe dritaret',
    lead:
      'Katet e banimit ndjekin të njëjtin rregullim dritaresh, nga kati i ' +
      'dytë deri te i shtati.',
    body: [
      'Ritmi i njëjtë në çdo kat i jep fasadës pamje të njëtrajtshme.',
      'Ndarjet horizontale mes kateve janë pak të dala dhe krijojnë hije ' +
      'në diell.',
      'Materiali kryesor është suvatim i bardhë me strukturë të imët. ' +
      'Ngjyra e çelët e reflekton nxehtësinë e verës.',
    ],
    notes: [
      ['Dritaret', 'xham i dyfishtë, me ndarës termik'],
      ['Suvatimi', 'i bardhë, me strukturë të imët'],
      ['Izolimi', 'i jashtëm, i pandërprerë'],
    ],
    side: 'right',
    pose: { theta: -84, phi: 63, dist: 1.75, targetY: 0.04 },
  },

  {
    id: 'paleta',
    index: '06',
    kicker: 'Materialet',
    title: 'Ngjyrat dhe materialet',
    lead:
      'Fasada është e bardhë dhe kati i parë është gri i errët. Gjelbërimi ' +
      'vjen nga pemët në trotuar dhe bimësia në tarracë.',
    body: [
      'Sipërfaqja e çelët e fasadës e reflekton nxehtësinë e diellit dhe e ' +
      'mban ndërtesën më të freskët.',
      'Ngjyra më e errët e katit të parë e dallon bazën nga pjesa e ' +
      'sipërme.',
      'Pemët në trotuar dhe bimësia në tarracë ndryshojnë me stinët.',
    ],
    notes: [
      ['Fasada', 'e bardhë, suvatim i imët'],
      ['Kati i parë', 'gri i errët'],
      ['Theksi', 'gjelbërim dhe xham'],
    ],
    side: 'left',
    pose: { theta: -118, phi: 74, dist: 1.3, targetY: -0.08 },
  },

  {
    id: 'ballkonet',
    index: '07',
    kicker: 'Ballkonet',
    title: 'Ballkonet',
    lead:
      'Çdo apartament ka ballkon. Ballkonet janë brenda vëllimit të ' +
      'ndërtesës dhe jo të varura jashtë saj.',
    body: [
      'Ballkoni brenda vëllimit nuk e shpon izolimin e fasadës. Kështu ' +
      'kati nuk humb nxehtësi nga pllaka.',
      'Ballkonet e futura krijojnë hije në fasadë gjatë ditës.',
      'Parmakët janë të plotë deri në lartësinë e brezit.',
    ],
    notes: [
      ['Mbulimi', '100% e apartamenteve'],
      ['Thellësia', '1.60 m'],
      ['Izolimi', 'i pandërprerë te ballkoni'],
    ],
    side: 'right',
    pose: { theta: 16, phi: 56, dist: 1.65, targetY: 0.2 },
  },

  {
    id: 'pamja',
    index: '08',
    kicker: 'Pamja',
    title: 'Pamja nga apartamentet',
    lead: 'Nga katet e sipërme, cepi hapet në dy drejtime.',
    body: [
      'Dritaret kanë pamje nga dy rrugë të hapura dhe jo nga muri i një ' +
      'ndërtese tjetër.',
      'Nga kati i katërt e lart, pamja kalon mbi çatitë e ndërtesave ' +
      'përreth.',
      'Njëra fasadë merr diellin e mëngjesit dhe tjetra atë të pasdites.',
    ],
    notes: [
      ['Drejtimet', 'dy rrugë të hapura'],
      ['Mbi çatitë', 'nga kati 4 e lart'],
      ['Dritë natyrale', 'mëngjes dhe pasdite'],
    ],
    side: 'left',
    pose: { theta: 175, phi: 44, dist: 2.3, targetY: 0.4 },
  },

  {
    id: 'apartamenti',
    index: '09',
    kicker: 'Apartamenti',
    title: 'Apartamenti Nr. 2',
    lead:
      'Apartament 2+1 me sipërfaqe neto 85.31 m²: ambient ndenjeje së ' +
      'bashku me kuzhinën, dy dhoma gjumi dhe tualet.',
    body: [
      'Kuzhina, zona e ngrënies dhe ajo e ndenjes janë në një hapësirë të vetme, me ' +
      'dalje në ballkon. Dhomat e gjumit janë në anën e qetë të ' +
      'apartamentit.',
      'Zona e ditës dhe zona e natës janë të ndara.',
      'Pamja virtuale ju çon brenda apartamentit: ndenjja, kuzhina, dhoma ' +
      'e gjumit dhe tualeti.',
    ],
    notes: [
      ['Tipologjia', '2+1'],
      ['Sipërfaqe neto', '85.31 m²'],
      ['Sipërfaqe totale', '102.25 m²'],
    ],
    tour: true,
    side: 'right',
    pose: { theta: 92, phi: 71, dist: 2.05, targetY: -0.02 },
  },

  {
    id: 'cilesia',
    index: '10',
    kicker: 'Cilësia',
    title: 'Cilësia e ndërtimit',
    lead: 'Ndërtim me standarde bashkëkohore dhe materiale të zgjedhura.',
    body: [
      'Izolimi është i vazhdueshëm nga jashtë, hidroizolimi i mbrojtur nën ' +
      'shtresë dhe dritaret me ndarës termik.',
      'Instalimet dorëzohen të përfunduara deri te pikat e lidhjes.',
      'Punën e ndjek i njëjti staf nga fillimi deri në fund. Modeli ' +
      'tredimensional përdoret edhe në kantier.',
    ],
    notes: [
      ['Materialet', 'të zgjedhura'],
      ['Mbikëqyrja', 'i njëjti staf'],
      ['Dorëzimi', 'deri te pikat e lidhjes'],
    ],
    side: 'left',
    pose: { theta: 20, phi: 66, dist: 2.15, targetY: -0.06 },
  },

  {
    id: 'ndertimi',
    index: '11',
    kicker: 'Struktura',
    title: 'Struktura dhe instalimet',
    lead:
      'Strukturë betonarme sipas standardeve antisizmike, me izolim të ' +
      'vazhdueshëm nga jashtë.',
    body: [
      'Skeleti është me kolona dhe pllaka betonarme. Bërthama e shkallëve ' +
      'dhe e ashensorit ka mure mbajtëse dhe ndodhet në qendër.',
      'Izolimi termik vendoset nga jashtë mbi të gjithë fasadën dhe nuk ' +
      'ndërpritet te pllakat e kateve.',
      'Çdo apartament dorëzohet me instalime elektrike, hidraulike dhe të ' +
      'ngrohjes deri te pikat e lidhjes, me parapërgatitje për kondicioner ' +
      'në çdo dhomë.',
    ],
    notes: [
      ['Struktura', 'betonarme, antisizmike'],
      ['Bërthama', 'mure mbajtëse, në qendër'],
      ['Izolimi', 'i jashtëm, i pandërprerë'],
      ['Ashensori', 'i instaluar'],
    ],
    side: 'right',
    pose: { theta: -44, phi: 46, dist: 2.9, targetY: 0.1 },
  },

  {
    id: 'kontakt',
    index: '12',
    kicker: 'Kontakt',
    title: 'Na kontaktoni',
    lead:
      'Ndërtesa është në ndërtim dhe apartamentet janë të disponueshme. Na ' +
      'shkruani për planimetritë, çmimet dhe një vizitë në kantier.',
    body: [
      'Golden Hands Construction ndërton në këtë qytet prej vitesh. Çdo ' +
      'projekt kalon nga i njëjti model tredimensional.',
    ],
    side: 'left',
    contact: true,
    pose: { theta: 38, phi: 70, dist: 3.2, targetY: 0.0 },
  },
];

/**
 * The closing summary, below the last chapter.
 *
 * Every line here restates something a chapter already established — it
 * is a recap for someone who scrolled fast, not a place to introduce new
 * claims. If you change a spec above, change it here too.
 */
export const ADVANTAGES = [
  ['Cep me dy fasada', 'Dritë dhe pamje nga dy anë të ndërtesës.'],
  ['Ballkon për çdo apartament', 'Brenda vëllimit të ndërtesës, pa ndërprerje të izolimit.'],
  ['Njësi tregtare në katin e parë', 'Gjashtë njësi, me hyrje të veçantë për banorët.'],
  ['Tarracë e gjelbëruar', 'Hapësirë e jashtme private mbi katin e pestë.'],
  ['Izolim i jashtëm', 'I pandërprerë mbi të gjithë fasadën.'],
  ['Strukturë antisizmike', 'Betonarme, me bërthamë mbajtëse në qendër.'],
];

/**
 * Other projects by the same developer.
 *
 * ⚠ THE NAMES BELOW ARE A GUESS — inferred from this one being called
 * "Golden Hands 4". Replace them with the real project names, and fill in
 * `year` and `note`. Both fields render only when filled, so an unedited
 * entry shows the name alone rather than something invented.
 *
 * Setting this to [] hides the whole section.
 */
export const PROJECTS = [
  { name: 'Golden Hands 1', year: '', note: '' },
  { name: 'Golden Hands 2', year: '', note: '' },
  { name: 'Golden Hands 3', year: '', note: '' },
];

/** The 360° interior tour, opened from the highlighted apartment. */
export const TOUR = {
  label: 'Apartamenti Nr. 2 · 2+1',
  url: 'https://www.coohom.com/pub/modelo/viewer/preview/3FO3CYS0MSC1',
};

/**
 * Contact details for the overlay.
 *
 * `phone`, `address` and `hours` render only when filled in — leave them
 * empty rather than putting a placeholder in, so nothing invented ever
 * reaches a customer.
 */
export const CONTACT = {
  email: 'info@goldenhands.al',
  phone: '',
  address: '',
  hours: '',
  subject: 'Golden Hands 4',

  /**
   * WhatsApp dhe Telegram. Numri në formatin ndërkombëtar, pa '+' dhe pa
   * hapësira: p.sh. '355682057880'.
   *
   * ⚠ Numri i mëposhtëm është marrë nga regjistri publik i QKB-së dhe NUK
   * është konfirmuar se përdoret për WhatsApp/Telegram. Konfirmojeni, ose
   * lëreni bosh — ikona shfaqet vetëm kur fusha është e plotësuar.
   */
  whatsapp: '',
  telegram: '',

  /**
   * Harta te mbivendosja e kontaktit.
   *
   * Vendos koordinatat e ndërtesës. Merri kështu: hap Google Maps, kliko
   * me të djathtën mbi vendin e saktë, dhe numrat që dalin lart janë
   * gjerësia dhe gjatësia — p.sh. 41.3275, 19.8187.
   *
   * Përdoret OpenStreetMap, që nuk kërkon çelës API dhe nuk vendos
   * cookies gjurmuese si Google Maps — pra nuk shton detyrime te
   * politika e privatësisë.
   *
   * ⚠ Pa koordinata nuk shfaqet hartë, por një pamje e ndërtesës, që
   * hapësira të mos mbetet bosh. NUK vendos koordinata me hamendje:
   * një pin i gabuar dërgon një klient në vendin e gabuar.
   */
  map: {
    /* Marrë nga pika e vendit te lidhja e Google Maps: !3d…!4d… */
    lat: '41.3525169',
    lon: '19.807812',
    zoom: 17,
    /* Teksti nën hartë. Bosh = nuk shfaqet. */
    address: 'Paskuqan, Tiranë',
  },
};

/** Every fixed string in the interface, so the wording lives in one file. */
export const UI = {
  loading: 'Po ngarkohet modeli',
  ready: 'Gati',
  dragHint: 'Klikoni apartamentin e theksuar për pamjen virtuale · Rrotulloni ndërtesën me maus',

  navSections: 'Seksionet',
  navChapters: 'Kapitujt',
  contact: 'Kontakt',

  markerTitle: 'Kliko këtu',
  markerSub: 'Hyr brenda apartamentit',

  tourOpen: 'Hapni pamjen virtuale',
  tourHeroTitle: 'Pamja Virtuale e Brendshme',
  tourHeroSub: 'Apartament 2+1',
  tourSlow: 'Po zgjat më shumë se zakonisht?',
  tourNewTab: 'Hapeni pamjen në skedë të re',
  tourBeats: [
    'Po hapet pamja virtuale…',
    'Po ngarkohen ambientet e apartamentit…',
    'Po përgatitet modeli i brendshëm…',
  ],

  contactTitle: 'Na kontaktoni',
  contactLead:
    'Për planimetritë, çmimet dhe një vizitë në kantier — na shkruani ' +
    'dhe ju kthejmë përgjigje brenda ditës.',
  contactEmail: 'Email',
  contactPhone: 'Telefon',
  contactAddress: 'Adresa',
  contactHours: 'Orari',
  contactWrite: 'Na shkruani',
  contactChat: 'Ose na shkruani drejtpërdrejt',
  contactWhere: 'Vendndodhja',
  contactMapLink: 'Hape në hartë',
  contactNoMap: 'Ndërtesa Golden Hands 4',

  /* Contact form */
  formName: 'Emri',
  formEmail: 'Email',
  formPhone: 'Telefon (opsional)',
  formMessage: 'Mesazhi',
  formSubmit: 'Dërgo mesazhin',
  formSending: 'Po dërgohet…',
  formSent: 'Faleminderit. Mesazhi u dërgua dhe ju kthejmë përgjigje brenda ditës.',
  formMailOpened:
    'U hap programi juaj i email-it me mesazhin gati. Dërgojeni që t’ju kthejmë përgjigje.',
  formError: 'Mesazhi nuk u dërgua. Provoni sërish ose na shkruani te',
  formErrName: 'Shkruani emrin tuaj.',
  formErrEmailEmpty: 'Shkruani adresën tuaj të email-it.',
  formErrEmail: 'Kjo adresë email nuk duket e saktë.',
  formErrMessage: 'Shkruani një mesazh.',

  /* Cookie banner — shown only when a cookie-setting analytics
     provider is configured in site.config.js */
  consentTitle: 'Cookies',
  consentText:
    'Përdorim cookies për të matur vizitat në faqe. Asgjë nuk ruhet ' +
    'derisa ju të pranoni.',
  consentLink: 'Politika e privatësisë',
  consentAccept: 'Pranoj',
  consentDecline: 'Refuzoj',

  /* Closing section */
  advantagesKicker: 'Përmbledhje',
  advantagesTitle: 'Përparësitë',
  advantagesLead: 'Të dhënat kryesore të projektit në një vend.',
  projectsKicker: 'Golden Hands Construction',
  projectsTitle: 'Projekte të tjera',
  projectsLead: 'I njëjti staf dhe i njëjti proces ndërtimi.',

  /* Footer legal links */
  legalPrivacy: 'Politika e privatësisë',
  legalTerms: 'Kushtet e përdorimit',
  legalFaq: 'Pyetje të shpeshta',

  close: 'Mbylle',
  legal:
    'Modeli tredimensional është vizatimi i projektit. Pamjet janë ' +
    'ilustruese dhe mund të ndryshojnë gjatë ndërtimit.',
  completion: 'Përfundimi',
};
