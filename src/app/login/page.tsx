import { Broadcast, ChartLineUp, Gauge } from "@phosphor-icons/react/dist/ssr";
import { Brand } from "@/components/brand";
import { LoginForm } from "./login-form";

const points = [
  {
    icon: Broadcast,
    title: "Aliran langsung",
    text: "Garis menyala saat request sedang diproses, berhenti saat selesai.",
  },
  {
    icon: ChartLineUp,
    title: "Angka yang bergerak",
    text: "Token masuk, cached, keluar, dan estimasi biaya mengikuti periode yang dipilih.",
  },
  {
    icon: Gauge,
    title: "Kuota per koneksi",
    text: "Buka detail provider untuk memeriksa sisa kuota saat dibutuhkan.",
  },
];

export default function LoginPage() {
  return (
    <main className="grid min-h-[100dvh] lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative hidden overflow-hidden border-r border-line p-10 lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="radar-grid pointer-events-none absolute inset-0 opacity-50" aria-hidden="true" />
        <div
          className="pointer-events-none absolute -right-24 top-1/3 h-[420px] w-[420px] rounded-full opacity-40 blur-3xl"
          style={{ background: "radial-gradient(circle, rgba(246,183,60,0.16), transparent 68%)" }}
          aria-hidden="true"
        />

        <div className="relative z-10">
          <Brand />
        </div>

        <div className="relative z-10 max-w-xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-amber">
            Live traffic control
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.08] tracking-[-0.02em] xl:text-5xl">
            Setiap request punya arah. Lihat semuanya bergerak.
          </h1>
          <p className="mt-5 max-w-[46ch] text-sm leading-relaxed text-ink-muted">
            Peta aliran dari 9Router ke provider dan model, lengkap dengan token, biaya, dan status
            koneksi dalam satu layar.
          </p>

          <ul className="mt-9 grid gap-4">
            {points.map((point) => (
              <li key={point.title} className="flex gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] border border-line bg-surface/80 text-amber">
                  <point.icon size={17} aria-hidden="true" />
                </span>
                <span>
                  <span className="block text-sm font-medium">{point.title}</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-ink-muted">
                    {point.text}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative z-10">
          <div className="relative h-40 w-40 opacity-70" aria-hidden="true">
            <div className="absolute inset-0 rounded-full border border-line-strong" />
            <div className="absolute inset-6 rounded-full border border-line" />
            <div className="absolute inset-12 rounded-full border border-amber/30" />
            <div
              className="animate-core-sweep absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0deg, rgba(246,183,60,0.22) 34deg, transparent 62deg)",
              }}
            />
            <span className="absolute left-[72%] top-[24%] h-2 w-2 rounded-full bg-amber shadow-[0_0_10px_rgba(246,183,60,0.7)]" />
            <span className="absolute left-[26%] top-[62%] h-1.5 w-1.5 rounded-full bg-cyan/80" />
            <span className="absolute left-[52%] top-[82%] h-1.5 w-1.5 rounded-full bg-ink-muted/70" />
          </div>
          <p className="mt-5 max-w-[42ch] text-[11px] leading-relaxed text-ink-faint">
            Dibuat untuk instance 9Router pribadi. Sesi berlaku 24 jam dan dapat dicabut dengan keluar.
          </p>
        </div>
      </section>

      <section className="relative flex min-h-[100dvh] flex-col justify-center px-5 py-10 sm:px-8">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
