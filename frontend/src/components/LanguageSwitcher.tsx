// 語言切換器：改 i18n 語言 + localStorage 持久化（i18next 自帶）+ 登入時同步到後端
// （users.locale — 我們寄的 email 也吃這個偏好）。未登入只存本地，登入後首次變更即回寫。
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { SUPPORTED_LOCALES, LOCALE_LABELS, normalizeAppLocale, type AppLocale } from '../i18n';
import { api } from '../lib/api';

export default function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n } = useTranslation();
  const { user } = useAuth();

  const current = normalizeAppLocale(i18n.language);

  const change = async (locale: AppLocale) => {
    await i18n.changeLanguage(locale);
    if (user) {
      // best-effort 同步後端偏好（失敗不擋 UI，下次變更再試）
      api.updateLocale(locale).catch(() => {});
    }
  };

  return (
    <select
      aria-label="Language"
      value={current}
      onChange={(e) => change(e.target.value as AppLocale)}
      className={
        compact
          ? 'bg-transparent text-sm text-gray-500 font-bold focus:outline-none cursor-pointer'
          : 'rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-300 cursor-pointer'
      }
    >
      {SUPPORTED_LOCALES.map((l) => (
        <option key={l} value={l}>
          {LOCALE_LABELS[l]}
        </option>
      ))}
    </select>
  );
}
