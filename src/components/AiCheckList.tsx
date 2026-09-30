import React from "react";
import { CheckCircle2, XCircle, AlertTriangle, MinusCircle } from "lucide-react";
import type { AiCheck } from "../helpers/pintasTypes";
import styles from "./AiCheckList.module.css";

interface Props {
  checks: AiCheck[];
  className?: string;
}

const ICON: Record<AiCheck["status"], React.ReactNode> = {
  pass: <CheckCircle2 size={18} />,
  fail: <XCircle size={18} />,
  review: <AlertTriangle size={18} />,
  skip: <MinusCircle size={18} />,
};

const LABEL: Record<AiCheck["status"], string> = {
  pass: "Lolos",
  fail: "Gagal",
  review: "Perlu review",
  skip: "Tidak berlaku",
};

export const AiCheckList: React.FC<Props> = ({ checks, className }) => (
  <ul className={`${styles.list} ${className ?? ""}`}>
    {checks.map((c) => (
      <li key={c.key} className={`${styles.item} ${styles[c.status]}`}>
        <span className={styles.icon}>{ICON[c.status]}</span>
        <div className={styles.body}>
          <div className={styles.head}>
            <span className={styles.label}>{c.label}</span>
            <span className={styles.status}>{LABEL[c.status]}</span>
          </div>
          <p className={styles.detail}>{c.detail}</p>
        </div>
      </li>
    ))}
  </ul>
);