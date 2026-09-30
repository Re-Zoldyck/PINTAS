import React from "react";
import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Megaphone,
  UserPlus,
  Clapperboard,
  Upload,
  Bot,
  ShieldCheck,
  Wallet,
  Briefcase,
  Sparkles,
  Gavel,
} from "lucide-react";
import { Button } from "../components/Button";
import { BudgetProgress } from "../components/BudgetProgress";
import { StatusBadge } from "../components/StatusBadge";
import { useAuth } from "../helpers/useAuth";
import { roleHome } from "../helpers/roleHome";
import { useScrollReveal } from "../helpers/useScrollReveal";
import styles from "./_index.module.css";

const FLOW = [
  { icon: <Megaphone size={20} />, title: "Owner membuat campaign", text: "Nama, budget (min. Rp4.000.000), periode, target, requirement konten, dan aturan pembayaran." },
  { icon: <UserPlus size={20} />, title: "Creator mengambil campaign", text: "Bebas menentukan kapan mulai dan kapan berhenti. Tidak wajib menyelesaikan periode." },
  { icon: <Clapperboard size={20} />, title: "Creator membuat konten", text: "Sesuai requirement: platform, watermark logo, caption, hashtag, editing." },
  { icon: <Upload size={20} />, title: "Submit bukti", text: "Setiap konten adalah submission terpisah dengan URL, views, dan screenshot bukti." },
  { icon: <Bot size={20} />, title: "AI Verification", text: "Pemeriksaan otomatis per requirement: PASS, FAIL, atau NEED REVIEW — dengan alasan." },
  { icon: <ShieldCheck size={20} />, title: "Admin Confirmation", text: "Keputusan akhir di tangan Admin. Creator dapat mengajukan sanggahan atas hasil AI." },
  { icon: <Wallet size={20} />, title: "Claim & Payout", text: "Claim hanya untuk submission yang disetujui; nominal dibatasi sisa budget campaign." },
];

const PRINCIPLES = [
  "Creator dibayar berdasarkan submission yang valid dan telah diverifikasi.",
  "AI membantu verifikasi, Admin memiliki keputusan akhir.",
  "Creator dapat menyanggah keputusan AI; sanggahan diperiksa Admin.",
  "Creator bebas berhenti kapan saja — pembayaran tidak bergantung pada penyelesaian periode.",
  "Setiap submission diproses secara terpisah.",
  "Pembayaran tidak boleh melebihi budget yang tersedia.",
  "Budget campaign dan penggunaannya ditampilkan secara realtime.",
  "Data pribadi hanya diminta saat claim dan tidak dibuka ke publik.",
];

