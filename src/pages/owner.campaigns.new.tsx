import React from "react";
import { Helmet } from "react-helmet";
import { PageHeader } from "../components/PageHeader";
import { CampaignForm } from "../components/CampaignForm";

export default function OwnerNewCampaignPage() {
  return (
    <>
      <Helmet>
        <title>Buat Campaign — PINTAS</title>
      </Helmet>
      <PageHeader
        eyebrow="Campaign"
        title="Buat campaign"
        description="Tentukan budget, periode, target, requirement konten, dan aturan pembayaran. Simpan sebagai draft atau langsung aktifkan."
      />
      <CampaignForm />
    </>
  );
}