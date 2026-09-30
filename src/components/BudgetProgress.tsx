import React from "react";
import { budgetView } from "../helpers/budgetView";
import { formatRupiah } from "../helpers/formatRupiah";
import styles from "./BudgetProgress.module.css";

interface Props {
  budgetTotal: number;
  budgetUsed: number;
  budgetReserved: number;
  variant?: "compact" | "full";
  className?: string;
}

/**
 * Budget bar with two segments: dibayar (solid) and dialokasikan (lighter). The
 * percentage counts everything committed, so it never under-reports usage.
 */
export const BudgetProgress: React.FC<Props> = ({ budgetTotal, budgetUsed, budgetReserved, variant = "compact", className }) => {
  const b = budgetView({ budgetTotal, budgetUsed, budgetReserved });
  return (
    <div className={`${styles.wrap} ${className ?? ""}`}>
      {variant === "full" && (
        <div className={styles.figures}>
          <div className={styles.figure}>
            <span className={styles.figureLabel}>Budget</span>
            <span className={styles.figureValue}>{formatRupiah(b.total)}</span>
          </div>
          <div className={styles.figure}>
            <span className={styles.figureLabel}>Terpakai (dibayar)</span>
            <span className={styles.figureValue}>{formatRupiah(b.used)}</span>
          </div>
          <div className={styles.figure}>
            <span className={styles.figureLabel}>Dialokasikan</span>
            <span className={styles.figureValue}>{formatRupiah(b.reserved)}</span>
          </div>
          <div className={styles.figure}>
            <span className={styles.figureLabel}>Sisa</span>
            <span className={`${styles.figureValue} ${b.exhausted ? styles.exhausted : styles.remaining}`}>
              {formatRupiah(b.remaining)}
            </span>
          </div>
        </div>
      )}
      <div className={styles.barRow}>
        <div
          className={styles.track}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={b.pctCommitted}
          aria-label="Progress penggunaan budget"
        >
          <div className={styles.used} style={{ width: `${b.pctUsed}%` }} />
          <div className={styles.reserved} style={{ width: `${b.pctReserved}%`, left: `${b.pctUsed}%` }} />
        </div>
        <span className={styles.pct}>{b.pctCommitted}%</span>
      </div>
      {variant === "compact" && (
        <div className={styles.compactMeta}>
          <span>
            Terpakai <strong>{formatRupiah(b.committed)}</strong>
          </span>
          <span>
            Sisa <strong className={b.exhausted ? styles.exhausted : ""}>{formatRupiah(b.remaining)}</strong>
          </span>
        </div>
      )}
      {variant === "full" && (
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <i className={`${styles.swatch} ${styles.swatchUsed}`} /> Dibayar {b.pctUsed}%
          </span>
          <span className={styles.legendItem}>
            <i className={`${styles.swatch} ${styles.swatchReserved}`} /> Dialokasikan (menunggu claim/pembayaran) {b.pctReserved}%
          </span>
          {b.exhausted && <span className={styles.exhaustedNote}>Budget habis — tidak ada dana untuk submission baru</span>}
        </div>
      )}
    </div>
  );
};