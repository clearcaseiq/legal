import type { MarketingPage } from './marketingPages'

/**
 * When the Chinese set was last revised. Separate from the English and Spanish
 * constants so adding a translation does not restamp the other editions'
 * `lastmod` with a date on which they did not change.
 */
export const MARKETING_CONTENT_UPDATED_ZH = '2026-08-17'

/**
 * The Simplified Chinese edition of the evergreen marketing pages.
 *
 * These exist because the translation already did. `zh.json` carries 4,737 of
 * the 4,801 English keys, and only twelve of its values are not Chinese — the
 * brand name, two email addresses, and some currency figures. That work was
 * completely invisible to search engines: without a URL prefix, Chinese was a
 * preference applied after hydration, so every crawler saw English markup at an
 * English URL and there was no Chinese page to index. Giving the locale its own
 * path turns an existing asset into something that can rank.
 *
 * No topic hub here, unlike the Spanish set. `/es/temas` lists the eight Spanish
 * landing pages; there are no Chinese landing pages yet, so the equivalent would
 * be an empty index inviting a crawler to a dead end.
 *
 * Simplified only, matching the dictionary. If Traditional is added later it
 * needs its own registry and its own `zh-Hant` annotations, not a toggle: the
 * two scripts are separate content sets for separate audiences.
 *
 * The bodies are the professionally translated chrome. The titles and
 * descriptions below are not — they were written by a model and, like the
 * Spanish set, need a native speaker's review before they are trusted. Chinese
 * SERP titles are cut around 30 characters and descriptions around 80, far
 * shorter than the Latin-script limits `clampDescription` enforces, so these are
 * authored well inside those limits rather than relying on the clamp.
 */
export const marketingPagesZh: MarketingPage[] = [
  {
    path: '/zh',
    title: '加州人身伤害案件免费评估 | ClearCaseIQ',
    description:
      '了解您在加州是否有人身伤害索赔资格，估算案件价值，并免费与律师联系。ClearCaseIQ 并非律师事务所。',
    serverRender: true,
    contentUpdated: MARKETING_CONTENT_UPDATED_ZH,
    locale: 'zh',
    translationOf: '/',
    namespaces: ['common', 'footer', 'home', 'faqSection'],
  },
  {
    path: '/zh/ruhe-yunzuo',
    title: 'ClearCaseIQ 如何运作 | 几分钟完成案件评估',
    description: '回答几个关于事故的问题，上传医疗记录，几分钟内获得初步案件评估，全程免费。',
    serverRender: true,
    contentUpdated: MARKETING_CONTENT_UPDATED_ZH,
    locale: 'zh',
    translationOf: '/how-it-works',
    namespaces: ['common', 'footer', 'hiw'],
  },
  {
    path: '/zh/guanyu-women',
    title: '关于我们 | ClearCaseIQ 法律科技公司',
    description:
      'ClearCaseIQ Corp. 是一家位于洛杉矶的法律科技公司，并非律师事务所，为加州事故受害者提供帮助。',
    serverRender: true,
    contentUpdated: MARKETING_CONTENT_UPDATED_ZH,
    locale: 'zh',
    translationOf: '/about',
    namespaces: ['common', 'footer', 'aboutPage', 'auth'],
  },
  {
    path: '/zh/lianxi-women',
    title: '联系我们 | ClearCaseIQ',
    description: '就原告支持、律师合作、媒体或隐私问题联系 ClearCaseIQ。我们会通过电子邮件回复每一条咨询。',
    serverRender: true,
    contentUpdated: MARKETING_CONTENT_UPDATED_ZH,
    locale: 'zh',
    translationOf: '/contact',
    namespaces: ['common', 'footer', 'contactPage', 'auth'],
  },
  {
    path: '/zh/bangzhu-zhongxin',
    title: '帮助中心 | ClearCaseIQ',
    description: '关于如何开始评估、上传医疗记录、与律师联系以及数据隐私的常见问题解答。',
    serverRender: true,
    contentUpdated: MARKETING_CONTENT_UPDATED_ZH,
    locale: 'zh',
    translationOf: '/help',
    namespaces: ['common', 'footer', 'helpPage', 'legal', 'auth', 'supportForm', 'contactPage', 'plaintiffDashboard'],
  },
  {
    path: '/zh/pilu-shengming',
    title: '平台披露声明 | ClearCaseIQ',
    description:
      'ClearCaseIQ 的运作方式及其定位：独立的法律科技平台，并非律师事务所。包含律师网络、人工智能使用与加州隐私权说明。',
    serverRender: true,
    contentUpdated: MARKETING_CONTENT_UPDATED_ZH,
    locale: 'zh',
    translationOf: '/disclosures',
    namespaces: ['common', 'footer', 'disclosures'],
  },
  {
    path: '/zh/lvshi-wangluo',
    title: '律师网络 | 预先筛选的案件 | ClearCaseIQ',
    description:
      '加入 ClearCaseIQ 律师网络，获取预先筛选的人身伤害案件，附带文件、医疗信号与案件准备度评分。',
    serverRender: true,
    contentUpdated: MARKETING_CONTENT_UPDATED_ZH,
    locale: 'zh',
    translationOf: '/attorney-network',
    namespaces: ['common', 'footer', 'attorneyNet', 'auth', 'results'],
  },
]
