import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Link, Navigate } from "react-router-dom";
import { AuthPanel } from "../components/AuthPanel";
import { PasswordLoginForm } from "../components/PasswordLoginForm";
import { useAuth } from "../helpers/useAuth";
import { roleHome } from "../helpers/roleHome";
import styles from "./login.module.css";

const DEMO = [
  { label: "Owner", email: "owner@pintas.id" },
  { label: "Creator", email: "creator@pintas.id" },
  { label: "Admin", email: "admin@pintas.id" },
];

export default function LoginPage() {
  const { authState } = useAuth();
  const [prefill, setPrefill] = useState<{ email: string; key: number } | null>(null);

  if (authState.type === "authenticated") {
    return <Navigate to={roleHome(authState.user.role)} replace />;
  }

  return (
    <>
      <Helmet>
        <title>Masuk — PINTAS</title>
      </Helmet>
      <AuthPanel
        title="Masuk ke PINTAS"
        subtitle="Gunakan email dan password akun Anda."
        footer={
          <>
            Belum punya akun? <Link to="/register">Daftar sebagai Owner atau Creator</Link>
          </>
        }
      >
        <PasswordLoginForm key={prefill?.key ?? 0} defaultEmail={prefill?.email} defaultPassword={prefill ? "pintas123" : undefined} />
        <div className={styles.demo}>
          <span className={styles.demoLabel}>Akun demo (password: pintas123)</span>
          <div className={styles.demoChips}>
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                className={styles.chip}
                onClick={() => setPrefill({ email: d.email, key: Date.now() })}
              >
                {d.label} · {d.email}
              </button>
            ))}
          </div>
        </div>
      </AuthPanel>
    </>
  );
}