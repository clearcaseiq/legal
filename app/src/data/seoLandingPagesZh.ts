import type { LandingPage, LandingPageCategory } from './seoLandingPages'

/**
 * The Simplified Chinese landing pages.
 *
 * The same shape and the same reasoning as the Spanish set in
 * `seoLandingPagesEs`: the English corpus is assembled at render time from prose
 * generators, each with an `|| englishDefault` behind it, so a Chinese page run
 * through that template would fall back to English in whole sections — worse
 * than no page, because it competes for the same reader and fails the one who
 * clicked it. Everything here is therefore written, not generated, and
 * `SeoLandingPageZh` has no fallbacks to fall back to. `seoLandingPagesZh.test.ts`
 * fails on an empty field, which keeps that promise mechanical.
 *
 * Simplified only, matching the `zh.json` dictionary. If Traditional is ever
 * added it needs its own registry and its own `zh-Hant` annotations, not a
 * toggle: the two scripts are separate content sets for separate audiences.
 *
 * Translation status: written by ClearCaseIQ, not yet reviewed by a native
 * Chinese speaker or a California attorney. `reviewedBy` is therefore unset on
 * every page and the byline says so.
 */

/** One written section of body copy. `bullets` are optional supporting points. */
export type ZhSection = {
  heading: string
  body: string
  bullets?: string[]
}

