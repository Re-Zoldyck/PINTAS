import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { HandCoins } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { ClaimsTable } from "../components/ClaimsTable";
import { SubmissionTable } from "../components/SubmissionTable";
import { SectionCard } from "../components/SectionCard";
import { StatCard } from "../components/StatCard";
import { EmptyState } from "../components/EmptyState";
import { Button } from "../components/Button";
import { Toolbar, StatGrid, Stack, InlineAlert } from "../components/Layouts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { useClaimsList, useSubmissionsList } from "../helpers/useSubmissions";
import { ClaimStatusArrayValues, type ClaimStatus } from "../helpers/schema";
import { claimStatusLabel } from "../helpers/pintasLabels";
import { formatRupiah } from "../helpers/formatRupiah";

export default function AdminClaimsPage() {
  const [status, setStatus] = useState<ClaimStatus | "__all">("__all");
  const { data, isPending, error } = useClaimsList(status === "__all" ? {} : { status });
  const { data: claimable, isPending: loadingClaimable } = useSubmissionsList({ status: "claimable" });
  const claims = data?.claims ?? [];
  const pending = claims.filter((c) => c.status === "pending");

  return (
    <>
      <Helmet>
        <title>Manajemen Claim — PINTAS</title>
      </Helmet>
      <PageHeader
        eyebrow="Claim"
        title="Manajemen claim"
        description="Submission yang siap di-claim creator dan semua claim yang sudah diajukan. Data pembayaran creator hanya terlihat di panel Admin ini."
        actions={
          <Button asChild>
            <Link to="/admin/payments">
              <HandCoins size={16} /> Konfirmasi pembayaran
            </Link>
          </Button>
        }
      />
      {error && <InlineAlert tone="error">{error.message}</InlineAlert>}
      <Stack gap="lg">
        <StatGrid>
          <StatCard label="Siap di-claim (belum di-claim)" value={claimable?.submissions.length ?? 0} hint={formatRupiah((claimable?.submissions ?? []).reduce((a, s) => a + (s.approvedAmount ?? 0), 0))} />
          <StatCard label="Claim menunggu pembayaran" value={pending.length} tone="warning" hint={formatRupiah(pending.reduce((a, c) => a + c.amount, 0))} />
          <StatCard label="Total claim" value={claims.length} />
        </StatGrid>
        <SectionCard title="Semua claim">
          <Toolbar>
            <Select value={status} onValueChange={(v) => setStatus(v as ClaimStatus | "__all")}>
              <SelectTrigger style={{ width: 220 }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">Semua status</SelectItem>
                {ClaimStatusArrayValues.map((s) => (
                  <SelectItem key={s} value={s}>
                    {claimStatusLabel[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Toolbar>
          <ClaimsTable claims={claims} isLoading={isPending} showPersonal submissionLink={(c) => `/admin/submissions/${c.submissionId}`} emptyState={<EmptyState title="Belum ada claim" />} />
        </SectionCard>
        <SectionCard title="Siap di-claim oleh creator" description="Sudah disetujui dan budget sudah dialokasikan — menunggu creator mengajukan claim." padded={false}>
          <SubmissionTable submissions={claimable?.submissions ?? []} isLoading={loadingClaimable} showCreator linkTo={(s) => `/admin/submissions/${s.id}`} emptyState={<EmptyState title="Tidak ada" />} />
        </SectionCard>
      </Stack>
    </>
  );
}