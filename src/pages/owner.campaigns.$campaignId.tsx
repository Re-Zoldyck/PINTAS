import React, { useState } from "react";
import { Helmet } from "react-helmet";
import { Link, useParams } from "react-router-dom";
import { Pencil, Rocket, CheckCircle2, PiggyBank } from "lucide-react";
import { toast } from "sonner";
import { CampaignDetailView } from "../components/CampaignDetailView";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Skeleton } from "../components/Skeleton";
import { InlineAlert, Stack } from "../components/Layouts";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../components/Dialog";
import { useCampaignDetail, useCampaignStatus } from "../helpers/useCampaigns";
import { formatRupiah } from "../helpers/formatRupiah";
import styles from "./owner.campaigns.$campaignId.module.css";

export default function OwnerCampaignDetailPage() {
  const { campaignId } = useParams();
  const id = Number(campaignId);
  const { data, isPending, error } = useCampaignDetail(id);
  const statusMutation = useCampaignStatus();
  const [addOpen, setAddOpen] = useState(false);
  const [amount, setAmount] = useState("1000000");
  const [completeOpen, setCompleteOpen] = useState(false);

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

  const run = (action: "activate" | "complete" | "add_budget", extra?: { amount?: number }, done?: () => void) =>
    statusMutation.mutate(
      { id: c.id, action, ...extra },
      {
        onSuccess: () => {
          toast.success(action === "activate" ? "Campaign aktif" : action === "complete" ? "Campaign ditandai selesai" : "Budget ditambahkan");
          done?.();
        },
        onError: (e) => toast.error(e.message),
      }
    );

  return (
    <>
      <Helmet>
        <title>{c.name} — PINTAS</title>
      </Helmet>
      <CampaignDetailView
        data={data}
        viewer="owner"
        eyebrow={
          <>
            <Link to="/owner/campaigns" className={styles.back}>
              Campaign
            </Link>
            <span>/</span>
          </>
        }
        actions={
          <>
            <Button asChild variant="outline">
              <Link to={`/owner/campaigns/${c.id}/edit`}>
                <Pencil size={16} /> Edit
              </Link>
            </Button>
            {c.status === "draft" && (
              <Button onClick={() => run("activate")} disabled={statusMutation.isPending}>
                <Rocket size={16} /> Aktifkan
              </Button>
            )}
            {(c.status === "active" || c.status === "completed") && (
              <Button variant="secondary" onClick={() => setAddOpen(true)} disabled={statusMutation.isPending}>
                <PiggyBank size={16} /> Tambah budget
              </Button>
            )}
            {c.status === "active" && (
              <Button variant="ghost" onClick={() => setCompleteOpen(true)} disabled={statusMutation.isPending}>
                <CheckCircle2 size={16} /> Tandai selesai
              </Button>
            )}
          </>
        }
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tambah budget campaign</DialogTitle>
            <DialogDescription>
              Budget saat ini {formatRupiah(c.budgetTotal)}. Penambahan langsung memperbesar sisa budget yang dapat dialokasikan
              {c.status === "completed" ? " dan mengaktifkan kembali campaign bila periodenya belum berakhir" : ""}.
            </DialogDescription>
          </DialogHeader>
          <div className={styles.dialogField}>
            <label className={styles.label}>Nominal tambahan (Rp)</label>
            <Input type="number" min={100000} step={100000} value={amount} onChange={(e) => setAmount(e.target.value)} />
            <span className={styles.help}>{formatRupiah(Number(amount) || 0)}</span>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAddOpen(false)}>
              Batal
            </Button>
            <Button
              onClick={() => run("add_budget", { amount: Math.floor(Number(amount) || 0) }, () => setAddOpen(false))}
              disabled={statusMutation.isPending || !(Number(amount) > 0)}
            >
              Tambahkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tandai campaign selesai?</DialogTitle>
            <DialogDescription>
              Creator tidak dapat mengirim submission baru. Submission yang sudah masuk tetap diproses dan yang disetujui tetap dibayar dari budget yang sudah dialokasikan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCompleteOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => run("complete", undefined, () => setCompleteOpen(false))} disabled={statusMutation.isPending}>
              Ya, selesaikan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}