/**
 * Ekspor CSV daftar tiket.
 *
 * Pemisah titik koma + BOM UTF-8 supaya Microsoft Excel versi Indonesia
 * langsung menampilkan rupiah dan nama Indonesia dengan benar.
 */

import type { Ticket } from "../domain/types";
import { formatTanggal } from "../domain/dates";
import { rupiah } from "../domain/money";
import {
  hariMenungguPengambilan,
  hariTinggal,
  lewatTenggat,
  sisaTagihan,
} from "../domain/ticket";
import { labelStatus } from "../domain/status";
import { META_PRIORITAS } from "../domain/status";

const PEMISAH = ";";
const BOM = "\uFEFF";

export interface KolomCsv {
  judul: string;
  nilai: (t: Ticket, hariIniISO: string) => string;
}

export const KOLOM_CSV: KolomCsv[] = [
  { judul: "Nomor Tiket", nilai: (t) => t.nomor },
  { judul: "Pelanggan", nilai: (t) => t.pelanggan },
  { judul: "Telepon", nilai: (t) => t.telepon },
  { judul: "Perangkat", nilai: (t) => t.perangkat },
  { judul: "Kategori", nilai: (t) => t.kategori },
  { judul: "Deskripsi Pekerjaan", nilai: (t) => t.deskripsi },
  { judul: "Status", nilai: (t) => labelStatus(t.status) },
  { judul: "Prioritas", nilai: (t) => META_PRIORITAS[t.prioritas].label },
  { judul: "Tanggal Masuk", nilai: (t) => t.tanggalMasuk },
  { judul: "Tenggat", nilai: (t) => t.tenggat },
  { judul: "Status Tenggat", nilai: (t, hari) => (lewatTenggat(t, hari) ? "Terlambat" : "Sesuai jadwal") },
  { judul: "Sisa Hari ke Tenggat", nilai: (t, hari) => String(hariTinggal(t, hari)) },
  { judul: "Menunggu Diambil (hari)", nilai: (t, hari) => String(hariMenungguPengambilan(t, hari)) },
  { judul: "Biaya Estimasi (IDR)", nilai: (t) => String(t.estimasi) },
  { judul: "DP (IDR)", nilai: (t) => String(t.dp) },
  { judul: "Sisa Tagihan (IDR)", nilai: (t) => String(sisaTagihan(t)) },
  { judul: "Catatan Internal", nilai: (t) => t.catatanInternal },
];

function selKolom(nilai: string): string {
  const bersih = nilai.replace(/\s+/g, " ").trim();
  if (/[";\n\r]/.test(bersih)) return `"${bersih.replace(/"/g, '""')}"`;
  return bersih;
}

export function buatCsv(tiket: Ticket[], hariIniISO: string): string {
  const kepala = KOLOM_CSV.map((k) => selKolom(k.judul)).join(PEMISAH);
  const baris = tiket.map((t) =>
    KOLOM_CSV.map((k) => selKolom(k.nilai(t, hariIniISO))).join(PEMISAH),
  );
  return BOM + [kepala, ...baris].join("\r\n") + "\r\n";
}

export function ringkasCsv(tiket: Ticket[], hariIniISO: string): string {
  const estimasi = tiket.reduce((n, t) => n + t.estimasi, 0);
  const sisa = tiket.reduce((n, t) => n + sisaTagihan(t), 0);
  const terlambat = tiket.filter((t) => lewatTenggat(t, hariIniISO)).length;
  return `${tiket.length} tiket · ${rupiah(estimasi)} estimasi · ${rupiah(
    sisa,
  )} sisa tagihan · ${terlambat} terlambat`;
}

export function namaBerkasCsv(hariIniISO: string): string {
  return `jobtrack-tiket-${hariIniISO}.csv`;
}

export { formatTanggal };