export default function LandingPage() {
  const { authState } = useAuth();
  const revealFlow = useScrollReveal();
  const revealRoles = useScrollReveal();
  const revealPrinciples = useScrollReveal();
  const isAuthed = authState.type === "authenticated";
  const home = isAuthed ? roleHome(authState.user.role) : "/login";

  return (
    <div className={styles.page}>
      <Helmet>
        <title>PINTAS — Platform campaign konten digital antara Owner dan Creator</title>
        <meta name="description" content="PINTAS menghubungkan Owner yang punya budget campaign dengan Creator. Submission diverifikasi AI, dikonfirmasi Admin, dan dibayar sesuai budget." />
      </Helmet>

      <header className={styles.nav}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandMark}>P</span>
          <span className={styles.brandName}>PINTAS</span>
        </Link>
        <nav className={styles.navLinks}>
          <a href="#alur">Alur</a>
          <a href="#peran">Peran</a>
          <a href="#prinsip">Prinsip</a>
        </nav>
        <div className={styles.navActions}>
          {isAuthed ? (
            <Button asChild>
              <Link to={home}>
                Buka dashboard <ArrowRight size={16} />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost">
                <Link to="/login">Masuk</Link>
              </Button>
              <Button asChild>
                <Link to="/register">Daftar</Link>
              </Button>
            </>
          )}
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroText}>
          <span className={styles.eyebrow}>Creator economy · verifikasi AI · keputusan Admin</span>
          <h1 className={styles.heroTitle}>
            Campaign konten yang dibayar per <em>submission valid</em>, bukan per janji.
          </h1>
          <p className={styles.heroLead}>
            Owner menaruh budget dan requirement. Creator mengambil campaign kapan pun ia siap, mengirim bukti per konten, lalu AI dan Admin memverifikasi sebelum dana dibayarkan — tanpa pernah melampaui budget.
          </p>
          <div className={styles.heroActions}>
            <Button asChild size="lg">
              <Link to="/register?role=owner">
                <Briefcase size={18} /> Saya Owner — buat campaign
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/register?role=creator">
                <Sparkles size={18} /> Saya Creator — ambil campaign
              </Link>
            </Button>
          </div>
        </div>
        <div className={styles.heroCard}>
          <div className={styles.heroCardHead}>
            <span className={styles.mono}>CMP-0001</span>
            <StatusBadge tone="success" size="sm">Aktif</StatusBadge>
          </div>
          <h3 className={styles.heroCardTitle}>Kopi Nusantara — Rasa Pagi Indonesia</h3>
          <BudgetProgress budgetTotal={4000000} budgetUsed={2800000} budgetReserved={0} variant="full" />
          <div className={styles.heroSubs}>
            <div className={styles.heroSub}>
              <span className={styles.mono}>#001</span>
              <span>Ngopi pagi di teras</span>
              <StatusBadge tone="success" size="sm">Dibayar</StatusBadge>
            </div>
            <div className={styles.heroSub}>
              <span className={styles.mono}>#002</span>
              <span>Resep es kopi susu</span>
              <StatusBadge tone="primary" size="sm">Siap Claim</StatusBadge>
            </div>
            <div className={styles.heroSub}>
              <span className={styles.mono}>#003</span>
              <span>Kopi sore sambil kerja</span>
              <StatusBadge tone="warning" size="sm">Sanggahan Diajukan</StatusBadge>
            </div>
          </div>
        </div>
      </section>

      <section id="alur" className={styles.section} ref={revealFlow}>
        <h2 className={styles.sectionTitle}>Alur utama</h2>
        <p className={styles.sectionLead}>Owner membuat Campaign → Creator mengambil → membuat konten → submit bukti → AI Verification → Admin Confirmation → Claim/Payout.</p>
        <ol className={styles.flow}>
          {FLOW.map((step, i) => (
            <li key={step.title} className={styles.flowStep}>
              <span className={styles.flowIndex}>{String(i + 1).padStart(2, "0")}</span>
              <span className={styles.flowIcon}>{step.icon}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="peran" className={`${styles.section} ${styles.sectionAlt}`} ref={revealRoles}>
        <h2 className={styles.sectionTitle}>Tiga peran, satu aturan main</h2>
        <div className={styles.roles}>
          <article className={styles.role}>
            <Briefcase size={22} />
            <h3>Owner</h3>
            <p>Membuat campaign, menetapkan budget dan requirement, memantau budget terpakai, sisa, dan progres persentase secara realtime.</p>
          </article>
          <article className={styles.role}>
            <Sparkles size={22} />
            <h3>Creator</h3>
            <p>Mengambil campaign, mengirim konten sebagai submission terpisah, melihat hasil verifikasi AI, menyanggah bila tidak setuju, lalu claim pembayaran.</p>
          </article>
          <article className={styles.role}>
            <Gavel size={22} />
            <h3>Admin</h3>
            <p>Memeriksa hasil AI, menerima atau menolak submission dan sanggahan, mengonfirmasi pembayaran, dan memantau penggunaan budget.</p>
          </article>
        </div>
      </section>

      <section id="prinsip" className={styles.section} ref={revealPrinciples}>
        <h2 className={styles.sectionTitle}>Prinsip inti PINTAS</h2>
        <ul className={styles.principles}>
          {PRINCIPLES.map((p) => (
            <li key={p}>
              <ShieldCheck size={16} /> {p}
            </li>
          ))}
        </ul>
      </section>

      <footer className={styles.footer}>
        <span>© {new Date().getFullYear()} PINTAS</span>
        <span>Akun demo tersedia di halaman masuk.</span>
      </footer>
    </div>
  );
}