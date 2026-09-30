import React from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Megaphone, FileCheck2, HandCoins, Wallet, Clock3, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatGrid, Stack, TwoCol, InlineAlert } from "../components/Layouts";
import { SectionCard } from "../components/SectionCard";
import { SubmissionTable } from "../components/SubmissionTable";
import { CampaignCard } from "../components/CampaignCard";
import { StatusBadge } from "../components/StatusBadge";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { useDashboard } from "../helpers/useDashboard";
import { useAuth } from "../helpers/useAuth";
import { formatRupiah, formatDateTime } from "../helpers/formatRupiah";
import { claimStatusLabel, claimStatusTone } from "../helpers/pintasLabels";
import styles from "./creator.dashboard.module.css";

export default function CreatorDashboardPage() {
  const { authState } = useAuth();
  const { data, isPending, error } = useDashboard();
  const name = authState.type === "authenticated" ? authState.user.displayName : "";
  const d = data && data.role === "creator" ? data : null;

  return (
    <>
      <Helmet>
        <title>Dashboard Creator — PINTAS</title>
      </Helmet>
      <PageHeader
        eyebrow="Dashboard Creator"
        title={`Halo, ${name}`}
        description="Ringkasan campaign, submission, dan pembayaran Anda. Bebas mulai dan berhenti kapan saja — bayaran mengikuti submission valid."
        actions={
          <Button asChild>
            <Link to="/creator/campaigns">
              <Megaphone size={16} /> Cari campaign
            </Link>
          </Button>
        }
      />
      {error && <InlineAlert tone="error">Gagal memuat dashboard: {error.message}</InlineAlert>}
      {isPending && (
        <StatGrid>
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className={styles.skeletonCard} />
          ))}
        </StatGrid>
      )}
      {d && (
        <Stack gap="lg">
          {d.claimableCount > 0 && (
            <InlineAlert tone="success">
              <strong>{d.claimableCount} submission siap di-claim</strong> senilai {formatRupiah(d.claimableAmount)}.{" "}
              <Link to="/creator/submissions?status=claimable">Ajukan claim sekarang →</Link>
            </InlineAlert>
          )}
          <StatGrid>
            <StatCard label="Campaign tersedia" value={d.availableCampaigns} icon={<Megaphone size={16} />} />
            <StatCard label="Campaign diikuti" value={d.joinedCampaigns} icon={<FileCheck2 size={16} />} />
            <StatCard label="Total submission" value={d.totalSubmissions} />
            <StatCard label="Pending" value={d.pendingSubmissions} icon={<Clock3 size={16} />} tone="warning" />
            <StatCard label="Disetujui" value={d.approvedSubmissions} icon={<CheckCircle2 size={16} />} tone="success" />
            <StatCard label="Ditolak" value={d.rejectedSubmissions} icon={<XCircle size={16} />} tone="error" />
          </StatGrid>
          <StatGrid>
            <StatCard label="Siap claim" value={formatRupiah(d.claimableAmount)} hint={`${d.claimableCount} submission`} icon={<HandCoins size={16} />} tone="primary" />
            <StatCard label="Total earning" value={formatRupiah(d.totalEarning)} hint="Disetujui Admin (claimable + claimed + dibayar)" />
            <StatCard label="Total claimed" value={formatRupiah(d.totalClaimed)} hint={`Menunggu pembayaran ${formatRupiah(d.awaitingPayment)}`} />
            <StatCard label="Sudah dibayar" value={formatRupiah(d.totalPaid)} icon={<Wallet size={16} />} tone="success" />
          </StatGrid>

          <TwoCol>
            <SectionCard
              title="Submission terbaru"
              actions={
                <Button asChild variant="ghost" size="sm">
                  <Link to="/creator/submissions">Lihat semua</Link>
                </Button>
              }
              padded={false}
            >
              <SubmissionTable
                submissions={d.recentSubmissions}
                linkTo={(s) => `/creator/submissions/${s.id}`}
                emptyState={<EmptyState title="Belum ada submission" description="Ambil campaign lalu kirim konten pertama Anda." />}
              />
            </SectionCard>
            <SectionCard title="Status pembayaran" description="Claim terbaru Anda">
              {d.recentClaims.length === 0 ? (
                <p className={styles.muted}>Belum ada claim.</p>
              ) : (
                <ul className={styles.claimList}>
                  {d.recentClaims.map((c) => (
                    <li key={c.id} className={styles.claimItem}>
                      <div>
                        <Link to={`/creator/submissions/${c.submissionId}`} className={styles.claimTitle}>
                          {c.submissionCode} · {c.submissionTitle}
                        </Link>
                        <span className={styles.claimMeta}>
                          {c.campaignName} · {formatDateTime(c.paidAt ?? c.createdAt)}
                        </span>
                      </div>
                      <div className={styles.claimRight}>
                        <span className={styles.amount}>{formatRupiah(c.amount)}</span>
                        <StatusBadge tone={claimStatusTone[c.status]} size="sm">
                          {claimStatusLabel[c.status]}
                        </StatusBadge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </TwoCol>

          <SectionCard
            title="Campaign yang diikuti"
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link to="/creator/my-campaigns">Kelola</Link>
              </Button>
            }
          >
            {d.joined.length === 0 ? (
              <EmptyState
                title="Belum mengikuti campaign"
                description="Lihat campaign yang tersedia dan ambil yang sesuai dengan kontenmu."
                action={
                  <Button asChild>
                    <Link to="/creator/campaigns">Lihat campaign</Link>
                  </Button>
                }
              />
            ) : (
              <div className={styles.cardGrid}>
                {d.joined.map((c) => (
                  <CampaignCard key={c.id} campaign={c} to={`/creator/campaigns/${c.id}`} />
                ))}
              </div>
            )}
          </SectionCard>
        </Stack>
      )}
    </>
  );
}