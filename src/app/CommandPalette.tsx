/**
 * Palet perintah (Ctrl + K).
 *
 * Satu pintu untuk semua aksi: buat tiket, buka tiket apa pun, ganti filter,
 * ekspor, cetak, tema, pintasan, dan reset demo. Dipilih dengan pencocokan
 * sederhana berbasis posisi (kata yang muncul lebih depan mendapat skor lebih
 * tinggi), operasional penuh dengan keyboard.
 */

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Clock3,
  Database,
  Download,
  FileDown,
  Gauge,
  Keyboard,
  LayoutDashboard,
  Moon,
  Palette,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Sun,
  SunMoon,
  Undo2,
} from "lucide-react";
import type { FilterTiket, Status, Ticket } from "../domain/types";
import { sisaTagihan } from "../domain/ticket";
import { labelStatus, URUTAN_STATUS } from "../domain/status";
import { rupiah } from "../domain/money";
import { TombolIkon } from "../ui";
import { TOMBOL_DIALOG_PALET } from "../ui/shortcuts";

export interface Perintah {
  id: string;
  judul: string;
  sub?: string;
  grup: "Aksi" | "Pindah" | "Status" | "Data" | "Tampilan";
  ikon: ReactNode;
  pintasan?: string[];
  /** Teks tambahan untuk pencarian. */
  kataKunci?: string;
  jalankan: () => void;
}

export interface OpsiPalet {
  buka: boolean;
  tutup: () => void;
  tiket: Ticket[];
  onPindahFilter: (filter: Partial<FilterTiket>) => void;
  onBukaTiket: (id: string) => void;
  onBuat: () => void;
  onEksporCsv: () => void;
  onCetakDaftar: () => void;
  onEksporJson: () => void;
  onPulihkan: () => void;
  onUndo: () => void;
  onBukaBantuan: () => void;
  temaPref: "terang" | "gelap" | "sistem";
  onSiklusTema: () => void;
  bisaUrungkan: boolean;
}

/** Pencocokan sederhana: cocok penuh di awal skor tertinggi, lalu subsequence. */
export function skorCocok(teks: string, kueri: string): number {
  if (kueri.trim().length === 0) return 1;
  const t = teks.toLowerCase();
  const q = kueri.toLowerCase().trim();
  const posisi = t.indexOf(q);
  if (posisi === 0) return 1000 - t.length * 0.1;
  if (posisi > 0) return 700 - posisi;

  let i = 0;
  let skor = 0;
  for (const huruf of q) {
    const ketemu = t.indexOf(huruf, i);
    if (ketemu === -1) return 0;
    skor += 10 - Math.min(9, ketemu - i);
    i = ketemu + 1;
  }
  return skor;
}

