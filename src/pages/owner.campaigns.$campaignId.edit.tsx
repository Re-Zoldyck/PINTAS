import React from "react";
import { Helmet } from "react-helmet";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { CampaignForm } from "../components/CampaignForm";
import { Skeleton } from "../components/Skeleton";
import { InlineAlert } from "../components/Layouts";
import { useCampaignDetail } from "../helpers/useCampaigns";
import styles from "./owner.campaigns.$campaignId.edit.module.css";

export default function OwnerEditCampaignPage() {
  const { campaignId } = useParams();
  const id = Number(campaignId);
  const { data, isPending, error } = useCampaignDetail(id);

  if (error) return <InlineAlert tone="error">{error.message}</InlineAlert>;
  if (isPending || !data) return <Skeleton className={styles.skeleton} />;
  const c = data.campaign;

  return (
    <>
      <Helmet>
        <title>Edit {c.name} — PINTAS</title>
      </Helmet>
      <Link to={`/owner/campaigns/${c.id}`} className={styles.back}>
        <ArrowLeft size={14} /> Kembali ke detail campaign
      </Link>
      <PageHeader eyebrow={c.code} title={`Edit: ${c.name}`} description={c.status === "draft" ? "Campaign masih draft — semua field dapat diubah." : "Campaign sudah berjalan — perubahan terbatas."} />
      <CampaignForm key={c.id} existing={c} />
    </>
  );
}