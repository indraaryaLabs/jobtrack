/**
 * Definisi alur status, prioritas, dan aturan transisi.
 *
 * Peta transisi menjaga agar alur masuk akal untuk bengkel: pekerjaan tidak
 * bisa "Siap Diambil" sebelum pernah "Dikerjakan", dan tiket yang sudah
 * ditutup tidak bisa diubah statusnya lagi.
 */

import type { Priority, Status } from "./types";

export type Nada = "netral" | "info" | "aksen" | "waspada" | "ungu" | "sukses" | "bahaya";

export interface MetaStatus {
  key: Status;
  label: string;
  labelPendek: string;
  deskripsi: string;
  nada: Nada;
  /** Status penutup: tidak aktif, tidak bisa terlambat, tidak punya transisi. */
  ditutup: boolean;
  /** Letak pada papan status. */
  urutan: number;
}

export const META_STATUS: Record<Status, MetaStatus> = {
  baru: {
    key: "baru",
    label: "Baru",
    labelPendek: "Baru",
    deskripsi: "Pekerjaan baru diterima, belum diperiksa teknisi.",
    nada: "netral",
    ditutup: false,
    urutan: 0,
  },
  diperiksa: {
    key: "diperiksa",
    label: "Diperiksa",
    labelPendek: "Diperiksa",
    deskripsi: "Diagnosis selesai, menunggu dikerjakan.",
    nada: "info",
    ditutup: false,
    urutan: 1,
  },
  dikerjakan: {
    key: "dikerjakan",
    label: "Dikerjakan",
    labelPendek: "Dikerjakan",
    deskripsi: "Sedang dalam proses pengerjaan atau pemasangan.",
    nada: "aksen",
    ditutup: false,
    urutan: 2,
  },
  menunggu: {
    key: "menunggu",
    label: "Menunggu Persetujuan/Komponen",
    labelPendek: "Menunggu",
    deskripsi: "Menunggu konfirmasi pelanggan atau kedatangan komponen.",
    nada: "waspada",
    ditutup: false,
    urutan: 3,
  },
  siap_diambil: {
    key: "siap_diambil",
    label: "Siap Diambil",
    labelPendek: "Siap Diambil",
    deskripsi: "Pekerjaan selesai, menunggu pelanggan mengambil.",
    nada: "ungu",
    ditutup: false,
    urutan: 4,
  },
  selesai: {
    key: "selesai",
    label: "Selesai",
    labelPendek: "Selesai",
    deskripsi: "Pelanggan sudah mengambil unit, tiket ditutup.",
    nada: "sukses",
    ditutup: true,
    urutan: 5,
  },
  dibatalkan: {
    key: "dibatalkan",
    label: "Dibatalkan",
    labelPendek: "Dibatalkan",
    deskripsi: "Pekerjaan dibatalkan dan tidak dilanjutkan.",
    nada: "bahaya",
    ditutup: true,
    urutan: 6,
  },
};

export const URUTAN_STATUS: Status[] = [
  "baru",
  "diperiksa",
  "dikerjakan",
  "menunggu",
  "siap_diambil",
  "selesai",
  "dibatalkan",
];

const TRANSISI: Record<Status, Status[]> = {
  baru: ["diperiksa", "dikerjakan", "dibatalkan"],
  diperiksa: ["dikerjakan", "menunggu", "siap_diambil", "dibatalkan"],
  dikerjakan: ["menunggu", "siap_diambil", "selesai", "dibatalkan"],
  menunggu: ["dikerjakan", "siap_diambil", "dibatalkan"],
  siap_diambil: ["dikerjakan", "selesai", "dibatalkan"],
  selesai: [],
  dibatalkan: [],
};

export function statusDitutup(status: Status): boolean {
  return META_STATUS[status].ditutup;
}

export function transisi(status: Status): Status[] {
  return TRANSISI[status];
}

export function bolehBerpindah(dari: Status, ke: Status): boolean {
  return dari !== ke && TRANSISI[dari].includes(ke);
}

/** Alasan kontrol status dimatikan (null bila masih boleh diubah). */
export function alasanTerkunci(status: Status): string | null {
  if (status === "selesai") return "Tiket sudah Selesai. Buat tiket baru bila ada pekerjaan tambahan.";
  if (status === "dibatalkan") return "Tiket sudah Dibatalkan. Buat tiket baru untuk menerima pekerjaan lagi.";
  return null;
}

/**
 * Alur utama (happy path): Baru → Diperiksa → Dikerjakan → Siap Diambil → Selesai.
 * "Menunggu" bukan jalur utama melainkan kondisi menyimpang (komponen/
 * persetujuan), sehingga tombol aksi cepat tidak menganjurkan operator
 * "menunggu" setelah pekerjaan selesai dikerjakan.
 */
const ALUR_UTAMA: Status[] = ["baru", "diperiksa", "dikerjakan", "siap_diambil", "selesai"];

/**
 * Langkah berikutnya yang paling wajar — dipakai untuk tombol aksi cepat
 * sehingga operator tidak perlu memilih dari daftar panjang.
 */
export function langkahBerikutnya(status: Status): Status | null {
  const sekarang = ALUR_UTAMA.indexOf(status);
  if (status === "menunggu") return TRANSISI.menunggu[0] ?? null;
  if (sekarang < 0) return null;
  const berikut = ALUR_UTAMA[sekarang + 1];
  if (berikut && TRANSISI[status].includes(berikut)) return berikut;
  return null;
}

export interface MetaPrioritas {
  key: Priority;
  label: string;
  nada: Nada;
  rank: number;
  deskripsi: string;
  /** Pengali tenggat otomatis (hari kerja). */
  pengaliTenggat: number;
}

export const META_PRIORITAS: Record<Priority, MetaPrioritas> = {
  rendah: {
    key: "rendah",
    label: "Rendah",
    nada: "netral",
    rank: 0,
    deskripsi: "Bisa ditunda, tidak mengganggu operasional.",
    pengaliTenggat: 1.5,
  },
  normal: {
    key: "normal",
    label: "Normal",
    nada: "info",
    rank: 1,
    deskripsi: "Alur kerja harian yang biasa.",
    pengaliTenggat: 1,
  },
  tinggi: {
    key: "tinggi",
    label: "Tinggi",
    nada: "waspada",
    rank: 2,
    deskripsi: "Penting, perlu diselesaikan hari ini.",
    pengaliTenggat: 0.6,
  },
  darurat: {
    key: "darurat",
    label: "Darurat",
    nada: "bahaya",
    rank: 3,
    deskripsi: "Operasional pelanggan terhenti, kerjakan segera.",
    pengaliTenggat: 0.3,
  },
};

export const URUTAN_PRIORITAS: Priority[] = ["rendah", "normal", "tinggi", "darurat"];

export function rankPrioritas(p: Priority): number {
  return META_PRIORITAS[p].rank;
}

export function labelStatus(status: Status): string {
  return META_STATUS[status].label;
}

export function labelPendekStatus(status: Status): string {
  return META_STATUS[status].labelPendek;
}
