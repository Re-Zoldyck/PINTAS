import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { ScrollText, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { SectionCard } from "../components/SectionCard";
import { AuditTimeline } from "../components/AuditTimeline";
import { EmptyState } from "../components/EmptyState";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { Toolbar, InlineAlert, Muted } from "../components/Layouts";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";
import { useAuditLogs } from "../helpers/useAdminActions";
import styles from "./admin.audit-log.module.css";

type EntityType = "campaign" | "submission" | "claim" | "dispute" | "user" | "participation";
const ENTITY_LABEL: Record<EntityType, string> = {
  campaign: "Campaign",
  submission: "Submission",
  claim: "Claim",
  dispute: "Sanggahan",
  user: "Pengguna",
  participation: "Partisipasi",
};
const LIMIT = 50;

export default function AdminAuditLogPage() {
  const [entityType, setEntityType] = useState<EntityType | "__all">("__all");
  const [page, setPage] = useState(0);
  const { data, isPending, isFetching, error } = useAuditLogs({ ...(entityType === "__all" ? {} : { entityType }), limit: LIMIT, offset: page * LIMIT });
  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <>
      <Helmet>
        <title>Audit Log — PINTAS</title>
      </Helmet>
      <PageHeader eyebrow="Audit" title="Audit log" description="Setiap perubahan status campaign, submission, sanggahan, claim, pembayaran, dan akun tercatat di sini." />
      <Toolbar>
        <Select
          value={entityType}
          onValueChange={(v) => {
            setEntityType(v as EntityType | "__all");
            setPage(0);
          }}
        >
          <SelectTrigger style={{ width: 220 }}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all">Semua entitas</SelectItem>
            {(Object.keys(ENTITY_LABEL) as EntityType[]).map((k) => (
              <SelectItem key={k} value={k}>
                {ENTITY_LABEL[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Muted>
          {total} entri{isFetching ? " · memuat…" : ""}
        </Muted>
        <div className={styles.pager}>
          <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="Sebelumnya">
            <ChevronLeft size={16} />
          </Button>
          <Muted>
            {page + 1} / {pages}
          </Muted>
          <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} aria-label="Berikutnya">
            <ChevronRight size={16} />
          </Button>
        </div>
      </Toolbar>
      {error && <InlineAlert tone="error">{error.message}</InlineAlert>}
      <SectionCard>
        {isPending ? (
          <Skeleton className={styles.skeleton} />
        ) : (data?.logs.length ?? 0) === 0 ? (
          <EmptyState icon={<ScrollText size={26} />} title="Belum ada catatan" />
        ) : (
          <AuditTimeline entries={data?.logs ?? []} showEntity />
        )}
      </SectionCard>
    </>
  );
}