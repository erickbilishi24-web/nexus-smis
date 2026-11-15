import { Link } from "wouter";
import { ArrowRight, CheckCircle2, ExternalLink, Mail, MessageCircle, PlayCircle } from "lucide-react";

const videoSrc = "/manus-storage/NEXUS_SMIS_ADVERTISEMENT_eea4900a.mp4";
const logoSrc = "/manus-storage/nexus-smis-logo_37d2287e.png";

const highlights = [
  "Admissions, learner profiles and CBC academics",
  "Attendance, people, payroll and school finance",
  "Transport, boarding, clinic and leave-out workflows",
  "Reports, analytics, communication and school settings",
];

const shareMessage = "Watch the NEXUS SMIS story — one platform for every school operation.";
const shareUrl = typeof window === "undefined" ? "/advertise" : `${window.location.origin}/advertise`;
const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${shareMessage} ${shareUrl}`)}`;
const emailUrl = `mailto:?subject=${encodeURIComponent("Discover NEXUS SMIS")}&body=${encodeURIComponent(`${shareMessage}\n\n${shareUrl}`)}`;

export default function Advertisement() {
  return (
    <main className="min-h-screen bg-[#f7f4ed] text-[#193d32]">
      <section className="relative overflow-hidden bg-[#123f35] px-4 py-5 text-white sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 font-bold tracking-[.16em]">
            <img src={logoSrc} alt="NEXUS-smis" className="h-10 w-10 rounded-lg object-contain" />
            <span>NEXUS<span className="text-[#e7bd6d]">·</span>SMIS</span>
          </Link>
          <Link href="/apply" className="hidden items-center gap-2 rounded-full bg-[#f3cc78] px-4 py-2 text-xs font-extrabold text-[#173f35] transition hover:-translate-y-0.5 hover:bg-[#ffe09b] sm:inline-flex">
            Apply for your school <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 pt-8 sm:px-8 sm:pt-12">
        <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_.95fr]">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#b17b2d]">NEXUS school management system</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-6xl">Running a school is complex. Managing it shouldn&apos;t be.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#5f7068] sm:text-lg">One connected platform for school leaders, teachers and administrators — built around the realities of Kenyan schools.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/apply" className="inline-flex items-center gap-2 rounded-xl bg-[#1d6a57] px-5 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-[#1d6a57]/20 transition hover:-translate-y-0.5 hover:bg-[#155443]">Apply Now <ArrowRight size={16} /></Link>
              <Link href="/" className="inline-flex items-center gap-2 rounded-xl border border-[#cfe0d3] bg-white px-5 py-3.5 text-sm font-bold text-[#28483f] transition hover:-translate-y-0.5 hover:border-[#1d6a57]">Sign in to NEXUS <ExternalLink size={15} /></Link>
            </div>
          </div>
          <div className="rounded-[1.25rem] border border-[#d8e6dc] bg-white p-3 shadow-[0_18px_60px_rgba(37,64,53,.14)]">
            <video className="aspect-video w-full rounded-[.85rem] bg-[#0f2d27]" controls preload="metadata" poster={logoSrc} playsInline>
              <source src={videoSrc} type="video/mp4" />
              Your browser does not support embedded video.
            </video>
            <div className="flex items-center gap-2 px-2 pb-1 pt-3 text-xs font-bold text-[#5f7068]"><PlayCircle size={15} className="text-[#1d6a57]" /> NEXUS product advertisement · 52 seconds</div>
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-[#edf1eb] px-2 pt-3">
              <span className="mr-1 text-xs font-bold text-[#718077]">Share this story:</span>
              <a href={whatsappUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-[#25D366] px-3 py-2 text-xs font-extrabold text-white transition hover:-translate-y-0.5 hover:bg-[#1fad54]"><MessageCircle size={14} /> WhatsApp</a>
              <a href={emailUrl} className="inline-flex items-center gap-1.5 rounded-lg border border-[#bfd0c1] bg-white px-3 py-2 text-xs font-extrabold text-[#28483f] transition hover:-translate-y-0.5 hover:border-[#1d6a57]"><Mail size={14} /> Email</a>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#e0e7df] bg-[#fffefa] px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {highlights.map(item => <div key={item} className="rounded-xl border border-[#dfe8df] bg-[#f8fbf7] p-4 text-sm font-bold leading-6 text-[#28483f]"><CheckCircle2 size={18} className="mb-3 text-[#1d6a57]" />{item}</div>)}
          </div>
        </div>
      </section>

      <section className="bg-[#173f35] px-4 py-12 text-center text-white sm:px-8">
        <p className="text-xs font-extrabold uppercase tracking-[.18em] text-[#e7bd6d]">Ready to transform your school?</p>
        <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-black sm:text-4xl">NEXUS — one platform. Every school operation. Total control.</h2>
        <Link href="/apply" className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#f3cc78] px-6 py-3.5 text-sm font-extrabold text-[#173f35] transition hover:-translate-y-0.5 hover:bg-[#ffe09b]">Apply Now and join the NEXUS family <ArrowRight size={16} /></Link>
      </section>
    </main>
  );
}
