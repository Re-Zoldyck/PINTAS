import React from "react";
import styles from "./Layouts.module.css";

type Div = React.HTMLAttributes<HTMLDivElement> & { className?: string };

export const StatGrid: React.FC<Div> = ({ className, ...p }) => <div className={`${styles.statGrid} ${className ?? ""}`} {...p} />;
export const CardGrid: React.FC<Div> = ({ className, ...p }) => <div className={`${styles.cardGrid} ${className ?? ""}`} {...p} />;
export const Stack: React.FC<Div & { gap?: "sm" | "md" | "lg" }> = ({ className, gap = "md", ...p }) => (
  <div className={`${styles.stack} ${styles[`gap_${gap}`]} ${className ?? ""}`} {...p} />
);
export const TwoCol: React.FC<Div> = ({ className, ...p }) => <div className={`${styles.twoCol} ${className ?? ""}`} {...p} />;
export const Toolbar: React.FC<Div> = ({ className, ...p }) => <div className={`${styles.toolbar} ${className ?? ""}`} {...p} />;
export const Muted: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({ className, ...p }) => <span className={`${styles.muted} ${className ?? ""}`} {...p} />;
export const Mono: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({ className, ...p }) => <span className={`${styles.mono} ${className ?? ""}`} {...p} />;
export const InlineAlert: React.FC<Div & { tone?: "info" | "warning" | "error" | "success" }> = ({ className, tone = "info", ...p }) => (
  <div role="status" className={`${styles.alert} ${styles[`alert_${tone}`]} ${className ?? ""}`} {...p} />
);