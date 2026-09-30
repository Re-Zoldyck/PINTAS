import React, { useState } from "react";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Form, FormControl, FormItem, FormLabel, FormMessage, useForm } from "./Form";
import { Input } from "./Input";
import { Button } from "./Button";
import { Spinner } from "./Spinner";
import styles from "./PasswordLoginForm.module.css";
import { schema, postLogin } from "../endpoints/auth/login_with_password_POST.schema";
import { useAuth } from "../helpers/useAuth";
import { roleHome } from "../helpers/roleHome";

export type LoginFormData = z.infer<typeof schema>;

interface PasswordLoginFormProps {
  className?: string;
  defaultEmail?: string;
  defaultPassword?: string;
}

export const PasswordLoginForm: React.FC<PasswordLoginFormProps> = ({ className, defaultEmail, defaultPassword }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { onLogin } = useAuth();
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: { email: defaultEmail ?? "", password: defaultPassword ?? "" },
    schema,
  });

  const handleSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await postLogin(data);
      onLogin(result.user);
      setTimeout(() => navigate(roleHome(result.user.role)), 150);
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      setError(
        message.includes("Invalid email or password")
          ? "Email atau password salah."
          : message.includes("Too many")
            ? "Terlalu banyak percobaan gagal. Coba lagi beberapa menit lagi."
            : "Login gagal. Silakan coba lagi."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className={`${styles.form} ${className || ""}`}>
        {error && <div className={styles.errorMessage}>{error}</div>}

        <FormItem name="email">
          <FormLabel>Email</FormLabel>
          <FormControl>
            <Input
              placeholder="nama@email.com"
              type="email"
              autoComplete="email"
              disabled={isLoading}
              value={form.values.email}
              onChange={(e) => form.setValues((prev) => ({ ...prev, email: e.target.value }))}
            />
          </FormControl>
          <FormMessage />
        </FormItem>

        <FormItem name="password">
          <FormLabel>Password</FormLabel>
          <FormControl>
            <Input
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              disabled={isLoading}
              value={form.values.password}
              onChange={(e) => form.setValues((prev) => ({ ...prev, password: e.target.value }))}
            />
          </FormControl>
          <FormMessage />
        </FormItem>

        <Button type="submit" disabled={isLoading} className={styles.submitButton} size="lg">
          {isLoading ? (
            <span className={styles.loadingText}>
              <Spinner className={styles.spinner} size="sm" />
              Masuk…
            </span>
          ) : (
            "Masuk"
          )}
        </Button>
      </form>
    </Form>
  );
};