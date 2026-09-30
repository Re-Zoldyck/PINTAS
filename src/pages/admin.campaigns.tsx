import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { useNavigate } from "react-router-dom";
import { Megaphone } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { DataTable, Column } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { BudgetProgress } from "../components/BudgetProgress";
import { EmptyState } from "../components/EmptyState";
import { StatCard } from "../components/StatCard";
import { Toolbar, StatGrid, Stack, InlineAlert, Mono } from "../components/Layouts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { useCampaignsList } from "../helpers/useCampaigns";
import { CampaignStatusArrayValues, type CampaignStatus } from "../helpers/schema";
import { campaignStatusLabel, campaignStatusTone, platformLabel } from "../helpers/pintasLabels";
import { formatDate, formatRupiah } from "../helpers/formatRupiah";
import type { CampaignSummary } from "../helpers/pintasTypes";
import styles from "./admin.campaigns.module.css";

export default function AdminCampaignsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<CampaignStatus | "__all">("__all");
  const { data, isPending, error } = useCampaignsList(status === "__all" ? {} : { status });
  const campaigns = data?.campaigns ?? [];
  const active = campaigns.filter((c) => c.status === "active");

  const columns: Column<CampaignSummary>[] = [
    {
      key: "name",
      header: "Campaign",
      render: (c) => (
        <div className={styles.cell}>
          <span className={styles.name}>{c.name}</span>
          <span className={styles.sub}>
            <Mono>{c.code}</Mono> · {c.ownerName}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (c) => (
        <StatusBadge tone={campaignStatusTone[c.status]} size="sm">
          {campaignStatusLabel[c.status]}
        </StatusBadge>
      ),
    },
    { key: "platform", header: "Platform", hideOnMobile: true, render: (c) => platformLabel[c.requiredPlatform] },
    { key: "period", header: "Periode", hideOnMobile: true, render: (c) => <span className={styles.sub}>{formatDate(c.startDate)} – {formatDate(c.endDate)}</span> },
    { key: "creators", header: "Creator", align: "right", hideOnMobile: true, render: (c) => c.participantCount },
    { key: "subs", header: "Submission", align: "right", hideOnMobile: true, render: (c) => c.submissionCount },
    { key: "budget", header: "Budget", align: "right", render: (c) => <Mono>{formatRupiah(c.budgetTotal)}</Mono> },
    {
      key: "progress",
      header: "Penggunaan",
      width: "220px",
      render: (c) => <BudgetProgress budgetTotal={c.budgetTotal} budgetUsed={c.budgetUsed} budgetReserved={c.budgetReserved} className={styles.miniBar} />,
    },
  ];

  return (
    <>
      <Helmet>
        <title>Manajemen Campaign — PINTAS</title>
      </Helmet>
      <PageHeader eyebrow="Campaign" title="Manajemen campaign" description="Semua campaign di platform beserta penggunaan budgetnya." />
      {error && <InlineAlert tone="error">{error.message}</InlineAlert>}
      <Stack>
        <StatGrid>
          <StatCard label="Total campaign" value={campaigns.length} icon={<Megaphone size={16} />} />
          <StatCard label="Aktif" value={active.length} tone="success" />
          <StatCard label="Budget berjalan" value={formatRupiah(active.reduce((a, c) => a + c.budgetTotal, 0))} tone="primary" />
          <StatCard label="Dibayarkan (aktif)" value={formatRupiah(active.reduce((a, c) => a + c.budgetUsed, 0))} />
        </StatGrid>
        <Toolbar>
          <Select value={status} onValueChange={(v) => setStatus(v as CampaignStatus | "__all")}>
            <SelectTrigger style={{ width: 220 }}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">Semua status</SelectItem>
              {CampaignStatusArrayValues.map((s) => (
                <SelectItem key={s} value={s}>
                  {campaignStatusLabel[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Toolbar>
        <DataTable columns={columns} rows={campaigns} rowKey={(c) => c.id} isLoading={isPending} onRowClick={(c) => navigate(`/admin/campaigns/${c.id}`)} emptyState={<EmptyState title="Belum ada campaign" />} />
      </Stack>
    </>
  );
}