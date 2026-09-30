import React from "react";
import styles from "./PageHeader.module.css";

interface Props {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<Props> = ({ eyebrow, title, description, actions, className }) => (
  <header className={`${styles.header} ${className ?? ""}`}>
    <div className={styles.text}>
      {eyebrow && <div className={styles.eyebrow}>{eyebrow}</div>}
      <h1 className={styles.title}>{title}</h1>
      {description && <p className={styles.description}>{description}</p>}
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </header>
);