export function PaletPerintah({
  buka,
  tutup,
  tiket,
  onPindahFilter,
  onBukaTiket,
  onBuat,
  onEksporCsv,
  onCetakDaftar,
  onEksporJson,
  onPulihkan,
  onUndo,
  onBukaBantuan,
  temaPref,
  onSiklusTema,
  bisaUrungkan,
}: OpsiPalet): ReactNode {
  const [kueri, setKueri] = useState("");
  const [aktif, setAktif] = useState(0);

  useEffect(() => {
    if (buka) {
      setKueri("");
      setAktif(0);
    }
  }, [buka]);

  const perintahTiket = useMemo<Perintah[]>(
    () =>
      [...tiket]
        .sort((a, b) => b.diubahPada.localeCompare(a.diubahPada))
        .slice(0, 400)
        .map((t) => ({
          id: `buka:${t.id}`,
          judul: `${t.nomor} · ${t.pelanggan}`,
          sub: `${labelStatus(t.status)} · ${t.perangkat} · sisa ${rupiah(sisaTagihan(t))}`,
          grup: "Aksi" as const,
          ikon: <Gauge size={15} aria-hidden="true" />,
          kataKunci: `${t.nomor} ${t.pelanggan} ${t.perangkat} ${t.telepon} ${t.kategori}`,
          jalankan: () => {
            onBukaTiket(t.id);
          },
        })),
    // onBukaTiket sengaja tidak jadi dependensi: sudah stabil (useCallback di App).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tiket],
  );

  const perintah = useMemo<Perintah[]>(
    () => [
      {
        id: "buat",
        judul: "Buat tiket baru",
        sub: "Terima pekerjaan baru dari pelanggan",
        grup: "Aksi",
        ikon: <Plus size={15} aria-hidden="true" />,
        pintasan: ["N"],
        kataKunci: "tambah tiket baru pekerjaan terima servis",
        jalankan: onBuat,
      },
      ...perintahTiket,
      ...URUTAN_STATUS.map((status) => ({
        id: `filter:${status}`,
        judul: `Tampilkan yang ${labelStatus(status).toLowerCase()}`,
        grup: "Status" as const,
        ikon: <Gauge size={15} aria-hidden="true" />,
        kataKunci: `filter status ${status}`,
        jalankan: () => onPindahFilter({ status: status as Status, terlambat: false }),
      })),
      {
        id: "filter:terlambat",
        judul: "Tampilkan yang terlambat",
        sub: "Tenggat sudah lewat dan belum ditutup",
        grup: "Status",
        ikon: <Clock3 size={15} aria-hidden="true" />,
        kataKunci: "lewat tenggat terlambat telat urgent",
        jalankan: () => onPindahFilter({ terlambat: true, status: "semua" }),
      },
      {
        id: "nav:dasbor",
        judul: "Buka Dasbor",
        grup: "Pindah",
        ikon: <LayoutDashboard size={15} aria-hidden="true" />,
        pintasan: ["Ctrl", "G"],
        kataKunci: "ringkasan beranda papan kerja",
        jalankan: () => {
          window.location.hash = "#/";
          tutup();
        },
      },
      {
        id: "nav:tiket",
        judul: "Buka Daftar Tiket",
        grup: "Pindah",
        ikon: <Gauge size={15} aria-hidden="true" />,
        pintasan: ["Ctrl", "T"],
        kataKunci: "daftar semua pekerjaan cari filter",
        jalankan: () => {
          window.location.hash = "#/tiket";
          tutup();
        },
      },
      {
        id: "nav:data",
        judul: "Buka Data & Cadangan",
        grup: "Pindah",
        ikon: <Database size={15} aria-hidden="true" />,
        pintasan: ["Ctrl", "B"],
        kataKunci: "ekspor impor reset pengaturan penyimpanan",
        jalankan: () => {
          window.location.hash = "#/data";
          tutup();
        },
      },
      {
        id: "csv",
        judul: "Ekspor daftar ke CSV",
        sub: "Siap dibuka di Excel (pemisah titik koma)",
        grup: "Data",
        ikon: <FileDown size={15} aria-hidden="true" />,
        kataKunci: "ekspor excel csv unduh arsip",
        jalankan: () => {
          onEksporCsv();
          tutup();
        },
      },
      {
        id: "json",
        judul: "Ekspor cadangan JSON",
        sub: "Dapat diimpor kembali kapan saja",
        grup: "Data",
        ikon: <Download size={15} aria-hidden="true" />,
        kataKunci: "cadangan backup json unduh manajemen",
        jalankan: () => {
          onEksporJson();
          tutup();
        },
      },
      {
        id: "cetak",
        judul: "Cetak daftar tiket",
        grup: "Data",
        ikon: <Printer size={15} aria-hidden="true" />,
        kataKunci: "cetak print daftar pdf",
        jalankan: () => {
          onCetakDaftar();
          tutup();
        },
      },
      ...(bisaUrungkan
        ? [
            {
              id: "undo",
              judul: "Urungkan perubahan terakhir",
              grup: "Aksi" as const,
              ikon: <Undo2 size={15} aria-hidden="true" />,
              pintasan: ["Ctrl", "Z"],
              kataKunci: "undo batal urungkan kembali",
              jalankan: () => {
                onUndo();
                tutup();
              },
            },
          ]
        : []),
      {
        id: "tema",
        judul:
          temaPref === "terang"
            ? "Ganti ke mode gelap"
              : temaPref === "gelap"
                ? "Ikuti tampilan sistem"
                : "Ganti ke mode terang",
        grup: "Tampilan",
        ikon:
          temaPref === "terang" ? (
            <Moon size={15} aria-hidden="true" />
          ) : temaPref === "gelap" ? (
            <SunMoon size={15} aria-hidden="true" />
          ) : (
            <Sun size={15} aria-hidden="true" />
          ),
        kataKunci: "tema gelap terang mode tampilan malam",
        jalankan: () => {
          onSiklusTema();
          tutup();
        },
      },
      {
        id: "bantuan",
        judul: "Lihat pintasan keyboard",
        sub: TOMBOL_DIALOG_PALET,
        grup: "Tampilan",
        ikon: <Keyboard size={15} aria-hidden="true" />,
        pintasan: ["?"],
        kataKunci: "bantuan pintasan keyboard help shortcut",
        jalankan: () => {
          onBukaBantuan();
          tutup();
        },
      },
      {
        id: "reset",
        judul: "Pulihkan data demo",
        sub: "Menghapus semua perubahan lokal",
        grup: "Data",
        ikon: <RotateCcw size={15} aria-hidden="true" />,
        kataKunci: "reset demo pulihkan contoh awal",
        jalankan: () => {
          tutup();
          onPulihkan();
        },
      },
    ],
    [
      perintahTiket,
      onBuat,
      onPindahFilter,
      onEksporCsv,
      onEksporJson,
      onCetakDaftar,
      onPulihkan,
      onUndo,
      onBukaBantuan,
      temaPref,
      onSiklusTema,
      bisaUrungkan,
      tutup,
    ],
  );

  const hasil = useMemo(() => {
    return perintah
      .map((p) => ({
        p,
        skor: Math.max(
          skorCocok(p.judul, kueri),
          p.kataKunci ? skorCocok(p.kataKunci, kueri) * 0.8 : 0,
        ),
      }))
      .filter((item) => item.skor > 0)
      .sort((a, b) => b.skor - a.skor)
      .map((item) => item.p)
      .slice(0, 40);
  }, [perintah, kueri]);

  useEffect(() => {
    setAktif((n) => Math.min(n, Math.max(0, hasil.length - 1)));
  }, [hasil.length]);

  /** Jalankan perintah lalu tutup palet — semua perintah memindahkan konteks. */
  function jalankan(p: Perintah) {
    p.jalankan();
    tutup();
  }

  if (!buka) return null;

  return createPortal(
    <div
      className="palet"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) tutup();
      }}
    >
      <div
        className="palet-kotak"
        role="dialog"
        aria-modal="true"
        aria-label="Palet perintah"
        aria-keyshortcuts="Control+K"
      >
        <div className="palet-cari">
          <Search size={16} className="t-faint" aria-hidden="true" />
          <input
            autoFocus
            value={kueri}
            placeholder="Cari tiket, pelanggan, atau aksi…"
            aria-label="Cari perintah"
            onChange={(e) => {
              setKueri(e.target.value);
              setAktif(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setAktif((n) => Math.min(n + 1, hasil.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setAktif((n) => Math.max(n - 1, 0));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const p = hasil[aktif];
                if (p) jalankan(p);
              } else if (e.key === "Escape") {
                e.preventDefault();
                tutup();
              }
            }}
          />
          <span className="kbd">Esc</span>
        </div>

        <div className="palet-daftar">
          {hasil.length === 0 ? (
            <p className="t-lede" style={{ padding: "var(--s-4)" }}>
              Tidak ada yang cocok dengan “{kueri}”.
            </p>
          ) : (
            hasil.map((p, i) => {
              const tampilGrup = i === 0 || hasil[i - 1].grup !== p.grup;
              return (
                <div key={p.id}>
                  {tampilGrup ? (
                    <div className="t-eyebrow palet-grup">{p.grup}</div>
                  ) : null}
                  <button
                    type="button"
                    className="palet-item"
                    data-aktif={i === aktif}
                    onMouseEnter={() => setAktif(i)}
                    onClick={() => jalankan(p)}
                  >
                    <span className="palet-item-ikon">{p.ikon}</span>
                    <span className="palet-item-teks">
                      <strong>{p.judul}</strong>
                      {p.sub ? <span>{p.sub}</span> : null}
                    </span>
                    {p.pintasan ? <span className="kbd">{p.pintasan.join(" ")}</span> : null}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="palet-kaki">
          <span className="t-eyebrow">JobTrack</span>
          <span>↑↓ untuk memilih</span>
          <span>Enter untuk menjalankan</span>
          <span>Esc untuk menutup</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function TombolPalet({ onKlik }: { onKlik: () => void }): ReactNode {
  return (
    <TombolIkon
      label="Buka palet perintah (Ctrl+K)"
      ikon={<Palette size={16} aria-hidden="true" />}
      onClick={onKlik}
    />
  );
}
