import React from "react";
import styles from "./EmptyState.module.css";

interface Props {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<Props> = ({ icon, title, description, action, className }) => (
  <div className={`${styles.empty} ${className ?? ""}`}>
    {icon && <div className={styles.icon}>{icon}</div>}
    <p className={styles.title}>{title}</p>
    {description && <p className={styles.description}>{description}</p>}
    {action && <div className={styles.action}>{action}</div>}
  </div>
);