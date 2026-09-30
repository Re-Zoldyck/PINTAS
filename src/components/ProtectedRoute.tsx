import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../helpers/useAuth";
import { User } from "../helpers/User";
import { AuthErrorPage } from "./AuthErrorPage";
import { ShieldOff } from "lucide-react";
import { AuthLoadingState } from "./AuthLoadingState";
import styles from "./ProtectedRoute.module.css";

// Do not use this in pageLayout
const MakeProtectedRoute: (roles: User["role"][]) => React.FC<{
  children: React.ReactNode;
}> =
  (roles) =>
  ({ children }) => {
    const { authState } = useAuth();

    if (authState.type === "loading") {
      return <AuthLoadingState title="Memeriksa sesi" />;
    }

    if (authState.type === "unauthenticated") {
      return <Navigate to="/login" replace />;
    }

    if (!roles.includes(authState.user.role)) {
      return (
        <AuthErrorPage
          title="Akses ditolak"
          message={`Halaman ini tidak tersedia untuk peran ${authState.user.role}.`}
          icon={<ShieldOff className={styles.accessDeniedIcon} size={64} />}
        />
      );
    }

    return <>{children}</>;
  };

export const AdminRoute = MakeProtectedRoute(["admin"]);
export const OwnerRoute = MakeProtectedRoute(["owner"]);
export const CreatorRoute = MakeProtectedRoute(["creator"]);
export const AnyRoleRoute = MakeProtectedRoute(["owner", "creator", "admin"]);