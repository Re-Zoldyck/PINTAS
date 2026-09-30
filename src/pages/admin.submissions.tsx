import React from "react";
import { Helmet } from "react-helmet";
import { useSearchParams } from "react-router-dom";
import { BadgeCheck } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SubmissionTable } from "../components/SubmissionTable";
import { EmptyState } from "../components/EmptyState";
import { Toolbar, InlineAlert } from "../components/Layouts";
import { Tabs, TabsList, TabsTrigger } from "../components/Tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { useSubmissionsList } from "../helpers/useSubmissions";
import { useCampaignsList } from "../helpers/useCampaigns";
import { SubmissionStatusArrayValues, type SubmissionStatus } from "../helpers/schema";
import { submissionStatusLabel } from "../helpers/pintasLabels";

type Group = "confirm" | "review" | "claimable" | "all";
const GROUPS: Array<{ value: Group; label: string }> = [
  { value: "confirm", label: "Perlu keputusan" },
  { value: "review", label: "Perlu review / sanggahan" },
  { value: "claimable", label: "Disetujui" },
  { value: "all", label: "Semua" },
];

export default function AdminSubmissionsPage() {
  const [params, setParams] = useSearchParams();
  const group = (GROUPS.some((g) => g.value === params.get("group")) ? params.get("group") : "confirm") as Group;
  const statusParam = params.get("status");
  const status = SubmissionStatusArrayValues.includes(statusParam as SubmissionStatus) ? (statusParam as SubmissionStatus) : undefined;
  const campaignParam = params.get("campaignId");
  const campaignId = campaignParam ? Number(campaignParam) : undefined;

  const { data, isPending, error } = useSubmissionsList({
    ...(status ? { status } : { group }),
    ...(campaignId ? { campaignId } : {}),
  });
  const { data: campaigns } = useCampaignsList();

  const update = (next: Record<string, string | undefined>) => {
    const merged: Record<string, string | undefined> = { group, status: status ?? undefined, campaignId: campaignParam ?? undefined, ...next };
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(merged)) if (v) clean[k] = v;
    setParams(clean);
  };

  return (
    <>
      <Helmet>
        <title>Verifikasi Submission — PINTAS</title>
      </Helmet>
      <PageHeader eyebrow="Verifikasi" title="Verifikasi submission" description="Periksa hasil AI, lalu setujui atau tolak. Pembayaran tidak pernah dilakukan hanya berdasarkan hasil AI." />
      <Tabs value={status ? "__status" : group} onValueChange={(v) => update({ group: v === "__status" ? group : v, status: undefined })}>
        <TabsList>
          {GROUPS.map((g) => (
            <TabsTrigger key={g.value} value={g.value}>
              {g.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <Toolbar style={{ marginTop: 16 }}>
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
        <Select value={status ?? "__none"} onValueChange={(v) => update({ status: v === "__none" ? undefined : v })}>
          <SelectTrigger style={{ width: 240 }}>
            <SelectValue placeholder="Filter status spesifik" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none">Ikuti tab</SelectItem>
            {SubmissionStatusArrayValues.filter((s) => s !== "draft").map((s) => (
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
        linkTo={(s) => `/admin/submissions/${s.id}`}
        emptyState={<EmptyState icon={<BadgeCheck size={26} />} title="Tidak ada submission" description="Tidak ada submission yang cocok dengan filter ini." />}
      />
    </>
  );
}