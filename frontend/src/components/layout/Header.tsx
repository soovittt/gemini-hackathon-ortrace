import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, LogOut } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { appUrl } from "@/lib/domain";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import ortraceLogo from "@/assets/ortrace_logo.png";

interface HeaderProps {
  variant?: 'landing' | 'app';
}

const Header = ({ variant = 'app' }: HeaderProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Navigation items based on user role
  const getNavItems = () => {
    if (!isAuthenticated || !user) return [];

    if (user.role === 'internal') {
      return [
        { path: "/overview", label: "Overview" },
        { path: "/tickets", label: "Tickets" },
        { path: "/integrations", label: "Integrations" },
        { path: "/analytics", label: "Analytics" },
      ];
    } else {
      // Customer navigation - minimal
      return [
        { path: "/overview", label: "Overview" },
      ];
    }
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Landing page header (minimal) — links to app subdomain when on landing domain
  if (variant === 'landing') {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="group flex items-center">
            <img src={ortraceLogo} alt="Ortrace" className="h-7 transition-opacity group-hover:opacity-80 dark:invert" />
          </Link>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button asChild>
                <a href={appUrl("/overview")}>Go to Dashboard</a>
              </Button>
            ) : (
              <Button asChild variant="outline">
                <a href={appUrl("/auth")}>Sign In</a>
              </Button>
            )}
          </div>
        </div>
      </header>
    );
  }

  // App header (with navigation)
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="group flex items-center">
          <img src={ortraceLogo} alt="Ortrace" className="h-7 transition-opacity group-hover:opacity-80 dark:invert" />
        </Link>

        {/* Desktop Navigation */}
        {navItems.length > 0 && (
        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`relative px-4 py-2 text-sm font-medium transition-colors rounded-lg hover:bg-accent ${
                location.pathname.startsWith(item.path) ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
              {location.pathname.startsWith(item.path) && (
                <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </nav>
        )}

        {/* Right side - User menu */}
        <div className="flex items-center gap-4">
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={user.avatar_url || undefined} alt={user.name || 'User'} />
                    <AvatarFallback>
                      {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    {user.name && (
                      <p className="font-medium">{user.name}</p>
                    )}
                    {user.email && (
                      <p className="w-[200px] truncate text-sm text-muted-foreground">
                        {user.email}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground capitalize">
                      {user.role} account
                    </p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="outline">
              <Link to="/auth">Sign In</Link>
            </Button>
          )}

        {/* Mobile Menu Button */}
          {navItems.length > 0 && (
        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
          )}
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && navItems.length > 0 && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl md:hidden animate-fade-in">
          <nav className="container py-4 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname.startsWith(item.path)
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
