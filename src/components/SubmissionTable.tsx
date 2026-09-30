import React from "react";
import { useNavigate } from "react-router-dom";
import type { SubmissionSummary } from "../helpers/pintasTypes";
import { aiResultLabel, aiResultTone, platformLabel, submissionStatusLabel, submissionStatusTone } from "../helpers/pintasLabels";
import { formatDateTime, formatNumber, formatRupiah } from "../helpers/formatRupiah";
import { DataTable, Column } from "./DataTable";
import { StatusBadge } from "./StatusBadge";
import styles from "./SubmissionTable.module.css";

interface Props {
  submissions: SubmissionSummary[];
  isLoading?: boolean;
  linkTo: (s: SubmissionSummary) => string;
  showCreator?: boolean;
  showCampaign?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
}

export const SubmissionTable: React.FC<Props> = ({ submissions, isLoading, linkTo, showCreator, showCampaign = true, emptyState, className }) => {
  const navigate = useNavigate();
  const columns: Column<SubmissionSummary>[] = [
    {
      key: "code",
      header: "ID",
      width: "72px",
      render: (s) => <span className={styles.mono}>{s.code}</span>,
    },
    {
      key: "title",
      header: "Konten",
      render: (s) => (
        <div className={styles.titleCell}>
          <span className={styles.title}>{s.title}</span>
          {showCampaign && <span className={styles.sub}>{s.campaignName}</span>}
        </div>
      ),
    },
    ...(showCreator
      ? [
          {
            key: "creator",
            header: "Creator",
            hideOnMobile: true,
            render: (s: SubmissionSummary) => (
              <div className={styles.titleCell}>
                <span>{s.creatorName}</span>
                <span className={styles.sub}>@{s.accountHandle}</span>
              </div>
            ),
          } as Column<SubmissionSummary>,
        ]
      : []),
    {
      key: "platform",
      header: "Platform",
      hideOnMobile: true,
      render: (s) => platformLabel[s.platform],
    },
    {
      key: "views",
      header: "Views",
      align: "right",
      hideOnMobile: true,
      render: (s) => (
        <span className={styles.mono}>
          {formatNumber(s.verifiedViews ?? s.viewsClaimed)}
          {s.verifiedViews !== null && s.verifiedViews !== s.viewsClaimed && <span className={styles.sub}> (klaim {formatNumber(s.viewsClaimed)})</span>}
        </span>
      ),
    },
    {
      key: "ai",
      header: "AI",
      hideOnMobile: true,
      render: (s) =>
        s.aiResult ? (
          <StatusBadge tone={aiResultTone[s.aiResult]} size="sm" dot={false}>
            {aiResultLabel[s.aiResult]}
          </StatusBadge>
        ) : (
          <span className={styles.sub}>—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (s) => (
        <StatusBadge tone={submissionStatusTone[s.status]} size="sm">
          {submissionStatusLabel[s.status]}
        </StatusBadge>
      ),
    },
    {
      key: "amount",
      header: "Nominal",
      align: "right",
      render: (s) => (
        <span className={styles.mono}>{s.approvedAmount !== null ? formatRupiah(s.approvedAmount) : "—"}</span>
      ),
    },
    {
      key: "updated",
      header: "Diperbarui",
      hideOnMobile: true,
      render: (s) => <span className={styles.sub}>{formatDateTime(s.updatedAt)}</span>,
    },
  ];

  return (
    <DataTable
      className={className}
      columns={columns}
      rows={submissions}
      rowKey={(s) => s.id}
      isLoading={isLoading}
      emptyState={emptyState}
      onRowClick={(s) => navigate(linkTo(s))}
    />
  );
};