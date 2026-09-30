import React from "react";
import styles from "./SectionCard.module.css";

interface Props {
  title?: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
}

export const SectionCard: React.FC<Props> = ({ title, description, actions, children, className, padded = true }) => (
  <section className={`${styles.card} ${className ?? ""}`}>
    {(title || actions) && (
      <header className={styles.header}>
        <div className={styles.headText}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {description && <p className={styles.description}>{description}</p>}
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </header>
    )}
    <div className={padded ? styles.body : styles.bodyFlush}>{children}</div>
  </section>
);

export const KeyValueList: React.FC<{ items: Array<{ label: React.ReactNode; value: React.ReactNode }>; className?: string }> = ({ items, className }) => (
  <dl className={`${styles.kv} ${className ?? ""}`}>
    {items.map((it, i) => (
      <div key={i} className={styles.kvRow}>
        <dt className={styles.kvLabel}>{it.label}</dt>
        <dd className={styles.kvValue}>{it.value}</dd>
      </div>
    ))}
  </dl>
);