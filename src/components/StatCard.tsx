import React from "react";
import styles from "./StatCard.module.css";

interface Props {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: "default" | "primary" | "warning" | "error" | "success";
  className?: string;
}

export const StatCard: React.FC<Props> = ({ label, value, hint, icon, tone = "default", className }) => (
  <div className={`${styles.card} ${styles[tone]} ${className ?? ""}`}>
    <div className={styles.top}>
      <span className={styles.label}>{label}</span>
      {icon && <span className={styles.icon}>{icon}</span>}
    </div>
    <div className={styles.value}>{value}</div>
    {hint && <div className={styles.hint}>{hint}</div>}
  </div>
);