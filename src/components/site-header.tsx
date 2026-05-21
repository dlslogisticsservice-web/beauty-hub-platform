import { Link, useNavigate } from "@tanstack/react-router";
import { Sparkles, LogOut, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
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
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-soft">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="text-2xl text-display font-semibold tracking-tight">
            Glowy <span className="text-primary text-base align-middle" dir="rtl">جلوي</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <Link to="/" className="text-sm hover:text-primary transition-colors">Home</Link>
          <Link to="/centers" className="text-sm hover:text-primary transition-colors">Browse</Link>
          {isAdmin && (
            <>
              <Link to="/admin/dashboard" className="text-sm hover:text-primary transition-colors">Admin</Link>
              <Link to="/admin/centers" className="text-sm hover:text-primary transition-colors">Centers</Link>
              <Link to="/admin/bookings" className="text-sm hover:text-primary transition-colors">Bookings</Link>
              <Link to="/admin/subscriptions" className="text-sm hover:text-primary transition-colors">Plans</Link>
            </>
          )}
          {isCenterOwner && !isAdmin && (
            <>
              <Link to="/center/dashboard" className="text-sm hover:text-primary transition-colors">Dashboard</Link>
              <Link to="/center/bookings" className="text-sm hover:text-primary transition-colors">Bookings</Link>
              <Link to="/center/services" className="text-sm hover:text-primary transition-colors">Services</Link>
              <Link to="/center/profile" className="text-sm hover:text-primary transition-colors">Profile</Link>
            </>
          )}
          {isCustomer && !isCenterOwner && !isAdmin && (
            <Link to="/dashboard" className="text-sm hover:text-primary transition-colors">My Bookings</Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {!isAuthenticated ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/auth/login" })}>
                Sign in
              </Button>
              <Button size="sm" className="rounded-full bg-gradient-primary shadow-soft" onClick={() => navigate({ to: "/auth/signup" })}>
                Join Glowy
              </Button>
            </>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full">
                  <UserIcon className="h-4 w-4" />
                  <span className="ml-2 hidden sm:inline">{user?.email?.split("@")[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate({ to: "/admin/dashboard" })}>Admin dashboard</DropdownMenuItem>
                )}
                {isCenterOwner && (
                  <>
                    <DropdownMenuItem onClick={() => navigate({ to: "/center/dashboard" })}>Center dashboard</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate({ to: "/center/profile" })}>Center profile</DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => navigate({ to: "/dashboard" })}>My bookings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
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
  return (
    <footer className="border-t border-border/60 bg-background mt-24">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-display text-2xl">Glowy <span dir="rtl" className="text-primary text-lg">جلوي</span></p>
            <p className="text-sm text-muted-foreground mt-1">Beauty, laser & aesthetic bookings — done right.</p>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Glowy. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
