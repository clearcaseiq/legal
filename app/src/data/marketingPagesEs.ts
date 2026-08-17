import type { MarketingPage } from './marketingPages'

/**
 * When the Spanish set was last revised. Separate from the English constant so
 * adding or editing a translation does not restamp every English page's
 * `lastmod` with a date on which it did not change.
 */
export const MARKETING_CONTENT_UPDATED_ES = '2026-08-16'

/**
 * The Spanish edition of the evergreen marketing pages.
 *
 * Only pages that already server-render are here. A translated page whose body
 * arrives from an API would hand a crawler an empty Spanish shell, which is
 * worse than not having the URL: it competes with the English page for the same
 * intent and has nothing to rank on. That rules out `/privacy-policy` and
 * `/terms-of-service`, whose text is fetched at runtime and, by the note on
 * those pages, deliberately maintained in English only.
 *
 * `namespaces` lists the slices of `es.json` that this page's markup reads. The
 * server seeds exactly those so its Spanish HTML and the browser's first render
 * agree; the full dictionary still loads after hydration, so a namespace missed
 * here shows up as English text in the server HTML rather than as a crash. Every
 * entry needs `common` and `footer` because the shared Layout reads them.
 *
 * Three of these lists were wrong for as long as they existed, and the Chinese
 * edition is what exposed it. English hiding in a Spanish page is invisible to
 * any automated check, because Spanish and English are the same script and share
 * plenty of words; English hiding in a Chinese page is unmistakable. Rendering
 * the `/zh` twin and looking for Latin text found `auth` missing here, and
 * `supportForm`, `contactPage` and `plaintiffDashboard` missing from the help
 * page. Re-run that comparison after changing what a translated page renders.
 */
export const marketingPagesEs: MarketingPage[] = [
  {
    path: '/es',
    title: 'Evaluación Gratuita de Casos de Lesiones | ClearCaseIQ',
    description:
      'Descubra si tiene un caso de lesiones personales en California, estime el valor de su reclamo y conéctese con un abogado, sin costo alguno.',
    serverRender: true,
    contentUpdated: MARKETING_CONTENT_UPDATED_ES,
    locale: 'es',
    translationOf: '/',
    namespaces: ['common', 'footer', 'home', 'faqSection'],
  },
  {
    path: '/es/como-funciona',
    title: 'Cómo Funciona ClearCaseIQ | Evaluación en Minutos',
    description:
      'Responda unas preguntas sobre su accidente, agregue sus registros médicos y reciba una evaluación preliminar de su caso en minutos, sin costo.',
    serverRender: true,
    contentUpdated: MARKETING_CONTENT_UPDATED_ES,
    locale: 'es',
    translationOf: '/how-it-works',
    namespaces: ['common', 'footer', 'hiw'],
  },
  {
    path: '/es/quienes-somos',
    title: 'Quiénes Somos | ClearCaseIQ, Tecnología Legal',
    description:
      'ClearCaseIQ Corp. es una empresa de tecnología legal en Los Ángeles, no un bufete, que ayuda a víctimas de accidentes en California.',
    serverRender: true,
    contentUpdated: MARKETING_CONTENT_UPDATED_ES,
    locale: 'es',
    translationOf: '/about',
    namespaces: ['common', 'footer', 'aboutPage', 'auth'],
  },
  {
    path: '/es/contacto',
    title: 'Contáctenos | ClearCaseIQ',
    description:
      'Comuníquese con ClearCaseIQ sobre apoyo a demandantes, alianzas con abogados, prensa o privacidad. Respondemos cada consulta por correo.',
    serverRender: true,
    contentUpdated: MARKETING_CONTENT_UPDATED_ES,
    locale: 'es',
    translationOf: '/contact',
    namespaces: ['common', 'footer', 'contactPage', 'auth'],
  },
  {
    path: '/es/centro-de-ayuda',
    title: 'Centro de Ayuda | ClearCaseIQ',
    description:
      'Respuestas sobre cómo iniciar su evaluación, subir registros médicos, la conexión con abogados y la privacidad de sus datos.',
    serverRender: true,
    contentUpdated: MARKETING_CONTENT_UPDATED_ES,
    locale: 'es',
    translationOf: '/help',
    namespaces: ['common', 'footer', 'helpPage', 'legal', 'auth', 'supportForm', 'contactPage', 'plaintiffDashboard'],
  },
  {
    path: '/es/divulgaciones',
    title: 'Divulgaciones de la Plataforma | ClearCaseIQ',
    description:
      'Cómo funciona ClearCaseIQ y qué no es: tecnología legal independiente, no un bufete. Red de abogados, uso de IA y privacidad en California.',
    serverRender: true,
    contentUpdated: MARKETING_CONTENT_UPDATED_ES,
    locale: 'es',
    translationOf: '/disclosures',
    namespaces: ['common', 'footer', 'disclosures'],
  },
  {
    // The hub for the Spanish landing pages. Its body is a Spanish literal
    // component rather than translated chrome, so it needs no namespaces beyond
    // what the shared Layout reads.
    path: '/es/temas',
    title: 'Guías en Español sobre Lesiones | ClearCaseIQ',
    description:
      'Guías en español sobre reclamos por lesiones en California: cuánto vale un caso, los plazos para demandar y la documentación médica.',
    serverRender: true,
    contentUpdated: MARKETING_CONTENT_UPDATED_ES,
    locale: 'es',
    translationOf: '/topics',
    namespaces: ['common', 'footer'],
  },
  {
    path: '/es/red-de-abogados',
    title: 'Red de Abogados | Casos Preseleccionados | ClearCaseIQ',
    description:
      'Únase a la red de ClearCaseIQ y reciba casos de lesiones preseleccionados, con documentos, señales médicas y una puntuación de preparación.',
    serverRender: true,
    contentUpdated: MARKETING_CONTENT_UPDATED_ES,
    locale: 'es',
    translationOf: '/attorney-network',
    namespaces: ['common', 'footer', 'attorneyNet', 'auth', 'results'],
  },
]
