import React from "react";
import type { StatusTone } from "../helpers/pintasLabels";
import styles from "./StatusBadge.module.css";

interface Props {
  tone?: StatusTone;
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const StatusBadge: React.FC<Props> = ({ tone = "neutral", size = "md", dot = true, className, children }) => (
  <span className={`${styles.badge} ${styles[tone]} ${styles[size]} ${className ?? ""}`}>
    {dot && <span className={styles.dot} aria-hidden="true" />}
    {children}
  </span>
);