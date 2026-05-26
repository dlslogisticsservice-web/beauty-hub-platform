import { useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useI18n } from "@/hooks/use-i18n";

const SLIDES = [
  {
    url: "https://images.unsplash.com/photo-1512290923902-8a9f81dc236c?w=800&h=320&fit=crop&q=80",
    caption_ar: "تجميل وعناية بأعلى المعايير الطبية",
    caption_en: "Beauty care at the highest medical standards",
  },
  {
    url: "https://images.unsplash.com/photo-1552693673-1bf958298935?w=800&h=320&fit=crop&q=80",
    caption_ar: "خبراء الليزر والتجميل في مكان واحد",
    caption_en: "Laser and beauty experts in one place",
  },
  {
    url: "https://images.unsplash.com/photo-1560750588-73207b1ef5b8?w=800&h=320&fit=crop&q=80",
    caption_ar: "رحلة جمالك تبدأ من هنا",
    caption_en: "Your beauty journey starts here",
  },
  {
    url: "https://images.unsplash.com/photo-1598440947619-2c35f0bb9900?w=800&h=320&fit=crop&q=80",
    caption_ar: "اكتشفي أفضل مراكز العناية والتجميل",
    caption_en: "Discover the best beauty and care centers",
  },
];

export function PromoCarousel() {
  const { locale } = useI18n();
  const isAr = locale === "ar";
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });

  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const timer = setInterval(scrollNext, 4000);
    return () => clearInterval(timer);
  }, [emblaApi, scrollNext]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border" ref={emblaRef}>
      <div className="flex">
        {SLIDES.map((slide, i) => (
          <div key={i} className="relative flex-[0_0_100%] min-w-0">
            <img
              src={slide.url}
              alt={isAr ? slide.caption_ar : slide.caption_en}
              className="w-full h-48 object-cover"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
            <p className="absolute bottom-3 right-3 text-sm font-bold text-white text-right drop-shadow">
              {isAr ? slide.caption_ar : slide.caption_en}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
