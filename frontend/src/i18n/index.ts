// 全站 i18n：偵測順序 localStorage('oao-locale') → 瀏覽器語言 → en。
// 登入後與後端 users.locale 同步（email 也用同一偏好），見 LanguageSwitcher + AuthContext。
// 翻譯覆蓋策略：核心導航/設定/定價先行，其餘頁面字串逐步收編 — 未翻譯字串維持英文原文。
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

export const SUPPORTED_LOCALES = ['en', 'zh-TW', 'zh-CN', 'ja'] as const;
export type AppLocale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_LABELS: Record<AppLocale, string> = {
  en: 'English',
  'zh-TW': '繁體中文',
  'zh-CN': '简体中文',
  ja: '日本語',
};

/** 寬鬆輸入 → 支援的 locale（與後端 normalizeLocale 同規則） */
export function normalizeAppLocale(raw: string | null | undefined): AppLocale {
  if (!raw) return 'en';
  const v = raw.replace('_', '-').toLowerCase();
  if (v.startsWith('zh')) {
    return v.includes('cn') || v.includes('hans') || v.includes('sg') ? 'zh-CN' : 'zh-TW';
  }
  if (v.startsWith('ja')) return 'ja';
  return 'en';
}

const resources = {
  en: {
    translation: {
      nav: { features: 'Features', pricing: 'Pricing', api: 'API', dashboard: 'Dashboard' },
      sidebar: {
        overview: 'Overview', analytics: 'Analytics', apiKeys: 'API Keys',
        credits: 'Credits & Plan', apiDocs: 'API Docs', support: 'Support', settings: 'Settings', logout: 'Log out',
      },
      settings: {
        title: 'Settings',
        language: 'Language',
        languageHint: 'Used across the site and for emails we send you.',
      },
      pricing: {
        title: 'Simple, transparent pricing',
        subtitle: 'Start free. Upgrade when you need more.',
        monthly: 'Monthly', yearly: 'Yearly',
        perMonth: '/mo', getStarted: 'Get started', currentPlan: 'Current plan', upgrade: 'Upgrade',
      },
      common: { save: 'Save', saved: 'Saved', loading: 'Loading…' },
    },
  },
  'zh-TW': {
    translation: {
      nav: { features: '功能', pricing: '定價', api: 'API', dashboard: '儀表板' },
      sidebar: {
        overview: '總覽', analytics: '分析', apiKeys: 'API 金鑰',
        credits: '點數與方案', apiDocs: 'API 文件', support: '客服工單', settings: '設定', logout: '登出',
      },
      settings: {
        title: '設定',
        language: '語言',
        languageHint: '全站介面與我們寄給你的 email 都會使用這個語言。',
      },
      pricing: {
        title: '簡單透明的定價',
        subtitle: '免費開始，需要更多再升級。',
        monthly: '月繳', yearly: '年繳',
        perMonth: '/月', getStarted: '開始使用', currentPlan: '目前方案', upgrade: '升級',
      },
      common: { save: '儲存', saved: '已儲存', loading: '載入中…' },
    },
  },
  'zh-CN': {
    translation: {
      nav: { features: '功能', pricing: '定价', api: 'API', dashboard: '仪表板' },
      sidebar: {
        overview: '总览', analytics: '分析', apiKeys: 'API 密钥',
        credits: '点数与套餐', apiDocs: 'API 文档', support: '客服工单', settings: '设置', logout: '退出登录',
      },
      settings: {
        title: '设置',
        language: '语言',
        languageHint: '全站界面与我们发送给你的邮件都会使用这个语言。',
      },
      pricing: {
        title: '简单透明的定价',
        subtitle: '免费开始，需要更多再升级。',
        monthly: '月付', yearly: '年付',
        perMonth: '/月', getStarted: '开始使用', currentPlan: '当前套餐', upgrade: '升级',
      },
      common: { save: '保存', saved: '已保存', loading: '加载中…' },
    },
  },
  ja: {
    translation: {
      nav: { features: '機能', pricing: '料金', api: 'API', dashboard: 'ダッシュボード' },
      sidebar: {
        overview: '概要', analytics: '分析', apiKeys: 'API キー',
        credits: 'クレジットとプラン', apiDocs: 'API ドキュメント', support: 'サポート', settings: '設定', logout: 'ログアウト',
      },
      settings: {
        title: '設定',
        language: '言語',
        languageHint: 'サイト全体と、お送りするメールに使用されます。',
      },
      pricing: {
        title: 'シンプルで透明な料金',
        subtitle: '無料で始めて、必要になったらアップグレード。',
        monthly: '月払い', yearly: '年払い',
        perMonth: '/月', getStarted: '始める', currentPlan: '現在のプラン', upgrade: 'アップグレード',
      },
      common: { save: '保存', saved: '保存しました', loading: '読み込み中…' },
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_LOCALES],
    nonExplicitSupportedLngs: false,
    load: 'currentOnly',
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'oao-locale',
      caches: ['localStorage'],
      convertDetectedLanguage: (lng: string) => normalizeAppLocale(lng),
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
