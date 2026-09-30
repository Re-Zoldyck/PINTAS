import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Users, FileCheck2, ArrowUpRight } from "lucide-react";
import type { CampaignSummary } from "../helpers/pintasTypes";
import { campaignStatusLabel, campaignStatusTone, platformLabel } from "../helpers/pintasLabels";
import { formatDate, formatRupiah } from "../helpers/formatRupiah";
import { describePayoutRule } from "../helpers/payout";
import { StatusBadge } from "./StatusBadge";
import { BudgetProgress } from "./BudgetProgress";
import styles from "./CampaignCard.module.css";

interface Props {
  campaign: CampaignSummary;
  to: string;
  showBudget?: boolean;
  footer?: React.ReactNode;
  className?: string;
}

export const CampaignCard: React.FC<Props> = ({ campaign: c, to, showBudget = true, footer, className }) => (
  <article className={`${styles.card} ${className ?? ""}`}>
    <div className={styles.top}>
      <div className={styles.meta}>
        <span className={styles.code}>{c.code}</span>
        <StatusBadge tone={campaignStatusTone[c.status]} size="sm">
          {campaignStatusLabel[c.status]}
        </StatusBadge>
        {c.myParticipation === "active" && (
          <StatusBadge tone="primary" size="sm" dot={false}>
            Diikuti
          </StatusBadge>
        )}
        {c.myParticipation === "stopped" && (
          <StatusBadge tone="neutral" size="sm" dot={false}>
            Berhenti
          </StatusBadge>
        )}
      </div>
      <Link to={to} className={styles.title}>
        {c.name}
        <ArrowUpRight size={16} className={styles.arrow} />
      </Link>
      <p className={styles.owner}>oleh {c.ownerName}</p>
      <p className={styles.description}>{c.description}</p>
    </div>
    <div className={styles.facts}>
      <span>
        <CalendarDays size={14} /> {formatDate(c.startDate)} – {formatDate(c.endDate)}
      </span>
      <span>{platformLabel[c.requiredPlatform]}</span>
      <span>
        <Users size={14} /> {c.participantCount} creator
      </span>
      <span>
        <FileCheck2 size={14} /> {c.submissionCount} submission
      </span>
    </div>
    <p className={styles.rule}>{describePayoutRule(c, formatRupiah)}</p>
    {showBudget && (
      <BudgetProgress budgetTotal={c.budgetTotal} budgetUsed={c.budgetUsed} budgetReserved={c.budgetReserved} />
    )}
    {footer && <div className={styles.footer}>{footer}</div>}
  </article>
);