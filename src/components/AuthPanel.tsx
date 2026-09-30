import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Bot, Wallet } from "lucide-react";
import styles from "./AuthPanel.module.css";

interface Props {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const AuthPanel: React.FC<Props> = ({ title, subtitle, children, footer, className }) => (
  <div className={`${styles.page} ${className ?? ""}`}>
    <aside className={styles.brandSide}>
      <Link to="/" className={styles.brand}>
        <span className={styles.brandMark}>P</span>
        <span className={styles.brandName}>PINTAS</span>
      </Link>
      <div className={styles.pitch}>
        <h2 className={styles.pitchTitle}>Campaign konten yang adil untuk Owner dan Creator.</h2>
        <ul className={styles.pitchList}>
          <li>
            <Bot size={18} /> AI memeriksa setiap submission terhadap requirement campaign.
          </li>
          <li>
            <ShieldCheck size={18} /> Admin memberi keputusan akhir; creator dapat mengajukan sanggahan.
          </li>
          <li>
            <Wallet size={18} /> Pembayaran tidak pernah melebihi budget, budget tampil realtime.
          </li>
        </ul>
      </div>
      <p className={styles.fine}>Creator bebas berhenti kapan saja. Bayaran mengikuti submission valid, bukan lamanya periode.</p>
    </aside>
    <main className={styles.formSide}>
      <div className={styles.formCard}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        {children}
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </main>
  </div>
);