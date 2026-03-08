import { Users, ShieldAlert, Building2, Radio, Settings, type LucideIcon } from "lucide-react";

export type UserRole = "citizen" | "first_responder" | "government" | "control_room" | "admin";

export interface RoleOption {
  value: UserRole;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const ROLE_OPTIONS: RoleOption[] = [
  { value: "citizen", label: "Citizen", description: "Alerts, safety guidance & reporting", icon: Users },
  { value: "first_responder", label: "First Responder", description: "Emergency response & rescue ops", icon: ShieldAlert },
  { value: "government", label: "Government / Authority", description: "Analytics, predictions & planning", icon: Building2 },
  { value: "control_room", label: "Control Room", description: "Live monitoring & coordination", icon: Radio },
  { value: "admin", label: "Admin", description: "System administration", icon: Settings },
];

export function getRoleDashboardPath(role: UserRole): string {
  const paths: Record<UserRole, string> = {
    citizen: "/dashboard/citizen",
    first_responder: "/dashboard/responder",
    government: "/dashboard/government",
    control_room: "/dashboard/control-room",
    admin: "/dashboard/admin",
  };
  return paths[role] || "/dashboard/citizen";
}

export function getRoleLabel(role: UserRole): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label || role;
}
