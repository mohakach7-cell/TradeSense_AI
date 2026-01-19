import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { TrendingUp, Menu, X, LogOut, User, ChevronDown, Shield, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAdmin } from "@/hooks/useAdmin";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Navbar = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut, isLoading } = useAuth();
  const { isAdmin, isSuperAdmin } = useAdmin();

  const navLinks = [
    { name: t("nav.home"), path: "/" },
    { name: t("nav.challenges"), path: "/challenges" },
    { name: t("nav.dashboard"), path: "/dashboard" },
    { name: t("nav.leaderboard"), path: "/leaderboard" },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-foreground text-lg tracking-tight">TradeSense</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Right Side */}
          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-success/10 border border-success/20">
              <div className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-xs font-medium text-success">{t("dashboard.live")}</span>
            </div>
            
            {!isLoading && (
              <>
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2 h-9">
                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-3 h-3 text-primary" />
                        </div>
                        <span className="max-w-[80px] truncate text-sm">{user.email?.split("@")[0]}</span>
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                        <TrendingUp className="w-4 h-4 mr-2" />
                        {t("nav.dashboard")}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate("/profile")}>
                        <User className="w-4 h-4 mr-2" />
                        {t("nav.profile")}
                      </DropdownMenuItem>
                      {isAdmin && (
                        <DropdownMenuItem onClick={() => navigate("/admin")}>
                          <Shield className="w-4 h-4 mr-2" />
                          {t("nav.admin")}
                        </DropdownMenuItem>
                      )}
                      {isSuperAdmin && (
                        <DropdownMenuItem onClick={() => navigate("/superadmin")}>
                          <Crown className="w-4 h-4 mr-2" />
                          {t("nav.superAdmin")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                        <LogOut className="w-4 h-4 mr-2" />
                        {t("nav.logout")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <>
                    <Link to="/auth">
                      <Button variant="ghost" size="sm" className="h-9">
                        {t("nav.login")}
                      </Button>
                    </Link>
                    <Link to="/auth">
                      <Button size="sm" className="h-9">
                        {t("challenges.startChallenge")}
                      </Button>
                    </Link>
                  </>
                )}
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`px-3 py-2.5 rounded-md text-sm font-medium ${
                    isActive(link.path)
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
              {isAdmin && (
                <Link
                  to="/admin"
                  onClick={() => setIsOpen(false)}
                  className={`px-3 py-2.5 rounded-md text-sm font-medium flex items-center gap-2 ${
                    isActive("/admin")
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  Admin
                </Link>
              )}
              <div className="flex items-center gap-2 mt-4 px-3">
                <LanguageSwitcher />
                <ThemeToggle />
              </div>
              <div className="flex gap-2 mt-2 px-3">
                {user ? (
                  <Button variant="outline" size="sm" className="flex-1" onClick={handleSignOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    {t("nav.logout")}
                  </Button>
                ) : (
                  <>
                    <Link to="/auth" className="flex-1">
                      <Button variant="ghost" size="sm" className="w-full">
                        {t("nav.login")}
                      </Button>
                    </Link>
                    <Link to="/auth" className="flex-1">
                      <Button size="sm" className="w-full">
                        {t("challenges.startChallenge")}
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
