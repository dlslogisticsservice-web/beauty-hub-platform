export const SERVICE_CATEGORIES = [
  {
    id: 'body',
    title_ar: 'العناية بالجسم',
    title_en: 'Body Care',
    subtitle_ar: 'تنحيف · نحت · شد الجسم',
    subtitle_en: 'Slimming · Sculpting · Lifting',
    description_ar: 'جلسات متخصصة لتنحيف ونحت وشد ترهلات الجسم لزيادة اللياقة والمظهر المتناسق.',
    description_en: 'Specialized sessions for body slimming, sculpting and lifting for a toned figure.',
  },
  {
    id: 'cosmetics',
    title_ar: 'التجميل غير الجراحي',
    title_en: 'Non-Surgical Aesthetics',
    subtitle_ar: 'فيلر · بوتوكس · خيوط شد',
    subtitle_en: 'Filler · Botox · Thread Lift',
    description_ar: 'حقن الفيلر والبوتوكس وخيوط الشد بدقة وأمان على أيدي أطباء معتمدين.',
    description_en: 'Filler, Botox and thread lifts by board-certified physicians.',
  },
  {
    id: 'radiance',
    title_ar: 'النضارة والشباب',
    title_en: 'Radiance & Youth',
    subtitle_ar: 'جلسات شد ونضارة البشرة',
    subtitle_en: 'Skin Lifting & Rejuvenation',
    description_ar: 'جلسات مكثفة تشد البشرة وتزيد نضارتها الطبيعية وتخفي مظاهر التعب.',
    description_en: 'Intensive sessions to lift, rejuvenate and brighten the skin.',
  },
  {
    id: 'laser',
    title_ar: 'جلسات الليزر',
    title_en: 'Laser Sessions',
    subtitle_ar: 'عناية متقدمة ومتخصصة',
    subtitle_en: 'Advanced Laser Treatment',
    description_ar: 'خدمات ترميمية وتحفيزية متكاملة ببروتوكولات دقيقة تناسب طبيعة بشرتك.',
    description_en: 'Comprehensive restorative and stimulative protocols tailored to your skin type.',
  },
  {
    id: 'skincare',
    title_ar: 'العناية بالبشرة',
    title_en: 'Skin Care',
    subtitle_ar: 'تنظيف عميق · نضارة',
    subtitle_en: 'Deep Cleansing · Brightening',
    description_ar: 'تنظيف عميق وتقشير طبي آمن مع تغذية مكثفة بالفيتامينات والمرطبات.',
    description_en: 'Deep cleansing, safe medical peeling, and intensive vitamin nourishment.',
  },
  {
    id: 'hair',
    title_ar: 'إزالة الشعر',
    title_en: 'Hair Removal',
    subtitle_ar: 'جلسات إزالة الشعر الاحترافية',
    subtitle_en: 'Professional Hair Removal',
    description_ar: 'جلسات إزالة شعر احترافية تناسب جميع أنواع البشرة الحساسة.',
    description_en: 'Professional hair removal sessions for all skin types including sensitive skin.',
  },
] as const;

export type ServiceCategoryId = typeof SERVICE_CATEGORIES[number]['id'];

export const CITIES_BY_COUNTRY = {
  eg: ['القاهرة', 'الإسكندرية', 'الجيزة', 'المنصورة', 'أسيوط'],
  sa: ['الرياض', 'جدة', 'مكة المكرمة', 'المدينة المنورة', 'الدمام'],
} as const;
