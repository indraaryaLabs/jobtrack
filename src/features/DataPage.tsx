/**
 * Halaman Data & Cadangan.
 *
 * Jujur soal batasan aplikasi, menampilkan kondisi penyimpanan, dan
 * menyediakan jalur keluar yang aman: ekspor CSV, ekspor JSON, impor
 * tervalidasi, serta reset demo dengan konfirmasi.
 */

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Database,
  Download,
  FileJson,
  FileSpreadsheet,
  Info,
  RotateCcw,
  ShieldCheck,
  Upload,
  WifiOff,
} from "lucide-react";
import type { Ticket } from "../domain/types";
import { formatWaktu } from "../domain/dates";
import { ukuranReadable } from "../data/backup";
import { ukuranData } from "../data/storage";
import { ringkasCsv } from "../data/csv";
import { bacaStatusOffline } from "../offline";
import { Tombol } from "../ui";

export interface DataPageProps {
  tiket: Ticket[];
  hariIni: string;
  masihDemo: boolean;
  tersimpanPada: string | null;
  galatMuat: string | null;
  galatSimpan: string | null;
  onEksporCsv: () => void;
  onEksporJson: () => void;
  onImpor: (file: File) => void;
  onPulihkan: () => void;
  onBuat: () => void;
}

export function DataPage({
  tiket,
  hariIni,
  masihDemo,
  tersimpanPada,
  galatMuat,
  galatSimpan,
  onEksporCsv,
  onEksporJson,
  onImpor,
  onPulihkan,
  onBuat,
}: DataPageProps): ReactNode {
  const inputBerkas = useRef<HTMLInputElement>(null);
  const [namaBerkas, setNamaBerkas] = useState<string | null>(null);
  const [offline, setOffline] = useState(() => bacaStatusOffline());

  // Status offline berubah saat koneksi putus/nyala; service worker juga
  // bisa selesai memegang kontrol setelah komponen ini terpasang.
  useEffect(() => {
    const perbarui = () => setOffline(bacaStatusOffline());
    perbarui();
    const timer = window.setTimeout(perbarui, 1500);
    window.addEventListener("online", perbarui);
    window.addEventListener("offline", perbarui);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("online", perbarui);
      window.removeEventListener("offline", perbarui);
    };
  }, []);

  const catatanOffline = offline.tanpaJaringan
    ? "Tanpa koneksi — aplikasi tetap terbuka dari cache"
    : offline.terdaftar
      ? "Siap dipakai tanpa koneksi"
      : offline.didukung && offline.produksi
        ? "Menyiapkan dukungan offline…"
        : offline.didukung
          ? "Aktif pada build produksi (npm run build)"
          : "Tidak tersedia pada peramban ini";

  return (
    <div className="halaman">
      <section className="panel">
        <div className="panel-kepala">
          <div>
            <h2 className="t-title">Penyimpanan lokal</h2>
            <p className="t-lede" style={{ marginTop: 4 }}>
              JobTrack memakai localStorage browser. Tidak ada server, akun, atau layanan
              berbayar — data hanya ada di peramban ini.
            </p>
          </div>
        </div>

        <div>
          <div className="baris-angka">
            <dt>Jumlah tiket</dt>
            <dd>{tiket.length}</dd>
          </div>
          <div className="baris-angka">
            <dt>Ukuran data</dt>
            <dd>{ukuranReadable(ukuranData(tiket))}</dd>
          </div>
          <div className="baris-angka">
            <dt>Terakhir disimpan</dt>
            <dd>{tersimpanPada ? formatWaktu(tersimpanPada) : "baru dimuat"}</dd>
          </div>
          <div className="baris-angka">
            <dt>Status data</dt>
            <dd>{masihDemo ? "Data demo contoh" : "Data Anda sendiri"}</dd>
          </div>
          <div className="baris-angka">
            <dt>Mode offline</dt>
            <dd data-nada={offline.tanpaJaringan ? "waspada" : offline.terdaftar ? "aksen" : undefined}>
              {catatanOffline}
            </dd>
          </div>
        </div>

        {offline.tanpaJaringan ? (
          <div className="banner" data-nada="waspada" style={{ marginTop: "var(--s-4)" }}>
            <WifiOff size={16} aria-hidden="true" />
            <span className="banner-isi">
              Koneksi sedang putus. JobTrack tetap bisa dipakai dan data tiket Anda tetap
              tersimpan di peramban ini.
            </span>
          </div>
        ) : null}

        {masihDemo ? (
          <div className="banner" data-nada="aksen" style={{ marginTop: "var(--s-4)" }}>
            <Database size={16} aria-hidden="true" />
            <span className="banner-isi">
              Isi aplikasi masih <strong>data contoh</strong> ({tiket.length} tiket bertema bengkel
              servis). Semua angka di dasbor, daftar, dan nota berasal dari data itu. Buat
              tiket untuk beralih ke data Anda sendiri.
            </span>
            <Tombol ukuran="kecil" variasi="aksen" onClick={onBuat}>
              Buat tiket
            </Tombol>
          </div>
        ) : null}

        {galatSimpan ? (
          <div className="banner" data-nada="bahaya" style={{ marginTop: "var(--s-3)" }} role="alert">
            <Info size={16} aria-hidden="true" />
            <span className="banner-isi">{galatSimpan}</span>
          </div>
        ) : null}
        {galatMuat ? (
          <div className="banner" data-nada="waspada" style={{ marginTop: "var(--s-3)" }}>
            <Info size={16} aria-hidden="true" />
            <span className="banner-isi">{galatMuat}</span>
          </div>
        ) : null}
      </section>

      <div className="kisi-2" style={{ alignItems: "start" }}>
        <section className="panel">
          <div className="panel-kepala">
            <div>
              <h2>Ekspor</h2>
              <p>Unduh salinan data untuk arsip atau dipindahkan ke peramban lain.</p>
            </div>
          </div>

          <div className="daftar-aksi">
            <button
              type="button"
              className="kartu-aksi"
              onClick={onEksporCsv}
              disabled={tiket.length === 0}
              title={tiket.length === 0 ? "Tidak ada tiket untuk diekspor" : "Unduh CSV untuk Excel"}
            >
              <span className="kartu-aksi-ikon">
                <FileSpreadsheet size={16} aria-hidden="true" />
              </span>
              <span className="kartu-aksi-teks">
                <strong>Ekspor CSV</strong>
                <span>Seluruh tiket, pemisah titik koma + UTF-8 — langsung rapi di Excel.</span>
                <span className="t-faint">{ringkasCsv(tiket, hariIni)}</span>
              </span>
              <Download size={15} className="t-faint" aria-hidden="true" />
            </button>

            <button
              type="button"
              className="kartu-aksi"
              onClick={onEksporJson}
              disabled={tiket.length === 0}
              title={tiket.length === 0 ? "Tidak ada tiket untuk dicadangkan" : "Unduh cadangan JSON"}
            >
              <span className="kartu-aksi-ikon">
                <FileJson size={16} aria-hidden="true" />
              </span>
              <span className="kartu-aksi-teks">
                <strong>Ekspor cadangan JSON</strong>
                <span>Berkas lengkap yang bisa diimpor kembali kapan saja.</span>
              </span>
              <Download size={15} className="t-faint" aria-hidden="true" />
            </button>
          </div>
        </section>

        <section className="panel">
          <div className="panel-kepala">
            <div>
              <h2>Impor &amp; pulihkan</h2>
              <p>Berkas JSON yang tidak valid tidak akan menghapus data yang ada.</p>
            </div>
          </div>

          <div className="daftar-aksi">
            <button
              type="button"
              className="kartu-aksi"
              onClick={() => inputBerkas.current?.click()}
              title="Pilih berkas cadangan JSON"
            >
              <span className="kartu-aksi-ikon">
                <Upload size={16} aria-hidden="true" />
              </span>
              <span className="kartu-aksi-teks">
                <strong>Impor cadangan JSON</strong>
                <span>
                  {namaBerkas
                    ? `Berkas terakhir: ${namaBerkas}`
                    : "Setiap tiket diperiksa dulu sebelum data diganti."}
                </span>
              </span>
            </button>
            <input
              ref={inputBerkas}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setNamaBerkas(file.name);
                  onImpor(file);
                }
                e.target.value = "";
              }}
            />

            <button
              type="button"
              className="kartu-aksi"
              data-nada="bahaya"
              onClick={onPulihkan}
              title="Pulihkan data contoh awal (dengan konfirmasi)"
            >
              <span className="kartu-aksi-ikon">
                <RotateCcw size={16} aria-hidden="true" />
              </span>
              <span className="kartu-aksi-teks">
                <strong>Reset ke data demo</strong>
                <span>Menghapus seluruh perubahan lokal dan memuat ulang data contoh.</span>
              </span>
            </button>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-kepala">
          <div>
            <h2>Batasan aplikasi ini</h2>
            <p>JobTrack adalah demo portfolio SatuArah Labs, bukan produk produksi.</p>
          </div>
          <ShieldCheck size={18} className="t-faint" aria-hidden="true" />
        </div>
        <ul className="t-lede" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <li>Data hanya tersimpan di peramban ini — membersihkan data situs akan menghapusnya.</li>
          <li>Tidak ada akun, login, atau mode multi-pengguna.</li>
          <li>Tidak ada pembayaran, faktur pajak, atau integrasi WhatsApp/email otomatis.</li>
          <li>Cetak memakai dialog print bawaan peramban; simpan sebagai PDF dari sana bila perlu.</li>
        </ul>
      </section>
    </div>
  );
}
