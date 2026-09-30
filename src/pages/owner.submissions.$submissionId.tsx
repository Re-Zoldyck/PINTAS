import React from "react";
import { Helmet } from "react-helmet";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SubmissionDetailView } from "../components/SubmissionDetailView";
import { Skeleton } from "../components/Skeleton";
import { InlineAlert, Stack } from "../components/Layouts";
import { useSubmissionDetail } from "../helpers/useSubmissions";
import styles from "./owner.submissions.$submissionId.module.css";

export default function OwnerSubmissionDetailPage() {
  const { submissionId } = useParams();
  const id = Number(submissionId);
  const { data, isPending, error } = useSubmissionDetail(id);

  if (error) return <InlineAlert tone="error">{error.message}</InlineAlert>;
  if (isPending || !data) {
    return (
      <Stack>
        <Skeleton className={styles.skeletonHead} />
        <Skeleton className={styles.skeletonBody} />
      </Stack>
    );
  }
  return (
    <>
      <Helmet>
        <title>
          {data.submission.code} {data.submission.title} — PINTAS
        </title>
      </Helmet>
      <Link to="/owner/submissions" className={styles.back}>
        <ArrowLeft size={14} /> Monitoring submission
      </Link>
      <SubmissionDetailView submission={data.submission} viewer="owner" />
    </>
  );
}