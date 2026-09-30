import React from "react";
import { Helmet } from "react-helmet";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { AuthPanel } from "../components/AuthPanel";
import { PasswordRegisterForm } from "../components/PasswordRegisterForm";
import { useAuth } from "../helpers/useAuth";
import { roleHome } from "../helpers/roleHome";

export default function RegisterPage() {
  const { authState } = useAuth();
  const [params] = useSearchParams();
  const roleParam = params.get("role") === "owner" ? "owner" : "creator";

  if (authState.type === "authenticated") {
    return <Navigate to={roleHome(authState.user.role)} replace />;
  }

  return (
    <>
      <Helmet>
        <title>Daftar — PINTAS</title>
      </Helmet>
      <AuthPanel
        title="Buat akun PINTAS"
        subtitle="Pilih peran Anda, lalu lengkapi data akun."
        footer={
          <>
            Sudah punya akun? <Link to="/login">Masuk</Link>
          </>
        }
      >
        <PasswordRegisterForm defaultRole={roleParam} />
      </AuthPanel>
    </>
  );
}