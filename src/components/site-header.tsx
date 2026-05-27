import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  LogOut,
  User as UserIcon,
  Globe,
  Crown,
  Menu,
  Home,
  Search,
  CalendarDays,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

// ── Brand logo mark ────────────────────────────────────────────────────────

function BrandLogo({ onClick }: { onClick?: () => void }) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className="flex items-center gap-2.5 group"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-soft transition-transform duration-200 group-hover:scale-105">
        <Crown className="h-4 w-4 text-black" />
      </span>
      <span className="text-2xl text-display font-semibold tracking-tight text-gold-gradient leading-none">
        Beauty Hub
      </span>
      <span
        dir="rtl"
        className="text-sm text-display text-primary/70 hidden sm:inline leading-none"
      >
        بيوتي هب
      </span>
    </Link>
  );
}

// ── Drawer nav item ────────────────────────────────────────────────────────

function DrawerLink({
  to,
  label,
  onClick,
}: {
  to: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <Link
      to={to as never}
      onClick={onClick}
      className="flex items-center justify-between py-3.5 border-b border-border/50 text-sm text-foreground/80 hover:text-primary transition-colors"
    >
      {label}
      <span className="text-muted-foreground/30 text-base">›</span>
    </Link>
  );
}

// ── Mobile bottom-nav tab ──────────────────────────────────────────────────

function BottomTab({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to as never}
      className="flex flex-1 flex-col items-center justify-center gap-1 py-2 text-muted-foreground hover:text-primary transition-colors active:scale-95"
    >
      {icon}
      <span className="text-[10px] font-medium leading-none tracking-tight">
        {label}
      </span>
    </Link>
  );
}

// ── SiteHeader ─────────────────────────────────────────────────────────────

