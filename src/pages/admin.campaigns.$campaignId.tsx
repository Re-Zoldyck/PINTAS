import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { CampaignDetailView } from "../components/CampaignDetailView";
import { Button } from "../components/Button";
import { Skeleton } from "../components/Skeleton";
import { InlineAlert, Stack } from "../components/Layouts";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/Dialog";
import { useCampaignDetail, useCampaignStatus } from "../helpers/useCampaigns";
import styles from "./admin.campaigns.$campaignId.module.css";

export default function AdminCampaignDetailPage() {
  const { campaignId } = useParams();
  const id = Number(campaignId);
  const { data, isPending, error } = useCampaignDetail(id);
  const statusMutation = useCampaignStatus();
  const [open, setOpen] = useState(false);

  if (error) return <InlineAlert tone="error">{error.message}</InlineAlert>;
  if (isPending || !data) {
    return (
      <Stack>
        <Skeleton className={styles.skeletonHead} />
        <Skeleton className={styles.skeletonBody} />
      </Stack>
    );
  }
  const c = data.campaign;
  return (
    <>
      <Helmet>
        <title>{c.name} — PINTAS Admin</title>
      </Helmet>
      <CampaignDetailView
        data={data}
        viewer="admin"
        eyebrow={
          <>
            <Link to="/admin/campaigns" className={styles.back}>
              Campaign
            </Link>
            <span>/</span>
          </>
        }
        actions={
          c.status === "active" ? (
            <Button variant="outline" onClick={() => setOpen(true)} disabled={statusMutation.isPending}>
              <CheckCircle2 size={16} /> Tandai selesai
            </Button>
          ) : undefined
        }
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Selesaikan campaign ini?</DialogTitle>
            <DialogDescription>Creator tidak dapat mengirim submission baru. Submission yang sudah masuk tetap diproses.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() =>
                statusMutation.mutate(
                  { id: c.id, action: "complete" },
                  { onSuccess: () => { toast.success("Campaign diselesaikan"); setOpen(false); }, onError: (e) => toast.error(e.message) }
                )
              }
              disabled={statusMutation.isPending}
            >
              Ya, selesaikan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}