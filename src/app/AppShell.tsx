/**
 * Kerangka aplikasi v2: navigasi kiri yang bisa diciutkan, top bar ringkas,
 * dan pintasan yang terlihat (bukan disembunyikan).
 */

import { useState } from "react";
import type { ReactNode } from "react";
import {
  Bookmark,
  ChevronLeft,
  ClipboardList,
  Database,
  LayoutDashboard,
  Menu,
  Moon,
  Plus,
  Sun,
  SunMoon,
} from "lucide-react";
import { Tombol, TombolIkon } from "../ui";

export type Halaman = "dasbor" | "tiket" | "data";

interface ItemNav {
  key: Halaman;
  label: string;
  ikon: ReactNode;
}

const NAV: ItemNav[] = [
  { key: "dasbor", label: "Dasbor", ikon: <LayoutDashboard size={16} aria-hidden="true" /> },
  { key: "tiket", label: "Tiket", ikon: <ClipboardList size={16} aria-hidden="true" /> },
  { key: "data", label: "Data & cadangan", ikon: <Database size={16} aria-hidden="true" /> },
];

export interface AppShellProps {
  halaman: Halaman;
  onPindah: (halaman: Halaman) => void;
  onBuat: () => void;
  onBukaPalet: () => void;
  isDemo: boolean;
  jumlahTiket: number;
  ciut: boolean;
  onToggleCiut: () => void;
  tampilan: { id: string; nama: string; jumlah: number }[];
  tampilanAktif: string | null;
  onPilihTampilan: (id: string) => void;
  tema: "terang" | "gelap" | "sistem";
  onSiklusTema: () => void;
  children: ReactNode;
}

function IkonTema({ tema }: { tema: "terang" | "gelap" | "sistem" }) {
  if (tema === "terang") return <Sun size={15} aria-hidden="true" />;
  if (tema === "gelap") return <Moon size={15} aria-hidden="true" />;
  return <SunMoon size={15} aria-hidden="true" />;
}

function IsiNavigasi({
  halaman,
  onPindah,
  onTutup,
}: {
  halaman: Halaman;
  onPindah: (h: Halaman) => void;
  onTutup?: () => void;
}): ReactNode {
  return (
    <>
      <div className="rail-merek">
        <span className="rail-merek-lambang" aria-hidden="true">
          JT
        </span>
        <span className="rail-merek-nama">
          <strong>JobTrack</strong>
          <span>SatuArah Labs</span>
        </span>
      </div>
      <div className="rail-grup">
        <nav aria-label="Menu utama">
          {NAV.map((item) => (
            <button
              key={item.key}
              type="button"
              className="rail-item"
              aria-current={halaman === item.key ? "page" : undefined}
              onClick={() => {
                onPindah(item.key);
                onTutup?.();
              }}
            >
              {item.ikon}
              <span className="rail-item-teks">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}

export function AppShell({
  halaman,
  onPindah,
  onBuat,
  onBukaPalet,
  isDemo,
  jumlahTiket,
  ciut,
  onToggleCiut,
  tampilan,
  tampilanAktif,
  onPilihTampilan,
  tema,
  onSiklusTema,
  children,
}: AppShellProps): ReactNode {
  const [menuMobile, setMenuMobile] = useState(false);

  return (
    <div className="app" data-rail={ciut}>
      <a className="lewati-ke-konten" href="#konten-utama">
        Lewati ke konten utama
      </a>

      <aside className="rail" aria-label="Navigasi dan tampilan">
        <IsiNavigasi halaman={halaman} onPindah={onPindah} />

        <div className="rail-grup">
          <div className="rail-judul">
            <span className="t-eyebrow">Tampilan</span>
          </div>
          <div className="daftar-mini">
            {tampilan.map((t) => (
              <button
                key={t.id}
                type="button"
                data-aktif={tampilanAktif === t.id}
                onClick={() => onPilihTampilan(t.id)}
                title={t.nama}
              >
                <Bookmark size={12} aria-hidden="true" />
                {t.nama}
                <span>{t.jumlah}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rail-kaki">
          <Tombol
            variasi="halus"
            ukuran="kecil"
            ikon={<ChevronLeft size={14} aria-hidden="true" />}
            onClick={onToggleCiut}
            title={ciut ? "Lebarkan navigasi" : "Ciutkan navigasi"}
          >
            {ciut ? "" : "Ciutkan"}
          </Tombol>
          <button
            type="button"
            className="rail-status"
            onClick={() => onPindah("data")}
            title="Buka Data &amp; Cadangan"
          >
            <span className="rail-lampu" data-demo={isDemo || undefined} aria-hidden="true" />
            <div>
              <strong>{isDemo ? "Data demo" : "Data Anda"}</strong>
              <span>{jumlahTiket} tiket · tersimpan lokal</span>
            </div>
          </button>
        </div>
      </aside>

      {menuMobile ? (
        <div
          className="overlay-nav"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setMenuMobile(false);
          }}
        >
          <div className="overlay-nav-kotak" role="dialog" aria-label="Menu navigasi">
            <IsiNavigasi
              halaman={halaman}
              onPindah={onPindah}
              onTutup={() => setMenuMobile(false)}
            />
          </div>
        </div>
      ) : null}

      <div className="utama">
        <header className="puncak">
          <div className="hanya-mobile">
            <TombolIkon
              label="Buka menu"
              ikon={<Menu size={16} aria-hidden="true" />}
              onClick={() => setMenuMobile(true)}
            />
          </div>
          <div className="puncak-aksi" style={{ marginLeft: 0 }}>
            <Tombol
              variasi="halus"
              ukuran="kecil"
              onClick={onBukaPalet}
              className="palet-pemicu"
              ikon={<span className="kbd">Ctrl K</span>}
              title="Palet perintah (Ctrl+K)"
            >
              <span className="palet-pemicu-teks">Cari atau jalankan aksi</span>
            </Tombol>
          </div>
          <div className="puncak-aksi">
            <TombolIkon
              label={
                tema === "terang"
                  ? "Mode gelap"
                  : tema === "gelap"
                    ? "Ikuti sistem"
                    : "Mode terang"
              }
              ikon={<IkonTema tema={tema} />}
              onClick={onSiklusTema}
            />
            <Tombol variasi="utama" ikon={<Plus size={15} aria-hidden="true" />} onClick={onBuat}>
              Tiket baru
            </Tombol>
          </div>
        </header>

        <main className="isi" id="konten-utama">
          {children}
        </main>
      </div>
    </div>
  );
}
