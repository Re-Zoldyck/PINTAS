import React from "react";
import { Helmet } from "react-helmet";
import { Link, useNavigate } from "react-router-dom";
import { Bot, BadgeCheck, MessageSquareWarning, HandCoins, Wallet, Megaphone, Users } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { StatGrid, Stack, TwoCol, InlineAlert, Mono } from "../components/Layouts";
import { SectionCard } from "../components/SectionCard";
import { BudgetProgress } from "../components/BudgetProgress";
import { SubmissionTable } from "../components/SubmissionTable";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { EmptyState } from "../components/EmptyState";
import { useDashboard } from "../helpers/useDashboard";
import { formatDateTime, formatRupiah } from "../helpers/formatRupiah";
import styles from "./admin.dashboard.module.css";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { data, isPending, error } = useDashboard();
  const d = data && data.role === "admin" ? data : null;

  return (
    <>
      <Helmet>
        <title>Dashboard Admin — PINTAS</title>
      </Helmet>
      <PageHeader eyebrow="Dashboard Admin" title="Pusat verifikasi & pembayaran" description="Antrian keputusan, sanggahan, claim, dan pemantauan budget campaign yang sedang berjalan." />
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
          <StatGrid>
            <StatCard label="Pending AI" value={d.pendingAi} icon={<Bot size={16} />} hint="Sedang / menunggu verifikasi AI" />
            <StatCard label="Butuh review" value={d.needReview} icon={<BadgeCheck size={16} />} tone="warning" hint="AI: NEED REVIEW" />
            <StatCard label="Menunggu konfirmasi" value={d.awaitingConfirmation} tone="primary" hint="AI PASS / FAIL menunggu Admin" />
            <StatCard label="Sanggahan pending" value={d.disputesPending} icon={<MessageSquareWarning size={16} />} tone={d.disputesPending > 0 ? "warning" : "default"} />
            <StatCard label="Claim pending" value={d.claimPending} icon={<HandCoins size={16} />} hint="Disetujui, belum di-claim creator" />
            <StatCard label="Payment pending" value={d.paymentPending} icon={<Wallet size={16} />} tone={d.paymentPending > 0 ? "warning" : "default"} hint={formatRupiah(d.paymentPendingAmount)} />
          </StatGrid>
          <TwoCol>
            <SectionCard title="Budget campaign yang sedang berjalan" description={`${d.activeCampaigns} campaign aktif`}>
              <BudgetProgress budgetTotal={d.runningBudget} budgetUsed={d.runningUsed} budgetReserved={d.runningReserved} variant="full" />
            </SectionCard>
            <StatGrid>
              <StatCard label="Campaign aktif" value={d.activeCampaigns} icon={<Megaphone size={16} />} />
              <StatCard label="Pengguna" value={d.totalUsers} icon={<Users size={16} />} hint={`${d.totalCreators} creator · ${d.totalOwners} owner`} />
            </StatGrid>
          </TwoCol>

          <SectionCard
            title="Antrian keputusan"
            description="Urut dari yang paling lama menunggu."
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin/submissions">Buka verifikasi</Link>
              </Button>
            }
            padded={false}
          >
            <SubmissionTable submissions={d.queue} showCreator linkTo={(s) => `/admin/submissions/${s.id}`} emptyState={<EmptyState title="Antrian kosong" description="Tidak ada submission yang menunggu keputusan." />} />
          </SectionCard>

          <TwoCol>
            <SectionCard
              title="Sanggahan menunggu"
              actions={
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin/disputes">Semua</Link>
                </Button>
              }
            >
              {d.recentDisputes.length === 0 ? (
                <p className={styles.muted}>Tidak ada sanggahan pending.</p>
              ) : (
                <ul className={styles.list}>
                  {d.recentDisputes.map((x) => (
                    <li key={x.id} className={styles.item} onClick={() => navigate(`/admin/submissions/${x.submissionId}`)}>
                      <div>
                        <span className={styles.itemTitle}>
                          {x.submissionCode} · {x.submissionTitle}
                        </span>
                        <span className={styles.itemMeta}>
                          {x.creatorName} · {x.campaignName} · {formatDateTime(x.createdAt)}
                        </span>
                        <p className={styles.reason}>{x.reason}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
            <SectionCard
              title="Claim menunggu pembayaran"
              actions={
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin/payments">Konfirmasi</Link>
                </Button>
              }
            >
              {d.recentClaims.length === 0 ? (
                <p className={styles.muted}>Tidak ada claim pending.</p>
              ) : (
                <ul className={styles.list}>
                  {d.recentClaims.map((c) => (
                    <li key={c.id} className={styles.item} onClick={() => navigate(`/admin/payments`)}>
                      <div>
                        <span className={styles.itemTitle}>
                          <Mono>{c.code}</Mono> · {c.creatorName}
                        </span>
                        <span className={styles.itemMeta}>
                          {c.submissionCode} {c.submissionTitle} · {c.campaignName}
                        </span>
                      </div>
                      <span className={styles.amount}>{formatRupiah(c.amount)}</span>
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