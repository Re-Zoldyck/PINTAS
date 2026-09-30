import React from "react";
import { Helmet } from "react-helmet";
import { Bot } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { SectionCard } from "../components/SectionCard";
import { SubmissionTable } from "../components/SubmissionTable";
import { EmptyState } from "../components/EmptyState";
import { StatGrid, Stack, InlineAlert } from "../components/Layouts";
import { useSubmissionsList } from "../helpers/useSubmissions";

export default function AdminAiReviewPage() {
  const { data, isPending, error } = useSubmissionsList({ group: "confirm" });
  const all = data?.submissions ?? [];
  const needReview = all.filter((s) => s.aiResult === "need_review" && s.status !== "disputed");
  const failed = all.filter((s) => s.aiResult === "fail" && s.status !== "disputed");
  const disputed = all.filter((s) => s.status === "disputed");
  const passed = all.filter((s) => s.aiResult === "pass");

  return (
    <>
      <Helmet>
        <title>Review Hasil AI — PINTAS</title>
      </Helmet>
      <PageHeader
        eyebrow="AI Verification"
        title="Review hasil AI"
        description="Mesin verifikasi berbasis aturan memeriksa akun, watermark, views & bukti, duplikat/reupload, caption, hashtag, editing, validitas bukti, dan indikasi manipulasi. Hasil AI bukan keputusan final."
      />
      {error && <InlineAlert tone="error">{error.message}</InlineAlert>}
      <Stack gap="lg">
        <StatGrid>
          <StatCard label="NEED REVIEW" value={needReview.length} tone="warning" icon={<Bot size={16} />} hint="Perlu pemeriksaan manual" />
          <StatCard label="FAIL" value={failed.length} tone="error" hint="Creator dapat menyanggah" />
          <StatCard label="Disanggah" value={disputed.length} tone="warning" hint="Menunggu keputusan Admin" />
          <StatCard label="PASS" value={passed.length} tone="success" hint="Menunggu konfirmasi Admin" />
        </StatGrid>
        <SectionCard title="Perlu review manual (NEED REVIEW)" padded={false}>
          <SubmissionTable submissions={needReview} isLoading={isPending} showCreator linkTo={(s) => `/admin/submissions/${s.id}`} emptyState={<EmptyState title="Tidak ada" />} />
        </SectionCard>
        <SectionCard title="Sanggahan atas hasil AI" padded={false}>
          <SubmissionTable submissions={disputed} isLoading={isPending} showCreator linkTo={(s) => `/admin/submissions/${s.id}`} emptyState={<EmptyState title="Tidak ada sanggahan" />} />
        </SectionCard>
        <SectionCard title="AI FAIL (belum disanggah)" padded={false}>
          <SubmissionTable submissions={failed} isLoading={isPending} showCreator linkTo={(s) => `/admin/submissions/${s.id}`} emptyState={<EmptyState title="Tidak ada" />} />
        </SectionCard>
        <SectionCard title="AI PASS — menunggu konfirmasi Admin" padded={false}>
          <SubmissionTable submissions={passed} isLoading={isPending} showCreator linkTo={(s) => `/admin/submissions/${s.id}`} emptyState={<EmptyState title="Tidak ada" />} />
        </SectionCard>
      </Stack>
    </>
  );
}