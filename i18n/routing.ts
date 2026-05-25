// 22 official Indian languages per Schedule 8 of the Constitution.
// At launch, only en/ml/hi have hand-authored UI strings; the rest fall back to en
// until an admin generates AI-bootstrapped translations.
// KSCB serves Malayalam-speaking customers in Kerala — ml is the surface default.
export const LOCALES = [
  'ml', 'en', 'hi', 'as', 'bn', 'brx', 'doi', 'gu', 'kn', 'ks', 'kok',
  'mai', 'mni', 'mr', 'ne', 'or', 'pa', 'sa', 'sat', 'sd', 'ta', 'te', 'ur',
] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'ml';

export const LOCALE_LABELS: Record<Locale, string> = {
  ml: 'മലയാളം', en: 'English', hi: 'हिन्दी', as: 'অসমীয়া', bn: 'বাংলা',
  brx: 'बड़ो', doi: 'डोगरी', gu: 'ગુજરાતી', kn: 'ಕನ್ನಡ', ks: 'کٲشُر',
  kok: 'कोंकणी', mai: 'मैथिली', mni: 'মৈতৈলোন্', mr: 'मराठी', ne: 'नेपाली',
  or: 'ଓଡ଼ିଆ', pa: 'ਪੰਜਾਬੀ', sa: 'संस्कृतम्', sat: 'ᱥᱟᱱᱛᱟᱲᱤ', sd: 'سنڌي',
  ta: 'தமிழ்', te: 'తెలుగు', ur: 'اُردُو',
};
