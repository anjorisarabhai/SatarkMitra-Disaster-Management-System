import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Shield, LogOut, Mountain, Building2, LayoutDashboard, Accessibility, Type, Volume2, Languages } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAccessibility } from "@/contexts/AccessibilityContext";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getRoleLabel, getRoleDashboardPath } from "@/lib/roles";

export default function DashboardHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { largeText, voiceAlerts, simpleLanguage, setLargeText, setVoiceAlerts, setSimpleLanguage } = useAccessibility();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLinks = [
    { path: user ? getRoleDashboardPath(user.role) : "/", label: "My Dashboard", icon: LayoutDashboard },
    { path: "/kedarnath", label: "Kedarnath", icon: Mountain },
    { path: "/delhi", label: "Delhi NCR", icon: Building2 },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/80 backdrop-blur-xl">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            <span className="font-bold text-foreground">SatarkMitra</span>
          </div>

          <nav className="hidden md:flex items-center gap-1 ml-4">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  location.pathname === link.path
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {user && (
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user.name} · {getRoleLabel(user.role)}
            </span>
          )}

          {/* Accessibility Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Accessibility className="w-4 h-4" />
                {(largeText || voiceAlerts || simpleLanguage) && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="end">
              <p className="text-sm font-semibold text-foreground mb-3">Accessibility</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Large Text</span>
                  </div>
                  <Switch checked={largeText} onCheckedChange={setLargeText} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Voice Alerts</span>
                  </div>
                  <Switch checked={voiceAlerts} onCheckedChange={setVoiceAlerts} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Languages className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground">Simple Language</span>
                  </div>
                  <Switch checked={simpleLanguage} onCheckedChange={setSimpleLanguage} />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <ThemeToggle />
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex items-center gap-1 px-4 pb-2 overflow-x-auto">
        {navLinks.map((link) => (
          <Link
            key={link.path}
            to={link.path}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
              location.pathname === link.path
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}
          >
            <link.icon className="w-3.5 h-3.5" />
            {link.label}
          </Link>
        ))}
      </div>
    </header>
  );
}
