import React from "react";
import { Skeleton } from "./Skeleton";
import styles from "./DataTable.module.css";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  align?: "left" | "right" | "center";
  width?: string;
  hideOnMobile?: boolean;
};

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string | number;
  isLoading?: boolean;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
  dense?: boolean;
}

export function DataTable<T>({ columns, rows, rowKey, isLoading, emptyState, onRowClick, className, dense }: Props<T>) {
  return (
    <div className={`${styles.wrap} ${className ?? ""}`}>
      <table className={`${styles.table} ${dense ? styles.dense : ""}`}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`${styles.th} ${c.align ? styles[c.align] : ""} ${c.hideOnMobile ? styles.hideMobile : ""}`}
                style={c.width ? { width: c.width } : undefined}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading && rows.length === 0 &&
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={`sk-${i}`}>
                {columns.map((c) => (
                  <td key={c.key} className={`${styles.td} ${c.hideOnMobile ? styles.hideMobile : ""}`}>
                    <Skeleton className={styles.skeleton} />
                  </td>
                ))}
              </tr>
            ))}
          {!isLoading && rows.length === 0 && (
            <tr>
              <td className={styles.emptyCell} colSpan={columns.length}>
                {emptyState ?? <span className={styles.emptyText}>Belum ada data.</span>}
              </td>
            </tr>
          )}
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={`${styles.tr} ${onRowClick ? styles.clickable : ""}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((c) => (
                <td key={c.key} className={`${styles.td} ${c.align ? styles[c.align] : ""} ${c.hideOnMobile ? styles.hideMobile : ""}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}