import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as z from "zod";
import { Briefcase, Sparkles } from "lucide-react";
import { Form, FormControl, FormItem, FormLabel, FormMessage, FormDescription, useForm } from "./Form";
import { Input } from "./Input";
import { Button } from "./Button";
import { Spinner } from "./Spinner";
import styles from "./PasswordRegisterForm.module.css";
import { useAuth } from "../helpers/useAuth";
import { roleHome } from "../helpers/roleHome";
import { schema, postRegister } from "../endpoints/auth/register_with_password_POST.schema";

export type RegisterFormData = z.infer<typeof schema>;

interface PasswordRegisterFormProps {
  className?: string;
  defaultRole?: "owner" | "creator";
}

export const PasswordRegisterForm: React.FC<PasswordRegisterFormProps> = ({ className, defaultRole = "creator" }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { onLogin } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    schema,
    defaultValues: { email: "", password: "", displayName: "", role: defaultRole },
  });

  const handleSubmit = async (data: RegisterFormData) => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await postRegister(data);
      onLogin(result.user);
      navigate(roleHome(result.user.role));
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(message.includes("sudah terdaftar") ? "Email ini sudah terdaftar. Silakan masuk." : message || "Registrasi gagal. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const role = form.values.role;

  return (
    <Form {...form}>
      {error && <div className={styles.errorMessage}>{error}</div>}
      <form onSubmit={form.handleSubmit((data) => handleSubmit(data as RegisterFormData))} className={`${styles.form} ${className || ""}`}>
        <FormItem name="role">
          <FormLabel>Daftar sebagai</FormLabel>
          <div className={styles.roleGrid}>
            <button
              type="button"
              className={`${styles.roleCard} ${role === "creator" ? styles.roleCardActive : ""}`}
              onClick={() => form.setValues((prev: any) => ({ ...prev, role: "creator" }))}
              disabled={isLoading}
            >
              <Sparkles size={18} />
              <span className={styles.roleTitle}>Creator</span>
              <span className={styles.roleDesc}>Ambil campaign, buat konten, dapatkan bayaran per submission valid.</span>
            </button>
            <button
              type="button"
              className={`${styles.roleCard} ${role === "owner" ? styles.roleCardActive : ""}`}
              onClick={() => form.setValues((prev: any) => ({ ...prev, role: "owner" }))}
              disabled={isLoading}
            >
              <Briefcase size={18} />
              <span className={styles.roleTitle}>Owner</span>
              <span className={styles.roleDesc}>Buat campaign dengan budget dan pantau hasilnya secara realtime.</span>
            </button>
          </div>
          <FormMessage />
        </FormItem>

        <FormItem name="displayName">
          <FormLabel>Nama tampilan</FormLabel>
          <FormControl>
            <Input
              placeholder={role === "owner" ? "Nama brand atau perusahaan" : "Nama yang ditampilkan ke Owner"}
              value={form.values.displayName || ""}
              disabled={isLoading}
              onChange={(e) => form.setValues((prev: any) => ({ ...prev, displayName: e.target.value }))}
            />
          </FormControl>
          <FormDescription>Nama asli hanya diminta saat claim pembayaran dan tidak ditampilkan ke publik.</FormDescription>
          <FormMessage />
        </FormItem>

        <FormItem name="email">
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input
              placeholder="nama@email.com"
              type="email"
              autoComplete="email"
              value={form.values.email || ""}
              disabled={isLoading}
              onChange={(e) => form.setValues((prev: any) => ({ ...prev, email: e.target.value }))}
            />
          </FormControl>
          <FormMessage />
        </FormItem>

        <FormItem name="password">
          <FormLabel>Password</FormLabel>
          <FormControl>
            <Input
              type="password"
              placeholder="Minimal 8 karakter"
              autoComplete="new-password"
              value={form.values.password || ""}
              disabled={isLoading}
              onChange={(e) => form.setValues((prev: any) => ({ ...prev, password: e.target.value }))}
            />
          </FormControl>
          <FormMessage />
        </FormItem>

        <Button type="submit" disabled={isLoading} className={styles.submitButton} size="lg">
          {isLoading ? (
            <>
              <Spinner size="sm" /> Membuat akun…
            </>
          ) : (
            `Buat akun ${role === "owner" ? "Owner" : "Creator"}`
          )}
        </Button>
      </form>
    </Form>
  );
};