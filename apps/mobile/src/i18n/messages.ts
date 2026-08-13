export type MobileLanguage = 'en' | 'es' | 'zh'

const MESSAGES = {
  en: {
    myProfile: 'My Profile',
    account: 'Account',
    profileSettings: 'Profile Settings',
    language: 'Language',
    languageHint: 'Choose the language used for the app and chat translations.',
    security: 'Security',
    logout: 'Log out',
    uploadPhoto: 'Upload Photo',
    changePhoto: 'Change Photo',
    removePhoto: 'Remove Photo',
    photoOptions: 'Profile photo',
  },
  es: {
    myProfile: 'Mi perfil',
    account: 'Cuenta',
    profileSettings: 'Configuración del perfil',
    language: 'Idioma',
    languageHint: 'Elige el idioma de la aplicación y de la traducción del chat.',
    security: 'Seguridad',
    logout: 'Cerrar sesión',
    uploadPhoto: 'Subir foto',
    changePhoto: 'Cambiar foto',
    removePhoto: 'Eliminar foto',
    photoOptions: 'Foto de perfil',
  },
  zh: {
    myProfile: '我的资料',
    account: '账户',
    profileSettings: '资料设置',
    language: '语言',
    languageHint: '选择应用界面和聊天翻译使用的语言。',
    security: '安全',
    logout: '退出登录',
    uploadPhoto: '上传照片',
    changePhoto: '更换照片',
    removePhoto: '删除照片',
    photoOptions: '头像',
  },
} as const

export type MobileMessageKey = keyof (typeof MESSAGES)['en']

export function normalizeMobileLanguage(value?: string | null): MobileLanguage {
  const lower = String(value || '').toLowerCase()
  if (lower.startsWith('es')) return 'es'
  if (lower.startsWith('zh')) return 'zh'
  return 'en'
}

export function tMobile(language: MobileLanguage | string | null | undefined, key: MobileMessageKey): string {
  const lang = normalizeMobileLanguage(language)
  return MESSAGES[lang][key] || MESSAGES.en[key]
}

export const MOBILE_LANGUAGES: Array<{ code: MobileLanguage; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'zh', label: '中文' },
]
