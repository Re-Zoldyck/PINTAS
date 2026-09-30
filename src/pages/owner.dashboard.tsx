import React from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Megaphone, PlusCircle, Users, FileCheck2, Wallet, Clock3, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatGrid, Stack, TwoCol, InlineAlert } from "../components/Layouts";
import { SectionCard } from "../components/SectionCard";
import { BudgetProgress } from "../components/BudgetProgress";
import { SubmissionTable } from "../components/SubmissionTable";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { useDashboard } from "../helpers/useDashboard";
import { useAuth } from "../helpers/useAuth";
import { formatRupiah } from "../helpers/formatRupiah";
import { campaignStatusLabel, campaignStatusTone } from "../helpers/pintasLabels";
import styles from "./owner.dashboard.module.css";

export default function OwnerDashboardPage() {
  const { authState } = useAuth();
  const { data, isPending, error } = useDashboard();
  const name = authState.type === "authenticated" ? authState.user.displayName : "";
  const d = data && data.role === "owner" ? data : null;

  return (
    <>
      <Helmet>
        <title>Dashboard Owner — PINTAS</title>
      </Helmet>
      <PageHeader
        eyebrow="Dashboard Owner"
        title={`Halo, ${name}`}
        description="Pantau budget, submission, dan pembayaran seluruh campaign Anda secara realtime."
        actions={
          <Button asChild>
            <Link to="/owner/campaigns/new">
              <PlusCircle size={16} /> Buat campaign
            </Link>
          </Button>
        }
      />
      {error && <InlineAlert tone="error">{error.message}</InlineAlert>}
      {isPending && (
        <StatGrid>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={styles.skeletonCard} />
          ))}
        </StatGrid>
      )}
      {d && (
        <Stack gap="lg">
          <SectionCard title="Budget seluruh campaign" description={`${d.pctUsed}% dari total budget sudah terpakai atau dialokasikan.`}>
            <BudgetProgress budgetTotal={d.totalBudget} budgetUsed={d.totalUsed} budgetReserved={d.totalReserved} variant="full" />
          </SectionCard>
          <StatGrid>
            <StatCard label="Total campaign" value={d.totalCampaigns} icon={<Megaphone size={16} />} />
            <StatCard label="Campaign aktif" value={d.activeCampaigns} tone="success" />
            <StatCard label="Total creator" value={d.totalCreators} icon={<Users size={16} />} />
            <StatCard label="Total submission" value={d.totalSubmissions} icon={<FileCheck2 size={16} />} />
            <StatCard label="Pending" value={d.pendingSubmissions} icon={<Clock3 size={16} />} tone="warning" />
            <StatCard label="Disetujui" value={d.approvedSubmissions} icon={<CheckCircle2 size={16} />} tone="success" />
            <StatCard label="Ditolak" value={d.rejectedSubmissions} icon={<XCircle size={16} />} tone="error" />
            <StatCard label="Total pembayaran" value={formatRupiah(d.totalPayments)} hint={`Menunggu konfirmasi ${formatRupiah(d.pendingPayments)}`} icon={<Wallet size={16} />} tone="primary" />
          </StatGrid>

          <TwoCol>
            <SectionCard
              title="Submission terbaru"
              actions={
                <Button asChild variant="ghost" size="sm">
                  <Link to="/owner/submissions">Monitoring</Link>
                </Button>
              }
              padded={false}
            >
              <SubmissionTable
                submissions={d.recentSubmissions}
                showCreator
                linkTo={(s) => `/owner/submissions/${s.id}`}
                emptyState={<EmptyState title="Belum ada submission" description="Submission creator akan tampil di sini." />}
              />
            </SectionCard>
            <SectionCard
              title="Budget per campaign"
              actions={
                <Button asChild variant="ghost" size="sm">
                  <Link to="/owner/budget">Detail</Link>
                </Button>
              }
            >
              {d.campaigns.length === 0 ? (
                <EmptyState
                  title="Belum ada campaign"
                  action={
                    <Button asChild size="sm">
                      <Link to="/owner/campaigns/new">Buat campaign</Link>
                    </Button>
                  }
                />
              ) : (
                <ul className={styles.campaignList}>
                  {d.campaigns.map((c) => (
                    <li key={c.id} className={styles.campaignItem}>
                      <div className={styles.campaignHead}>
                        <Link to={`/owner/campaigns/${c.id}`} className={styles.campaignName}>
                          {c.name}
                        </Link>
                        <StatusBadge tone={campaignStatusTone[c.status]} size="sm">
                          {campaignStatusLabel[c.status]}
                        </StatusBadge>
                      </div>
                      <BudgetProgress budgetTotal={c.budgetTotal} budgetUsed={c.budgetUsed} budgetReserved={c.budgetReserved} />
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </TwoCol>
        </Stack>
      )}
    </>
  );
}