export type LandingPageZh = LandingPage & {
  locale: 'zh'
  /** Paragraph under the H1, before the first section. */
  intro: string
  /** The body, in render order. Never empty; see the test. */
  body: ZhSection[]
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

/** When the Chinese landing set was last revised, separate from the English sets. */
export const CONTENT_UPDATED_ZH = '2026-08-23'
export const CONTENT_PUBLISHED_ZH = '2026-08-23'

const NOT_A_LAW_FIRM =
  'ClearCaseIQ 并非律师事务所，也不提供法律建议。本页仅供参考，用于在您咨询律师前整理案件事实。'

/**
 * Dictionary slices the shared Layout reads, applied to every page below. The
 * body of these pages is Chinese literals and needs no dictionary; the header
 * and footer wrapped around them do, and a page that forgot them would serve
 * Chinese content inside English chrome.
 */
const CHROME_NAMESPACES = ['common', 'footer']

const writtenPages: Array<Omit<LandingPageZh, 'namespaces'>> = [
  {
    slug: '/zh/anjian-jiazhi',
    locale: 'zh',
    translationOf: '/how-much-is-my-case-worth',
    category: 'Settlement',
    cluster: '案件价值',
    title: '我的事故案件值多少钱？',
    eyebrow: '案件价值指南',
    description:
      '在加州，人身伤害索赔的价值取决于伤情、医疗记录、责任划分、误工损失和保险限额。本页解释这些因素。',
    psychology: '在决定下一步之前，我想对案件的真实价值有一个合理的预期。',
    cta: '打开和解金额估算工具',
    exampleQueries: [
      '车祸赔偿能拿多少钱',
      '加州人身伤害赔偿金额',
      '事故和解金怎么算',
      '保险公司会赔多少',
    ],
    signals: ['伤情严重程度', '医疗费用', '责任证据', '误工损失', '保险限额', '治疗连续性'],
    sections: {
      whyItMatters:
        '没有一个“平均数”能套用到您的案件上。索赔的实际价值会随着医疗证据、责任划分、经济损失和可用保险的逐步明确而变化。理解是什么在推动这个数字，才能在收到过低报价时一眼看出。',
      whatToTrack: [
        '事故发生的日期、地点和经过，有照片就一并保存',
        '诊断结果、症状持续时间、治疗过程和病历',
        '医疗账单、自付费用，以及医生建议的后续治疗',
        '误工天数和收入证明',
        '保险公司、理赔编号、保单限额，以及收到的任何报价',
      ],
      howClearCaseHelps:
        'ClearCaseIQ 把“我的案件值多少钱”这个问题转化为结构化数据，指出哪些因素在抬高或压低区间，并提示还缺哪些信息才能让估算更可靠。',
    },
    intro:
      '这是几乎每个人在事故后问的第一个问题，也是网上答案最不靠谱的问题。广告里的数字都是精挑细选出来的极端个案，因为它们够震撼。本页要说的恰恰相反：真正决定加州人身伤害索赔价值的是哪些因素，以及为什么两起看起来几乎一模一样的事故，结果可能天差地别。',
    body: [
      {
        heading: '赔偿分为两大类',
        body: '在加州，您能追回的损失分为经济损失和非经济损失。经济损失是能用单据加总的部分：医疗账单、后续治疗、误工工资，以及就诊交通、居家护理等花费。非经济损失是疼痛、身体活动受限、睡眠受影响，以及对日常生活的整体冲击。前者靠单据证明，后者靠病历的连贯性和您生活如何改变的叙述来证明。',
        bullets: [
          '经济损失：医疗账单、后续治疗、误工收入、可凭证报销的开支',
          '非经济损失：疼痛、痛苦、身体受限和生活质量下降',
        ],
      },
      {
        heading: '有记录的严重程度比“感觉上的严重”更重要',
        body: '一处让您很痛、却没有出现在任何病历里的伤，在索赔中很难估值。保险公司只认写下来的东西：诊断、影像检查、治疗时长，以及医生是否把这处伤和事故联系起来。所以一处有六周治疗记录、诊断清晰的颈部扭伤，可能比只有一次急诊记录的严重背痛更有价值。',
      },
      {
        heading: '责任是按比例分摊的，不是非黑即白',
        body: '加州采用纯比较过失原则。这意味着即使您有部分过错，仍然可以追回赔偿，金额只是按归责给您的百分比相应扣减。如果您的损失估值为十万美元，被认定承担百分之二十的责任，追回的金额就减为八万美元。这条规则比许多其他州更宽松，在那些州，一点过错就可能让索赔彻底泡汤。这也解释了保险公司为什么要花那么大力气去论证是您也造成了事故。',
      },
      {
        heading: '保单限额往往才是真正的天花板',
        body: '一个案件理论上可能很值钱，实际上却拿不到多少——如果责任方买的是最低额度保险。对于 2025 年 1 月 1 日起签发或续保的保单，加州对人身伤害责任的要求也不过是每人三万美元、每次事故六万美元；该日期之前的最低额度是每人一万五千、每次事故三万美元。如果您的医疗账单超过这个限额，问题就不再是案件值多少，而是钱还能从哪里来：您自己的无保险或保险不足驾车人保障、车辆属于商业用途时的商业保单，或者第二个责任方。',
      },
      {
        heading: '为什么“平均值”会误导人',
        body: '一个平均数把轻微扭伤和脑损伤混在一起，得出的数字对两者都不适用。更糟的是，网上流传的平均值往往来自那些希望数字显得很高的来源。一个基于您案件事实、并说明什么在抬高什么在压低的区间，比任何全国平均值都有用，哪怕这个数字听起来没那么激动人心。',
      },
      {
        heading: '哪些做法会拉低一个本来很强的案件',
        body: '有些因素会削弱一个本来很有力的案件，而大多数是可以避免的。最常见的是治疗中断：如果您两个月没去看医生，保险公司就会主张您那时已经康复。其次是在治疗结束前就接受报价，那时总费用还不清楚。此外，同一部位的旧伤、未经准备就录音陈述，以及看似与您所述活动受限相矛盾的社交媒体贴文，都会产生影响。',
        bullets: [
          '治疗中断',
          '在医疗结束前就接受报价',
          '同一部位有旧伤却没记录差异',
          '未经准备就接受录音陈述',
          '某个医疗机构的账单或病历缺失',
        ],
      },
    ],
    checklist: {
      heading: '估算价值前要准备什么',
      intro: '估算的可靠程度取决于它有多少单据支撑。如果缺了某项，把机构名称和日期记下来：缺失的原因本身也算信息。',
      items: [
        '警方报告或事故报告编号',
        '车辆、现场和可见伤情的照片',
        '所有病历和医疗账单，包括急诊',
        '影像检查及其判读报告',
        '收入证明和误工天数',
        '保险公司的信函，含理赔编号和任何报价',
        '仍在为您治疗的医生名单',
      ],
    },
    warning: {
      heading: '时效从事故当天起算',
      body: '在加州，人身伤害诉讼的一般时效是自受伤之日起两年。如果责任方是政府机构，例如市政府或公交机构，则须先在短得多的期限内提出行政索赔，通常是六个月。时效一旦届满，再准确的估值也没有意义。',
    },
    faqs: [
      {
        q: 'ClearCaseIQ 能告诉我案件到底值多少钱吗？',
        a: '不能。没有任何工具能保证结果，任何在看过您病历之前就承诺一个确切数字的，都是在向您推销东西。ClearCaseIQ 会根据您录入的事实和单据给出一个仅供参考的区间，并说明哪些因素在左右它。',
      },
      {
        q: '事故我也有部分过错，还能索赔吗？',
        a: '可以。加州采用纯比较过失原则，所以即使您负有部分责任，仍能追回赔偿。您追回的金额会按归责给您的过错比例扣减，但不会被清零。',
      },
      {
        q: '保险公司为什么给我报价这么低？',
        a: '第一次报价往往在治疗结束前就送来，那时总费用还不清楚、病历也不完整。此时给出的报价反映的是保险公司当下知道的情况，而不是案件在记录齐全后可能达到的价值。',
      },
      {
        q: '未来的医疗费用算进案件价值里吗？',
        a: '算，前提是有医生的建议作支撑。建议进行的手术、计划中的注射或持续的治疗都属于经济损失，但必须在病历中有书面记载，保险公司才会考虑。',
      },
      {
        q: '想知道案件值多少，需要请律师吗？',
        a: '要一个大致概念不需要，这正是本页提供的。但在伤情严重、责任有争议、涉及商业保险、报价明显偏低或时效临近时，就该咨询律师。人身伤害案件的初次咨询通常是免费的。',
      },
    ],
  },

  {
    slug: '/zh/jiazhou-susong-shixiao',
    locale: 'zh',
    translationOf: '/california-statute-of-limitations-personal-injury',
    category: 'Attorney Intent',
    cluster: '加州法律时效',
    title: '加州人身伤害的诉讼时效',
    eyebrow: '法律时效',
    description:
      '在加州，人身伤害索赔一般有两年时效；若责任方是政府机构，须在六个月内先提出行政索赔。',
    psychology: '我不知道自己还剩多少时间，很怕错过索赔的期限。',
    cta: '核对我的时效期限',
    exampleQueries: [
      '加州车祸多久内要起诉',
      '人身伤害诉讼时效加州',
      '错过起诉期限还能索赔吗',
      '告政府机构的期限',
    ],
    signals: ['事故日期', '索赔类型', '是否涉及政府机构', '受伤人年龄', '延迟发现', '期限紧迫程度'],
    sections: {
      whyItMatters:
        '时效是少数几个能凭一己之力终结案件的因素之一。无论伤情多重、责任多清楚，期限一过，法院几乎必然驳回。所以时效应当在决定其他事情之前就先弄清楚。',
      whatToTrack: [
        '受伤的确切日期，以及您第一次察觉伤情的日期',
        '责任方是个人、公司，还是政府机构',
        '受伤人是否为未成年人或当时无行为能力',
        '是否已向任何一方寄出信函或提出行政索赔',
        '任何来自保险公司、载有截止日期的书面通知',
      ],
      howClearCaseHelps:
        'ClearCaseIQ 会根据事故类型和涉及方，标出适用于您情况的期限，并提示哪个是最短、最紧迫的那一个。' +
        NOT_A_LAW_FIRM,
    },
    intro:
      '在加州，起诉是有期限的，一旦错过，再有力的案件也基本无法挽回。多数人身伤害索赔的期限是两年，但有几种例外会把它大幅缩短或有条件地延长。本页解释一般规则、最重要的例外，以及为什么涉及政府机构时“两年”这个数字会突然失效。',
    body: [
      {
        heading: '一般规则：自受伤之日起两年',
        body: '加州对人身伤害的一般诉讼时效是自受伤之日起两年。对于大多数车祸、行人事故和跌倒受伤，这就是那个起决定作用的日期。两年听起来很长，但取证、治疗和与保险公司谈判都要花时间，等到临近期限才找律师，往往已经太迟。',
      },
      {
        heading: '涉及政府机构时期限要短得多',
        body: '如果致害方是政府机构——例如市政府、县政府或公交系统——您必须先提出行政索赔，通常是在受伤之日起六个月内。机构可以拒绝该索赔，之后才另有一段起诉的期限。错过这个六个月的窗口，往往会连带断送整个案件，所以在涉及公共实体时，这是最需要优先弄清的日期。',
      },
      {
        heading: '“延迟发现”规则可能改变起算点',
        body: '有些伤害不会立刻显现，或一开始无法把它与起因联系起来。在这种情况下，时效可能从您发现、或理应发现受伤及其成因之日起算，而不是从事件当天起算。这条规则很有用，但也常被误解：它不是一个可以随意依赖的宽限期，而是针对特定情形的狭窄例外。',
      },
      {
        heading: '未成年人和无行为能力者',
        body: '如果受伤的是未成年人，时效通常在其年满十八岁之前暂停计算，之后才开始走一般的两年。当事人在法律上无行为能力时也可能有类似的暂停。这些规则会大幅改变期限，但同样属于狭窄例外，不应在没有确认适用的情况下就假定成立。',
      },
    ],
    timeline: {
      heading: '常见的期限一览',
      intro: '这些是大致的期限。您的具体情况可能触发例外，所以请把它当作核对的起点，而不是最终定论。',
      columns: ['情形', '通常期限'],
      rows: [
        ['针对个人或公司的人身伤害', '受伤之日起两年'],
        ['针对政府机构的索赔', '通常为六个月的行政索赔'],
        ['财产损失（如车辆）', '通常为三年'],
        ['受伤人为未成年人', '一般在其满十八岁前暂停计算'],
      ],
    },
    warning: {
      heading: '不确定就当作期限更短来对待',
      body: '如果您不确定哪条规则适用，最安全的做法是当作最短的期限在走。涉及政府机构的六个月窗口尤其容易被忽略，而它一旦错过，往往无法补救。',
    },
    faqs: [
      {
        q: '加州车祸后我有多长时间可以起诉？',
        a: '大多数情况下是自事故之日起两年。但如果责任方是政府机构，您通常须先在六个月内提出行政索赔，所以要先确认涉及的是哪一类责任方。',
      },
      {
        q: '如果期限已经过了，还有办法吗？',
        a: '有时有。延迟发现、受伤人为未成年人或当事人无行为能力等狭窄例外，可能改变起算点或暂停计时。这些能否适用取决于具体事实，值得尽快请人核实。',
      },
      {
        q: '“两年”是从事故当天算，还是从我发现受伤那天算？',
        a: '通常从受伤之日起算。但当一处伤害在当时无法合理察觉时，延迟发现规则可能把起算点推后到您发现、或理应发现该伤及其成因之时。',
      },
      {
        q: '财产损失和人身伤害的期限一样吗？',
        a: '不一样。车辆等财产损失在加州通常适用三年时效，长于人身伤害的两年。但如果两者源于同一起事故，往往会一并处理。',
      },
    ],
  },

  {
    slug: '/zh/heshi-qing-lvshi',
    locale: 'zh',
    translationOf: '/when-to-hire-a-lawyer-after-accident',
    category: 'Attorney Intent',
    cluster: '与律师合作',
    title: '事故后何时该请律师？',
    eyebrow: '与律师合作',
    description:
      '并非每起事故都需要律师。本页说明在加州，什么情况下自行处理即可，什么情况下该请律师。',
    psychology: '我不知道这件事自己就能搞定，还是应该请律师。',
    cta: '评估我是否需要律师',
    exampleQueries: [
      '车祸要不要请律师',
      '什么情况下需要人身伤害律师',
      '小事故值得请律师吗',
      '加州事故律师收费',
    ],
    signals: ['伤情严重程度', '责任是否有争议', '是否涉及商业保险', '报价是否偏低', '期限是否临近', '是否有多个责任方'],
    sections: {
      whyItMatters:
        '请律师的决定会左右您最终能追回多少，以及过程有多耗神。在有些案件里律师带来的价值远超其费用；在另一些案件里，一处轻伤、责任清楚、报价也公道，自行处理反而更省事。关键是看清自己属于哪一种。',
      whatToTrack: [
        '伤情、治疗过程，以及医生是否建议后续治疗',
        '事故经过，以及是否有人对责任提出异议',
        '涉及的保险公司，以及是否有商业保单',
        '收到的任何报价，以及它与您医疗账单的对比',
        '相关的任何期限，尤其是涉及政府机构时',
      ],
      howClearCaseHelps:
        'ClearCaseIQ 帮您整理案件事实，指出哪些信号提示该找律师，并说明在您具体情况下律师能做什么。' +
        NOT_A_LAW_FIRM,
    },
    intro:
      '不是每起事故都需要律师，任何声称“无论如何都得请”的说法都值得怀疑。有些案件自行处理反而更快更省心；有些则会因为没有律师而白白损失。本页帮您分辨自己属于哪一类，以及在加州什么信号提示该去咨询。',
    body: [
      {
        heading: '哪些情况下自行处理往往就够了',
        body: '如果伤势轻微、很快痊愈，责任毫无争议，而保险公司的报价与您为数不多的医疗账单相称，那么自己处理理赔通常没问题。这类案件里，律师费可能会吃掉本就不多的赔偿中很大一块，未必划算。把记录留存齐全、按时就医，往往就足以拿到公道的结果。',
      },
      {
        heading: '哪些信号强烈提示该请律师',
        body: '有几种情形几乎总是值得咨询：伤情严重或需要长期治疗、责任有争议、涉及多个责任方、对方是商业保险、报价明显低于您的账单，或者时效临近。伤情越重、责任越复杂，律师带来的差额通常越能覆盖其费用。',
        bullets: [
          '需要手术或长期治疗的严重伤情',
          '保险公司主张事故是您的过错',
          '涉及卡车、网约车或商业车辆',
          '报价明显低于您的医疗账单',
          '时效临近，尤其涉及政府机构时',
        ],
      },
      {
        heading: '人身伤害律师通常怎么收费',
        body: '加州的人身伤害律师大多按风险代理收费：不预收费用，只在为您追回赔偿时按约定比例收取，通常在三分之一上下。这意味着咨询本身几乎总是免费的，弄清自己的处境不必先花一分钱。请务必在书面协议里确认这个比例，以及案件费用如何处理。',
      },
      {
        heading: '尽早咨询的价值',
        body: '即使最后决定自行处理，早一点咨询也有好处。证据会消失，记忆会模糊，有些期限短得惊人。一次免费咨询能帮您弄清期限、避免早期的失误，也让您在需要时知道何时该把案件交出去。',
      },
    ],
    checklist: {
      heading: '咨询前要准备什么',
      intro: '带着这些去咨询，律师才能给出具体意见，而不是泛泛而谈。',
      items: [
        '警方或事故报告',
        '目前为止的病历和医疗账单',
        '事故现场和伤情的照片',
        '保险公司的往来信函和任何报价',
        '误工天数和收入证明',
        '您能回忆起的事故经过',
      ],
    },
    faqs: [
      {
        q: '小事故也值得请律师吗？',
        a: '通常不必。如果伤情轻微、责任清楚、报价与您的账单相称，自行处理往往更快，也能避免律师费吃掉本就不多的赔偿。伤情较重或责任有争议时才更该请律师。',
      },
      {
        q: '人身伤害律师怎么收费？',
        a: '加州大多按风险代理收费：不预收费用，只在为您追回赔偿时按约定比例收取，常见约为三分之一。所以初次咨询几乎总是免费的。',
      },
      {
        q: '已经和保险公司谈过了，现在请律师会不会太晚？',
        a: '通常不会，只要时效还没届满。不过在给出录音陈述或签署任何弃权文件之前先咨询会更稳妥，因为这些早期步骤有时很难挽回。',
      },
      {
        q: '我怎么判断报价是不是太低？',
        a: '一个明显的信号是报价没有覆盖您的医疗账单和误工损失，或者在治疗尚未结束时就送来。把报价和已知费用对照，往往能看出它是否只反映了保险公司当下愿意承认的部分。',
      },
    ],
  },

  {
    slug: '/zh/baoxian-gongsi-shouduan',
    locale: 'zh',
    translationOf: '/education/insurance-settlement-tactics',
    category: 'Insurance',
    cluster: '与保险公司打交道',
    title: '保险公司常用的和解手段',
    eyebrow: '与保险公司打交道',
    description:
      '理赔员用来压低赔付的常见手段，以及在加州如何识别录音陈述、快速报价和拖延战术。',
    psychology: '我感觉保险公司在占我便宜，但说不清他们到底在做什么。',
    cta: '整理我与保险公司的往来',
    exampleQueries: [
      '保险公司拖着不赔怎么办',
      '理赔员要我录音可以吗',
      '第一次报价能接受吗',
      '保险公司压低赔偿的套路',
    ],
    signals: ['早期报价', '录音陈述请求', '拖延与沉默', '弃权文件', '对旧伤的追问', '快速结案的压力'],
    sections: {
      whyItMatters:
        '理赔员的工作是把赔付控制在尽可能低的水平，这不代表他们坏，而是他们的立场如此。认出这些常见手段，您就不会把一种谈判策略误当成对案件价值的客观评价。',
      whatToTrack: [
        '每一次通话的日期、对方姓名和谈话内容',
        '任何录音陈述的请求，以及您是否同意',
        '收到的每一个报价和它送达的时间',
        '任何要求您签署的弃权或授权文件',
        '关于既往伤病史的提问',
      ],
      howClearCaseHelps:
        'ClearCaseIQ 帮您按时间顺序整理与保险公司的每一次往来，标出常见手段，并提示在回应前该先弄清什么。' +
        NOT_A_LAW_FIRM,
    },
    intro:
      '和解谈判并非双方对等。理赔员每天处理这类案件，而您可能一生只经历一次。这种落差本身就是一种手段。本页拆解保险公司压低赔付时最常用的几种做法，让您能认出它们，而不是被它们牵着走。',
    body: [
      {
        heading: '在您了解伤情全貌前就给出快速报价',
        body: '最常见的手段就是快。在事故后几天内送来一个看似慷慨的报价，赶在您知道伤情是否会持续、总费用是多少之前。一旦接受并签署弃权，即使日后需要更多治疗，案件也就此了结。快速报价针对的是不确定和金钱压力，而不是案件的真实价值。',
      },
      {
        heading: '要求录音陈述',
        body: '理赔员常会在早期要求录音陈述，语气显得只是例行公事。但这段录音可以被用来在日后抓住您措辞上的矛盾，或引导您淡化伤情。您没有义务在未经准备的情况下接受录音陈述，事先弄清自己的权利，往往比当场配合更重要。',
      },
      {
        heading: '拖延与沉默',
        body: '拖延本身也是一种策略。数周的沉默、反复索要同一份文件、把案件在不同理赔员之间转来转去，都会消磨人的耐心，让人只想尽快了结。把每一次往来记录下来，会让这种拖延变得可见，也更难被当作谈判筹码。',
      },
      {
        heading: '揪住旧伤或治疗中断做文章',
        body: '保险公司会翻查既往病史，寻找可以把您现在的伤归咎于旧疾的理由，也会盯住治疗中断，主张您那时已经康复。这些说法未必成立，但如果无人回应就会削弱案件。清楚记录新伤与旧疾的区别、以及为何会中断治疗，是最有力的回应。',
      },
    ],
    warning: {
      heading: '签署弃权文件前务必想清楚',
      body: '和解弃权书通常是不可撤销的：一旦签字，即便日后需要更多治疗，也不能再就同一事故索赔。在治疗结束、总费用明确之前签字，是最难挽回的失误之一。',
    },
    faqs: [
      {
        q: '我必须接受保险公司的录音陈述吗？',
        a: '通常不必，尤其是对方的保险公司。这段录音可能日后被用来对付您。在同意之前先弄清自己的权利、或先咨询，往往比当场配合更稳妥。',
      },
      {
        q: '第一次报价可以接受吗？',
        a: '要非常谨慎。第一次报价往往在治疗结束前就送来，反映的是保险公司当下愿意承认的部分，而不是案件在记录齐全后的价值。接受并签署弃权后，案件通常就此了结。',
      },
      {
        q: '保险公司一直拖着不处理，我该怎么办？',
        a: '把每一次往来都记录下来——日期、对方姓名、谈话内容。拖延常被用作谈判手段，而一份清晰的记录会让它变得可见，也为后续可能的申诉或法律步骤留下依据。',
      },
      {
        q: '理赔员问我以前的伤病，我要如实说吗？',
        a: '诚实很重要，但也要谨慎。保险公司会用旧伤来主张您现在的伤与事故无关。清楚说明新伤与旧疾的区别，比笼统作答更能保护案件；不确定时先咨询会更好。',
      },
    ],
  },

  {
    slug: '/zh/uber-lyft-shigu',
    locale: 'zh',
    translationOf: '/commercial/rideshare-accidents',
    category: 'Commercial',
    cluster: '网约车事故',
    title: 'Uber 与 Lyft 事故索赔',
    eyebrow: '网约车事故',
    description:
      '在加州，Uber 或 Lyft 事故的赔付取决于司机当时处于哪个阶段，这决定了哪份保单负责。',
    psychology: '我在一次网约车事故中受伤，不知道到底该找谁的保险。',
    cta: '整理我的网约车事故',
    exampleQueries: [
      'uber车祸怎么赔',
      'lyft事故谁的保险负责',
      '坐网约车受伤索赔',
      '网约车司机撞了我',
    ],
    signals: ['司机所处阶段', '乘客还是第三方', '公司百万保单', '司机个人保单', '无保险驾车人保障', '伤情严重程度'],
    sections: {
      whyItMatters:
        '网约车事故的赔付，往往取决于一个看不见的细节：碰撞发生时，司机在应用里处于哪个阶段。这个阶段决定了是公司的百万美元保单负责，还是只剩司机的个人保单，而两者相差极大。',
      whatToTrack: [
        '事故发生时司机是否在应用上线、是否正接单或载客',
        '您是乘客、另一辆车里的人，还是行人',
        '司机的姓名，以及行程的截图或记录',
        '所有涉及方的保险信息',
        '伤情、就诊记录和治疗的连续性',
      ],
      howClearCaseHelps:
        'ClearCaseIQ 帮您理清事故发生时司机处于哪个阶段，指出哪些保单可能负责，并提示要保存什么证据。' +
        NOT_A_LAW_FIRM,
    },
    intro:
      '网约车事故看似普通车祸，赔付方式却不同。因为多了一层：司机是独立承包人，而 Uber 和 Lyft 的保险只在特定阶段才启动。同一起碰撞，赔付可能来自公司的百万美元保单，也可能只剩司机有限的个人保单，区别就在于事故发生的那一刻司机在做什么。',
    body: [
      {
        heading: '司机所处的阶段决定哪份保单负责',
        body: '关键问题是碰撞发生时司机在应用里的状态。如果应用离线、司机只是在私人出行，那就只有他的个人车险。如果应用在线但尚未接单，公司提供的保障较为有限。一旦接受了订单、正在前往接客或已载客途中，公司通常会启动高达一百万美元的第三方责任保障。这个阶段的差别，往往就是赔付上限的差别。',
      },
      {
        heading: '您是乘客、第三方还是行人',
        body: '您在事故中的身份也很重要。作为网约车乘客，只要司机当时正在接单或载客，通常能受公司保单的保障。作为被网约车撞到的另一辆车里的人或行人，您的索赔同样取决于司机所处阶段。厘清这两点——司机的阶段和您的身份——是判断哪份保单负责的第一步。',
      },
      {
        heading: '别忘了您自己的保障',
        body: '如果肇事的网约车司机当时处于保障较弱的阶段，或另一名肇事司机没有保险，您自己的无保险或保险不足驾车人保障可能会补上缺口。人们常常忽略这一层，但在对方保险不足时，它往往是主要的赔付来源。在接受任何报价前，先查一查自己的车险。',
      },
      {
        heading: '尽早保存行程证据',
        body: '网约车事故有一类普通车祸没有的证据：应用内的行程记录。请截图保存行程、司机信息和时间戳，因为这些能证明事故发生时司机所处的阶段——而阶段决定了哪份保单负责。这类记录事后未必还能取得，所以越早保存越好。',
      },
    ],
    checklist: {
      heading: '网约车事故后要保存什么',
      intro: '其中有些只在最初几天内还能拿到。',
      items: [
        '应用内的行程记录或订单截图',
        '司机的姓名和车辆信息',
        '所有涉及方的保险信息',
        '现场、车辆和伤情的照片',
        '证人的姓名和电话',
        '您自己的车险保单，用于核对无保险驾车人保障',
      ],
    },
    faqs: [
      {
        q: 'Uber 或 Lyft 事故中，是谁的保险负责？',
        a: '取决于司机在应用里所处的阶段。载客或正前往接客时，公司通常提供高达一百万美元的保障；应用离线时，只有司机的个人车险。所以要先弄清事故发生那一刻司机在做什么。',
      },
      {
        q: '我是网约车乘客受了伤，该怎么办？',
        a: '作为乘客，只要司机当时正在接单或载客，通常能受公司保单保障。请保存行程记录，尽快就医，并把伤情记录下来。',
      },
      {
        q: '网约车司机撞了我，但他说当时没在接单，怎么办？',
        a: '这正是行程记录重要的原因。应用内数据能显示事故发生时司机所处的阶段。如果他当时确实离线，可能只有其个人保单负责，此时您自己的无保险驾车人保障也许能补上缺口。',
      },
      {
        q: '网约车事故我能得到的赔偿会更多吗？',
        a: '不一定更多，但当公司的百万美元保单启动时，可动用的保障往往远高于普通个人车险。最终能追回多少，仍取决于伤情、责任和适用的保单。',
      },
    ],
  },

  {
    slug: '/zh/chehuo-hou-jingbu-tengtong',
    locale: 'zh',
    translationOf: '/injuries/neck-pain-after-accident',
    category: 'Symptoms',
    cluster: '事故后的伤情',
    title: '车祸后的颈部疼痛',
    eyebrow: '伤情与症状',
    description:
      '车祸后的颈部疼痛可能延迟出现。本页说明为何要尽早就医，以及如何为索赔留下记录。',
    psychology: '事故后我的脖子越来越痛，不知道是不是伤到了，也不知道该怎么办。',
    cta: '整理我的伤情记录',
    exampleQueries: [
      '车祸后脖子疼',
      '挥鞭样损伤多久好',
      '事故后颈部疼痛索赔',
      '车祸后第二天脖子才痛',
    ],
    signals: ['症状延迟出现', '就医的连续性', '影像检查', '活动受限', '与事故的关联', '治疗时长'],
    sections: {
      whyItMatters:
        '颈部疼痛是车祸后最常见的伤情之一，也是最容易被保险公司低估的一种。它常常延迟出现，又不总能在影像上显示，这让“何时就医、如何记录”变得尤为关键。',
      whatToTrack: [
        '症状首次出现的时间，以及此后如何变化',
        '每一次就诊，包括急诊和后续复诊',
        '任何影像检查及其判读报告',
        '疼痛如何限制了工作、睡眠和日常活动',
        '治疗过程和医生建议的后续治疗',
      ],
      howClearCaseHelps:
        'ClearCaseIQ 帮您把颈部伤情的时间线和病历整理清楚，指出记录中的薄弱环节，并提示该保存什么。' +
        NOT_A_LAW_FIRM,
    },
    intro:
      '颈部疼痛是车祸后最常见的伤情，却也最常被低估。它往往不会当场发作，而是在第二天甚至更晚才出现，这个延迟正是保险公司用来质疑它与事故有关的理由。本页解释为什么会这样，以及尽早、持续地就医如何既保护您的健康，也保护您的索赔。',
    body: [
      {
        heading: '为什么颈部疼痛会延迟出现',
        body: '事故当下，肾上腺素会掩盖疼痛。挥鞭样损伤——头颈突然前后甩动造成的软组织损伤——常常要等几个小时甚至一两天，肿胀和僵硬才逐渐显现。这种延迟完全正常，但如果您因此拖到几天后才就医，保险公司就会拿这段空档做文章。',
      },
      {
        heading: '尽早就医既为健康也为记录',
        body: '事故后尽快就医有两重意义。首先是为了健康：早期评估能发现需要处理的问题。其次是为了记录：一份把颈部症状和事故联系起来的早期病历，是证明二者相关的最有力证据。就医拖得越久，这条关联就越容易被质疑。',
      },
      {
        heading: '软组织损伤未必显示在影像上',
        body: '挥鞭样损伤和肌肉拉伤属于软组织损伤，X 光和 CT 常常看不出来。这不代表伤不存在，但意味着记录要靠别的方式建立：一致的症状描述、体格检查所见、治疗的连续性，以及疼痛如何限制了日常活动。连贯的病历，能弥补影像上的“看不见”。',
      },
      {
        heading: '治疗的连续性最关键',
        body: '对颈部伤情而言，最能左右结果的往往是治疗的连贯性。按医嘱复诊、完成理疗、如实报告症状变化，会形成一条清晰的康复轨迹。中途停治两个月，则会给保险公司留下主张您已康复的空间——哪怕您其实并没有。',
      },
    ],
    warning: {
      heading: '别因为“过几天会好”就不去就医',
      body: '很多颈部伤情确实会自行好转，但那道就医与事故之间的空档一旦形成，就无法补回。即便疼痛看似轻微，事故后尽早做一次评估，既保护健康，也保住了那条把伤情和事故联系起来的记录。',
    },
    faqs: [
      {
        q: '为什么我事故当天不痛，第二天脖子才开始痛？',
        a: '这很常见。事故时肾上腺素会掩盖疼痛，而挥鞭样损伤造成的肿胀和僵硬往往要过几个小时甚至一两天才显现。延迟出现并不代表伤情轻微。',
      },
      {
        q: '颈部疼痛但影像检查正常，还能索赔吗？',
        a: '能。挥鞭样损伤等软组织损伤常常在 X 光或 CT 上看不出来。此时记录要靠一致的症状描述、体格检查、治疗连续性，以及疼痛如何限制日常活动来建立。',
      },
      {
        q: '车祸后我要多久内去看医生？',
        a: '越早越好。就医与事故之间的空档越短，越容易证明颈部伤情与事故相关；拖得越久，保险公司越容易质疑二者的关联。',
      },
      {
        q: '如果我中断了治疗，会有什么影响？',
        a: '治疗中断会给保险公司留下主张您已康复的空间，即便您并未痊愈。按医嘱持续治疗、如实报告症状，会形成一条更有说服力的康复记录。',
      },
    ],
  },

  {
    slug: '/zh/chehuo-hou-beibu-tengtong',
    locale: 'zh',
    translationOf: '/injuries/lower-back-pain-after-accident',
    category: 'Symptoms',
    cluster: '事故后的伤情',
    title: '车祸后的下背部疼痛',
    eyebrow: '伤情与症状',
    description:
      '车祸后的下背部疼痛可能延迟出现，也未必显示在影像上。本页说明如何就医并为索赔留下记录。',
    psychology: '事故后我的下背越来越痛，担心是不是伤到了，也不知道该怎么做。',
    cta: '整理我的伤情记录',
    exampleQueries: ['车祸后下背疼', '事故后腰疼多久好', '腰椎间盘突出车祸', '车祸后腰部受伤索赔'],
    signals: ['症状延迟出现', '就医的连续性', '影像检查', '活动受限', '与事故的关联', '治疗时长'],
    sections: {
      whyItMatters:
        '下背部疼痛是车祸后最常见、也最容易被低估的伤情之一。它常常延迟出现，软组织损伤又未必在影像上显示，这让“何时就医、如何记录”变得格外关键。',
      whatToTrack: [
        '症状首次出现的时间，以及此后如何变化',
        '每一次就诊，包括急诊和后续复诊',
        '任何影像检查及其判读报告',
        '疼痛如何限制了工作、久坐、弯腰和睡眠',
        '治疗过程和医生建议的后续治疗',
      ],
      howClearCaseHelps:
        'ClearCaseIQ 帮您把下背部伤情的时间线和病历整理清楚，指出记录中的薄弱环节，并提示该保存什么。' +
        NOT_A_LAW_FIRM,
    },
    intro:
      '下背部疼痛是车祸后极常见的后果，却也最常被低估。它往往不会当场发作，而是在第二天甚至更晚才出现，这个延迟正是保险公司质疑它与事故有关的理由。本页解释为什么会这样，以及尽早、持续地就医如何既保护您的健康，也保护您的索赔。',
    body: [
      {
        heading: '为什么下背部疼痛会延迟出现',
        body: '事故当下，肾上腺素会掩盖疼痛。腰部的肌肉拉伤、韧带损伤，乃至椎间盘的问题，常常要过几个小时甚至一两天，肿胀和僵硬才逐渐显现。这种延迟完全正常，但如果您因此拖到几天后才就医，保险公司就会拿这段空档做文章。',
      },
      {
        heading: '尽早就医既为健康也为记录',
        body: '事故后尽快就医有两重意义。首先是为了健康：早期评估能发现需要处理的问题，例如可能压迫神经的椎间盘突出。其次是为了记录：一份把下背症状和事故联系起来的早期病历，是证明二者相关的最有力证据。拖得越久，这条关联越容易被质疑。',
      },
      {
        heading: '软组织损伤未必显示在影像上',
        body: '腰部的肌肉和韧带损伤属于软组织损伤，X 光常常看不出来；即便是椎间盘问题，也未必在每一次检查中都清晰可见。这不代表伤不存在，而是记录要靠别的方式建立：一致的症状描述、体格检查所见、治疗的连续性，以及疼痛如何限制日常活动。',
      },
      {
        heading: '治疗的连续性最关键',
        body: '对下背部伤情而言，最能左右结果的往往是治疗的连贯性。按医嘱复诊、完成理疗、如实报告症状变化，会形成一条清晰的康复轨迹。中途停治两个月，则会给保险公司留下主张您已康复的空间——哪怕您其实并没有。',
      },
    ],
    warning: {
      heading: '别忽视可能压迫神经的症状',
      body: '如果下背疼痛伴随腿部放射痛、麻木、无力，或大小便功能异常，请立即就医：这些可能是神经受压的信号，需要尽快处理。健康永远优先于索赔的考量。',
    },
    faqs: [
      {
        q: '为什么我事故当天不痛，隔天下背才开始痛？',
        a: '这很常见。事故时肾上腺素会掩盖疼痛，而腰部肌肉、韧带乃至椎间盘的损伤往往要过几个小时甚至一两天才显现。延迟出现并不代表伤情轻微。',
      },
      {
        q: '下背疼痛但影像检查正常，还能索赔吗？',
        a: '能。腰部的软组织损伤常常在 X 光上看不出来。此时记录要靠一致的症状描述、体格检查、治疗连续性，以及疼痛如何限制日常活动来建立。',
      },
      {
        q: '车祸后我要多久内去看医生？',
        a: '越早越好。就医与事故之间的空档越短，越容易证明下背伤情与事故相关；拖得越久，保险公司越容易质疑二者的关联。',
      },
      {
        q: '如果我中断了治疗，会有什么影响？',
        a: '治疗中断会给保险公司留下主张您已康复的空间，即便您并未痊愈。按医嘱持续治疗、如实报告症状，会形成一条更有说服力的康复记录。',
      },
    ],
  },
]

export { NOT_A_LAW_FIRM }

export const landingPagesZh: LandingPageZh[] = writtenPages.map((page) => ({
  ...page,
  namespaces: CHROME_NAMESPACES,
}))

export const landingPagesZhBySlug = new Map(landingPagesZh.map((page) => [page.slug, page]))

/**
 * Chinese names for the categories, for the hub headings.
 *
 * Only the categories the Chinese set actually uses. Adding a page in a new
 * category without a label here fails `seoLandingPagesZh.test.ts` rather than
 * rendering an English heading over Chinese pages.
 */
export const CATEGORY_LABELS_ZH: Partial<Record<LandingPageCategory, string>> = {
  Settlement: '案件价值与和解',
  'Attorney Intent': '法律时效与律师',
  Symptoms: '伤情与症状',
  Insurance: '与保险公司打交道',
  Commercial: '卡车与网约车',
  'Educational / SEO Moat': '综合指南',
}

/** The Chinese pages grouped for the hub, in a stable order. */
export function landingPagesZhByCategory() {
  const order = Object.keys(CATEGORY_LABELS_ZH) as LandingPageCategory[]
  return order
    .map((category) => ({
      category,
      label: CATEGORY_LABELS_ZH[category]!,
      pages: landingPagesZh.filter((page) => page.category === category),
    }))
    .filter((group) => group.pages.length > 0)
}

/** Every Chinese landing path, for the router and the route-coverage test. */
export const landingPageZhSlugs = landingPagesZh.map((page) => page.slug)

/**
 * Siblings to link from a Chinese page. Walks forward through the set and wraps,
 * so every page links to its neighbours and is linked to by the ones behind it.
 * With a set this small that is close to linking everything to everything, which
 * is the point: pages reachable only from a hub would each have one inbound link.
 */
export function relatedPagesZh(slug: string, limit = 4): LandingPageZh[] {
  const index = landingPagesZh.findIndex((page) => page.slug === slug)
  if (index < 0) return landingPagesZh.slice(0, limit)

  const picked: LandingPageZh[] = []
  for (let step = 1; picked.length < limit && step < landingPagesZh.length; step += 1) {
    picked.push(landingPagesZh[(index + step) % landingPagesZh.length])
  }
  return picked
}
