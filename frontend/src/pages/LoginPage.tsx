import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Shield, LogIn, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getRoleDashboardPath } from "@/lib/roles";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const success = await login(email, password);
    
    if (success) {
      try {
        const user = JSON.parse(localStorage.getItem("satarkmitra_user") || "null");

if (!user) {
  toast({
    title: "Error",
    description: "User session not found.",
    variant: "destructive",
  });
  setLoading(false);
  return;
}

        // 🔐 SECURITY: If user is admin, get backend session token
        if (user.role === "admin") {
          try {
            const formData = new URLSearchParams();
            formData.append("email", email);
            formData.append("password", password);

            const response = await fetch("http://localhost:8000/admin/login", {
              method: "POST",
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: formData.toString()
            });

            if (response.ok) {
              const data = await response.json();
              
              // Store admin session with expiry
              const sessionData = {
                token: data.token,
                email: data.email,
                name: data.name,
                expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour
                created_at: new Date().toISOString()
              };
              
              localStorage.setItem("admin_session", JSON.stringify(sessionData));
              
              toast({
                title: "Admin Login Successful",
                description: `Welcome back, ${data.name}. Session expires in ${data.expires_in}.`,
              });
              
              console.log("✅ Admin session stored with expiry");
            } else {
              console.warn("⚠️ Admin token fetch failed, using local auth only");
              toast({
                title: "Admin Login",
                description: "Logged in with local authentication",
              });
            }
          } catch (error) {
            console.error("Admin token error:", error);
          }
        }

        navigate(getRoleDashboardPath(user.role));
      } catch (error) {
        toast({
          title: "Error",
          description: "Something went wrong. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Login failed",
        description: "Invalid email or password. Please sign up first.",
        variant: "destructive",
      });
    }
    
    setLoading(false);
  };

  const handleOfflineMode = () => {
    window.location.href = "tel:*123#";
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative">
      
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      <div className="absolute inset-0 bg-hero-pattern opacity-50" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="glass-card p-8">

          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-extrabold text-foreground">
                SatarkMitra
              </h1>
            </div>
            <p className="text-muted-foreground text-sm">
              Sign in to your dashboard
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !email || !password}
            >
              <LogIn className="w-4 h-4 mr-2" />
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <button
            onClick={handleOfflineMode}
            className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
          >
            📞 Offline Mode (*384*41482#)
          </button>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-primary hover:underline font-medium"
            >
              Sign up
            </Link>
          </p>

          <div className="mt-4 p-3 bg-muted/30 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground text-center">
              <strong>Demo Credentials:</strong><br />
              Admin: admin@satarkmitra.com / admin123
            </p>
          </div>

        </div>
      </motion.div>
    </div>
  );
}