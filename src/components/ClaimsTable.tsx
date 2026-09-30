import React from "react";
import { Link } from "react-router-dom";
import type { ClaimInfo } from "../helpers/pintasTypes";
import { claimStatusLabel, claimStatusTone } from "../helpers/pintasLabels";
import { formatDateTime, formatRupiah } from "../helpers/formatRupiah";
import { DataTable, Column } from "./DataTable";
import { StatusBadge } from "./StatusBadge";
import styles from "./ClaimsTable.module.css";

interface Props {
  claims: ClaimInfo[];
  isLoading?: boolean;
  submissionLink: (c: ClaimInfo) => string;
  showPersonal?: boolean;
  renderActions?: (c: ClaimInfo) => React.ReactNode;
  emptyState?: React.ReactNode;
  className?: string;
}

export const ClaimsTable: React.FC<Props> = ({ claims, isLoading, submissionLink, showPersonal, renderActions, emptyState, className }) => {
  const columns: Column<ClaimInfo>[] = [
    { key: "code", header: "Claim", width: "90px", render: (c) => <span className={styles.mono}>{c.code}</span> },
    {
      key: "sub",
      header: "Submission",
      render: (c) => (
        <div className={styles.cell}>
          <Link to={submissionLink(c)} className={styles.link}>
            {c.submissionCode} · {c.submissionTitle}
          </Link>
          <span className={styles.sub}>{c.campaignName}</span>
        </div>
      ),
    },
    {
      key: "creator",
      header: "Creator",
      render: (c) => (
        <div className={styles.cell}>
          <span>{c.creatorName}</span>
          {showPersonal && c.personal && (
            <span className={styles.sub}>
              {c.personal.realName} · {c.personal.phone}
            </span>
          )}
        </div>
      ),
    },
    ...(showPersonal
      ? [
          {
            key: "bank",
            header: "Rekening",
            hideOnMobile: true,
            render: (c: ClaimInfo) =>
              c.personal ? (
                <div className={styles.cell}>
                  <span className={styles.mono}>
                    {c.personal.bankName} {c.personal.bankAccountNumber}
                  </span>
                  <span className={styles.sub}>a.n. {c.personal.bankAccountHolder}</span>
                </div>
              ) : (
                "—"
              ),
          } as Column<ClaimInfo>,
        ]
      : []),
    { key: "amount", header: "Nominal", align: "right", render: (c) => <span className={styles.mono}>{formatRupiah(c.amount)}</span> },
    {
      key: "status",
      header: "Status",
      render: (c) => (
        <StatusBadge tone={claimStatusTone[c.status]} size="sm">
          {claimStatusLabel[c.status]}
        </StatusBadge>
      ),
    },
    {
      key: "date",
      header: "Tanggal",
      hideOnMobile: true,
      render: (c) => (
        <div className={styles.cell}>
          <span className={styles.sub}>{formatDateTime(c.paidAt ?? c.createdAt)}</span>
          {c.paymentReference && <span className={styles.mono}>{c.paymentReference}</span>}
        </div>
      ),
    },
    ...(renderActions ? [{ key: "actions", header: "", align: "right", render: (c: ClaimInfo) => <div className={styles.actions}>{renderActions(c)}</div> } as Column<ClaimInfo>] : []),
  ];

  return <DataTable className={className} columns={columns} rows={claims} rowKey={(c) => c.id} isLoading={isLoading} emptyState={emptyState} />;
};