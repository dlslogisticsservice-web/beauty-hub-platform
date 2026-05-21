import { Link, useNavigate } from "@tanstack/react-router";
import { LogOut, User as UserIcon, Globe, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useI18n } from "@/hooks/use-i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

export function SiteHeader() {
  const { isAuthenticated, user, isAdmin, isCenterOwner, isCustomer, signOut } = useAuth();
  const { t, locale, setLocale } = useI18n();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-2xl text-display font-semibold tracking-tight text-gold-gradient">
            Beauty Hub
          </span>
          <span dir="rtl" className="text-base text-display text-primary/80 hidden sm:inline">بيوتي هب</span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.home")}</Link>
          <Link to="/centers" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.centers")}</Link>
          {isAdmin && (
            <>
              <Link to="/admin/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.admin")}</Link>
              <Link to="/admin/centers" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.centers")}</Link>
              <Link to="/admin/bookings" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.bookings")}</Link>
              <Link to="/admin/subscriptions" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.plans")}</Link>
            </>
          )}
          {isCenterOwner && !isAdmin && (
            <>
              <Link to="/center/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.dashboard")}</Link>
              <Link to="/center/bookings" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.bookings")}</Link>
              <Link to="/center/services" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.services")}</Link>
              <Link to="/center/profile" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.profile")}</Link>
            </>
          )}
          {isCustomer && !isCenterOwner && !isAdmin && (
            <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-primary transition-colors">{t("nav.my_bookings")}</Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
            className="text-xs gap-1"
            aria-label="Toggle language"
          >
            <Globe className="h-4 w-4" />
            {locale === "ar" ? "🇸🇦 AR" : "🇬🇧 EN"}
          </Button>

          {!isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/auth/login" })}>
                {t("nav.login")}
              </Button>
              <Button size="sm" className="rounded-full bg-gradient-primary text-primary-foreground font-semibold shadow-soft" onClick={() => navigate({ to: "/auth/signup" })}>
                {t("nav.join")}
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full border-gold text-primary">
                  <UserIcon className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">{user?.email?.split("@")[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => navigate({ to: "/admin/dashboard" })}>{t("nav.admin")}</DropdownMenuItem>
                  </>
                )}
                {isCenterOwner && (
                  <>
                    <DropdownMenuItem onClick={() => navigate({ to: "/center/dashboard" })}>{t("nav.dashboard")}</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate({ to: "/center/profile" })}>{t("nav.profile")}</DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>{t("nav.my_bookings")}</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="h-4 w-4 mr-2" /> {t("nav.signout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const { t } = useI18n();
  return (
    <footer className="border-t border-border bg-background mt-24">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-display text-2xl text-gold-gradient">Beauty Hub <span dir="rtl" className="text-primary/80 text-lg">بيوتي هب</span></p>
            <p className="text-sm text-muted-foreground mt-1">{t("brand.tagline")}</p>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Beauty Hub. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
