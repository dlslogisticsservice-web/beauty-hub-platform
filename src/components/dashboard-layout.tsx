import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Calendar,
  Store,
  DollarSign,
  CreditCard,
  Settings,
  Sparkles,
  User,
  Percent,
  BarChart2,
  Users,
  Clock,
  Tag,
  Star,
} from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site-header";
import { useI18n } from "@/hooks/use-i18n";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────────────────

export type DashboardRole = "admin" | "center" | "customer";

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label_en: string;
  label_ar: string;
}

// ── Nav item definitions (bilingual, no hook required at module level) ────────

const ADMIN_NAV: NavItem[] = [
  { to: "/admin/dashboard",     icon: LayoutDashboard, label_en: "Dashboard",    label_ar: "لوحة التحكم" },
  { to: "/admin/bookings",      icon: Calendar,        label_en: "Bookings",     label_ar: "الحجوزات" },
  { to: "/admin/centers",       icon: Store,           label_en: "Centers",      label_ar: "المراكز" },
  { to: "/admin/reviews",       icon: Star,            label_en: "Reviews",      label_ar: "التقييمات" },
  { to: "/admin/commissions",   icon: Percent,         label_en: "Commissions",  label_ar: "العمولات" },
  { to: "/admin/subscriptions", icon: CreditCard,      label_en: "Plans",        label_ar: "الخطط" },
  { to: "/admin/system",        icon: Settings,        label_en: "System",       label_ar: "النظام" },
];

const CENTER_NAV: NavItem[] = [
  { to: "/center/dashboard",    icon: LayoutDashboard, label_en: "Dashboard", label_ar: "لوحة التحكم" },
  { to: "/center/bookings",     icon: Calendar,        label_en: "Bookings",  label_ar: "الحجوزات" },
  { to: "/center/services",     icon: Sparkles,        label_en: "Services",  label_ar: "الخدمات" },
  { to: "/center/staff",        icon: Users,           label_en: "Staff",     label_ar: "الفريق" },
  { to: "/center/hours",        icon: Clock,           label_en: "Hours",     label_ar: "ساعات العمل" },
  { to: "/center/coupons",      icon: Tag,             label_en: "Coupons",   label_ar: "الكوبونات" },
  { to: "/center/analytics",    icon: BarChart2,       label_en: "Analytics", label_ar: "التحليلات" },
  { to: "/center/subscription", icon: CreditCard,      label_en: "Plans",     label_ar: "الخطط" },
  { to: "/center/profile",      icon: User,            label_en: "Profile",   label_ar: "ملفي الشخصي" },
];

const CUSTOMER_NAV: NavItem[] = [
  { to: "/dashboard",      icon: Calendar,        label_en: "My Bookings",   label_ar: "حجوزاتي" },
  { to: "/profile",        icon: User,            label_en: "My Profile",    label_ar: "ملفي الشخصي" },
  { to: "/centers",        icon: Store,           label_en: "Browse",        label_ar: "استعرض" },
  { to: "/ai-consultant",  icon: Sparkles,        label_en: "AI Consultant", label_ar: "مستشار الذكاء الاصطناعي" },
];

// ── Mobile nav (5-item subset per role) ─────────────────────────────────────

const ADMIN_MOBILE_NAV: NavItem[] = [
  ADMIN_NAV[0], // Dashboard
  ADMIN_NAV[1], // Bookings
  ADMIN_NAV[2], // Centers
  ADMIN_NAV[3], // Reviews
  ADMIN_NAV[6], // System
];

const CENTER_MOBILE_NAV: NavItem[] = [
  CENTER_NAV[0], // Dashboard
  CENTER_NAV[1], // Bookings
  CENTER_NAV[2], // Services
  CENTER_NAV[4], // Hours
  CENTER_NAV[8], // Profile
];

// Customer only has 4 items — show all
const CUSTOMER_MOBILE_NAV = CUSTOMER_NAV;

function MobileBottomNav({ role }: { role: DashboardRole }) {
  const { locale } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const navItems =
    role === "admin"
      ? ADMIN_MOBILE_NAV
      : role === "center"
      ? CENTER_MOBILE_NAV
      : CUSTOMER_MOBILE_NAV;

  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-card/95 backdrop-blur border-t border-border flex items-stretch h-16 safe-area-inset-bottom"
      dir={locale === "ar" ? "rtl" : "ltr"}
    >
      {navItems.map((item) => {
        const isActive =
          pathname === item.to ||
          (item.to.length > 1 && pathname.startsWith(item.to + "/"));
        return (
          <Link
            key={item.to}
            to={item.to as never}
            className={cn(
              "flex flex-col items-center justify-center flex-1 gap-1 px-1 transition-colors",
              isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <item.icon
              className={cn("h-5 w-5 shrink-0", isActive && "text-primary")}
            />
            <span className="text-[10px] leading-none truncate max-w-[52px] text-center">
              {locale === "ar" ? item.label_ar : item.label_en}
            </span>
            {isActive && (
              <span className="absolute bottom-0.5 h-0.5 w-6 rounded-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

// ── DashboardSidebar ─────────────────────────────────────────────────────────

function DashboardSidebar({ role }: { role: DashboardRole }) {
  const { locale } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const navItems =
    role === "admin" ? ADMIN_NAV : role === "center" ? CENTER_NAV : CUSTOMER_NAV;

  const roleLabel =
    role === "admin"
      ? locale === "ar" ? "مدير النظام" : "Admin"
      : role === "center"
      ? locale === "ar" ? "مركزي" : "My Center"
      : locale === "ar" ? "حسابي" : "My Account";

  return (
    <aside className="hidden lg:flex flex-col w-52 shrink-0 sticky top-20 self-start max-h-[calc(100vh-5.5rem)] overflow-y-auto">
      <div className="rounded-2xl border border-border bg-card p-3 shadow-soft">
        {/* Role header */}
        <p className="px-3 pt-1 pb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground/60 font-semibold select-none">
          {roleLabel}
        </p>

        <nav className="space-y-0.5" dir={locale === "ar" ? "rtl" : "ltr"}>
          {navItems.map((item) => {
            const isActive =
              pathname === item.to ||
              (item.to.length > 1 && pathname.startsWith(item.to + "/"));

            return (
              <Link
                key={item.to}
                to={item.to as never}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm rounded-xl transition-all duration-150",
                  isActive
                    ? "bg-secondary text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                )}
              >
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive ? "text-primary" : "text-muted-foreground/70",
                  )}
                />
                <span className="truncate leading-snug">
                  {locale === "ar" ? item.label_ar : item.label_en}
                </span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

// ── DashboardLayout ───────────────────────────────────────────────────────────

export interface DashboardLayoutProps {
  role: DashboardRole;
  children: React.ReactNode;
  /**
   * Extra className forwarded to the `<main>` content wrapper.
   * Use "space-y-10" for pages that need vertical spacing between sections.
   */
  contentClassName?: string;
}

export function DashboardLayout({
  role,
  children,
  contentClassName,
}: DashboardLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-8 sm:py-10 flex-1 lg:flex lg:items-start lg:gap-8">
        <DashboardSidebar role={role} />
        {/* pb-20 on mobile reserves space above the fixed bottom nav */}
        <main className={cn("flex-1 min-w-0 pb-20 lg:pb-0", contentClassName)}>
          {children}
        </main>
      </div>
      <SiteFooter />
      <MobileBottomNav role={role} />
    </div>
  );
}