export function SiteHeader() {
  const {
    isAuthenticated,
    user,
    isAdmin,
    isSuperAdmin,
    isCenterOwner,
    isCustomer,
    signOut,
  } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">

          {/* Brand */}
          <BrandLogo />

          {/* Desktop navigation */}
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              to="/"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {t("nav.home")}
            </Link>
            <Link
              to="/centers"
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {t("nav.centers")}
            </Link>

            {isAdmin && (
              <>
                <Link to="/admin/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.admin")}</Link>
                <Link to="/admin/centers" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.centers")}</Link>
                <Link to="/admin/bookings" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.bookings")}</Link>
                <Link to="/admin/commissions" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.commissions")}</Link>
                <Link to="/admin/subscriptions" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.plans")}</Link>
                {isSuperAdmin && (
                  <Link to="/admin/system" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.system")}</Link>
                )}
              </>
            )}

            {isCenterOwner && !isAdmin && (
              <>
                <Link to="/center/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.dashboard")}</Link>
                <Link to="/center/bookings" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.bookings")}</Link>
                <Link to="/center/services" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.services")}</Link>
                <Link to="/center/subscription" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.plans")}</Link>
                <Link to="/center/profile" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.profile")}</Link>
              </>
            )}

            {isCustomer && !isCenterOwner && !isAdmin && (
              <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.my_bookings")}</Link>
            )}
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-1.5">
            {/* Language toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
              className="gap-1.5 text-xs"
              aria-label="Toggle language"
            >
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">
                {locale === "ar" ? "EN" : "AR"}
              </span>
            </Button>

            {!isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden sm:flex"
                  onClick={() => navigate({ to: "/auth/login" })}
                >
                  {t("nav.login")}
                </Button>
                <Button
                  size="sm"
                  className="rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-soft"
                  onClick={() => navigate({ to: "/auth/signup" })}
                >
                  <span className="hidden sm:inline">{t("nav.join")}</span>
                  <span className="sm:hidden">{t("nav.signup")}</span>
                </Button>
              </>
            ) : (
              /* Desktop user dropdown — hidden on mobile */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="hidden md:flex rounded-full border-gold text-primary"
                  >
                    <UserIcon className="h-4 w-4" />
                    <span className="ml-2">{user?.email?.split("@")[0]}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate({ to: "/admin/dashboard" })}>
                      {t("nav.admin")}
                    </DropdownMenuItem>
                  )}
                  {isCenterOwner && (
                    <>
                      <DropdownMenuItem onClick={() => navigate({ to: "/center/dashboard" })}>
                        {t("nav.dashboard")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate({ to: "/center/profile" })}>
                        {t("nav.profile")}
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>
                    {t("nav.my_bookings")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="h-4 w-4 mr-2" />
                    {t("nav.signout")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* ── Mobile navigation drawer ─────────────────────────────────── */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="right"
          className="w-[280px] sm:w-[320px] flex flex-col p-0"
        >
          {/* Accessible title (visually hidden) */}
          <SheetHeader className="px-5 py-4 border-b border-border">
            <SheetTitle className="sr-only">Navigation menu</SheetTitle>
            <BrandLogo onClick={() => setDrawerOpen(false)} />
          </SheetHeader>

          {/* Nav links */}
          <nav
            className="flex-1 overflow-y-auto px-5 py-2"
            dir={locale === "ar" ? "rtl" : "ltr"}
          >
            <DrawerLink to="/" label={t("nav.home")} onClick={() => setDrawerOpen(false)} />
            <DrawerLink to="/centers" label={t("nav.centers")} onClick={() => setDrawerOpen(false)} />

            {isAdmin && (
              <>
                <DrawerLink to="/admin/dashboard" label={t("nav.admin")} onClick={() => setDrawerOpen(false)} />
                <DrawerLink to="/admin/bookings" label={t("nav.bookings")} onClick={() => setDrawerOpen(false)} />
                <DrawerLink to="/admin/commissions" label={t("nav.commissions")} onClick={() => setDrawerOpen(false)} />
                <DrawerLink to="/admin/subscriptions" label={t("nav.plans")} onClick={() => setDrawerOpen(false)} />
                {isSuperAdmin && (
                  <DrawerLink to="/admin/system" label={t("nav.system")} onClick={() => setDrawerOpen(false)} />
                )}
              </>
            )}

            {isCenterOwner && !isAdmin && (
              <>
                <DrawerLink to="/center/dashboard" label={t("nav.dashboard")} onClick={() => setDrawerOpen(false)} />
                <DrawerLink to="/center/bookings" label={t("nav.bookings")} onClick={() => setDrawerOpen(false)} />
                <DrawerLink to="/center/services" label={t("nav.services")} onClick={() => setDrawerOpen(false)} />
                <DrawerLink to="/center/subscription" label={t("nav.plans")} onClick={() => setDrawerOpen(false)} />
                <DrawerLink to="/center/profile" label={t("nav.profile")} onClick={() => setDrawerOpen(false)} />
              </>
            )}

            {isCustomer && !isCenterOwner && !isAdmin && (
              <DrawerLink to="/dashboard" label={t("nav.my_bookings")} onClick={() => setDrawerOpen(false)} />
            )}

            {/* Auth actions */}
            {!isAuthenticated ? (
              <div className="mt-5 flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    navigate({ to: "/auth/login" });
                    setDrawerOpen(false);
                  }}
                >
                  {t("nav.login")}
                </Button>
                <Button
                  className="w-full bg-gradient-primary text-primary-foreground font-semibold"
                  onClick={() => {
                    navigate({ to: "/auth/signup" });
                    setDrawerOpen(false);
                  }}
                >
                  {t("nav.join")}
                </Button>
              </div>
            ) : (
              <button
                onClick={() => {
                  signOut();
                  setDrawerOpen(false);
                }}
                className="mt-3 flex w-full items-center gap-2 rounded-lg py-3 text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                <LogOut className="h-4 w-4 shrink-0" />
                {t("nav.signout")}
              </button>
            )}
          </nav>

          {/* Language toggle at bottom */}
          <div className="px-5 pb-6 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 justify-center"
              onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            >
              <Globe className="h-4 w-4" />
              {locale === "ar" ? "Switch to English" : "التحويل للعربية"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// ── SiteFooter ──────────────────────────────────────────────────────────────

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <>
      <footer className="border-t border-border bg-background mt-24">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-display text-2xl text-gold-gradient">
                Beauty Hub{" "}
                <span dir="rtl" className="text-primary/80 text-lg">
                  بيوتي هب
                </span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {t("brand.tagline")}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              © {new Date().getFullYear()} Beauty Hub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* Mobile bottom navigation (fixed) */}
      <MobileBottomNav />

      {/* Spacer so content isn't hidden behind the fixed bottom nav on mobile */}
      <div className="h-20 md:hidden" aria-hidden="true" />
    </>
  );
}

// ── Mobile bottom navigation ───────────────────────────────────────────────

function MobileBottomNav() {
  const { isAuthenticated, isCenterOwner, isAdmin } = useAuth();
  const { t } = useI18n();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t border-border bg-background/95 backdrop-blur-xl"
      aria-label="Mobile navigation"
    >
      <div className="flex items-stretch justify-around h-16 max-w-lg mx-auto px-1">
        <BottomTab
          to="/"
          icon={<Home className="h-5 w-5" />}
          label={t("nav.home")}
        />
        <BottomTab
          to="/centers"
          icon={<Search className="h-5 w-5" />}
          label={t("nav.centers")}
        />
        {isAuthenticated ? (
          <>
            {isCenterOwner && !isAdmin ? (
              <BottomTab
                to="/center/dashboard"
                icon={<LayoutDashboard className="h-5 w-5" />}
                label={t("nav.dashboard")}
              />
            ) : isAdmin ? (
              <BottomTab
                to="/admin/dashboard"
                icon={<LayoutDashboard className="h-5 w-5" />}
                label={t("nav.admin")}
              />
            ) : null}
            <BottomTab
              to="/dashboard"
              icon={<CalendarDays className="h-5 w-5" />}
              label={t("nav.my_bookings")}
            />
          </>
        ) : (
          <BottomTab
            to="/auth/login"
            icon={<UserIcon className="h-5 w-5" />}
            label={t("nav.login")}
          />
        )}
      </div>
    </nav>
  );
}
