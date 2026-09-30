import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import { MessageSquareWarning } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { DataTable, Column } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { EmptyState } from "../components/EmptyState";
import { Toolbar, InlineAlert, Mono } from "../components/Layouts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { useDisputesList } from "../helpers/useSubmissions";
import type { DisputeListItem } from "../endpoints/disputes/list_GET.schema";
import { DisputeStatusArrayValues, type DisputeStatus } from "../helpers/schema";
import { disputeStatusLabel, disputeStatusTone } from "../helpers/pintasLabels";
import { formatDateTime } from "../helpers/formatRupiah";
import styles from "./admin.disputes.module.css";

export default function AdminDisputesPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<DisputeStatus | "__all">("pending");
  const { data, isPending, error } = useDisputesList(status === "__all" ? {} : { status });
  const disputes = data?.disputes ?? [];

  const columns: Column<DisputeListItem>[] = [
    {
      key: "sub",
      header: "Submission",
      render: (d) => (
        <div className={styles.cell}>
          <span className={styles.title}>
            <Mono>{d.submissionCode}</Mono> · {d.submissionTitle}
          </span>
          <span className={styles.sub}>
            {d.creatorName} · {d.campaignName}
          </span>
        </div>
      ),
    },
    { key: "reason", header: "Alasan creator", render: (d) => <span className={styles.reason}>{d.reason}</span> },
    { key: "ai", header: "Hasil AI", hideOnMobile: true, render: (d) => <span className={styles.sub}>{d.aiSummary ?? "—"}</span> },
    {
      key: "status",
      header: "Status",
      render: (d) => (
        <StatusBadge tone={disputeStatusTone[d.status]} size="sm">
          {disputeStatusLabel[d.status]}
        </StatusBadge>
      ),
    },
    { key: "date", header: "Diajukan", hideOnMobile: true, render: (d) => <span className={styles.sub}>{formatDateTime(d.createdAt)}</span> },
  ];

  return (
    <>
      <Helmet>
        <title>Sanggahan — PINTAS</title>
      </Helmet>
      <PageHeader eyebrow="Sanggahan" title="Manajemen sanggahan" description="Sanggahan creator terhadap hasil AI. Klik baris untuk memeriksa bukti dan memutuskan." />
      <Toolbar>
        <Select value={status} onValueChange={(v) => setStatus(v as DisputeStatus | "__all")}>
          <SelectTrigger style={{ width: 220 }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Semua</SelectItem>
            {DisputeStatusArrayValues.map((s) => (
              <SelectItem key={s} value={s}>
                {disputeStatusLabel[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Toolbar>
      {error && <InlineAlert tone="error">{error.message}</InlineAlert>}
      <DataTable
        columns={columns}
        rows={disputes}
        rowKey={(d) => d.id}
        isLoading={isPending}
        onRowClick={(d) => navigate(`/admin/submissions/${d.submissionId}`)}
        emptyState={<EmptyState icon={<MessageSquareWarning size={26} />} title="Tidak ada sanggahan" />}
      />
    </>
  );
}