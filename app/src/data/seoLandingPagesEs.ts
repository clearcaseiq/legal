import type { LandingPage, LandingPageCategory } from './seoLandingPages'

/**
 * The Spanish landing pages.
 *
 * Deliberately a different shape from the English corpus. Those 173 pages are
 * assembled at render time by `getDiagramCopy`, `buildPlaintiffGuidance`, and
 * `buildTopicDeepDive`, which compose English sentences from structured data —
 * that machinery is what makes volume possible, and it is also why a Spanish
 * page rendered through the English template would silently fall back to
 * generated English prose in three or four sections. A page that looks Spanish
 * but reads English in the middle is worse than no page: it competes for the
 * same intent and fails the reader who clicked it.
 *
 * So everything here is written, not generated, and the template that renders
 * it has no fallbacks to fall back to. `seoLandingPagesEs.test.ts` fails if any
 * field is empty, which is what keeps that promise mechanical rather than a
 * matter of remembering.
 *
 * Translation status: written by ClearCaseIQ, not yet reviewed by a native
 * Spanish speaker or a California attorney. `reviewedBy` is therefore unset on
 * every page, and the byline says so in as many words. Do not set it without an
 * actual named reviewer who actually read the page.
 */

/** One written section of body copy. `bullets` are optional supporting points. */
export type EsSection = {
  heading: string
  body: string
  bullets?: string[]
}

export type LandingPageEs = LandingPage & {
  locale: 'es'
  /** Paragraph under the H1, before the first section. */
  intro: string
  /** The body, in render order. Never empty; see the test. */
  body: EsSection[]
  /** Optional two-column table, for content that is genuinely chronological. */
  timeline?: {
    heading: string
    intro?: string
    columns: [string, string]
    rows: Array<[string, string]>
  }
  /** Optional list of things to gather or do. */
  checklist?: {
    heading: string
    intro?: string
    items: string[]
  }
  /** Optional callout for a deadline or trap that can end a claim outright. */
  warning?: {
    heading: string
    body: string
  }
}

/** When the Spanish landing set was last revised, separate from the English sets. */
export const CONTENT_UPDATED_ES = '2026-08-16'
export const CONTENT_PUBLISHED_ES = '2026-08-16'

const NOT_A_LAW_FIRM =
  'ClearCaseIQ no es un bufete de abogados y no ofrece asesoría legal. Esta página es informativa y sirve para organizar los hechos de su caso antes de hablar con un abogado.'

/**
 * Dictionary slices the shared Layout reads, applied to every page below rather
 * than written on each one. The body of these pages is Spanish literals and
 * needs no dictionary; the header and footer wrapped around them do, and a page
 * that forgot them would serve Spanish content inside English chrome.
 */
const CHROME_NAMESPACES = ['common', 'footer']

