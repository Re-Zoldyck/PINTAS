import React from "react";
import { Helmet } from "react-helmet";
import { Link, useNavigate } from "react-router-dom";
import { PiggyBank } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { BudgetProgress } from "../components/BudgetProgress";
import { DataTable, Column } from "../components/DataTable";
import { StatusBadge } from "../components/StatusBadge";
import { StatCard } from "../components/StatCard";
import { EmptyState } from "../components/EmptyState";
import { Button } from "../components/Button";
import { StatGrid, Stack, InlineAlert, Mono } from "../components/Layouts";
import { useCampaignsList } from "../helpers/useCampaigns";
import { budgetView } from "../helpers/budgetView";
import type { CampaignSummary } from "../helpers/pintasTypes";
import { campaignStatusLabel, campaignStatusTone } from "../helpers/pintasLabels";
import { formatRupiah } from "../helpers/formatRupiah";
import styles from "./owner.budget.module.css";

export default function OwnerBudgetPage() {
  const navigate = useNavigate();
  const { data, isPending, error } = useCampaignsList();
  const campaigns = data?.campaigns ?? [];
  const total = campaigns.reduce((a, c) => a + c.budgetTotal, 0);
  const used = campaigns.reduce((a, c) => a + c.budgetUsed, 0);
  const reserved = campaigns.reduce((a, c) => a + c.budgetReserved, 0);
  const agg = budgetView({ budgetTotal: total, budgetUsed: used, budgetReserved: reserved });

  const columns: Column<CampaignSummary>[] = [
    {
      key: "name",
      header: "Campaign",
      render: (c) => (
        <div className={styles.cell}>
          <span className={styles.name}>{c.name}</span>
          <span className={styles.sub}>
            <Mono>{c.code}</Mono>
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
    { key: "total", header: "Budget", align: "right", render: (c) => <Mono>{formatRupiah(c.budgetTotal)}</Mono> },
    { key: "used", header: "Terpakai", align: "right", render: (c) => <Mono>{formatRupiah(c.budgetUsed)}</Mono> },
    { key: "reserved", header: "Dialokasikan", align: "right", hideOnMobile: true, render: (c) => <Mono>{formatRupiah(c.budgetReserved)}</Mono> },
    { key: "remaining", header: "Sisa", align: "right", render: (c) => <Mono className={budgetView(c).exhausted ? styles.exhausted : styles.remaining}>{formatRupiah(budgetView(c).remaining)}</Mono> },
    {
      key: "progress",
      header: "Progress",
      width: "220px",
      hideOnMobile: true,
      render: (c) => <BudgetProgress budgetTotal={c.budgetTotal} budgetUsed={c.budgetUsed} budgetReserved={c.budgetReserved} className={styles.miniBar} />,
    },
  ];

  return (
    <>
      <Helmet>
        <title>Monitoring Budget — PINTAS</title>
      </Helmet>
      <PageHeader eyebrow="Monitoring" title="Monitoring budget" description="Budget total, terpakai (dibayar), dialokasikan (disetujui, menunggu pembayaran), dan sisa untuk setiap campaign." />
      {error && <InlineAlert tone="error">{error.message}</InlineAlert>}
      <Stack gap="lg">
        <StatGrid>
          <StatCard label="Total budget" value={formatRupiah(agg.total)} icon={<PiggyBank size={16} />} />
          <StatCard label="Terpakai (dibayar)" value={formatRupiah(agg.used)} tone="primary" hint={`${agg.pctUsed}%`} />
          <StatCard label="Dialokasikan" value={formatRupiah(agg.reserved)} tone="warning" hint={`${agg.pctReserved}%`} />
          <StatCard label="Sisa" value={formatRupiah(agg.remaining)} tone="success" hint={`${Math.max(0, Math.round((100 - agg.pctCommitted) * 10) / 10)}% tersedia`} />
        </StatGrid>
        <SectionCard title="Progress penggunaan budget (semua campaign)">
          <BudgetProgress budgetTotal={agg.total} budgetUsed={agg.used} budgetReserved={agg.reserved} variant="full" />
        </SectionCard>
        <DataTable
          columns={columns}
          rows={campaigns}
          rowKey={(c) => c.id}
          isLoading={isPending}
          onRowClick={(c) => navigate(`/owner/campaigns/${c.id}`)}
          emptyState={
            <EmptyState
              title="Belum ada campaign"
              action={
                <Button asChild size="sm">
                  <Link to="/owner/campaigns/new">Buat campaign</Link>
                </Button>
              }
            />
          }
        />
      </Stack>
    </>
  );
}