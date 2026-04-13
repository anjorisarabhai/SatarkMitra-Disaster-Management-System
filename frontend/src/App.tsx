import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignUpPage";
import UnauthorizedPage from "./pages/UnauthorizedPage";
import KedarnathDashboard from "./pages/KedarnathDashboard";
import DelhiDashboard from "./pages/DelhiDashboard";
import CitizenDashboard from "./pages/dashboards/CitizenDashboard";
import FirstResponderDashboard from "./pages/dashboards/FirstResponderDashboard";
import GovernmentDashboard from "./pages/dashboards/GovernmentDashboard";
import AdminDashboard from "./pages/dashboards/AdminDashboard";
import ControlRoomDashboard from "./pages/dashboards/ControlRoomDashboard";
import AdminCreateUser from "./pages/AdminCreateUser";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <AccessibilityProvider>
        <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<SignupPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/kedarnath" element={<KedarnathDashboard />} />
            <Route path="/delhi" element={<DelhiDashboard />} />

            {/* Role-based dashboards */}
            <Route path="/dashboard/citizen" element={
              <ProtectedRoute allowedRoles={["citizen"]}>
                <CitizenDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/responder" element={
              <ProtectedRoute allowedRoles={["first_responder"]}>
                <FirstResponderDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/government" element={
              <ProtectedRoute allowedRoles={["government"]}>
                <GovernmentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/control-room" element={
              <ProtectedRoute allowedRoles={["control_room"]}>
                <ControlRoomDashboard />
              </ProtectedRoute>
            } />
            <Route path="/dashboard/admin" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            } />

            {/* Admin Create User Route */}
            <Route path="/admin/create-user" element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminCreateUser />
              </ProtectedRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        </AuthProvider>
        </AccessibilityProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;