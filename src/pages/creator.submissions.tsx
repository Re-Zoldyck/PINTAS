import React from "react";
import { Helmet } from "react-helmet";
import { Link, useSearchParams } from "react-router-dom";
import { PlusCircle, FileCheck2 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SubmissionTable } from "../components/SubmissionTable";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { Toolbar, InlineAlert } from "../components/Layouts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { useSubmissionsList } from "../helpers/useSubmissions";
import { SubmissionStatusArrayValues, type SubmissionStatus } from "../helpers/schema";
import { submissionStatusLabel } from "../helpers/pintasLabels";

const ORDER: SubmissionStatus[] = ["draft", "submitted", "ai_verifying", "ai_passed", "ai_failed", "need_admin_review", "disputed", "admin_approved", "claimable", "claimed", "paid", "admin_rejected"];

export default function CreatorSubmissionsPage() {
  const [params, setParams] = useSearchParams();
  const statusParam = params.get("status");
  const status = SubmissionStatusArrayValues.includes(statusParam as SubmissionStatus) ? (statusParam as SubmissionStatus) : undefined;
  const { data, isPending, error } = useSubmissionsList(status ? { status } : {});

  return (
    <>
      <Helmet>
        <title>Submission Saya — PINTAS</title>
      </Helmet>
      <PageHeader
        eyebrow="Submission"
        title="Submission saya"
        description="Semua konten yang pernah Anda kirim, masing-masing diproses terpisah."
        actions={
          <Button asChild>
            <Link to="/creator/submit">
              <PlusCircle size={16} /> Submit konten
            </Link>
          </Button>
        }
      />
      <Toolbar>
        <Select value={status ?? "__all"} onValueChange={(v) => setParams(v === "__all" ? {} : { status: v })}>
          <SelectTrigger style={{ width: 260 }}>
            <SelectValue placeholder="Semua status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Semua status</SelectItem>
            {ORDER.map((s) => (
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
        linkTo={(s) => `/creator/submissions/${s.id}`}
        emptyState={<EmptyState icon={<FileCheck2 size={26} />} title="Belum ada submission" description="Kirim konten pertama Anda dari campaign yang diikuti." />}
      />
    </>
  );
}