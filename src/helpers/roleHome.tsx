import type { UserRole } from "./schema";

export function roleHome(role: UserRole | null | undefined): string {
  switch (role) {
    case "owner":
      return "/owner/dashboard";
    case "admin":
      return "/admin/dashboard";
    case "creator":
      return "/creator/dashboard";
    default:
      return "/login";
  }
}