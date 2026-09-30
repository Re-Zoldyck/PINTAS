import React from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import { Wallet } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { DataTable, Column } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { EmptyState } from "../components/EmptyState";
import { StatGrid, Stack, InlineAlert, Mono } from "../components/Layouts";
import { useClaimsList } from "../helpers/useSubmissions";
import type { ClaimInfo } from "../helpers/pintasTypes";
import { claimStatusLabel, claimStatusTone } from "../helpers/pintasLabels";
import { formatDateTime, formatRupiah } from "../helpers/formatRupiah";
import styles from "./owner.payments.module.css";

export default function OwnerPaymentsPage() {
  const navigate = useNavigate();
  const { data, isPending, error } = useClaimsList();
  const claims = data?.claims ?? [];
  const paid = claims.filter((c) => c.status === "paid").reduce((a, c) => a + c.amount, 0);
  const pending = claims.filter((c) => c.status === "pending").reduce((a, c) => a + c.amount, 0);

  const columns: Column<ClaimInfo>[] = [
    { key: "code", header: "Claim", width: "90px", render: (c) => <Mono>{c.code}</Mono> },
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
    { key: "creator", header: "Creator", hideOnMobile: true, render: (c) => c.creatorName },
    { key: "amount", header: "Nominal", align: "right", render: (c) => <Mono>{formatRupiah(c.amount)}</Mono> },
    {
      key: "status",
      header: "Status",
      render: (c) => (
        <StatusBadge tone={claimStatusTone[c.status]} size="sm">
          {claimStatusLabel[c.status]}
        </StatusBadge>
      ),
    },
    { key: "ref", header: "Referensi", hideOnMobile: true, render: (c) => <Mono>{c.paymentReference ?? "—"}</Mono> },
    { key: "date", header: "Tanggal", hideOnMobile: true, render: (c) => <span className={styles.sub}>{formatDateTime(c.paidAt ?? c.createdAt)}</span> },
  ];

  return (
    <>
      <Helmet>
        <title>Monitoring Pembayaran — PINTAS</title>
      </Helmet>
      <PageHeader eyebrow="Monitoring" title="Monitoring pembayaran" description="Claim creator di campaign Anda dan status pembayarannya. Detail rekening creator hanya dapat dilihat Admin." />
      {error && <InlineAlert tone="error">{error.message}</InlineAlert>}
      <Stack>
        <StatGrid>
          <StatCard label="Total dibayar" value={formatRupiah(paid)} tone="success" icon={<Wallet size={16} />} />
          <StatCard label="Menunggu konfirmasi Admin" value={formatRupiah(pending)} tone="warning" />
          <StatCard label="Total claim" value={claims.length} />
        </StatGrid>
        <DataTable
          columns={columns}
          rows={claims}
          rowKey={(c) => c.id}
          isLoading={isPending}
          onRowClick={(c) => navigate(`/owner/submissions/${c.submissionId}`)}
          emptyState={<EmptyState title="Belum ada claim" description="Claim muncul setelah Admin menyetujui submission dan creator mengajukan claim." />}
        />
      </Stack>
    </>
  );
}