const writtenPages: Array<Omit<LandingPageEs, 'namespaces'>> = [
  {
    slug: '/es/cuanto-vale-mi-caso',
    locale: 'es',
    translationOf: '/how-much-is-my-case-worth',
    category: 'Settlement',
    cluster: 'Valor del caso',
    title: '¿Cuánto vale mi caso de accidente?',
    eyebrow: 'Guía de valor del caso',
    description:
      'Qué determina el valor de un reclamo por lesiones en California: gravedad, tratamiento médico, culpa, ingresos perdidos y límites de la póliza.',
    psychology: 'Necesito una idea realista de lo que vale mi caso antes de decidir qué hacer.',
    cta: 'Abrir la calculadora de acuerdos',
    exampleQueries: [
      'cuánto vale mi caso de accidente',
      'cuánto me toca por un accidente de carro',
      'calculadora de acuerdo de accidente california',
      'cuánto paga el seguro por un accidente',
    ],
    signals: [
      'Gravedad de la lesión',
      'Gastos médicos',
      'Prueba de culpa',
      'Pérdida de ingresos',
      'Límites de la póliza',
      'Continuidad del tratamiento',
    ],
    sections: {
      whyItMatters:
        'No existe una cifra promedio que sirva para su caso. El valor práctico de un reclamo cambia a medida que se aclaran la prueba médica, la culpa, los daños económicos y el seguro disponible. Entender qué mueve esa cifra le permite reconocer una oferta baja cuando la vea.',
      whatToTrack: [
        'Fecha, lugar y descripción del accidente, con fotos si las tiene',
        'Diagnóstico, duración de los síntomas, tratamiento y expedientes médicos',
        'Facturas médicas, gastos de su bolsillo y atención futura recomendada',
        'Días de trabajo perdidos y comprobantes de ingresos',
        'Aseguradora, número de reclamo, límites de la póliza y cualquier oferta recibida',
      ],
      howClearCaseHelps:
        'ClearCaseIQ convierte la pregunta "¿cuánto vale mi caso?" en datos estructurados, identifica qué factores están elevando o reduciendo el rango y señala qué información falta para que la estimación sea más confiable.',
    },
    intro:
      'Es la primera pregunta de casi todo el mundo después de un accidente, y también la que recibe las peores respuestas en internet. Las cifras que aparecen en anuncios son casos extremos elegidos porque impresionan. Esta página explica, en cambio, cuáles son los factores que realmente determinan el valor de un reclamo por lesiones personales en California y por qué dos accidentes que se ven casi idénticos pueden terminar en cifras muy distintas.',
    body: [
      {
        heading: 'Los daños se dividen en dos categorías',
        body: 'En California, lo que usted puede recuperar se divide en daños económicos y daños no económicos. Los daños económicos son los que se pueden sumar con recibos: facturas médicas, tratamiento futuro, salarios perdidos y gastos como transporte a las citas o ayuda en casa. Los daños no económicos son el dolor, la limitación física, la pérdida de sueño y el efecto sobre su vida diaria. Los primeros se comprueban con documentos; los segundos se comprueban con la consistencia del expediente médico y con el relato de cómo cambió su rutina.',
        bullets: [
          'Daños económicos: facturas médicas, atención futura, ingresos perdidos, gastos comprobables',
          'Daños no económicos: dolor, sufrimiento, limitaciones y pérdida de calidad de vida',
        ],
      },
      {
        heading: 'La gravedad documentada importa más que la gravedad sentida',
        body: 'Una lesión que le duele mucho pero que no aparece en ningún expediente médico es difícil de valorar en un reclamo. Las aseguradoras trabajan con lo que está escrito: el diagnóstico, los estudios de imagen, la duración del tratamiento y si un médico relacionó la lesión con el accidente. Por eso una distensión cervical con seis semanas de terapia documentada y un diagnóstico claro puede valer más que un dolor de espalda severo del que solo existe una visita a la sala de emergencias.',
      },
      {
        heading: 'La culpa se reparte, no se decide en blanco y negro',
        body: 'California aplica la negligencia comparativa pura. Esto significa que usted puede recuperar dinero incluso si tuvo parte de la culpa; la cantidad simplemente se reduce en el porcentaje que se le atribuya. Si sus daños se valoran en 100,000 dólares y se determina que usted tuvo 20 por ciento de responsabilidad, la recuperación se reduce a 80,000. Esta regla es más favorable que la de muchos otros estados, donde una parte de culpa puede eliminar el reclamo por completo. También explica por qué las aseguradoras invierten tanto esfuerzo en argumentar que usted contribuyó al accidente.',
      },
      {
        heading: 'El límite de la póliza suele ser el techo real',
        body: 'Un caso puede valer mucho en teoría y muy poco en la práctica si la persona responsable tenía el seguro mínimo. Para pólizas emitidas o renovadas desde el 1 de enero de 2025, California exige apenas 30,000 dólares por persona y 60,000 por accidente en cobertura de lesiones corporales; antes de esa fecha el mínimo era de 15,000 por persona y 30,000 por accidente. Si sus facturas médicas superan ese límite, la pregunta deja de ser cuánto vale el caso y pasa a ser de dónde más puede salir dinero: su propia cobertura para conductores sin seguro o con seguro insuficiente, una póliza comercial si el vehículo era de trabajo, o un segundo responsable.',
      },
      {
        heading: 'Por qué los promedios engañan',
        body: 'Un promedio mezcla un esguince leve con una lesión cerebral y produce una cifra que no describe ninguno de los dos. Peor aún, los promedios que circulan en internet suelen venir de fuentes que tienen un interés en que la cifra parezca alta. Un rango basado en los hechos de su caso, con una explicación de qué lo sube y qué lo baja, es más útil que cualquier promedio nacional, aunque el número sea menos emocionante.',
      },
      {
        heading: 'Lo que baja el valor de un reclamo sólido',
        body: 'Hay factores que reducen el valor de un caso que por lo demás es fuerte, y la mayoría son evitables. El más común es la interrupción del tratamiento: si usted deja de ir al médico durante dos meses, la aseguradora argumentará que ya estaba recuperado. Otro es aceptar una oferta antes de terminar el tratamiento, cuando todavía no se sabe el costo total. También pesan las lesiones previas en la misma zona del cuerpo, las declaraciones grabadas dadas sin preparación y las publicaciones en redes sociales que parecen contradecir las limitaciones descritas.',
        bullets: [
          'Interrupciones en el tratamiento médico',
          'Aceptar una oferta antes de terminar la atención médica',
          'Lesiones previas en la misma zona sin documentar la diferencia',
          'Declaraciones grabadas dadas sin preparación',
          'Facturas o expedientes de algún proveedor que faltan',
        ],
      },
    ],
    checklist: {
      heading: 'Qué reunir antes de estimar el valor',
      intro:
        'Una estimación mejora en la medida en que se apoya en documentos. Si le falta alguno, anote el proveedor y las fechas: una explicación de por qué falta también cuenta.',
      items: [
        'Reporte policial o número de reporte del accidente',
        'Fotos del vehículo, del lugar y de las lesiones visibles',
        'Todos los expedientes y facturas médicas, incluida la sala de emergencias',
        'Estudios de imagen y los informes que los interpretan',
        'Comprobantes de ingresos y días de trabajo perdidos',
        'Carta de la aseguradora con el número de reclamo y cualquier oferta',
        'Nombres de los médicos que aún le están tratando',
      ],
    },
    warning: {
      heading: 'El plazo corre desde el día del accidente',
      body: 'En California, el plazo general para presentar una demanda por lesiones personales es de dos años a partir de la fecha de la lesión. Si el responsable es una entidad pública, como una ciudad o una agencia de transporte, primero hay que presentar un reclamo administrativo en un plazo mucho más corto, normalmente seis meses. Ninguna estimación de valor sirve si el plazo ya venció.',
    },
    faqs: [
      {
        q: '¿ClearCaseIQ puede decirme exactamente cuánto vale mi caso?',
        a: 'No. Ninguna herramienta puede garantizar un resultado, y cualquiera que le prometa una cifra exacta antes de revisar sus expedientes médicos le está vendiendo algo. ClearCaseIQ ofrece un rango informativo basado en los hechos y documentos que usted ingresa, junto con una explicación de qué factores lo están moviendo.',
      },
      {
        q: '¿Puedo reclamar si tuve parte de la culpa del accidente?',
        a: 'Sí. California aplica la negligencia comparativa pura, así que usted puede recuperar daños incluso si fue parcialmente responsable. Su recuperación se reduce en el porcentaje de culpa que se le atribuya, pero no se elimina.',
      },
      {
        q: '¿Por qué la aseguradora me ofreció tan poco?',
        a: 'Las primeras ofertas suelen llegar antes de que termine el tratamiento, cuando el costo total todavía no se conoce y el expediente médico está incompleto. Una oferta hecha en ese momento refleja lo que la aseguradora sabe, no lo que el caso puede valer una vez documentado.',
      },
      {
        q: '¿Los gastos médicos futuros cuentan en el valor del caso?',
        a: 'Sí, cuando están respaldados por la recomendación de un médico. Una cirugía recomendada, inyecciones previstas o terapia continua forman parte de los daños económicos, pero deben constar por escrito en el expediente médico para que la aseguradora las considere.',
      },
      {
        q: '¿Necesito un abogado para saber cuánto vale mi caso?',
        a: 'No para obtener una idea general, que es lo que ofrece esta página. Sí conviene consultar a un abogado cuando hay lesiones graves, culpa disputada, cobertura comercial, una oferta que parece baja o un plazo cercano. La consulta inicial en casos de lesiones personales normalmente no tiene costo.',
      },
    ],
  },

  {
    slug: '/es/plazo-para-demandar-en-california',
    locale: 'es',
    translationOf: '/california-statute-of-limitations-personal-injury',
    category: 'Attorney Intent',
    cluster: 'Plazos legales en California',
    title: 'Plazo para demandar por lesiones en California',
    eyebrow: 'Plazos legales',
    description:
      'Cuánto tiempo tiene para reclamar por lesiones en California: dos años en general y seis meses si el responsable es una entidad pública.',
    psychology: 'No sé cuánto tiempo me queda y tengo miedo de perder el derecho a reclamar.',
    cta: 'Verificar mi plazo',
    exampleQueries: [
      'cuánto tiempo tengo para demandar por un accidente en california',
      'plazo de prescripción lesiones personales california',
      'se me venció el plazo para demandar',
      'demanda contra la ciudad plazo california',
    ],
    signals: [
      'Fecha del accidente',
      'Tipo de reclamo',
      'Entidad pública involucrada',
      'Edad del lesionado',
      'Descubrimiento tardío',
      'Urgencia del plazo',
    ],
    sections: {
      whyItMatters:
        'El plazo de prescripción es el único elemento de un caso que no admite discusión. Un reclamo con lesiones graves, culpa clara y buena documentación se pierde por completo si se presenta un día tarde. Y el plazo que la mayoría de la gente conoce, dos años, no es el que aplica cuando hay una entidad pública involucrada.',
      whatToTrack: [
        'La fecha exacta del accidente o de la lesión',
        'Quién es el responsable y si se trata de una entidad pública o de un empleado del gobierno',
        'La edad del lesionado en la fecha del accidente',
        'Cuándo se descubrió la lesión, si no fue evidente de inmediato',
        'Cualquier reclamo administrativo ya presentado y su fecha',
      ],
      howClearCaseHelps:
        'ClearCaseIQ calcula las fechas límite que aplican a su situación a partir de la fecha del accidente y del tipo de responsable, y le indica cuándo la urgencia justifica hablar con un abogado de inmediato en lugar de seguir reuniendo documentos.',
    },
    intro:
      'En California, el derecho a reclamar tiene fecha de caducidad. Se llama plazo de prescripción, y cuando vence, el tribunal desestima el caso sin importar cuán graves sean las lesiones ni cuán clara sea la culpa del otro. La regla general es de dos años, pero hay varias situaciones en las que el plazo real es mucho más corto, y son precisamente las que sorprenden a la gente.',
    body: [
      {
        heading: 'La regla general: dos años desde la lesión',
        body: 'Para la mayoría de los reclamos por lesiones personales en California, incluidos los accidentes de tránsito, el plazo es de dos años contados desde la fecha en que ocurrió la lesión. No desde el día en que la aseguradora negó el reclamo, ni desde el día en que usted terminó el tratamiento: desde el accidente. Los daños solo a la propiedad, como los del vehículo, tienen un plazo distinto de tres años.',
      },
      {
        heading: 'Seis meses cuando el responsable es el gobierno',
        body: 'Si el vehículo era un autobús municipal, una patrulla, un camión de una agencia de transporte o cualquier vehículo del gobierno, o si la lesión se debió al mal estado de una carretera o de una propiedad pública, primero hay que presentar un reclamo administrativo ante la entidad. El plazo para ese reclamo es de seis meses desde la lesión, no dos años. Si la entidad lo rechaza, se abre un plazo adicional corto para demandar. Perder los seis meses puede terminar el caso incluso cuando los hechos son excelentes, y es el error de plazo más frecuente y más costoso que existe en California.',
      },
      {
        heading: 'Menores de edad: el plazo espera',
        body: 'Cuando la persona lesionada es menor de 18 años, el plazo de dos años generalmente no empieza a correr hasta que cumple la mayoría de edad, lo que en la práctica le da hasta los 20 años para demandar. Esta excepción tiene un límite importante: no se aplica de la misma manera al reclamo de seis meses contra una entidad pública, que sigue teniendo su propio calendario. Si un menor se lesionó en un autobús escolar o en una propiedad pública, no conviene asumir que hay tiempo de sobra.',
      },
      {
        heading: 'Lesiones que no se descubren de inmediato',
        body: 'Algunas lesiones no son evidentes el día del accidente. Cuando una persona razonablemente no podía haber sabido que estaba lesionada ni que la lesión venía de ese hecho, el plazo puede empezar a contar desde el momento del descubrimiento y no desde el accidente. Esta regla existe para situaciones genuinas, no para justificar una demora en buscar atención médica, y quien la invoca tiene que demostrar por qué el descubrimiento fue tardío. La documentación médica de cuándo apareció el síntoma y cuándo se diagnosticó se vuelve central.',
      },
      {
        heading: 'La negligencia médica tiene su propio calendario',
        body: 'Los reclamos por negligencia médica en California siguen una regla distinta: un año desde que usted descubrió o debió descubrir la lesión, o tres años desde que ocurrió, y aplica el plazo que se cumpla primero. Además existe el requisito de avisar al proveedor con noventa días de anticipación antes de demandar. Estas reglas son suficientemente distintas de las de un accidente de tránsito como para justificar la consulta con un abogado en cuanto surja la sospecha.',
      },
      {
        heading: 'Si cree que el plazo ya venció',
        body: 'No dé el caso por perdido sin que alguien revise las fechas. Existen circunstancias que suspenden el conteo: que el responsable haya estado fuera del estado, que la persona lesionada haya estado incapacitada, que el lesionado fuera menor de edad, o que la lesión se haya descubierto tarde. También ocurre que la fecha que la gente cree correcta no lo es. Un abogado puede evaluar si alguna de estas situaciones aplica, y esa evaluación es urgente: si el plazo sigue abierto, cada día cuenta.',
      },
    ],
    timeline: {
      heading: 'Plazos habituales en California',
      intro:
        'Esta tabla resume los plazos más comunes. No cubre todas las situaciones y las excepciones son frecuentes, así que confirme su fecha con un abogado antes de confiar en ella.',
      columns: ['Tipo de reclamo', 'Plazo general'],
      rows: [
        ['Lesiones personales', 'Dos años desde la fecha de la lesión'],
        ['Daños a la propiedad', 'Tres años desde la fecha del daño'],
        ['Reclamo contra una entidad pública', 'Seis meses para el reclamo administrativo'],
        ['Muerte por negligencia', 'Dos años desde la fecha del fallecimiento'],
        ['Negligencia médica', 'Un año desde el descubrimiento o tres desde la lesión'],
        ['Persona lesionada menor de 18 años', 'Generalmente hasta los 20 años'],
      ],
    },
    warning: {
      heading: 'Si hubo un vehículo o una propiedad del gobierno, actúe esta semana',
      body: 'El plazo de seis meses para presentar un reclamo administrativo ante una entidad pública es el más corto y el que menos gente conoce. Si tiene alguna duda sobre quién era el dueño del otro vehículo o de la propiedad donde se lesionó, averígüelo de inmediato: la respuesta cambia el calendario por completo.',
    },
    faqs: [
      {
        q: '¿Cuánto tiempo tengo para demandar por un accidente de carro en California?',
        a: 'En general, dos años desde la fecha del accidente para el reclamo por lesiones y tres años para los daños al vehículo. Si el otro vehículo era del gobierno, primero debe presentar un reclamo administrativo en un plazo de aproximadamente seis meses.',
      },
      {
        q: '¿El plazo se detiene mientras negocio con la aseguradora?',
        a: 'No. Negociar con la aseguradora no suspende el plazo de prescripción, y esperar una respuesta es una de las formas más comunes de perderlo. El plazo solo se detiene al presentar la demanda ante el tribunal.',
      },
      {
        q: '¿Qué pasa si presento la demanda un día tarde?',
        a: 'El tribunal normalmente desestima el caso, sin evaluar los hechos ni las lesiones. Por eso conviene confirmar la fecha límite mucho antes de que se acerque, y no en la última semana.',
      },
      {
        q: '¿Necesito estatus legal en el país para presentar un reclamo dentro del plazo?',
        a: 'No. El estatus migratorio no afecta el plazo ni el derecho a presentar un reclamo por lesiones en California. Tenemos una página dedicada a este tema si es su situación.',
      },
      {
        q: '¿Es lo mismo el plazo para reclamar al seguro que para demandar?',
        a: 'No. Las pólizas de seguro suelen exigir que se avise del accidente con prontitud, un plazo contractual mucho más corto que el legal. El plazo de prescripción es el límite para acudir al tribunal, y cumplir uno no lo exime del otro.',
      },
    ],
  },

  {
    slug: '/es/estatus-migratorio-y-reclamos',
    locale: 'es',
    category: 'Attorney Intent',
    cluster: 'Estatus migratorio y reclamos por lesiones',
    title: '¿Puedo reclamar sin papeles en California?',
    eyebrow: 'Derechos sin importar el estatus',
    description:
      'En California el estatus migratorio no impide reclamar por una lesión ni recibir compensación. Qué protege la ley y qué no le pueden exigir.',
    psychology: 'Me lesionaron, pero tengo miedo de que reclamar me exponga a problemas migratorios.',
    cta: 'Empezar una evaluación confidencial',
    exampleQueries: [
      'puedo demandar sin papeles en california',
      'accidente sin seguro y sin licencia california',
      'me pueden preguntar mi estatus migratorio en una demanda',
      'derechos de indocumentados accidente de trabajo california',
    ],
    signals: [
      'Estatus migratorio irrelevante',
      'Pérdida de ingresos',
      'Sin licencia de conducir',
      'Lesión en el trabajo',
      'Miedo a represalias',
      'Confidencialidad',
    ],
    sections: {
      whyItMatters:
        'El miedo hace que muchas personas lesionadas no reclamen nada, y ese silencio le ahorra dinero a la aseguradora. La ley de California es explícita en este punto: el estatus migratorio no elimina el derecho a una compensación por una lesión causada por otro, y en los casos por lesiones personales esa información normalmente no es admisible ante un jurado.',
      whatToTrack: [
        'Fecha, lugar y descripción del accidente o de la lesión',
        'Toda la atención médica recibida, incluso si pagó en efectivo',
        'Ingresos perdidos, aunque le pagaran en efectivo o sin recibos formales',
        'Nombre del empleador y de la aseguradora, si la lesión fue en el trabajo',
        'Cualquier presión, amenaza o comentario sobre su estatus tras la lesión',
      ],
      howClearCaseHelps:
        'ClearCaseIQ organiza los hechos y los documentos de su lesión sin pedirle número de seguro social ni estatus migratorio, y le explica qué puede esperar antes de que hable con un abogado.',
    },
    intro:
      'Esta es una de las preguntas que la gente no se atreve a hacer en voz alta, y la falta de una respuesta clara en español es exactamente lo que aprovechan quienes se benefician del silencio. La respuesta corta es que en California el estatus migratorio no le quita el derecho a reclamar por una lesión que otra persona le causó. Esta página explica en qué se apoya esa afirmación y qué protecciones concretas existen.',
    body: [
      {
        heading: 'El derecho a reclamar no depende del estatus',
        body: 'Las leyes de California que permiten demandar a quien causa una lesión por negligencia no distinguen entre personas por su estatus migratorio. Quien resulta lesionado por la negligencia de otro puede presentar un reclamo, negociar con la aseguradora y acudir al tribunal. No se necesita ciudadanía, residencia, visa ni número de seguro social para presentar una demanda por lesiones personales en un tribunal estatal de California.',
      },
      {
        heading: 'Su estatus normalmente no es admisible ante un jurado',
        body: 'California fue más allá de la regla general. El Código de Evidencia establece que, en los casos por lesiones personales y muerte por negligencia, la información sobre el estatus migratorio de una persona es inadmisible y no se puede descubrir en el proceso. La razón es práctica: se usaba para intimidar a los demandantes y para predisponer al jurado en lugar de para probar algo relevante sobre el accidente. Si en su caso alguien intenta introducir el tema, su abogado tiene una base legal directa para objetar.',
      },
      {
        heading: 'La pérdida de ingresos se puede reclamar aunque le paguen en efectivo',
        body: 'Los salarios perdidos forman parte de los daños económicos, y el hecho de que le pagaran en efectivo o sin recibos formales no elimina la pérdida; complica su comprobación, que es un problema distinto y resoluble. Sirven los registros de horas, los mensajes con el patrón, los depósitos bancarios, la declaración de un compañero de trabajo y la constancia de un patrón de ingresos anterior. Vale la pena reunir estos elementos desde el principio en lugar de asumir que esa parte del reclamo no existe.',
        bullets: [
          'Registros de horas trabajadas o calendarios propios',
          'Mensajes de texto o WhatsApp con el empleador sobre turnos y pagos',
          'Depósitos o giros que muestren un patrón de ingresos',
          'Declaración de un compañero de trabajo o del supervisor',
        ],
      },
      {
        heading: 'Si la lesión ocurrió en el trabajo',
        body: 'El sistema de compensación laboral de California cubre a los trabajadores lesionados sin distinción de estatus migratorio, y la ley estatal establece que las protecciones laborales se aplican con independencia de ese estatus. También es ilegal que un empleador tome represalias contra usted por reportar una lesión o por reclamar sus derechos, incluida cualquier amenaza relacionada con su situación migratoria. Si recibió una amenaza así, anote la fecha, quién la hizo y con qué palabras: ese registro importa.',
      },
      {
        heading: 'No tener licencia de conducir no es lo mismo que tener la culpa',
        body: 'Si el accidente ocurrió mientras conducía sin licencia, eso puede tener consecuencias propias, pero no convierte automáticamente el accidente en su responsabilidad. La culpa se determina por la conducta que causó la colisión: quién no respetó una señal, quién iba distraído, quién invadió el carril. California también emite licencias sin requisito de estatus migratorio, un detalle que conviene conocer aparte del reclamo.',
      },
      {
        heading: 'Qué esperar de un abogado y qué preguntar',
        body: 'La mayoría de los abogados de lesiones personales en California trabajan por honorarios de contingencia: cobran un porcentaje solo si obtienen una recuperación, sin pago adelantado. La comunicación con su abogado es confidencial. Es legítimo preguntar en la primera consulta si atienden en español, cómo protegen la información sensible del caso y qué experiencia tienen con clientes en su misma situación. Una respuesta evasiva a esa última pregunta es información útil.',
        bullets: [
          '¿Cobran solo si el caso se resuelve a mi favor y qué porcentaje?',
          '¿Puedo comunicarme con ustedes en español durante todo el caso?',
          '¿Tienen experiencia con clientes preocupados por su estatus migratorio?',
          '¿Quién tendrá acceso a la información de mi caso?',
        ],
      },
    ],
    checklist: {
      heading: 'Qué reunir, sin necesidad de documentos migratorios',
      intro: 'Nada de esta lista requiere estatus legal, número de seguro social ni licencia.',
      items: [
        'Reporte policial del accidente o su número, si existe',
        'Fotos del lugar, de los vehículos y de las lesiones visibles',
        'Nombre y datos del seguro de la otra persona involucrada',
        'Todos los expedientes y recibos médicos, incluso los pagados en efectivo',
        'Constancia de los ingresos que dejó de recibir',
        'Nombres y teléfonos de testigos',
      ],
    },
    warning: {
      heading: 'El plazo corre igual para todos',
      body: 'Las protecciones descritas aquí no alargan el plazo para reclamar. En California el plazo general por lesiones personales es de dos años desde el accidente, y de aproximadamente seis meses si el responsable es una entidad pública. El miedo a preguntar es, en la práctica, la forma más común de perder el derecho por vencimiento del plazo.',
    },
    faqs: [
      {
        q: '¿Pueden preguntarme por mi estatus migratorio si demando?',
        a: 'En los casos por lesiones personales y muerte por negligencia en California, la ley establece que esa información es inadmisible y no se puede solicitar durante el proceso. Si alguien intenta introducir el tema, su abogado puede objetar con base en esa norma.',
      },
      {
        q: '¿Reclamar puede afectar mi situación migratoria?',
        a: 'Presentar un reclamo por lesiones es un procedimiento civil estatal, distinto del sistema de inmigración. Dicho esto, cada situación personal es diferente y esta página es informativa, no asesoría legal: si tiene una preocupación migratoria concreta, conviene consultarla con un abogado de inmigración además del abogado de lesiones.',
      },
      {
        q: '¿Necesito número de seguro social para presentar un reclamo?',
        a: 'No se necesita un número de seguro social para presentar una demanda por lesiones personales en un tribunal estatal de California. Algunos trámites administrativos o de pago pueden requerir identificación, y su abogado puede explicarle cómo se maneja eso en su caso.',
      },
      {
        q: '¿Puedo recibir compensación si me lesioné trabajando?',
        a: 'La compensación laboral de California cubre a los trabajadores lesionados sin distinción de estatus migratorio. También es ilegal que un empleador tome represalias por reportar una lesión, incluidas las amenazas relacionadas con el estatus.',
      },
      {
        q: '¿Y si conducía sin licencia cuando ocurrió el accidente?',
        a: 'Conducir sin licencia puede tener consecuencias propias, pero no determina por sí solo quién tuvo la culpa del accidente. La responsabilidad se evalúa según la conducta que causó la colisión.',
      },
    ],
  },

  {
    slug: '/es/dolor-de-cuello-despues-de-un-accidente',
    locale: 'es',
    translationOf: '/injuries/neck-pain-after-accident',
    category: 'Symptoms',
    cluster: 'Dolor de cuello después de un accidente',
    title: 'Dolor de cuello después de un accidente',
    eyebrow: 'Síntomas y documentación',
    description:
      'Por qué el dolor de cuello aparece días después de un choque, cuándo buscar atención médica y cómo se documenta la lesión para un reclamo.',
    psychology: 'Me empezó a doler el cuello después del choque y no sé si es grave ni qué debo hacer.',
    cta: 'Evaluar mis síntomas',
    exampleQueries: [
      'dolor de cuello después de un accidente de carro',
      'latigazo cervical cuánto dura',
      'me duele el cuello dos días después del choque',
      'cuánto paga el seguro por latigazo cervical',
    ],
    signals: [
      'Aparición tardía del dolor',
      'Rango de movimiento limitado',
      'Dolor que baja al brazo',
      'Dolores de cabeza',
      'Duración del tratamiento',
      'Estudios de imagen',
    ],
    sections: {
      whyItMatters:
        'El dolor de cuello es la lesión más común en los choques por alcance y también la más cuestionada por las aseguradoras. La diferencia entre un reclamo que se toma en serio y uno que se descarta casi siempre está en la documentación médica: cuándo empezó el dolor, quién lo registró y si el tratamiento fue continuo.',
      whatToTrack: [
        'El día y la hora en que empezó el dolor, aunque fuera días después del choque',
        'Si el dolor baja al hombro, al brazo o a la mano, y si hay hormigueo o entumecimiento',
        'Dolores de cabeza, mareo, náuseas o problemas para dormir',
        'Movimientos que ya no puede hacer y tareas diarias que tuvo que dejar',
        'Cada visita médica, terapia y medicamento, con fechas',
      ],
      howClearCaseHelps:
        'ClearCaseIQ organiza la cronología de sus síntomas y su tratamiento, identifica los vacíos que una aseguradora usaría en su contra y señala qué expedientes conviene solicitar.',
    },
    intro:
      'Es muy común salir de un choque sintiéndose bien y despertar al día siguiente sin poder girar la cabeza. Eso no significa que la lesión no sea real ni que sea tarde para atenderla, pero sí crea un problema práctico: la aseguradora tratará ese intervalo como prueba de que el dolor no vino del accidente. Esta página explica por qué el dolor aparece tarde, qué hacer al respecto y cómo se documenta una lesión de cuello para que se sostenga.',
    body: [
      {
        heading: 'Por qué el dolor aparece un día o dos después',
        body: 'En una colisión, el cuello se mueve hacia atrás y hacia adelante más rápido de lo que los músculos alcanzan a controlar. Los ligamentos y músculos se estiran más allá de su rango normal, pero la inflamación que produce el dolor tarda horas o días en desarrollarse. A eso se suma la adrenalina del momento, que suprime la sensación de dolor. Por eso la secuencia de sentirse bien en el lugar del accidente y peor al tercer día es la norma y no la excepción.',
      },
      {
        heading: 'Señales que justifican atención médica sin esperar',
        body: 'Hay síntomas que no conviene observar en casa. El dolor que baja al brazo con hormigueo o entumecimiento puede indicar irritación de una raíz nerviosa. La debilidad al agarrar objetos, la pérdida de fuerza en una mano, el dolor de cabeza intenso o que empeora, la confusión, los problemas de visión y el dolor que le impide dormir son motivos para acudir a un médico pronto. Esta página es informativa y no sustituye una evaluación médica.',
        bullets: [
          'Dolor, hormigueo o entumecimiento que baja al brazo o a la mano',
          'Debilidad o pérdida de fuerza al agarrar objetos',
          'Dolor de cabeza intenso, que empeora o acompañado de confusión',
          'Problemas de visión, mareo persistente o náuseas',
          'Dolor que le impide dormir o girar la cabeza',
        ],
      },
      {
        heading: 'Qué documenta realmente una lesión de cuello',
        body: 'Las radiografías se usan sobre todo para descartar fracturas y suelen verse normales en una lesión de tejido blando, algo que las aseguradoras citan como si significara que no hay lesión. Una resonancia magnética muestra discos, ligamentos y nervios, y es el estudio que puede confirmar una hernia o la compresión de una raíz nerviosa. Igual de importantes son las notas del médico sobre el rango de movimiento, los espasmos musculares y su respuesta al tratamiento a lo largo de las semanas: esa progresión documentada es la que sostiene el reclamo.',
      },
      {
        heading: 'La continuidad del tratamiento es lo que más se juzga',
        body: 'Un expediente con visitas regulares durante seis u ocho semanas cuenta una historia coherente. Un expediente con una visita a urgencias, luego nada durante dos meses y después una consulta, cuenta otra: la aseguradora argumentará que usted se recuperó y que el dolor posterior tiene otra causa. Si tuvo que interrumpir el tratamiento por trabajo, por transporte o por dinero, dígalo al médico para que quede anotado. Una interrupción explicada pesa mucho menos que una interrupción sin explicación.',
      },
      {
        heading: 'Cómo las aseguradoras cuestionan estas lesiones',
        body: 'Los argumentos son predecibles y conviene conocerlos de antemano. Que el daño al vehículo fue menor, como si la fuerza sobre el cuerpo se midiera por la abolladura. Que usted tardó en buscar atención médica. Que ya tenía problemas de cuello, lo que en realidad no elimina el reclamo cuando el accidente empeoró una condición previa. Que el tratamiento fue excesivo. Y que sus redes sociales muestran actividad incompatible con el dolor descrito.',
        bullets: [
          '"El golpe fue leve, no pudo causar esa lesión"',
          '"Esperó tres días para ver a un médico"',
          '"Ya tenía degeneración en el cuello antes del accidente"',
          '"El tratamiento fue más largo de lo necesario"',
        ],
      },
      {
        heading: 'Una condición previa no cancela el reclamo',
        body: 'Mucha gente tiene cambios degenerativos en el cuello sin síntomas, sobre todo después de los treinta años. Si el accidente convirtió una condición asintomática en dolor real, eso es una agravación y en California se puede reclamar. La clave está en establecer el contraste: cómo estaba usted antes y cómo quedó después. Los expedientes médicos anteriores, que a primera vista parecen perjudicar el caso, suelen ser lo que demuestra que antes no tenía este dolor.',
      },
    ],
    timeline: {
      heading: 'Cómo suelen evolucionar los síntomas',
      intro:
        'Una secuencia orientativa, no un pronóstico. Lo importante es que cada etapa quede registrada por un médico con la fecha correspondiente.',
      columns: ['Momento', 'Síntomas y señales del caso'],
      rows: [
        ['Primeras horas', 'Poco o ningún dolor por efecto de la adrenalina; conviene una evaluación aun así'],
        ['Día 1 a 3', 'Rigidez, dolor al girar la cabeza, dolor de cabeza que empieza en la base del cráneo'],
        ['Semana 1 a 2', 'El dolor se define; puede aparecer dolor que baja al brazo, hormigueo o problemas de sueño'],
        ['Semana 3 a 6', 'Con terapia suele haber mejoría gradual; la falta de mejoría justifica estudios de imagen'],
        ['Más de 6 semanas', 'El dolor persistente o irradiado sugiere una lesión más allá del tejido blando'],
      ],
    },
    checklist: {
      heading: 'Qué anotar desde hoy',
      intro:
        'Un registro propio, con fechas, es lo que le permite responder con precisión cuando la aseguradora pregunte por detalles de hace tres meses.',
      items: [
        'La fecha y la hora en que notó el dolor por primera vez',
        'Un nivel de dolor diario del 1 al 10 y qué lo empeora',
        'Cada cita médica con fecha, proveedor y lo que le indicaron',
        'Medicamentos, dosis y efectos',
        'Tareas concretas que ya no puede hacer: cargar, conducir, dormir, trabajar',
        'Días de trabajo perdidos y horas reducidas',
      ],
    },
    faqs: [
      {
        q: '¿Es normal que el cuello me empiece a doler días después del choque?',
        a: 'Sí, es muy común. La inflamación tarda en desarrollarse y la adrenalina del momento suprime el dolor. Lo importante es acudir al médico cuando aparezca y explicarle con precisión cuándo empezó, para que la relación con el accidente quede registrada.',
      },
      {
        q: '¿Cuánto dura un latigazo cervical?',
        a: 'Muchos casos mejoran en semanas con tratamiento, pero otros duran meses, y el dolor que baja al brazo o que no mejora después de seis semanas suele indicar algo más que una lesión de tejido blando. La duración real solo la puede evaluar un médico que lo examine.',
      },
      {
        q: 'La radiografía salió normal. ¿Significa que no tengo lesión?',
        a: 'No. Las radiografías sirven principalmente para descartar fracturas y no muestran músculos ni ligamentos. Una lesión de tejido blando puede ser real con radiografía normal; si los síntomas persisten, el estudio que aporta información es la resonancia magnética.',
      },
      {
        q: '¿Puedo reclamar si ya tenía problemas de cuello?',
        a: 'Sí. Si el accidente empeoró una condición previa, esa agravación es reclamable en California. Los expedientes médicos anteriores ayudan a mostrar la diferencia entre su estado antes y después del accidente.',
      },
      {
        q: '¿Afecta mi reclamo si el carro casi no se dañó?',
        a: 'Las aseguradoras lo usan como argumento, pero el daño visible al vehículo no mide la fuerza que recibió su cuerpo. Lo que sostiene el reclamo es la documentación médica: cuándo empezó el dolor, qué encontró el médico y si el tratamiento fue continuo.',
      },
    ],
  },

  {
    slug: '/es/dolor-de-espalda-despues-de-un-accidente',
    locale: 'es',
    translationOf: '/injuries/lower-back-pain-after-accident',
    category: 'Symptoms',
    cluster: 'Dolor de espalda baja después de un accidente',
    title: 'Dolor de espalda baja después de un accidente',
    eyebrow: 'Síntomas y documentación',
    description:
      'Qué significa el dolor de espalda baja tras un choque, cuándo el dolor que baja a la pierna indica un disco y cómo documentar la lesión.',
    psychology: 'Me duele la espalda baja desde el accidente y no sé si va a mejorar solo.',
    cta: 'Evaluar mis síntomas',
    exampleQueries: [
      'dolor de espalda baja después de un accidente de carro',
      'dolor que baja a la pierna después del choque',
      'hernia de disco por accidente california',
      'ciática después de un accidente',
    ],
    signals: [
      'Dolor que baja a la pierna',
      'Hormigueo o entumecimiento',
      'Hallazgos en resonancia',
      'Inyecciones epidurales',
      'Antecedentes de espalda',
      'Limitación para trabajar',
    ],
    sections: {
      whyItMatters:
        'La espalda baja soporta el peso del cuerpo, así que una lesión lumbar afecta casi todo lo que usted hace en el día. También es la zona donde las aseguradoras encuentran con más facilidad un argumento en contra, porque casi todos los adultos tienen algún desgaste visible en los estudios de imagen.',
      whatToTrack: [
        'Cuándo empezó el dolor y si se ha extendido a la cadera, la pierna o el pie',
        'Hormigueo, entumecimiento o debilidad en una pierna',
        'Posiciones y movimientos que lo empeoran: sentarse, agacharse, cargar, toser',
        'Cada estudio de imagen y lo que dice el informe, no solo si se lo hicieron',
        'Días de trabajo perdidos, tareas que ya no puede hacer y ayuda que necesita en casa',
      ],
      howClearCaseHelps:
        'ClearCaseIQ ordena su historial de síntomas y tratamiento en una cronología, marca las interrupciones que una aseguradora usaría como argumento y le indica qué expedientes conviene pedir a cada proveedor.',
    },
    intro:
      'El dolor de espalda baja es una de las consecuencias más frecuentes de un choque y también una de las más difíciles de valorar, porque el desgaste natural de la columna aparece en los estudios de imagen de casi cualquier adulto. Eso le da a la aseguradora una frase lista para usar: que lo que le duele ya estaba ahí antes. Esta página explica qué distingue una lesión lumbar causada por un accidente y cómo se documenta esa diferencia.',
    body: [
      {
        heading: 'Qué le pasa a la columna lumbar en un impacto',
        body: 'Entre las vértebras hay discos que funcionan como amortiguadores. Un impacto puede comprimirlos de golpe y hacer que el material interior se desplace o sobresalga. Cuando ese material toca una raíz nerviosa, el dolor deja de quedarse en la espalda y baja por la pierna. También pueden lesionarse los músculos y ligamentos que sostienen la zona, lo que produce espasmos y rigidez sin que haya daño en el disco.',
      },
      {
        heading: 'El dolor que baja a la pierna cambia el cuadro',
        body: 'Un dolor localizado en la espalda baja suele apuntar a músculos y ligamentos. Un dolor que baja por el glúteo y la parte posterior de la pierna, a veces hasta el pie, con hormigueo o entumecimiento, apunta a una raíz nerviosa comprimida. Esa distinción importa mucho porque cambia el tratamiento, el pronóstico y la seriedad con que se evalúa el reclamo. Si su dolor bajó a la pierna en algún momento, aunque después haya mejorado, asegúrese de que quedó anotado en el expediente.',
        bullets: [
          'Dolor que baja por el glúteo, la pierna o hasta el pie',
          'Hormigueo o entumecimiento en la pierna o los dedos',
          'Debilidad al levantar el pie o al subir escaleras',
          'Dolor que empeora al sentarse, al toser o al agacharse',
        ],
      },
      {
        heading: 'Señales que requieren atención médica urgente',
        body: 'Hay síntomas que no se deben observar en casa ni esperar a la próxima cita. La pérdida de control de la vejiga o del intestino, el entumecimiento en la zona entre las piernas y la debilidad que avanza rápidamente en ambas piernas pueden indicar una compresión grave de los nervios que requiere evaluación inmediata. Esta página es informativa y no sustituye la valoración de un médico.',
      },
      {
        heading: 'Qué muestran los estudios y qué no',
        body: 'Las radiografías muestran huesos y sirven para descartar fracturas, pero no muestran discos ni nervios. La resonancia magnética es el estudio que puede mostrar una hernia, una protrusión o la compresión de una raíz nerviosa. Aquí aparece la complicación: la resonancia también muestra el desgaste acumulado por la edad, y la aseguradora señalará ese desgaste como la causa real de su dolor. Lo que responde a ese argumento no es la imagen por sí sola, sino la correlación entre lo que muestra la imagen, el nervio que corresponde a la pierna que le duele y el momento en que empezaron los síntomas.',
      },
      {
        heading: 'Tener desgaste previo no significa no tener lesión',
        body: 'Los cambios degenerativos en la columna son normales a partir de cierta edad y la mayoría de las personas los tienen sin sentir nada. Si usted trabajaba, cargaba y dormía sin dolor antes del choque, y después del choque no puede, lo relevante es ese cambio. En California una agravación de una condición previa es reclamable. Los expedientes médicos anteriores, que parecen jugar en contra, suelen ser la mejor prueba de que antes de esa fecha usted no tenía este dolor.',
      },
      {
        heading: 'La escalera de tratamiento y por qué se sigue en orden',
        body: 'La atención lumbar normalmente avanza por etapas: primero reposo relativo, medicamentos y terapia física; si el dolor persiste, estudios de imagen; después inyecciones epidurales para reducir la inflamación alrededor del nervio; y solo cuando lo anterior falla se considera la cirugía. Cada etapa que usted completa y que queda documentada refuerza dos cosas a la vez: que el dolor es real y que usted intentó resolverlo de la manera menos invasiva. Saltarse etapas o abandonarlas a medias es lo que genera dudas.',
        bullets: [
          'Terapia física y medicamentos como primera línea',
          'Estudios de imagen cuando el dolor no cede',
          'Inyecciones epidurales para la inflamación del nervio',
          'Cirugía solo cuando lo conservador no funcionó',
        ],
      },
    ],
    timeline: {
      heading: 'Cómo suele evolucionar una lesión lumbar',
      intro:
        'Una secuencia orientativa, no un pronóstico. Lo importante es que cada cambio quede registrado con su fecha por un médico.',
      columns: ['Momento', 'Síntomas y señales del caso'],
      rows: [
        ['Primeras horas', 'Rigidez o poco dolor por efecto de la adrenalina; conviene una evaluación de todos modos'],
        ['Día 1 a 3', 'Dolor y espasmos en la zona baja, dificultad para agacharse o levantarse'],
        ['Semana 1 a 3', 'El dolor se define; si baja a la pierna, sugiere participación de un nervio'],
        ['Semana 4 a 8', 'La terapia suele dar mejoría; la falta de avance justifica una resonancia'],
        ['Más de 8 semanas', 'Dolor persistente o irradiado; se valoran inyecciones y opciones adicionales'],
      ],
    },
    checklist: {
      heading: 'Qué anotar desde hoy',
      items: [
        'La fecha en que notó el dolor y la fecha en que bajó a la pierna, si ocurrió',
        'Un nivel de dolor diario del 1 al 10, con lo que lo empeora',
        'Cada cita, terapia e inyección, con fecha y proveedor',
        'Medicamentos, dosis y efectos',
        'Tareas que dejó de hacer: cargar, conducir, agacharse, estar de pie, dormir',
        'Días de trabajo perdidos, horas reducidas y ayuda que necesita en casa',
      ],
    },
    faqs: [
      {
        q: '¿Cuánto tarda en sanar una lesión de espalda baja?',
        a: 'Muchas lesiones de músculos y ligamentos mejoran en semanas con terapia. Cuando hay participación de un disco o de un nervio, la recuperación suele medirse en meses y a veces no es completa. Solo un médico que lo examine puede estimar su caso.',
      },
      {
        q: 'La resonancia muestra desgaste. ¿Pierdo el reclamo?',
        a: 'No necesariamente. El desgaste es común y suele ser asintomático. Si el accidente convirtió una columna sin dolor en una con dolor, esa agravación es reclamable en California. Lo que lo demuestra es el contraste entre su estado antes y después.',
      },
      {
        q: '¿Por qué me piden todo mi historial médico anterior?',
        a: 'La aseguradora busca antecedentes en la misma zona del cuerpo para atribuirle el dolor. Conviene entender qué autoriza antes de firmar una solicitud amplia de expedientes, porque una autorización general puede abrir años de historial sin relación con el accidente.',
      },
      {
        q: '¿Puedo seguir trabajando mientras me trato?',
        a: 'Es una decisión médica. Si su médico le impone restricciones, pida que queden por escrito y guarde una copia, porque esas restricciones documentan tanto la limitación como cualquier ingreso que haya dejado de recibir.',
      },
      {
        q: '¿Las inyecciones epidurales cambian el valor del reclamo?',
        a: 'Suelen indicar que el dolor no cedió con terapia y que hay inflamación alrededor de un nervio, lo que se valora como una lesión más seria. Aun así, lo determinante es el conjunto: hallazgos de imagen, correlación con sus síntomas y continuidad del tratamiento.',
      },
    ],
  },

  {
    slug: '/es/cuando-contratar-un-abogado',
    locale: 'es',
    translationOf: '/when-to-hire-a-lawyer-after-accident',
    category: 'Attorney Intent',
    cluster: 'Cuándo contratar un abogado',
    title: '¿Cuándo conviene contratar un abogado?',
    eyebrow: 'Decidir con información',
    description:
      'Cuándo conviene un abogado tras un accidente en California, cómo funcionan los honorarios de contingencia y qué llevar a la consulta.',
    psychology: 'No sé si necesito un abogado o si estoy a tiempo de resolverlo yo.',
    cta: 'Revisar mi situación',
    exampleQueries: [
      'necesito un abogado para mi accidente',
      'cuándo contratar un abogado de accidentes',
      'cuánto cobra un abogado de accidentes en california',
      'puedo negociar con el seguro sin abogado',
    ],
    signals: [
      'Gravedad de la lesión',
      'Culpa disputada',
      'Oferta baja',
      'Cobertura comercial',
      'Gravámenes médicos',
      'Plazo cercano',
    ],
    sections: {
      whyItMatters:
        'No todos los reclamos necesitan un abogado, y quien le diga lo contrario tiene un interés. Pero hay situaciones en las que negociar solo cuesta mucho más de lo que ahorra, y casi todas se pueden reconocer desde el principio si uno sabe qué buscar.',
      whatToTrack: [
        'La gravedad de la lesión y si hay cirugía recomendada o limitaciones permanentes',
        'Si la otra parte o su aseguradora discuten quién tuvo la culpa',
        'Cualquier oferta recibida, con su fecha y su monto',
        'Si algún vehículo era comercial, de empresa o de una entidad pública',
        'La fecha del accidente y el plazo que le queda',
      ],
      howClearCaseHelps:
        'ClearCaseIQ organiza los hechos y documentos de su caso y le señala qué factores concretos hacen recomendable una consulta legal, de modo que usted llegue a esa conversación con la información ya ordenada.',
    },
    intro:
      'Hay reclamos que una persona puede resolver por su cuenta: un golpe menor, culpa clara, unas cuantas visitas médicas y una oferta razonable. Y hay reclamos donde intentar resolverlo solo termina costando mucho más que los honorarios de un abogado. La diferencia no depende de cuánto le duela, sino de un conjunto de factores bastante identificables. Esta página los enumera.',
    body: [
      {
        heading: 'Señales de que conviene una consulta',
        body: 'Cada uno de estos factores, por sí solo, justifica al menos una consulta gratuita. Cuando se combinan dos o más, negociar sin ayuda suele salir caro.',
        bullets: [
          'Hospitalización, fractura, cirugía recomendada o limitaciones que parecen permanentes',
          'La otra parte niega la culpa o la aseguradora dice que usted contribuyó',
          'Una oferta que llegó antes de que usted terminara el tratamiento',
          'El otro vehículo era comercial, de empresa, de reparto o de una entidad pública',
          'Hay varios lesionados compitiendo por un mismo límite de póliza',
          'La persona lesionada es un menor de edad',
          'La aseguradora pide una declaración grabada o una autorización amplia de expedientes',
          'El plazo para demandar está cerca',
        ],
      },
      {
        heading: 'Cuándo probablemente no lo necesita',
        body: 'Si el golpe fue leve, la culpa es indiscutible, usted recibió atención médica breve y ya terminó, no perdió ingresos significativos y la oferta cubre sus facturas más una cantidad razonable por las molestias, es perfectamente posible cerrar el asunto por su cuenta. En ese escenario, los honorarios se llevarían una parte de una cifra que ya es adecuada. Vale la pena decirlo con claridad porque casi nadie lo dice.',
      },
      {
        heading: 'Cómo funcionan los honorarios de contingencia',
        body: 'En California, los abogados de lesiones personales trabajan casi siempre por contingencia: no cobran nada por adelantado y su pago es un porcentaje de lo que se recupere. Si no hay recuperación, no hay honorario. El porcentaje habitual ronda un tercio cuando el caso se resuelve mediante negociación y sube si hay que presentar una demanda y litigar, porque el trabajo y el riesgo aumentan.',
      },
      {
        heading: 'Honorarios no es lo mismo que gastos',
        body: 'Es la parte que más sorpresas causa al final. Los honorarios son el porcentaje del abogado. Los gastos del caso son otra cosa: obtención de expedientes, tasas del tribunal, peritos, transcripciones. Además, de la recuperación suelen pagarse los gravámenes médicos, es decir, lo que se le debe a proveedores que atendieron a crédito o a un seguro de salud que pagó su atención. Pregunte desde la primera reunión cómo se calculan los honorarios respecto de los gastos y quién negocia los gravámenes, porque esa negociación puede cambiar de forma importante lo que a usted le queda en la mano.',
        bullets: [
          '¿El porcentaje se calcula antes o después de restar los gastos?',
          '¿Qué gastos se anticipan y qué ocurre con ellos si no hay recuperación?',
          '¿Quién negocia los gravámenes médicos y del seguro de salud?',
          '¿Me entregarán un desglose por escrito antes de que yo acepte cualquier cifra?',
        ],
      },
      {
        heading: 'El costo de esperar demasiado',
        body: 'Un abogado que entra al caso al principio puede preservar evidencia que después desaparece: video de cámaras de seguridad que se borra en semanas, testigos que se olvidan de los detalles, el vehículo antes de que lo repararan o lo desecharan. También puede evitar los errores más comunes de las primeras semanas, como dar una declaración grabada sin preparación o firmar una autorización que abre todo su historial médico. Cuando la consulta ocurre después de la primera oferta, parte de ese trabajo ya no se puede hacer.',
      },
      {
        heading: 'Qué llevar a la consulta',
        body: 'Una primera reunión rinde mucho más cuando usted llega con los documentos ordenados. Y si un abogado no puede atenderlo en su idioma durante todo el caso, no solo en la primera cita, conviene saberlo antes de firmar.',
        bullets: [
          'Reporte del accidente o su número',
          'Fotos del lugar, de los vehículos y de las lesiones',
          'Expedientes y facturas médicas que ya tenga',
          'Cartas de la aseguradora y cualquier oferta por escrito',
          'Comprobantes de los ingresos que dejó de recibir',
          'Su propia póliza, para revisar la cobertura sin seguro o con seguro insuficiente',
        ],
      },
    ],
    warning: {
      heading: 'No firme un acuerdo antes de terminar el tratamiento',
      body: 'Aceptar una oferta y firmar la liberación cierra el reclamo de manera definitiva. Si un mes después su médico recomienda una cirugía, ya no hay a quién reclamarle ese costo. Si no sabe todavía cuánto tratamiento le falta, tampoco puede saber si la cifra es suficiente.',
    },
    faqs: [
      {
        q: '¿Cuánto cobra un abogado de lesiones en California?',
        a: 'Lo habitual es un porcentaje de la recuperación, en torno a un tercio si el caso se resuelve negociando y más si hay que litigar. No se paga nada por adelantado y no hay honorario si no hay recuperación. Los gastos del caso y los gravámenes médicos se manejan aparte del porcentaje, así que conviene pedir el desglose por escrito.',
      },
      {
        q: '¿Puedo negociar con la aseguradora yo mismo?',
        a: 'Sí, y en casos leves con culpa clara suele ser razonable. El problema aparece cuando hay lesiones serias, culpa disputada o cobertura comercial: ahí la diferencia entre una primera oferta y un resultado documentado suele superar con holgura el costo de la representación.',
      },
      {
        q: '¿Es tarde para contratar un abogado si ya hablé con el seguro?',
        a: 'Normalmente no, aunque conviene actuar pronto. Una declaración ya dada o una autorización ya firmada no cierran el caso, pero sí condicionan el terreno, y hay evidencia que se pierde con el tiempo. Lo que sí puede cerrar el caso es haber firmado una liberación al aceptar un acuerdo.',
      },
      {
        q: '¿Necesito estatus legal para contratar un abogado?',
        a: 'No. El derecho a reclamar por una lesión en California no depende del estatus migratorio, y esa información normalmente no es admisible en un caso por lesiones personales. Tenemos una página dedicada a este tema.',
      },
      {
        q: '¿Puedo cambiar de abogado si no estoy conforme?',
        a: 'Generalmente sí. El abogado que deja el caso puede reclamar un gravamen por el trabajo realizado, que se resuelve entre los abogados y no significa pagar dos veces el porcentaje completo. Conviene revisar el acuerdo de honorarios que firmó.',
      },
    ],
  },

  {
    slug: '/es/tacticas-de-las-aseguradoras',
    locale: 'es',
    translationOf: '/education/insurance-settlement-tactics',
    category: 'Educational / SEO Moat',
    cluster: 'Tácticas de las aseguradoras',
    title: 'Tácticas que usan las aseguradoras',
    eyebrow: 'Qué esperar del ajustador',
    description:
      'Las maniobras habituales de una aseguradora tras un accidente: la llamada temprana, la declaración grabada, la oferta rápida y la demora.',
    psychology: 'El ajustador parece amable y no sé si lo que me pide me perjudica.',
    cta: 'Preparar mi caso',
    exampleQueries: [
      'qué decirle al ajustador de seguros',
      'debo dar una declaración grabada al seguro',
      'la aseguradora me ofreció muy poco',
      'el seguro no responde a mi reclamo',
    ],
    signals: [
      'Contacto temprano',
      'Declaración grabada',
      'Oferta rápida',
      'Autorización amplia',
      'Demora prolongada',
      'Revisión de redes sociales',
    ],
    sections: {
      whyItMatters:
        'El ajustador que le llama trabaja para una empresa cuyo resultado mejora cuando usted recibe menos. Eso no lo convierte en una mala persona, pero sí significa que su amabilidad no es una garantía de nada. Conocer las maniobras habituales de antemano cambia por completo cómo se vive esa conversación.',
      whatToTrack: [
        'Fecha, hora y contenido de cada llamada, con el nombre de quien llamó',
        'Cada carta, correo y formulario que reciba, con la fecha',
        'Cualquier oferta, su monto y en qué momento de su tratamiento llegó',
        'Qué documentos firmó y qué autorizó exactamente',
        'Los plazos que la aseguradora le indique y si los cumple',
    ],
      howClearCaseHelps:
        'ClearCaseIQ registra la cronología de su reclamo, ordena la documentación que respalda cada rubro de daños y señala los puntos donde una respuesta apresurada puede costarle.',
    },
    intro:
      'Nada de lo que sigue es ilegal ni secreto: son prácticas normales de una industria cuyo negocio consiste en pagar lo menos posible por cada reclamo. El problema es que funcionan mucho mejor con alguien que no las conoce, y esa es la única ventaja que esta página busca quitarles.',
    body: [
      {
        heading: 'La llamada de los primeros días',
        body: 'Es habitual recibir una llamada muy pronto, a veces al día siguiente, en un tono cordial y comprensivo. Ese momento es el mejor posible para la aseguradora: usted todavía no sabe el alcance de sus lesiones, no tiene un diagnóstico y probablemente dirá que se siente bien o que no es nada grave. Esa frase queda registrada. Es correcto y suficiente confirmar los datos básicos del accidente y decir que preferirá hablar cuando tenga una evaluación médica.',
      },
      {
        heading: 'La declaración grabada',
        body: 'Le dirán que es un trámite de rutina para agilizar el reclamo. Una grabación, sin embargo, fija sus palabras para siempre, incluidas las que usted dijo mientras adivinaba: a qué velocidad iba el otro, cuánto le duele en una escala del uno al diez, si alguna vez le había dolido la espalda. Las preguntas están diseñadas para obtener estimaciones que luego se puedan contrastar. Usted normalmente no está obligado a dar una declaración grabada a la aseguradora de la otra parte, y siempre puede pedir hacerlo más adelante.',
        bullets: [
          '"¿A qué velocidad venía usted?" invita a adivinar',
          '"¿Se siente mejor hoy?" busca una frase de mejoría',
          '"¿Había tenido antes este dolor?" busca una condición previa',
          '"¿Trabajó esta semana?" busca contradecir la limitación descrita',
        ],
      },
      {
        heading: 'La oferta rápida',
        body: 'Una oferta que llega en las primeras semanas suele parecer generosa frente a un bolsillo apretado, y ahí está su eficacia. Lo que se compra con ese dinero es una liberación: el cierre definitivo del reclamo. Si más adelante hace falta una resonancia, unas inyecciones o una cirugía, ese costo ya no tiene a quién reclamarse. Una oferta hecha antes de terminar el tratamiento no puede reflejar el costo total, porque nadie lo conoce todavía.',
      },
      {
        heading: 'La autorización amplia de expedientes',
        body: 'Para evaluar el reclamo necesitan los expedientes relacionados con el accidente, y eso es legítimo. El formulario que suelen enviar, sin embargo, autoriza con frecuencia mucho más: años de historial médico completo, sin límite de fechas ni de proveedores. Con eso se busca cualquier antecedente en la misma zona del cuerpo para atribuirle el dolor. Se puede pedir un alcance limitado, por fechas y por proveedores relacionados con el accidente, antes de firmar.',
      },
      {
        heading: 'La demora como estrategia',
        body: 'Las llamadas sin devolver, el ajustador que cambia, el documento que "nunca llegó" y la revisión que sigue pendiente cansan a cualquiera. La presión económica crece con el tiempo y una oferta baja se vuelve más aceptable en el mes ocho que en el mes dos. Lo que reduce el efecto de esta táctica es dejar constancia por escrito: confirmar cada conversación por correo, guardar copia de todo y anotar cada fecha. Y tener presente que el plazo legal sigue corriendo mientras usted espera.',
      },
      {
        heading: 'Lo que revisan sin decírselo',
        body: 'Sus perfiles públicos en redes sociales se revisan de forma rutinaria. Una foto en una fiesta, en unas vacaciones o cargando a un niño se presentará como incompatible con el dolor que usted describe, sin importar el contexto ni lo que le costó ese día. También pueden solicitar un examen médico con un profesional de su elección. No hace falta borrar nada, pero sí conviene entender que lo publicado puede aparecer en el expediente.',
      },
      {
        heading: 'Lo que sí funciona de su lado',
        body: 'Frente a todo lo anterior no hay trucos, sino una lista corta de conductas consistentes: atención médica continua y documentada, un registro propio con fechas, cuidado con lo que se dice sin preparación, y no cerrar nada antes de saber el costo total. Esas cuatro cosas resuelven la mayoría de los argumentos descritos aquí antes de que se puedan usar.',
        bullets: [
          'Continuidad en el tratamiento, y explicar por escrito cualquier interrupción',
          'Un registro diario de dolor, limitaciones y días de trabajo perdidos',
          'Confirmar por correo cada conversación telefónica',
          'No firmar liberaciones ni autorizaciones amplias sin entender su alcance',
        ],
      },
    ],
    warning: {
      heading: 'Negociar no detiene el plazo legal',
      body: 'Mientras usted espera una respuesta, el plazo para demandar sigue corriendo: dos años desde el accidente en la mayoría de los casos, y unos seis meses para el reclamo administrativo si el responsable es una entidad pública. La demora es cómoda para quien no tiene una fecha límite encima.',
    },
    faqs: [
      {
        q: '¿Estoy obligado a dar una declaración grabada?',
        a: 'Frente a la aseguradora de la otra parte, normalmente no. Su propia póliza puede exigirle cooperar con su aseguradora, que es una situación distinta. En cualquier caso, usted puede pedir posponerla hasta contar con una evaluación médica o con asesoría.',
      },
      {
        q: '¿Qué digo cuando me preguntan cómo me siento?',
        a: 'Lo más seguro es describir hechos y no pronósticos: qué le duele, qué no puede hacer y que sigue en tratamiento. Frases como "ya estoy mejor" o "no fue nada" se citan después como prueba de recuperación.',
      },
      {
        q: '¿Debo firmar la autorización de expedientes que me enviaron?',
        a: 'Antes de firmar, revise el alcance. Muchos formularios autorizan años de historial completo. Se puede solicitar una autorización limitada a las fechas y los proveedores relacionados con el accidente.',
      },
      {
        q: '¿Por qué la oferta subió cuando la rechacé?',
        a: 'Porque la primera cifra rara vez es el techo. Suele estar calculada para cerrar el asunto pronto y de forma económica, no para reflejar el costo documentado del tratamiento y de los ingresos perdidos.',
      },
      {
        q: '¿Puedo grabar mis llamadas con el ajustador?',
        a: 'En California la ley exige, en general, el consentimiento de todas las partes para grabar una conversación confidencial, así que no conviene hacerlo sin avisar. Una alternativa práctica es tomar notas y enviar un correo resumiendo lo conversado, que deja constancia sin ese problema.',
      },
    ],
  },

  {
    slug: '/es/accidentes-de-uber-y-lyft',
    locale: 'es',
    translationOf: '/commercial/rideshare-accidents',
    category: 'Commercial',
    cluster: 'Accidentes en Uber y Lyft',
    title: 'Accidentes en Uber y Lyft en California',
    eyebrow: 'Cobertura de viajes compartidos',
    description:
      'Qué cobertura aplica en un accidente de Uber o Lyft en California y por qué depende de lo que el conductor estaba haciendo en la aplicación.',
    psychology: 'Me accidenté en un Uber y no sé a quién le reclamo.',
    cta: 'Identificar la cobertura de mi caso',
    exampleQueries: [
      'accidente en uber quien paga',
      'me accidenté como pasajero de lyft california',
      'seguro de uber para conductores california',
      'me chocó un conductor de uber',
    ],
    signals: [
      'Estado de la aplicación',
      'Pasajero a bordo',
      'Cobertura de un millón',
      'Período de espera',
      'Capturas del viaje',
      'Conductor de plataforma',
    ],
    sections: {
      whyItMatters:
        'En un accidente común hay una póliza que revisar. En uno de viaje compartido puede haber tres, y cuál responde depende de un detalle que no se ve en la calle: qué estaba haciendo el conductor en la aplicación en ese instante. Ese detalle puede significar la diferencia entre una cobertura mínima y una de un millón de dólares.',
      whatToTrack: [
        'Si el conductor tenía la aplicación abierta, iba en camino a recoger a alguien o llevaba un pasajero',
        'Capturas de pantalla del viaje: recibo, nombre del conductor, ruta y horario',
        'Nombre del conductor, placa y su póliza personal',
        'El reporte del accidente y los datos de todos los involucrados',
        'Toda la atención médica recibida, desde la primera visita',
      ],
      howClearCaseHelps:
        'ClearCaseIQ identifica qué capa de cobertura probablemente aplica según lo que el conductor estaba haciendo, y le indica qué evidencia conviene conservar antes de que desaparezca de la aplicación.',
    },
    intro:
      'Un accidente en un viaje compartido se parece a cualquier otro hasta que llega el momento de averiguar quién paga. Ahí aparece una estructura de tres capas que existe justamente porque no estaba claro si estos conductores eran empleados o trabajadores independientes. Lo que decide qué capa responde es el estado de la aplicación en el momento del choque, y por eso la evidencia del viaje importa tanto como el reporte del accidente.',
    body: [
      {
        heading: 'Las tres capas de cobertura',
        body: 'La cobertura depende de lo que la plataforma llama períodos. Con la aplicación cerrada, el conductor está en su vida privada y responde solo su póliza personal, que además suele excluir el uso comercial. Con la aplicación abierta pero sin viaje asignado, existe una cobertura contingente de montos modestos. Desde que acepta un viaje y hasta que el pasajero baja, aplica una póliza de responsabilidad civil de un millón de dólares. Es el mismo conductor y el mismo carro; lo que cambia es la pantalla.',
        bullets: [
          'Aplicación cerrada: responde la póliza personal del conductor',
          'Aplicación abierta, esperando viaje: cobertura contingente, con montos limitados',
          'En camino a recoger o con pasajero a bordo: cobertura de un millón de dólares',
        ],
      },
      {
        heading: 'Si usted era pasajero',
        body: 'Es la posición más protegida. Un pasajero a bordo está dentro del período de cobertura amplia y prácticamente nunca tiene culpa del accidente, sea que lo haya causado su conductor o un tercero. Aun así hay que actuar rápido con la evidencia: guarde capturas del viaje, del recibo y del nombre del conductor. Esa información se conserva en su cuenta, pero conviene tener copias propias desde el primer día.',
      },
      {
        heading: 'Si otro vehículo lo chocó y era un conductor de plataforma',
        body: 'Aquí es donde más reclamos se subvaloran. Muchas personas presentan el reclamo contra la póliza personal del conductor sin saber que llevaba un pasajero, y aceptan una oferta limitada por el tope de esa póliza cuando había una cobertura mucho mayor disponible. Si el otro carro tenía una calcomanía de la plataforma, si el conductor lo mencionó, o si había un pasajero a bordo, vale la pena averiguarlo antes de negociar cualquier cifra.',
      },
      {
        heading: 'Si usted conduce para la plataforma',
        body: 'Su propia situación es la más compleja de las tres. La póliza personal de automóvil normalmente excluye el uso comercial, así que un accidente ocurrido con la aplicación abierta puede caer en un vacío si usted no contrató un endoso específico para viajes compartidos. Además, la cobertura de la plataforma para sus propias lesiones y para su vehículo funciona de manera distinta según el período y suele incluir un deducible considerable. Conviene revisar su póliza antes de necesitarla.',
      },
      {
        heading: 'Qué hacer en los primeros días',
        body: 'La evidencia digital de un viaje es el elemento que distingue estos casos, y es también el que más fácilmente se pierde entre cientos de viajes posteriores. Conviene asegurarla de inmediato y no cuando alguien la pida.',
        bullets: [
          'Capturas del viaje, del recibo y del nombre del conductor',
          'Reporte a la plataforma desde la aplicación, que genera un registro con fecha',
          'Fotos del lugar, de los vehículos, de las placas y de las calcomanías',
          'Nombres y teléfonos de testigos, incluidos otros pasajeros',
          'Atención médica pronta, incluso si el dolor parece leve',
        ],
      },
      {
        heading: 'Por qué estos casos tardan más',
        body: 'Con tres pólizas posibles, varias personas lesionadas y una discusión sobre el estado de la aplicación, hay más partes con motivos para señalarse entre sí. La aseguradora de la plataforma y la del conductor pueden discrepar sobre cuál responde, y esa discusión consume tiempo antes de que alguien evalúe sus lesiones. Documentar bien desde el principio no acelera a las aseguradoras, pero evita que la demora se convierta en una razón para pagarle menos.',
      },
    ],
    warning: {
      heading: 'Averigüe el estado de la aplicación antes de aceptar una oferta',
      body: 'Aceptar un acuerdo contra la póliza personal del conductor cierra el reclamo. Si más tarde se comprueba que el conductor llevaba un pasajero y que aplicaba la cobertura amplia, esa liberación ya está firmada. La pregunta de qué estaba haciendo en la aplicación es la primera que conviene responder.',
    },
    faqs: [
      {
        q: 'Era pasajero de un Uber y nos chocaron. ¿A quién le reclamo?',
        a: 'Como pasajero durante un viaje activo, normalmente aplica la cobertura amplia de la plataforma, con independencia de quién causó el choque. Guarde capturas del viaje y del recibo, y reporte el accidente desde la aplicación para dejar un registro con fecha.',
      },
      {
        q: '¿Siempre hay un millón de dólares de cobertura?',
        a: 'No. Ese límite aplica desde que el conductor acepta un viaje hasta que el pasajero baja. Con la aplicación abierta y sin viaje asignado la cobertura es contingente y mucho menor, y con la aplicación cerrada solo responde la póliza personal del conductor.',
      },
      {
        q: '¿Cómo sé si el conductor iba en un viaje?',
        a: 'Su propio recibo lo prueba si usted era el pasajero. Si usted iba en otro vehículo, ayudan las declaraciones en el lugar, el reporte del accidente, la presencia de un pasajero y los registros de la plataforma, que se pueden solicitar formalmente durante el reclamo.',
      },
      {
        q: 'Conduzco para la plataforma y me lesioné. ¿Qué cubre mis lesiones?',
        a: 'Depende del período en que estaba y de si contrató un endoso para viajes compartidos en su póliza personal, que de otro modo suele excluir el uso comercial. La cobertura de la plataforma para su propio vehículo suele traer un deducible alto. Conviene revisar ambas pólizas.',
      },
      {
        q: '¿Cambia algo que el conductor sea contratista independiente?',
        a: 'Esa clasificación afecta la relación entre el conductor y la plataforma, no su derecho a reclamar por sus lesiones. La estructura de cobertura por períodos existe precisamente para responder en estos casos.',
      },
    ],
  },

  {
    slug: '/es/cuanto-vale-un-caso-de-mordedura-de-perro',
    locale: 'es',
    translationOf: '/how-much-is-a-dog-bite-case-worth',
    category: 'Settlement',
    cluster: 'Valor de un caso de mordedura de perro',
    title: '¿Cuánto vale un caso de mordedura de perro?',
    eyebrow: 'Guía de valor del caso',
    description:
      'Qué determina el valor de una mordedura de perro en California: gravedad, cicatrices, responsabilidad del dueño y la póliza del hogar.',
    psychology: 'Me mordió un perro y no sé cuánto podría valer mi caso ni quién responde.',
    cta: 'Abrir la calculadora de acuerdos',
    exampleQueries: [
      'cuánto vale una demanda por mordedura de perro',
      'cuánto paga el seguro por mordedura de perro california',
      'responsabilidad del dueño de un perro en california',
      'cicatriz por mordedura de perro indemnización',
    ],
    signals: [
      'Responsabilidad estricta del dueño',
      'Gravedad e infección',
      'Cicatrices y cirugía',
      'Póliza del hogar o del inquilino',
      'Trauma psicológico',
      'Continuidad del cuidado',
    ],
    sections: {
      whyItMatters:
        'California responsabiliza al dueño de un perro por las lesiones de una mordedura aunque el animal nunca hubiera mordido antes. Eso simplifica la culpa, pero no fija la cifra: el valor práctico depende de la gravedad de la herida, de si quedan cicatrices, del riesgo de infección y de la póliza disponible para responder.',
      whatToTrack: [
        'Fecha, lugar y circunstancias de la mordedura, con fotos de las heridas',
        'Quién es el dueño del perro y dónde vive, para ubicar la póliza del hogar',
        'Atención recibida: urgencias, suturas, antibióticos y cirugía plástica',
        'Cicatrices visibles y su ubicación, sobre todo en la cara o las manos',
        'Efectos emocionales, miedo a los perros y pesadillas, en especial en menores',
      ],
      howClearCaseHelps:
        'ClearCaseIQ ordena las fotos, los expedientes y los datos del dueño en una cronología, señala qué factores elevan o reducen el rango y advierte qué información falta para afinar la estimación. ' +
        NOT_A_LAW_FIRM,
    },
    intro:
      'Después de una mordedura de perro, la primera duda suele ser quién paga y la segunda cuánto. En California la ley facilita lo primero, porque el dueño responde por las lesiones sin que haya que probar que el perro era peligroso. Lo segundo depende de varios factores que esta página explica, y que hacen que dos mordeduras parecidas terminen en cifras muy distintas.',
    body: [
      {
        heading: 'El dueño responde aunque el perro nunca hubiera mordido',
        body: 'El Código Civil de California establece la responsabilidad estricta del dueño: si su perro muerde a una persona que estaba legalmente en un lugar público o privado, el dueño responde por esas lesiones sin que importe si sabía que el animal era agresivo. La antigua idea de que "el primer mordisco es gratis" no rige aquí. Esto quita de la mesa gran parte de la discusión sobre culpa y traslada el foco a la gravedad de la herida y a la cobertura disponible.',
      },
      {
        heading: 'La gravedad de la herida marca el punto de partida',
        body: 'Una mordedura superficial que sana en dos semanas no se valora igual que una que llega al músculo, que daña un nervio o que exige cirugía. Cuentan la profundidad, el número de heridas, la necesidad de suturas y la aparición de una infección, que es un riesgo real en las mordeduras. La zona del cuerpo también pesa: una herida en la cara, en una mano o cerca de una articulación suele tener más consecuencias funcionales y estéticas.',
      },
      {
        heading: 'Las cicatrices permanentes pesan por sí solas',
        body: 'Una cicatriz visible, sobre todo en el rostro, es un daño que perdura y que se valora aparte del costo de curar la herida. Las fotos tomadas en distintos momentos, desde el día de la mordedura hasta la cicatriz ya formada, documentan esa evolución. Cuando hay una cirugía plástica recomendada o ya realizada, su costo y su resultado esperado forman parte de lo reclamable.',
      },
      {
        heading: 'El daño emocional es real, sobre todo en niños',
        body: 'Muchas mordeduras dejan una huella que no se ve: miedo intenso a los perros, ansiedad, pesadillas y evitar salir a la calle. En los niños este efecto puede ser más profundo y durar más. Un registro de esos síntomas y, cuando corresponde, la atención psicológica documentada, permiten que ese daño se tome en cuenta en lugar de quedar fuera por no constar en ningún papel.',
      },
      {
        heading: 'La póliza disponible suele ser el techo real',
        body: 'La mayoría de las mordeduras las paga el seguro del hogar o del inquilino del dueño del perro, no el dueño de su bolsillo. Por eso, ubicar esa póliza y su límite es tan importante como describir la herida: un caso grave vale poco en la práctica si no hay cobertura de dónde cobrar. Cuando la mordedura ocurrió en una propiedad rentada o en un negocio, puede haber una segunda póliza que revisar.',
      },
    ],
    checklist: {
      heading: 'Qué reunir antes de estimar el valor',
      intro:
        'Una estimación es tan buena como los documentos que la respaldan. Si le falta alguno, anote el proveedor y las fechas.',
      items: [
        'Fotos de las heridas en distintas fechas y de las cicatrices',
        'Expedientes y facturas de urgencias, suturas, antibióticos y cirugía',
        'Nombre y domicilio del dueño del perro y de cualquier testigo',
        'Reporte a control de animales o a la policía, si se hizo',
        'Constancia de cualquier atención psicológica o de los síntomas emocionales',
        'Días de escuela o de trabajo perdidos por la lesión',
      ],
    },
    warning: {
      heading: 'El plazo también corre en las mordeduras',
      body: 'El plazo general para reclamar por una mordedura de perro en California es de dos años desde la fecha de la lesión. Si el dueño era una entidad pública, o si el animal era un perro policía en servicio, pueden regir reglas y plazos distintos y más cortos, así que conviene confirmar la fecha límite pronto.',
    },
    faqs: [
      {
        q: '¿Tengo que probar que el perro era agresivo?',
        a: 'No. California aplica la responsabilidad estricta del dueño, así que no hace falta demostrar que el perro había mordido antes ni que el dueño sabía que era peligroso. Basta con que usted estuviera legalmente en el lugar donde ocurrió la mordedura.',
      },
      {
        q: '¿Quién paga si el dueño no tiene dinero?',
        a: 'Casi siempre responde la póliza del hogar o del inquilino del dueño, no su bolsillo. Ubicar esa póliza y su límite es clave, porque en la práctica marca el máximo que se puede recuperar.',
      },
      {
        q: '¿Cuentan las cicatrices en el valor del caso?',
        a: 'Sí. Una cicatriz permanente, en especial en la cara o las manos, se valora por separado del costo de curar la herida. Las fotos en distintos momentos ayudan a documentar cómo quedó.',
      },
      {
        q: '¿Y si mordieron a mi hijo?',
        a: 'El caso de un menor puede incluir el daño físico y el emocional, que en los niños suele ser mayor. Además, el plazo para demandar funciona distinto para los menores, aunque conviene no confiarse y revisar las fechas cuanto antes.',
      },
      {
        q: '¿Pierdo el caso si yo provoqué al perro?',
        a: 'No necesariamente. La provocación puede reducir la recuperación bajo la negligencia comparativa, pero rara vez la elimina por completo. Lo que ocurrió justo antes de la mordedura se evalúa según los hechos.',
      },
    ],
  },

  {
    slug: '/es/cuanto-vale-un-caso-de-resbalon-y-caida',
    locale: 'es',
    translationOf: '/how-much-is-a-slip-and-fall-case-worth',
    category: 'Settlement',
    cluster: 'Valor de un caso de resbalón y caída',
    title: '¿Cuánto vale un caso de resbalón y caída?',
    eyebrow: 'Guía de valor del caso',
    description:
      'Qué mueve el valor de una caída en California: gravedad de la lesión, prueba del peligro, aviso al dueño y su parte de culpa.',
    psychology: 'Me caí en una tienda y no sé si tengo caso ni cuánto podría valer.',
    cta: 'Abrir la calculadora de acuerdos',
    exampleQueries: [
      'cuánto vale una demanda por caída en una tienda',
      'me caí en un supermercado indemnización california',
      'responsabilidad del local por una caída',
      'cuánto paga el seguro por una caída',
    ],
    signals: [
      'Prueba del peligro',
      'Aviso previo al dueño',
      'Gravedad de la lesión',
      'Su parte de culpa',
      'Fotos y video del lugar',
      'Continuidad del cuidado',
    ],
    sections: {
      whyItMatters:
        'Una caída se valora distinto que un choque, porque aquí lo difícil no es la lesión sino probar que el lugar era peligroso y que el dueño debió haberlo arreglado. Cuando esa prueba es sólida, la gravedad de la lesión manda; cuando es débil, incluso una lesión seria puede quedar sin cobrar.',
      whatToTrack: [
        'Qué causó la caída: líquido en el piso, un desnivel, mala luz o un cable suelto',
        'Cuánto tiempo llevaba ahí el peligro y si el personal pudo haberlo visto',
        'Fotos y video del lugar el mismo día, antes de que lo limpiaran',
        'Reporte del incidente hecho al local y el nombre de quien lo atendió',
        'La lesión, la atención recibida y la continuidad del cuidado',
      ],
      howClearCaseHelps:
        'ClearCaseIQ ordena las fotos, el reporte del local y los expedientes en una cronología, marca dónde falta la prueba del peligro y le indica qué conviene solicitar antes de que desaparezca. ' +
        NOT_A_LAW_FIRM,
    },
    intro:
      'La pregunta de cuánto vale una caída tiene una respuesta poco intuitiva: depende menos de lo grave que sea la lesión y más de si se puede probar que el lugar era peligroso y que el dueño lo sabía o debió saberlo. Esta página explica qué convierte una caída en un caso con valor y qué lo debilita.',
    body: [
      {
        heading: 'Caerse no basta: hay que probar un peligro',
        body: 'Que usted se haya caído y lesionado no significa por sí solo que alguien deba pagar. En California hay que demostrar que existía una condición peligrosa en el lugar, como un derrame, un piso disparejo o una escalera sin pasamanos. Sin esa condición, no hay responsabilidad del dueño, por dolorosa que haya sido la caída. Por eso la prueba del peligro es el primer factor de valor.',
      },
      {
        heading: 'El aviso: que el dueño lo supiera o debiera saberlo',
        body: 'No basta con que existiera un peligro; hay que mostrar que el responsable del lugar lo conocía o que llevaba ahí el tiempo suficiente como para que un negocio cuidadoso lo hubiera detectado y corregido. Un derrame que ocurrió un minuto antes es distinto de uno que estuvo dos horas a la vista de los empleados. Por eso importa cuánto tiempo llevaba el peligro y si había cámaras o registros que lo muestren.',
      },
      {
        heading: 'La gravedad de la lesión fija el rango',
        body: 'Una vez que la responsabilidad es sólida, el valor sigue las mismas reglas que otras lesiones: una fractura de muñeca o de cadera, una lesión de cabeza o una cirugía valen mucho más que un golpe que sana solo. Las caídas producen con frecuencia fracturas y lesiones de cabeza, sobre todo en personas mayores, y esas consecuencias, bien documentadas, son el motor de la cifra.',
      },
      {
        heading: 'Su propia parte de culpa reduce la cifra',
        body: 'California aplica la negligencia comparativa pura, así que su parte de responsabilidad reduce la recuperación en ese porcentaje, pero no la elimina. El local argumentará que usted no miraba por dónde caminaba, que llevaba calzado inadecuado o que ignoró una señal de advertencia. Esos argumentos bajan la cifra en la medida en que se acepten, y por eso conviene documentar bien las circunstancias reales de la caída.',
      },
      {
        heading: 'La prueba desaparece rápido',
        body: 'El derrame se limpia, la caja rota se retira y el video de seguridad se borra, a veces en cuestión de días. Un caso de caída se gana o se pierde en buena parte por lo que se logre conservar el mismo día: fotos del piso, el nombre de los testigos y un reporte por escrito hecho al local. Pedir que se guarde el video cuanto antes puede ser lo que sostenga todo el caso.',
      },
    ],
    checklist: {
      heading: 'Qué reunir el mismo día, si puede',
      intro:
        'Cuanto más cerca del momento de la caída, mejor. Lo que se pierde no siempre se recupera.',
      items: [
        'Fotos del lugar exacto y de lo que causó la caída, antes de que lo limpien',
        'Nombres y teléfonos de testigos que la hayan visto',
        'Un reporte del incidente por escrito y el nombre de quien lo tomó',
        'Fotos de sus lesiones y del calzado que llevaba',
        'Expedientes y facturas de la atención recibida',
        'Una nota pidiendo que se conserve el video de seguridad',
      ],
    },
    warning: {
      heading: 'Si el lugar es público, el plazo es mucho más corto',
      body: 'El plazo general para una caída es de dos años, pero si ocurrió en una acera, un edificio del gobierno o cualquier propiedad pública, primero hay que presentar un reclamo administrativo en unos seis meses. Confundir un caso privado con uno público es una forma frecuente de perder el derecho por vencimiento del plazo.',
    },
    faqs: [
      {
        q: '¿Puedo cobrar solo porque me caí en una tienda?',
        a: 'No de forma automática. Hay que probar que existía una condición peligrosa y que el negocio la conocía o debió conocerla. Sin ese peligro y ese aviso, la caída, aunque real, no genera responsabilidad del local.',
      },
      {
        q: '¿Qué es lo más importante que puedo hacer?',
        a: 'Conservar la prueba el mismo día: fotos de lo que causó la caída antes de que lo limpien, los nombres de los testigos, un reporte por escrito y una solicitud de que se guarde el video de seguridad.',
      },
      {
        q: '¿Pierdo el caso si iba distraído?',
        a: 'No necesariamente. Su parte de culpa reduce la recuperación en ese porcentaje bajo la negligencia comparativa pura, pero rara vez la elimina si el peligro y el aviso están bien probados.',
      },
      {
        q: '¿Cuánto vale una caída con fractura?',
        a: 'No hay una cifra fija. Una vez que la responsabilidad es sólida, una fractura o una lesión de cabeza eleva bastante el rango, pero el valor final depende de la gravedad documentada, de la recuperación y de la cobertura disponible.',
      },
      {
        q: '¿Y si me caí en una propiedad del gobierno?',
        a: 'Cambia el calendario por completo. Antes de demandar hay que presentar un reclamo administrativo ante la entidad en un plazo aproximado de seis meses, mucho más corto que los dos años habituales.',
      },
    ],
  },

  {
    slug: '/es/cuanto-vale-un-caso-de-muerte-por-negligencia',
    locale: 'es',
    translationOf: '/how-much-is-a-wrongful-death-case-worth-in-california',
    category: 'Settlement',
    cluster: 'Valor de un caso de muerte por negligencia',
    title: 'Valor de un caso de muerte por negligencia',
    eyebrow: 'Guía de valor del caso',
    description:
      'Qué se puede recuperar por una muerte por negligencia en California, quién puede reclamar y qué determina el valor del caso.',
    psychology: 'Perdí a un familiar por culpa de otro y no sé qué corresponde ni por dónde empezar.',
    cta: 'Empezar una evaluación confidencial',
    exampleQueries: [
      'demanda por muerte por negligencia california',
      'cuánto se paga por una muerte injusta',
      'quién puede demandar por la muerte de un familiar',
      'indemnización por accidente mortal california',
    ],
    signals: [
      'Quién tiene derecho a reclamar',
      'Ingresos que aportaba el fallecido',
      'Pérdida de compañía y apoyo',
      'Gastos funerarios',
      'Cobertura disponible',
      'Plazo de dos años',
    ],
    sections: {
      whyItMatters:
        'Ningún cálculo devuelve a la persona, y decirlo con claridad importa. Aun así, la ley de California reconoce pérdidas concretas para la familia, y entender qué reconoce y qué exige ayuda a que la familia no quede además con el peso de un proceso que no comprende.',
      whatToTrack: [
        'La relación de cada familiar con la persona fallecida',
        'Los ingresos y el apoyo económico que la persona aportaba al hogar',
        'Las tareas y el cuidado que la persona daba y que ahora hay que suplir',
        'Los gastos funerarios y de entierro pagados',
        'Quién causó la muerte y qué cobertura o bienes existen para responder',
      ],
      howClearCaseHelps:
        'ClearCaseIQ organiza los documentos y los hechos con discreción, ordena las pérdidas que la ley reconoce y señala el plazo aplicable, para que la familia llegue con la información lista a hablar con un abogado. ' +
        NOT_A_LAW_FIRM,
    },
    intro:
      'Hablar del valor de una vida es incómodo, y esta página lo hace solo porque la falta de información clara deja a muchas familias sin reclamar lo que la ley sí reconoce. En California, cuando la negligencia de otro causa una muerte, ciertos familiares pueden recuperar por pérdidas económicas y por la pérdida de la compañía. Aquí se explica quién puede reclamar y qué determina la cifra.',
    body: [
      {
        heading: 'Quién puede presentar el reclamo',
        body: 'La ley de California define quién tiene derecho a reclamar por una muerte por negligencia, y el orden importa. En primer lugar suelen estar el cónyuge o la pareja de hecho registrada y los hijos. Cuando no hay, el derecho puede pasar a otros familiares según las reglas de herencia, y también a personas que dependían económicamente del fallecido. Definir bien quién reclama es el primer paso, porque afecta todo lo demás.',
      },
      {
        heading: 'Las pérdidas económicas de la familia',
        body: 'Una parte del valor son los aportes económicos que la persona ya no hará: el salario que llevaba a casa, los beneficios y la ayuda económica que daba a su familia, calculados a lo largo de los años que razonablemente habría seguido aportando. También cuentan el valor de las tareas del hogar y del cuidado que la persona brindaba, que ahora alguien tiene que hacer o pagar. Los gastos funerarios y de entierro se suman a este rubro.',
      },
      {
        heading: 'La pérdida de compañía y apoyo',
        body: 'La ley reconoce además una pérdida que no tiene factura: la compañía, la orientación moral, el afecto y el apoyo que la persona daba a su cónyuge y a sus hijos. No hay una fórmula que la convierta en una cifra exacta, y por eso este rubro depende mucho de la relación real y de cómo se describa. En California, el dolor y el sufrimiento del propio fallecido antes de morir se reclaman por una vía distinta, a nombre de su patrimonio.',
      },
      {
        heading: 'La cobertura disponible fija el límite práctico',
        body: 'Como en cualquier caso, el valor teórico sirve de poco si no hay de dónde cobrar. Hay que ubicar todas las fuentes posibles: la póliza de auto del responsable, una póliza comercial si conducía por trabajo, la cobertura de un negocio o de una propiedad, y a veces más de un responsable. En casos de muerte, buscar todas las capas de cobertura suele marcar una diferencia grande en lo que la familia recibe.',
      },
      {
        heading: 'Por qué conviene actuar sin demora',
        body: 'Además del peso emocional, hay razones prácticas para no esperar. La evidencia del hecho que causó la muerte, como un video, los restos de un vehículo o la memoria de los testigos, se pierde con el tiempo. Y el plazo legal corre desde la fecha del fallecimiento. Empezar a ordenar la información pronto no obliga a la familia a decidir nada de inmediato, pero preserva las opciones.',
      },
    ],
    checklist: {
      heading: 'Qué reunir, con calma y sin presión',
      intro:
        'No hace falta tenerlo todo de una vez. Cada documento ayuda a que la evaluación sea más precisa.',
      items: [
        'Acta de defunción y, si existe, el reporte del hecho que causó la muerte',
        'Comprobantes de los ingresos y beneficios que aportaba la persona',
        'Facturas de gastos funerarios y de entierro',
        'La relación familiar de cada persona que podría reclamar',
        'Datos del responsable y de cualquier seguro o bien conocido',
        'Nombres y teléfonos de testigos del hecho',
      ],
    },
    warning: {
      heading: 'El plazo corre desde el fallecimiento',
      body: 'En California el plazo general para reclamar por muerte por negligencia es de dos años desde la fecha del fallecimiento. Si el responsable es una entidad pública, primero hay que presentar un reclamo administrativo en unos seis meses. Perder ese plazo cierra el caso sin importar cuán clara sea la culpa.',
    },
    faqs: [
      {
        q: '¿Quién puede demandar por la muerte de un familiar?',
        a: 'La ley de California da prioridad al cónyuge o pareja de hecho registrada y a los hijos. A falta de ellos, el derecho puede pasar a otros familiares según las reglas de herencia y a personas que dependían económicamente del fallecido.',
      },
      {
        q: '¿Qué se puede recuperar exactamente?',
        a: 'Las pérdidas económicas, como los ingresos y el apoyo que la persona aportaba, el valor de las tareas del hogar que hacía y los gastos funerarios; y las pérdidas no económicas, como la compañía y el apoyo. El sufrimiento del propio fallecido se reclama por una vía separada.',
      },
      {
        q: '¿Cuánto se paga por una muerte por negligencia?',
        a: 'No hay una cifra fija ni un promedio útil. Depende de la edad y los ingresos de la persona, de quién dependía de ella, de la relación familiar y, en la práctica, de la cobertura o los bienes disponibles para responder.',
      },
      {
        q: '¿Importa el estatus migratorio de la familia?',
        a: 'El derecho a reclamar por la muerte de un familiar no depende del estatus migratorio, y en los casos por lesiones y muerte esa información normalmente no es admisible. Tenemos una página dedicada a este tema.',
      },
      {
        q: '¿Cuánto tiempo tenemos para reclamar?',
        a: 'En general dos años desde el fallecimiento, y solo unos seis meses para el reclamo administrativo si el responsable es una entidad pública. Conviene confirmar la fecha límite pronto para no perder el derecho.',
      },
    ],
  },

  {
    slug: '/es/cuanto-vale-un-caso-de-accidente-de-camion',
    locale: 'es',
    translationOf: '/how-much-is-a-truck-accident-case-worth-in-california',
    category: 'Commercial',
    cluster: 'Valor de un caso de accidente de camión',
    title: 'Valor de un caso de accidente de camión',
    eyebrow: 'Guía de valor del caso',
    description:
      'Por qué un choque con un camión comercial en California suele valer más: lesiones graves, varias pólizas y prueba que se pierde rápido.',
    psychology: 'Me chocó un camión grande y no sé a quién reclamarle ni cuánto vale.',
    cta: 'Identificar la cobertura de mi caso',
    exampleQueries: [
      'accidente con camión de carga quién paga',
      'demanda por choque con tráiler california',
      'cuánto vale un accidente con camión comercial',
      'seguro de camiones comerciales california',
    ],
    signals: [
      'Varias pólizas posibles',
      'Empresa de transporte responsable',
      'Bitácoras y caja negra',
      'Lesiones graves',
      'Prueba que se pierde rápido',
      'Cobertura alta disponible',
    ],
    sections: {
      whyItMatters:
        'Un choque con un camión comercial no es un choque de autos más grande. Las lesiones suelen ser más graves, puede haber varias empresas responsables y varias pólizas, y existe evidencia propia del transporte que se destruye o se sobrescribe en poco tiempo si nadie la reclama de inmediato.',
      whatToTrack: [
        'El nombre de la empresa de transporte y del conductor, y a quién pertenece el camión',
        'La carga que llevaba y quién la cargó',
        'Las bitácoras de horas del conductor y los datos de la caja negra del camión',
        'El reporte del accidente y los datos de todos los involucrados',
        'Toda la atención recibida, desde la primera visita',
      ],
      howClearCaseHelps:
        'ClearCaseIQ identifica a los posibles responsables y las capas de cobertura, y señala qué evidencia del camión conviene pedir que se conserve antes de que se pierda. ' +
        NOT_A_LAW_FIRM,
    },
    intro:
      'Los casos de camión comercial se distinguen de un choque común en tres cosas: las lesiones suelen ser más serias, casi siempre hay más de un responsable y más de una póliza, y hay evidencia que desaparece rápido. Esas tres diferencias, juntas, explican por qué estos casos valen más y por qué actuar pronto importa tanto.',
    body: [
      {
        heading: 'No es un choque de autos más grande',
        body: 'La diferencia de peso entre un camión de carga y un auto hace que las lesiones sean, en promedio, mucho más graves: fracturas, lesiones de columna, lesiones de cabeza y a veces consecuencias permanentes. Esa gravedad es el primer motor del valor, y también la razón por la que la parte contraria pelea estos casos con más recursos que un choque menor.',
      },
      {
        heading: 'Casi siempre hay más de un responsable',
        body: 'Detrás de un camión suele haber varias partes: el conductor, la empresa de transporte que lo emplea, el dueño del camión si es distinto, la empresa que cargó la mercancía y, a veces, el fabricante de una pieza que falló. Cada una puede tener su propia responsabilidad y su propia póliza. Identificar a todas es lo que distingue un reclamo bien armado de uno que se conforma con la primera póliza que aparece.',
      },
      {
        heading: 'Varias pólizas y cobertura más alta',
        body: 'Los camiones comerciales suelen estar obligados a llevar coberturas mucho mayores que un auto particular. Eso significa que, cuando la responsabilidad está bien establecida, hay más dinero disponible para responder por una lesión grave. Pero acceder a esa cobertura depende de identificar a la empresa correcta y de vincularla con el accidente, que no siempre es evidente en el lugar del choque.',
      },
      {
        heading: 'La evidencia del camión se pierde pronto',
        body: 'Un camión moderno guarda datos en una caja negra: velocidad, frenado y horas de conducción. El conductor lleva bitácoras de sus tiempos de manejo. Nada de eso dura para siempre; algunos registros se sobrescriben en semanas si nadie pide formalmente que se conserven. Una carta de preservación enviada pronto puede ser la diferencia entre probar que el conductor iba cansado o excedido de horas y quedarse sin esa prueba.',
      },
      {
        heading: 'Por qué la primera oferta suele quedarse corta',
        body: 'Cuando la aseguradora de la empresa ofrece pronto, suele ser antes de que se conozca el alcance real de las lesiones y antes de que se identifiquen todos los responsables. Aceptar esa cifra cierra el reclamo contra todos. En un caso con lesiones graves y varias pólizas en juego, la diferencia entre esa primera oferta y un resultado bien documentado puede ser enorme.',
      },
    ],
    checklist: {
      heading: 'Qué asegurar cuanto antes',
      intro:
        'Parte de esta evidencia solo existe en manos de la empresa y desaparece si nadie la reclama a tiempo.',
      items: [
        'Nombre de la empresa de transporte, del conductor y del dueño del camión',
        'Fotos del camión, de las placas, de los logotipos y del lugar',
        'El reporte del accidente y los datos de los testigos',
        'Una carta pidiendo que se conserven la caja negra y las bitácoras',
        'Todos los expedientes y facturas de la atención recibida',
        'Comprobantes de los ingresos que dejó de recibir',
      ],
    },
    warning: {
      heading: 'La evidencia y el plazo corren en su contra',
      body: 'El plazo general para reclamar por lesiones es de dos años, y de unos seis meses si un vehículo del gobierno estuvo involucrado. Pero en estos casos la evidencia del camión puede perderse mucho antes de esos plazos, así que pedir que se conserve no debe esperar.',
    },
    faqs: [
      {
        q: '¿Por qué un accidente con camión vale más que uno con un auto?',
        a: 'Porque las lesiones suelen ser más graves, casi siempre hay más de un responsable y los camiones comerciales llevan coberturas más altas. Esos tres factores, cuando la responsabilidad está clara, elevan el valor frente a un choque común.',
      },
      {
        q: '¿A quién le reclamo, al conductor o a la empresa?',
        a: 'A menudo a varias partes: el conductor, la empresa que lo emplea, el dueño del camión y hasta quien cargó la mercancía. Cada una puede tener su propia responsabilidad y su propia póliza.',
      },
      {
        q: '¿Qué es la caja negra y por qué importa?',
        a: 'Es el registro electrónico del camión, con datos de velocidad, frenado y tiempos de manejo. Puede probar cómo ocurrió el choque, pero algunos datos se sobrescriben pronto, así que hay que pedir por escrito que se conserven.',
      },
      {
        q: '¿Debo aceptar la primera oferta de la aseguradora?',
        a: 'Conviene ser cauteloso. Las primeras ofertas suelen llegar antes de conocerse el alcance de las lesiones y de identificar a todos los responsables, y aceptarlas cierra el reclamo contra todos ellos.',
      },
      {
        q: '¿Cuánto tiempo tengo para reclamar?',
        a: 'En general dos años desde el choque, y unos seis meses si un vehículo del gobierno estuvo involucrado. Aparte de eso, la evidencia del camión puede perderse antes, así que actuar pronto protege el caso.',
      },
    ],
  },

  {
    slug: '/es/cuanto-vale-un-caso-de-atropello-de-peaton',
    locale: 'es',
    translationOf: '/how-much-is-a-pedestrian-accident-case-worth',
    category: 'Commercial',
    cluster: 'Valor de un caso de atropello de peatón',
    title: '¿Cuánto vale un caso de atropello de peatón?',
    eyebrow: 'Guía de valor del caso',
    description:
      'Qué determina el valor de un atropello de peatón en California: gravedad de la lesión, culpa del conductor y coberturas disponibles.',
    psychology: 'Me atropelló un carro caminando y no sé qué me corresponde.',
    cta: 'Abrir la calculadora de acuerdos',
    exampleQueries: [
      'me atropelló un carro cuánto me toca',
      'demanda por atropello de peatón california',
      'atropello en paso de peatones indemnización',
      'me atropellaron y el conductor no tenía seguro',
    ],
    signals: [
      'Gravedad de la lesión',
      'Culpa del conductor',
      'Su propia cobertura sin seguro',
      'Paso de peatones o cruce',
      'Testigos y video',
      'Continuidad del cuidado',
    ],
    sections: {
      whyItMatters:
        'Una persona a pie no tiene nada que amortigüe el golpe, así que las lesiones de un atropello suelen ser graves. Eso eleva el valor, pero la cifra real depende de quién tuvo la culpa y, sobre todo, de qué cobertura hay para responder cuando el conductor tiene poco o ningún seguro.',
      whatToTrack: [
        'Dónde ocurrió: paso de peatones, esquina, banqueta o media calle',
        'Qué hacía el conductor: velocidad, giro, distracción o luz en rojo',
        'Datos del conductor y de su seguro, y si huyó del lugar',
        'Su propia póliza de auto y la cobertura para conductores sin seguro',
        'La lesión, la atención recibida y la continuidad del cuidado',
      ],
      howClearCaseHelps:
        'ClearCaseIQ ordena los hechos del atropello y sus expedientes, identifica las coberturas que podrían responder, incluida la suya, y señala qué evidencia conviene conservar. ' +
        NOT_A_LAW_FIRM,
    },
    intro:
      'Cuando un carro atropella a una persona a pie, la lesión suele ser seria justamente porque no hay carrocería que la proteja. Por eso estos casos parten de un valor alto. Pero el valor teórico y lo que se recupera son cosas distintas, y la diferencia casi siempre está en la cobertura disponible. Esta página explica qué mueve la cifra.',
    body: [
      {
        heading: 'La gravedad marca el punto de partida',
        body: 'Un atropello concentra toda la fuerza del impacto en el cuerpo de la persona, sin nada que la absorba. Fracturas, lesiones de cabeza, daño a la columna y lesiones internas son frecuentes. Esa gravedad, bien documentada desde la primera atención, es el primer motor del valor, y también la razón por la que la continuidad del cuidado pesa tanto en estos casos.',
      },
      {
        heading: 'La culpa no siempre es del conductor, pero suele serlo',
        body: 'El peatón tiene preferencia en muchos cruces, pero no en todos ni en toda circunstancia. La aseguradora buscará argumentar que usted cruzó fuera del paso, contra la señal o de forma imprevista. Bajo la negligencia comparativa pura, su parte de culpa reduce la recuperación pero rara vez la elimina. Dónde y cómo ocurrió el atropello, con testigos y video, es lo que define ese reparto.',
      },
      {
        heading: 'El gran problema: el conductor con poco seguro',
        body: 'Aquí está la clave práctica de casi todos estos casos. Si el conductor llevaba el seguro mínimo o ninguno, o si huyó y no se le identificó, la cifra real ya no depende de su póliza. Depende de la suya. La cobertura para conductores sin seguro o con seguro insuficiente de su propia póliza de auto puede responder por un atropello, incluso si usted iba a pie y aunque el otro conductor haya escapado.',
      },
      {
        heading: 'Su propia póliza puede ser la que pague',
        body: 'Mucha gente no sabe que su seguro de auto la protege como peatón. La cobertura para conductores sin seguro suele aplicar cuando a usted lo atropella alguien sin cobertura suficiente, sea usted quien conducía, un pasajero o una persona a pie. Revisar su propia póliza cuanto antes, antes de aceptar cualquier oferta, es uno de los pasos que más cambia el resultado en un atropello.',
      },
      {
        heading: 'La evidencia del lugar se pierde rápido',
        body: 'El video de una cámara de tráfico o de un negocio cercano puede mostrar quién tenía el paso, pero se borra en poco tiempo. Los testigos que se detuvieron a ayudar se van y se olvidan de los detalles. Conseguir el nombre de esos testigos y pedir que se conserve cualquier video el mismo día puede ser lo que decida quién tuvo la culpa.',
      },
    ],
    checklist: {
      heading: 'Qué reunir después de un atropello',
      intro:
        'Algunas de estas cosas solo existen los primeros días. Vale la pena buscarlas pronto.',
      items: [
        'El reporte del accidente y los datos del conductor y su seguro',
        'Nombres y teléfonos de los testigos que se detuvieron',
        'Fotos del lugar, del cruce y de la posición de los vehículos',
        'Una nota pidiendo que se conserve el video de cámaras cercanas',
        'Su propia póliza de auto, para revisar la cobertura sin seguro',
        'Expedientes y facturas de toda la atención recibida',
      ],
    },
    warning: {
      heading: 'No acepte una oferta sin revisar su propia póliza',
      body: 'Si el conductor tenía poco o ningún seguro, su cobertura para conductores sin seguro puede ser la fuente principal de dinero. Aceptar la oferta del conductor y firmar la liberación antes de revisar su propia póliza puede cerrar la puerta a esa cobertura.',
    },
    faqs: [
      {
        q: '¿Cuánto vale que me atropelle un carro?',
        a: 'No hay una cifra fija. Los atropellos suelen partir de un valor alto por la gravedad de las lesiones, pero lo que se recupera depende de la culpa y, sobre todo, de la cobertura disponible cuando el conductor tiene poco o ningún seguro.',
      },
      {
        q: '¿Y si el conductor huyó o no tenía seguro?',
        a: 'Su propia cobertura para conductores sin seguro o con seguro insuficiente puede responder por el atropello, incluso si el conductor escapó. Por eso conviene revisar su póliza de auto antes de aceptar cualquier cosa.',
      },
      {
        q: '¿Pierdo el caso si crucé fuera del paso de peatones?',
        a: 'No necesariamente. Su parte de culpa reduce la recuperación bajo la negligencia comparativa pura, pero rara vez la elimina. El lugar y la forma del atropello, con testigos y video, definen ese reparto.',
      },
      {
        q: '¿Mi seguro de auto me cubre aunque iba a pie?',
        a: 'Con frecuencia sí. La cobertura para conductores sin seguro suele aplicar cuando a usted lo atropella alguien sin cobertura suficiente, sea que usted condujera, fuera pasajero o caminara.',
      },
      {
        q: '¿Qué es lo más urgente que puedo hacer?',
        a: 'Conseguir los datos de los testigos y pedir que se conserve el video de cámaras cercanas el mismo día, además de buscar atención pronto y revisar su propia póliza de auto.',
      },
    ],
  },

  {
    slug: '/es/cuanto-vale-un-caso-de-accidente-de-bicicleta',
    locale: 'es',
    translationOf: '/how-much-is-a-bicycle-accident-case-worth',
    category: 'Commercial',
    cluster: 'Valor de un caso de accidente de bicicleta',
    title: '¿Cuánto vale un caso de accidente de bicicleta?',
    eyebrow: 'Guía de valor del caso',
    description:
      'Qué determina el valor de un choque en bicicleta en California: gravedad, culpa del conductor, ley de los tres pies y coberturas.',
    psychology: 'Me chocó un carro andando en bicicleta y no sé cuánto vale mi caso.',
    cta: 'Abrir la calculadora de acuerdos',
    exampleQueries: [
      'me chocó un carro en bicicleta indemnización',
      'demanda por accidente de bicicleta california',
      'ley de los tres pies para ciclistas california',
      'ciclista atropellado quién paga',
    ],
    signals: [
      'Gravedad de la lesión',
      'Culpa del conductor',
      'Ley de los tres pies',
      'Su propia cobertura sin seguro',
      'Testigos y video',
      'Continuidad del cuidado',
    ],
    sections: {
      whyItMatters:
        'Un ciclista tiene los mismos derechos que un conductor en la vía, pero nada que lo proteja del impacto. Por eso las lesiones son a menudo graves y el valor parte alto, aunque la cifra final depende de la culpa del conductor y de la cobertura que exista para responder.',
      whatToTrack: [
        'Cómo ocurrió el choque: giro del carro, puerta abierta, paso demasiado cerca',
        'Datos del conductor y de su seguro, y si huyó del lugar',
        'Su propia póliza de auto y la cobertura para conductores sin seguro',
        'La bicicleta y el casco, que conviene conservar sin repararlos',
        'La lesión, la atención recibida y la continuidad del cuidado',
      ],
      howClearCaseHelps:
        'ClearCaseIQ ordena los hechos del choque y sus expedientes, identifica las coberturas que podrían responder, incluida la suya, y le indica qué conservar. ' +
        NOT_A_LAW_FIRM,
    },
    intro:
      'Un ciclista lesionado por un carro parte de una posición fuerte, porque en California tiene los mismos derechos que un conductor y la ley lo protege de forma expresa. Pero el valor teórico y lo que se recupera dependen de dos cosas: quién tuvo la culpa y qué cobertura hay disponible. Esta página explica ambas.',
    body: [
      {
        heading: 'El ciclista tiene los mismos derechos que un conductor',
        body: 'En California quien va en bicicleta tiene, en general, los mismos derechos y deberes que quien conduce un vehículo. Un conductor que gira delante del ciclista, que abre la puerta en su camino o que lo pasa demasiado cerca puede ser responsable, igual que en un choque entre autos. Ese punto de partida legal es una ventaja, siempre que se documente bien cómo ocurrió el choque.',
      },
      {
        heading: 'La ley de los tres pies y otras protecciones',
        body: 'La ley de California obliga a un conductor a dejar al menos tres pies de distancia al rebasar a un ciclista. Pasar más cerca, invadir el carril de la bicicleta o abrir una puerta sin mirar son conductas que suelen ser negligentes. Cuando el choque encaja en una de esas reglas, la responsabilidad del conductor es más fácil de establecer y el caso se fortalece.',
      },
      {
        heading: 'La gravedad de la lesión fija el rango',
        body: 'Sin carrocería ni cinturón, un ciclista recibe el impacto en el cuerpo. Fracturas, lesiones de cabeza incluso con casco y lesiones de columna son comunes. La gravedad documentada desde la primera atención es el motor principal del valor, y la continuidad del cuidado es lo que sostiene que la lesión fue real y seria.',
      },
      {
        heading: 'Cuando el conductor tiene poco o ningún seguro',
        body: 'Igual que con los peatones, el problema práctico aparece cuando el conductor llevaba el seguro mínimo, no tenía o huyó. En esos casos su propia cobertura para conductores sin seguro o con seguro insuficiente puede responder por el choque, aunque usted iba en bicicleta. Revisar su póliza de auto antes de aceptar cualquier oferta es uno de los pasos que más cambia el resultado.',
      },
      {
        heading: 'Conserve la bicicleta y el casco',
        body: 'La bicicleta dañada y el casco golpeado son evidencia. Muestran la fuerza del impacto y a veces contradicen la versión del conductor. Conviene no repararlos ni tirarlos hasta que el caso avance, y fotografiarlos desde varios ángulos. Si una pieza falló, ese detalle puede abrir además un reclamo aparte contra el fabricante.',
      },
    ],
    checklist: {
      heading: 'Qué reunir después del choque',
      intro:
        'Algunas de estas cosas solo están disponibles los primeros días.',
      items: [
        'El reporte del accidente y los datos del conductor y su seguro',
        'Nombres y teléfonos de testigos',
        'Fotos del lugar, de la bicicleta, del casco y de las lesiones',
        'Una nota pidiendo que se conserve el video de cámaras cercanas',
        'Su propia póliza de auto, para revisar la cobertura sin seguro',
        'Expedientes y facturas de toda la atención recibida',
      ],
    },
    warning: {
      heading: 'No repare la bicicleta ni acepte una oferta sin revisar su póliza',
      body: 'La bicicleta y el casco son evidencia, así que conviene conservarlos. Y si el conductor tenía poco o ningún seguro, su propia cobertura para conductores sin seguro puede ser la fuente principal de dinero, de modo que revísela antes de firmar cualquier liberación.',
    },
    faqs: [
      {
        q: '¿Cuánto vale un accidente de bicicleta?',
        a: 'No hay una cifra fija. Suele partir de un valor alto por la gravedad de las lesiones, pero lo que se recupera depende de la culpa del conductor y de la cobertura disponible cuando este tiene poco o ningún seguro.',
      },
      {
        q: '¿Qué es la ley de los tres pies?',
        a: 'Es la norma de California que obliga a un conductor a dejar al menos tres pies al rebasar a un ciclista. Pasar más cerca suele ser negligencia y ayuda a establecer la responsabilidad del conductor.',
      },
      {
        q: '¿Y si el conductor no tenía seguro o huyó?',
        a: 'Su propia cobertura para conductores sin seguro o con seguro insuficiente puede responder por el choque, aunque usted iba en bicicleta. Por eso conviene revisar su póliza de auto antes de aceptar nada.',
      },
      {
        q: '¿Debo reparar mi bicicleta?',
        a: 'Todavía no. La bicicleta y el casco son evidencia de la fuerza del impacto, así que conviene conservarlos sin reparar y fotografiarlos hasta que el caso avance.',
      },
      {
        q: '¿Pierdo el caso si no llevaba casco?',
        a: 'No de forma automática. Para un adulto el casco no es obligatorio, y su ausencia puede discutirse dentro de la negligencia comparativa, pero rara vez elimina un caso cuando la culpa del conductor es clara.',
      },
    ],
  },
]

