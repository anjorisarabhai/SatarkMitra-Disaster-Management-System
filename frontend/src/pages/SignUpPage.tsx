import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Shield, UserPlus, Eye, EyeOff } from "lucide-react";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getRoleDashboardPath } from "@/lib/roles";
import USSDAlert from "@/components/ui/USSDAlert";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // 🔒 SECURITY FIX: Force citizen role - users cannot self-assign privileged roles
  const role = "citizen" as const;
  
  const { signup } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ 
        title: "Password too short", 
        description: "Minimum 6 characters required.", 
        variant: "destructive" 
      });
      return;
    }
    setLoading(true);
    const success = await signup(email, password, name, role);
    setLoading(false);

    if (success) {
      toast({ 
        title: "Account created!", 
        description: `Welcome, ${name}. You are registered as a citizen.` 
      });
      navigate(getRoleDashboardPath(role));
    } else {
      toast({ 
        title: "Signup failed", 
        description: "Email already registered or invalid data.", 
        variant: "destructive" 
      });
    }
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
              <h1 className="text-2xl font-extrabold text-foreground">SatarkMitra</h1>
            </div>
            <p className="text-muted-foreground text-sm">Create your citizen account</p>
            
            {/* 🔒 SECURITY NOTICE: Role assignment policy */}
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-800 dark:text-blue-300">
                <strong>📋 Note:</strong> All new accounts are registered as citizens. 
                Government, Control Room, and Responder roles are assigned by authorized administrators.
              </p>
            </div>
          </div>
          
          <USSDAlert />

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                placeholder="Your name" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>

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
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* 🔒 SECURITY FIX: Role selection removed - all users default to citizen */}
            <div className="p-3 bg-muted/30 rounded-lg border border-border">
              <p className="text-sm font-medium text-foreground mb-1">Account Type</p>
              <p className="text-sm text-muted-foreground">
                Citizen Account
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                You can report incidents, view alerts, and access public safety information.
              </p>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <UserPlus className="w-4 h-4 mr-2" />
              {loading ? "Creating account..." : "Create Citizen Account"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
          
          {/* 🔒 ADMIN NOTICE */}
          <p className="text-center text-xs text-muted-foreground mt-4">
            Government officials and first responders: Please contact your administrator for account setup.
          </p>
        </div>
      </motion.div>
    </div>
  );
}