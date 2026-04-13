import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Shield, 
  UserPlus, 
  Building2, 
  Radio, 
  Siren,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  User,
  Lock,
  Briefcase,
  Award,
  LogOut,
  Clock
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import DashboardHeader from "@/components/layout/DashboardHeader";
import type { UserRole } from "@/lib/roles";

// Role configuration for admin creation
// 🔒 SECURITY FIX: Removed 'admin' from allowed roles
const ALLOWED_ROLES = [
  {
    value: "govt_official" as UserRole,
    label: "Government Official",
    description: "Access to analytics dashboards and policy insights",
    icon: Building2,
    color: "blue"
  },
  {
    value: "control_room" as UserRole,
    label: "Control Room Operator",
    description: "Monitor alerts, coordinate response teams",
    icon: Radio,
    color: "purple"
  },
  {
    value: "first_responder" as UserRole,
    label: "First Responder",
    description: "NCC/NSS cadet with field response capabilities",
    icon: Siren,
    color: "green"
  }
] as const;

interface CreateUserForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  department: string;
  badge_id: string;
  subscribe_alerts: boolean;
}

interface AdminSession {
  token: string;
  email: string;
  expires_at: string;
  created_at: string;
  name?: string;
}

export default function AdminCreateUser() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState<CreateUserForm>({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "govt_official",
    department: "",
    badge_id: "",
    subscribe_alerts: true
  });
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sessionTimeLeft, setSessionTimeLeft] = useState<string>("");
  
  // 🔐 Get admin token from localStorage (set during login)
  const [adminToken, setAdminToken] = useState<string>("");
  const [adminEmail, setAdminEmail] = useState<string>("");

  useEffect(() => {
    // Retrieve admin session data with expiry
    const sessionData = localStorage.getItem("admin_session");
    
    if (sessionData) {
      try {
        const session: AdminSession = JSON.parse(sessionData);
        
        // Check if token is expired
        const expiresAt = new Date(session.expires_at);
        const now = new Date();
        
        if (now > expiresAt) {
          // Token expired
          localStorage.removeItem("admin_session");
          toast({
            title: "Session Expired",
            description: "Your admin session has expired. Please login again.",
            variant: "destructive"
          });
          navigate("/login");
          return;
        }
        
        setAdminToken(session.token);
        setAdminEmail(session.email);
        
        // Calculate and display time remaining
        const timeLeftMs = expiresAt.getTime() - now.getTime();
        const minutesLeft = Math.floor(timeLeftMs / 60000);
        const secondsLeft = Math.floor((timeLeftMs % 60000) / 1000);
        
        setSessionTimeLeft(`${minutesLeft}m ${secondsLeft}s`);
        
        // Update time left every second
        const interval = setInterval(() => {
          const now = new Date();
          const timeLeftMs = expiresAt.getTime() - now.getTime();
          
          if (timeLeftMs <= 0) {
            clearInterval(interval);
            localStorage.removeItem("admin_session");
            toast({
              title: "Session Expired",
              description: "Your admin session has expired. Please login again.",
              variant: "destructive"
            });
            navigate("/login");
          } else {
            const minutesLeft = Math.floor(timeLeftMs / 60000);
            const secondsLeft = Math.floor((timeLeftMs % 60000) / 1000);
            setSessionTimeLeft(`${minutesLeft}m ${secondsLeft}s`);
          }
        }, 1000);
        
        // Optional: Show time remaining
        const timeLeft = Math.floor((expiresAt.getTime() - Date.now()) / 60000);
        console.log(`✅ Admin session valid for ${timeLeft} more minutes`);
        
        return () => clearInterval(interval);
        
      } catch (error) {
        console.error("Failed to parse session data:", error);
        localStorage.removeItem("admin_session");
        navigate("/login");
      }
    } else if (user?.role === "admin") {
      toast({
        title: "Session Required",
        description: "Please login again to continue",
        variant: "destructive"
      });
      navigate("/login");
    }
  }, [user, navigate, toast]);

  // Security check - only admin can access
  if (user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="p-4 rounded-full bg-destructive/10 inline-block mb-4">
            <Shield className="w-16 h-16 text-destructive" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">
            This page requires administrator privileges. 
          </p>
          <Button onClick={() => navigate("/dashboard/admin")}>
            Return to Admin Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 🔒 Check for admin token AND admin email (source of truth)
    if (!adminToken || !adminEmail) {
      toast({
        title: "Authentication Required",
        description: "Admin session missing. Please login again.",
        variant: "destructive"
      });
      navigate("/login");
      return;
    }
    
    // Password validation
    if (formData.password.length < 8) {
      toast({
        title: "Password too weak",
        description: "Password must be at least 8 characters long",
        variant: "destructive"
      });
      return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    // Phone validation
    const phoneRegex = /^[\d\s\+\-\(\)]{10,}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast({
        title: "Invalid phone",
        description: "Please enter a valid phone number",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);

    try {
      // 🔒 SECURE: Send admin email (from session) and token in headers
      const response = await fetch(`http://localhost:8000/admin/create-user`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json",
          "admin-email": adminEmail,
          "admin-token": adminToken         // Session token in header
        },
        body: JSON.stringify(formData)
      });

      // 🔧 Safer response handling - check before parsing JSON
      if (!response.ok) {
  let errorMessage = "Failed to create user";
  try {
    const err = await response.json();

    if (Array.isArray(err.detail)) {
      errorMessage = err.detail.map((e: any) => e.msg).join(", ");
    } else {
      errorMessage = err.detail || errorMessage;
    }

  } catch {
    errorMessage = response.statusText || errorMessage;
  }
  throw new Error(errorMessage);
}

      const data = await response.json();

      setSuccess(true);
      toast({
        title: "✅ User Created Successfully",
        description: `${formData.name} has been registered as ${formData.role.replace("_", " ")}`,
      });
      
      // Reset form after 2 seconds
      setTimeout(() => {
        setFormData({
          name: "",
          email: "",
          phone: "",
          password: "",
          role: "govt_official",
          department: "",
          badge_id: "",
          subscribe_alerts: true
        });
        setSuccess(false);
      }, 2000);
      
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to create user account",
        variant: "destructive"
      });
      
      // If unauthorized, redirect to login
      if (error.message?.includes("Invalid") || error.message?.includes("session") || error.message?.includes("expired")) {
        localStorage.removeItem("admin_session");
        navigate("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // Call logout endpoint to invalidate token on server
      if (adminToken && adminEmail) {
        await fetch("http://localhost:8000/admin/logout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "admin_email": adminEmail,
            "admin_token": adminToken
          }
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local session regardless of server response
      localStorage.removeItem("admin_session");
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out",
      });
      navigate("/login");
    }
  };

  const selectedRoleConfig = ALLOWED_ROLES.find(r => r.value === formData.role);

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />
      
      <main className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto"
        >
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <Button
                variant="ghost"
                onClick={() => navigate("/dashboard/admin")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin Dashboard
              </Button>
              
              <div className="flex items-center gap-3">
                {/* Session Timer */}
                {sessionTimeLeft && (
                  <Badge variant="outline" className="gap-1">
                    <Clock className="w-3 h-3" />
                    Session: {sessionTimeLeft}
                  </Badge>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  className="text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout Admin
                </Button>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/10 border border-primary/20">
                <UserPlus className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Create User Account</h1>
                <p className="text-sm md:text-base text-muted-foreground">
                  Admin: {adminEmail || user?.email} • Session verified ✓ • Expires in: {sessionTimeLeft}
                </p>
              </div>
            </div>
          </div>

          {/* Main Form */}
          <Card className="border-border/50 bg-card/80 backdrop-blur">
            <CardHeader>
              <CardTitle>New User Registration</CardTitle>
              <CardDescription>
                Create accounts for government officials, control room operators, and first responders
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {success ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="py-12 text-center"
                >
                  <div className="p-4 rounded-full bg-green-500/10 inline-block mb-4">
                    <CheckCircle2 className="w-16 h-16 text-green-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">User Created Successfully!</h2>
                  <p className="text-muted-foreground mb-4">
                    Account has been created and is ready to use
                  </p>
                  <Button onClick={() => setSuccess(false)}>
                    Create Another User
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <span className="w-1 h-5 bg-primary rounded-full" />
                      Basic Information
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          Full Name *
                        </Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => setFormData({...formData, name: e.target.value})}
                          placeholder="Dr. Rajesh Kumar"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email" className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-muted-foreground" />
                          Email Address *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                          placeholder="rajesh.kumar@gov.in"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-muted-foreground" />
                          Phone Number *
                        </Label>
                        <Input
                          id="phone"
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                          placeholder="+91 98765 43210"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="password" className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-muted-foreground" />
                          Password *
                        </Label>
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => setFormData({...formData, password: e.target.value})}
                          placeholder="Minimum 8 characters"
                          required
                          minLength={8}
                        />
                        <p className="text-xs text-muted-foreground">
                          Password must be at least 8 characters long
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Role Assignment */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <span className="w-1 h-5 bg-primary rounded-full" />
                      Assign Role
                    </h3>
                    
                    <div className="grid gap-3">
                      {ALLOWED_ROLES.map((roleOption) => {
                        const Icon = roleOption.icon;
                        const isSelected = formData.role === roleOption.value;
                        
                        return (
                          <button
                            key={roleOption.value}
                            type="button"
                            onClick={() => setFormData({...formData, role: roleOption.value})}
                            className={`flex items-start gap-4 p-4 rounded-lg border-2 text-left transition-all ${
                              isSelected
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <div className={`p-2 rounded-lg ${
                              isSelected ? "bg-primary/20" : "bg-muted"
                            }`}>
                              <Icon className={`w-5 h-5 ${
                                isSelected ? "text-primary" : "text-muted-foreground"
                              }`} />
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="font-medium">{roleOption.label}</p>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {roleOption.description}
                              </p>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-5 h-5 text-primary" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    
                    {/* Note about admin role */}
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                      <p className="text-xs text-yellow-800 dark:text-yellow-300">
                        <strong>Note:</strong> Admin accounts cannot be created through this interface. 
                        Please contact the system administrator for admin account creation.
                      </p>
                    </div>
                  </div>

                  {/* Additional Information */}
                  {selectedRoleConfig && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="space-y-4"
                    >
                      <h3 className="text-lg font-semibold flex items-center gap-2">
                        <span className="w-1 h-5 bg-primary rounded-full" />
                        Additional Details (Optional)
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="department" className="flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-muted-foreground" />
                            Department/Organization
                          </Label>
                          <Input
                            id="department"
                            value={formData.department}
                            onChange={(e) => setFormData({...formData, department: e.target.value})}
                            placeholder="e.g., Disaster Management Authority"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="badge_id" className="flex items-center gap-2">
                            <Award className="w-4 h-4 text-muted-foreground" />
                            Badge/Employee ID
                          </Label>
                          <Input
                            id="badge_id"
                            value={formData.badge_id}
                            onChange={(e) => setFormData({...formData, badge_id: e.target.value})}
                            placeholder="e.g., DM-OFF-2024-001"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Alert Subscription */}
                  <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border border-border">
                    <input
                      type="checkbox"
                      id="subscribe_alerts"
                      checked={formData.subscribe_alerts}
                      onChange={(e) => setFormData({...formData, subscribe_alerts: e.target.checked})}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="subscribe_alerts" className="cursor-pointer">
                      Subscribe to SMS alerts for emergency notifications
                    </Label>
                  </div>

                  {/* Audit Trail */}
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex gap-3">
                      <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
                          Audit Trail - This action will be logged
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-400">
                          Created by: {adminEmail || user?.email} ({user?.name})<br />
                          Timestamp: {new Date().toLocaleString()}<br />
                          Session: Verified ✓ (Expires in {sessionTimeLeft})
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                    size="lg"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    {loading ? "Creating Account..." : `Create ${formData.role.replace("_", " ")} Account`}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Security Policy Notice */}
          <Card className="border-border/50 bg-card/80 backdrop-blur mt-6">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm mb-1">Security Policy</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Privileged accounts can only be created by system administrators</li>
                    <li>• All account creations are logged for security audit purposes</li>
                    <li>• Admin sessions expire after 1 hour for security</li>
                    <li>• Users will receive account credentials via secure email channels</li>
                    <li>• Regular citizens must self-register through the public signup page</li>
                    <li>• Admin accounts require super-admin privileges (contact system administrator)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}