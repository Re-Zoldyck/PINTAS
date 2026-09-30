import React from "react";
import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router-dom";
import { Eye } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SubmissionTable } from "../components/SubmissionTable";
import { EmptyState } from "../components/EmptyState";
import { Toolbar, InlineAlert } from "../components/Layouts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { useSubmissionsList } from "../helpers/useSubmissions";
import { useCampaignsList } from "../helpers/useCampaigns";
import { SubmissionStatusArrayValues, type SubmissionStatus } from "../helpers/schema";
import { submissionStatusLabel } from "../helpers/pintasLabels";

const STATUS_ORDER: SubmissionStatus[] = ["submitted", "ai_verifying", "ai_passed", "ai_failed", "need_admin_review", "disputed", "admin_approved", "claimable", "claimed", "paid", "admin_rejected"];

export default function OwnerSubmissionsPage() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get("status");
  const campaignParam = params.get("campaignId");
  const status = SubmissionStatusArrayValues.includes(statusParam as SubmissionStatus) ? (statusParam as SubmissionStatus) : undefined;
  const campaignId = campaignParam ? Number(campaignParam) : undefined;
  const { data, isPending, error } = useSubmissionsList({ ...(status ? { status } : {}), ...(campaignId ? { campaignId } : {}) });
  const { data: campaigns } = useCampaignsList();

  const update = (next: Record<string, string | undefined>) => {
    const merged = { status: status ?? undefined, campaignId: campaignParam ?? undefined, ...next };
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(merged)) if (v) clean[k] = v;
    setParams(clean);
  };

  return (
    <>
      <Helmet>
        <title>Monitoring Submission — PINTAS</title>
      </Helmet>
      <PageHeader eyebrow="Monitoring" title="Monitoring submission" description="Semua submission di campaign Anda beserta hasil verifikasi AI dan keputusan Admin. Data pribadi creator tidak ditampilkan." />
      <Toolbar>
        <Select value={campaignParam ?? "__all"} onValueChange={(v) => update({ campaignId: v === "__all" ? undefined : v })}>
          <SelectTrigger style={{ width: 280 }}>
            <SelectValue placeholder="Semua campaign" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Semua campaign</SelectItem>
            {(campaigns?.campaigns ?? []).map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.code} — {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status ?? "__all"} onValueChange={(v) => update({ status: v === "__all" ? undefined : v })}>
          <SelectTrigger style={{ width: 240 }}>
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Semua status</SelectItem>
            {STATUS_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {submissionStatusLabel[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Toolbar>
      {error && <InlineAlert tone="error">{error.message}</InlineAlert>}
      <SubmissionTable
        submissions={data?.submissions ?? []}
        isLoading={isPending}
        showCreator
        linkTo={(s) => `/owner/submissions/${s.id}`}
        emptyState={<EmptyState icon={<Eye size={26} />} title="Belum ada submission" description="Submission creator akan muncul setelah dikirim." />}
      />
    </>
  );
}