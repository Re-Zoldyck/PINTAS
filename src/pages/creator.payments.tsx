import React from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import { Wallet } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatGrid, Stack, InlineAlert } from "../components/Layouts";
import { DataTable, Column } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { EmptyState } from "../components/EmptyState";
import { useClaimsList } from "../helpers/useSubmissions";
import type { ClaimInfo } from "../helpers/pintasTypes";
import { claimStatusLabel, claimStatusTone } from "../helpers/pintasLabels";
import { formatDateTime, formatRupiah } from "../helpers/formatRupiah";
import styles from "./creator.payments.module.css";

export default function CreatorPaymentsPage() {
  const navigate = useNavigate();
  const { data, isPending, error } = useClaimsList();
  const claims = data?.claims ?? [];
  const paid = claims.filter((c) => c.status === "paid").reduce((a, c) => a + c.amount, 0);
  const pending = claims.filter((c) => c.status === "pending").reduce((a, c) => a + c.amount, 0);

  const columns: Column<ClaimInfo>[] = [
    { key: "code", header: "Claim", width: "90px", render: (c) => <span className={styles.mono}>{c.code}</span> },
    {
      key: "sub",
      header: "Submission",
      render: (c) => (
        <div className={styles.cell}>
          <span className={styles.title}>
            {c.submissionCode} · {c.submissionTitle}
          </span>
          <span className={styles.sub}>{c.campaignName}</span>
        </div>
      ),
    },
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
    { key: "bank", header: "Rekening", hideOnMobile: true, render: (c) => (c.personal ? <span className={styles.sub}>{c.personal.bankName} ••••{c.personal.bankAccountNumber.slice(-4)}</span> : "—") },
    { key: "ref", header: "Referensi", hideOnMobile: true, render: (c) => <span className={styles.mono}>{c.paymentReference ?? "—"}</span> },
    { key: "date", header: "Tanggal", hideOnMobile: true, render: (c) => <span className={styles.sub}>{formatDateTime(c.paidAt ?? c.createdAt)}</span> },
  ];

  return (
    <>
      <Helmet>
        <title>Riwayat Pembayaran — PINTAS</title>
      </Helmet>
      <PageHeader eyebrow="Pembayaran" title="Riwayat pembayaran" description="Semua claim yang pernah Anda ajukan beserta status pembayarannya." />
      {error && <InlineAlert tone="error">{error.message}</InlineAlert>}
      <Stack>
        <StatGrid>
          <StatCard label="Sudah dibayar" value={formatRupiah(paid)} tone="success" icon={<Wallet size={16} />} />
          <StatCard label="Menunggu pembayaran" value={formatRupiah(pending)} tone="warning" />
          <StatCard label="Total claim" value={claims.length} />
        </StatGrid>
        <DataTable
          columns={columns}
          rows={claims}
          rowKey={(c) => c.id}
          isLoading={isPending}
          onRowClick={(c) => navigate(`/creator/submissions/${c.submissionId}`)}
          emptyState={<EmptyState title="Belum ada claim" description="Claim muncul di sini setelah submission Anda disetujui Admin dan Anda mengajukan claim." />}
        />
      </Stack>
    </>
  );
}