/**
 * JobTrack — model domain.
 *
 * Semua nilai uang adalah integer rupiah (tidak ada pecahan sen) dan semua
 * tanggal dibuat lokal ("yyyy-mm-dd") agar tidak bergeser karena zona waktu.
 */

/** Status alur pekerjaan (workflow). */
export const DAFTAR_STATUS = [
  "baru",
  "diperiksa",
  "dikerjakan",
  "menunggu",
  "siap_diambil",
  "selesai",
  "dibatalkan",
] as const;

export type Status = (typeof DAFTAR_STATUS)[number];

/** Tingkat prioritas pekerjaan. */
export const DAFTAR_PRIORITAS = ["rendah", "normal", "tinggi", "darurat"] as const;

export type Priority = (typeof DAFTAR_PRIORITAS)[number];

/** Alias Bahasa Indonesia yang dipakai di seluruh lapisan domain. */
export type Prioritas = Priority;

export type JenisEvent = "dibuat" | "status" | "catatan" | "pembaruan";

export interface TimelineEvent {
  id: string;
  /** Timestamp lokal "yyyy-mm-ddTHH:mm:ss". */
  at: string;
  jenis: JenisEvent;
  pesan: string;
  dari?: Status;
  ke?: Status;
}

export interface CatatanKerja {
  id: string;
  at: string;
  teks: string;
}

export interface Ticket {
  id: string;
  nomor: string;
  pelanggan: string;
  telepon: string;
  /** Nama item/perangkat yang dikerjakan. */
  perangkat: string;
  /** Kategori dari katalog servis (mis. "Laptop", "Printer"). */
  kategori: string;
  deskripsi: string;
  prioritas: Priority;
  status: Status;
  tanggalMasuk: string;
  tenggat: string;
  estimasi: number;
  dp: number;
  catatanInternal: string;
  catatanKerja: CatatanKerja[];
  timeline: TimelineEvent[];
  dibuatPada: string;
  diubahPada: string;
}

/** Nilai form (tanpa field yang dikelola aplikasi). */
export interface DraftTiket {
  pelanggan: string;
  telepon: string;
  perangkat: string;
  kategori: string;
  deskripsi: string;
  prioritas: Priority;
  status: Status;
  tanggalMasuk: string;
  tenggat: string;
  estimasi: number;
  dp: number;
  catatanInternal: string;
}

export type Urutan = "tenggat" | "terbaru" | "prioritas" | "nomor" | "biaya";

export interface FilterTiket {
  cari: string;
  status: Status | "semua";
  prioritas: Priority | "semua";
  /** Batasi hanya pekerjaan yang lewat tenggat. */
  terlambat: boolean;
  /** Batasi hanya yang belum diambil pelanggan lebih dari N hari. */
  menungguPengambilan?: number;
  urut: Urutan;
  arah: "naik" | "turun";
}

export interface TampilanTersimpan {
  id: string;
  nama: string;
  filter: Partial<FilterTiket>;
  bawaan: boolean;
}

/** Kondisi pekerjaan menurut tenggat & status. */
export type Kesehatan = "sehat" | "perlu_perhatian" | "kritis" | "ditutup";

/** Wawasan otomatis yang dihitung dari data (tanpa server). */
export interface Wawasan {
  id: string;
  nada: "bahaya" | "waspada" | "aksen" | "sukses";
  judul: string;
  detail: string;
  /** Tindakan sekali klik (filter atau perubahan status massal). */
  aksi?: { label: string; filter: Partial<FilterTiket> };
  urut: number;
}

export type Tema = "terang" | "gelap";

/** Payload localStorage yang sudah tervalidasi. */
export interface DataTersimpan {
  app: "jobtrack";
  skemaVersi: number;
  tiket: Ticket[];
  masihDemo: boolean;
  tersimpanPada: string;
  tampilan: TampilanTersimpan[];
  tema: Tema | "sistem";
}

/** Berkas cadangan JSON hasil ekspor. */
export interface BerkasCadangan {
  app: "jobtrack";
  skemaVersi: number;
  dieksporPada: string;
  jumlahTiket: number;
  tiket: Ticket[];
}

export function draftDariTiket(ticket: Ticket): DraftTiket {
  return {
    pelanggan: ticket.pelanggan,
    telepon: ticket.telepon,
    perangkat: ticket.perangkat,
    kategori: ticket.kategori,
    deskripsi: ticket.deskripsi,
    prioritas: ticket.prioritas,
    status: ticket.status,
    tanggalMasuk: ticket.tanggalMasuk,
    tenggat: ticket.tenggat,
    estimasi: ticket.estimasi,
    dp: ticket.dp,
    catatanInternal: ticket.catatanInternal,
  };
}

export function draftKosong(hariIni: string): DraftTiket {
  return {
    pelanggan: "",
    telepon: "",
    perangkat: "",
    kategori: "",
    deskripsi: "",
    prioritas: "normal",
    status: "baru",
    tanggalMasuk: hariIni,
    tenggat: hariIni,
    estimasi: 0,
    dp: 0,
    catatanInternal: "",
  };
}