export { NOT_A_LAW_FIRM }

export const landingPagesEs: LandingPageEs[] = writtenPages.map((page) => ({
  ...page,
  namespaces: CHROME_NAMESPACES,
}))

export const landingPagesEsBySlug = new Map(landingPagesEs.map((page) => [page.slug, page]))

/**
 * Spanish names for the categories, for the hub headings.
 *
 * Only the categories the Spanish set actually uses. Adding a page in a new
 * category without a label here fails `seoLandingPagesEs.test.ts` rather than
 * rendering an English heading over Spanish pages.
 */
export const CATEGORY_LABELS_ES: Partial<Record<LandingPageCategory, string>> = {
  Settlement: 'Valor del caso y acuerdos',
  'Attorney Intent': 'Plazos y abogados',
  Symptoms: 'Lesiones y síntomas',
  Insurance: 'Problemas con la aseguradora',
  Commercial: 'Camiones y viajes compartidos',
  'Educational / SEO Moat': 'Guías generales',
}

/** The Spanish pages grouped for the hub, in a stable order. */
export function landingPagesEsByCategory() {
  const order = Object.keys(CATEGORY_LABELS_ES) as LandingPageCategory[]
  return order
    .map((category) => ({
      category,
      label: CATEGORY_LABELS_ES[category]!,
      pages: landingPagesEs.filter((page) => page.category === category),
    }))
    .filter((group) => group.pages.length > 0)
}

/** Every Spanish landing path, for the router and the route-coverage test. */
export const landingPageEsSlugs = landingPagesEs.map((page) => page.slug)

/**
 * Siblings to link from a Spanish page.
 *
 * Walks forward through the set and wraps, so every page links to its
 * neighbours and is linked to by the ones behind it. With a set this small that
 * is close to linking everything to everything, which is the point: eight pages
 * reachable only from a hub would each have one inbound link.
 */
export function relatedPagesEs(slug: string, limit = 4): LandingPageEs[] {
  const index = landingPagesEs.findIndex((page) => page.slug === slug)
  if (index < 0) return landingPagesEs.slice(0, limit)

  const picked: LandingPageEs[] = []
  for (let step = 1; picked.length < limit && step < landingPagesEs.length; step += 1) {
    picked.push(landingPagesEs[(index + step) % landingPagesEs.length])
  }
  return picked
}
