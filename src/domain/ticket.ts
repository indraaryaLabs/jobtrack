/**
 * Aturan bisnis tiket — fungsi murni tanpa React & tanpa localStorage.
 *
 * Aturan kunci (PRD bagian 3):
 *  - Tenggat sebelum hari ini dan status bukan Selesai/Dibatalkan => terlambat.
 *  - Timeline hanya ditambahkan; entri lama tidak pernah ditulis ulang.
 *  - Sisa tagihan = estimasi - DP dan tidak pernah negatif.
 */

import type {
  DraftTiket,
  FilterTiket,
  Prioritas,
  Status,
  Ticket,
  TimelineEvent,
  Urutan,
} from "./types";
import { DAFTAR_PRIORITAS, DAFTAR_STATUS } from "./types";
import { keTimestamp, selisihHari } from "./dates";
import { rupiah } from "./money";
import { labelStatus, rankPrioritas, statusDitutup } from "./status";

let penghitungId = 0;

/** Id lokal, tanpa jaringan. */
export function idBaru(awalan: string): string {
  penghitungId += 1;
  const acak =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${awalan}_${acak}${penghitungId.toString(36)}`;
}

/* ------------------------------------------------------------------ *
 * Nomor tiket otomatis
 * ------------------------------------------------------------------ */

export function nomorBerikutnya(tiket: Ticket[], hariIniISO: string): string {
  const tahun = hariIniISO.slice(0, 4);
  const pola = new RegExp(`^TKT-${tahun}-(\\d{4,})$`);
  let tertinggi = 0;
  for (const t of tiket) {
    const cocok = pola.exec(t.nomor);
    if (cocok) tertinggi = Math.max(tertinggi, Number(cocok[1]));
  }
  return `TKT-${tahun}-${String(tertinggi + 1).padStart(4, "0")}`;
}

/* ------------------------------------------------------------------ *
 * Penyusunan & perubahan tiket
 * ------------------------------------------------------------------ */

const LABEL_FIELD: Record<string, string> = {
  pelanggan: "Pelanggan",
  telepon: "Telepon",
  perangkat: "Perangkat",
  kategori: "Kategori",
  deskripsi: "Deskripsi",
  prioritas: "Prioritas",
  status: "Status",
  tanggalMasuk: "Tanggal masuk",
  tenggat: "Tenggat",
  estimasi: "Biaya estimasi",
  dp: "DP",
  catatanInternal: "Catatan internal",
};

export interface OpsiBuat {
  now: Date;
  nomor: string;
  id?: string;
}

export function buatTiket(draft: DraftTiket, opsi: OpsiBuat): Ticket {
  const at = keTimestamp(opsi.now.getTime());
  return {
    id: opsi.id ?? idBaru("tkt"),
    nomor: opsi.nomor,
    pelanggan: draft.pelanggan,
    telepon: draft.telepon,
    perangkat: draft.perangkat,
    kategori: draft.kategori,
    deskripsi: draft.deskripsi,
    prioritas: draft.prioritas,
    status: draft.status,
    tanggalMasuk: draft.tanggalMasuk,
    tenggat: draft.tenggat,
    estimasi: draft.estimasi,
    dp: draft.dp,
    catatanInternal: draft.catatanInternal,
    catatanKerja: [],
    timeline: [
      {
        id: idBaru("ev"),
        at,
        jenis: "dibuat",
        pesan: `Tiket dibuat dengan status ${labelStatus(draft.status)}`,
      },
    ],
    dibuatPada: at,
    diubahPada: at,
  };
}

/** Menambah event status di akhir timeline (tidak mengubah entri lama). */
export function ubahStatus(
  ticket: Ticket,
  ke: Status,
  opsi: { now: Date; id?: string; catatan?: string },
): Ticket {
  const at = keTimestamp(opsi.now.getTime());
  const tambahan = opsi.catatan?.trim() ? ` — ${opsi.catatan.trim()}` : "";
  return {
    ...ticket,
    status: ke,
    diubahPada: at,
    timeline: [
      ...ticket.timeline,
      {
        id: opsi.id ?? idBaru("ev"),
        at,
        jenis: "status",
        pesan: `Status ${labelStatus(ticket.status)} → ${labelStatus(ke)}${tambahan}`,
        dari: ticket.status,
        ke,
      },
    ],
  };
}

export function tambahCatatan(
  ticket: Ticket,
  teks: string,
  opsi: { now: Date; id?: string },
): Ticket {
  const at = keTimestamp(opsi.now.getTime());
  const bersih = teks.trim();
  const cuplikan = bersih.length > 60 ? `${bersih.slice(0, 57)}…` : bersih;
  return {
    ...ticket,
    diubahPada: at,
    catatanKerja: [
      ...ticket.catatanKerja,
      { id: opsi.id ?? idBaru("ctt"), at, teks: bersih },
    ],
    timeline: [
      ...ticket.timeline,
      {
        id: idBaru("ev"),
        at,
        jenis: "catatan",
        pesan: `Catatan pengerjaan ditambahkan: "${cuplikan}"`,
      },
    ],
  };
}

export interface HasilUbah {
  ticket: Ticket;
  perubahan: string[];
  statusBerubah: boolean;
}

/**
 * Menerapkan hasil edit form. Timeline lama tetap utuh; hanya event baru
 * yang ditambahkan, sehingga riwayat tidak pernah ditulis ulang.
 */
export function terapkanDraft(
  ticket: Ticket,
  draft: DraftTiket,
  opsi: { now: Date; id?: string },
): HasilUbah {
  const at = keTimestamp(opsi.now.getTime());
  const fields = Object.keys(LABEL_FIELD) as (keyof DraftTiket)[];
  const perubahan: string[] = [];
  for (const f of fields) {
    if (ticket[f] !== draft[f]) perubahan.push(LABEL_FIELD[f]);
  }

  const statusBerubah = ticket.status !== draft.status;
  const timeline: TimelineEvent[] = [...ticket.timeline];

  if (statusBerubah) {
    timeline.push({
      id: opsi.id ?? idBaru("ev"),
      at,
      jenis: "status",
      pesan: `Status ${labelStatus(ticket.status)} → ${labelStatus(draft.status)}`,
      dari: ticket.status,
      ke: draft.status,
    });
  }

  const data = perubahan.filter((label) => label !== LABEL_FIELD.status);
  if (data.length > 0) {
    timeline.push({
      id: idBaru("ev"),
      at,
      jenis: "pembaruan",
      pesan: `Data diperbarui: ${data.join(", ")}`,
    });
  }

  return {
    ticket: { ...ticket, ...draft, diubahPada: at, timeline },
    perubahan,
    statusBerubah,
  };
}

/* ------------------------------------------------------------------ *
 * Aturan keterlambatan, sisa tagihan, umur
 * ------------------------------------------------------------------ */

/** Telambat bila tenggat lewat dan tiket belum Selesai/Dibatalkan. */
export function lewatTenggat(ticket: Ticket, hariIniISO: string): boolean {
  if (statusDitutup(ticket.status)) return false;
  return selisihHari(hariIniISO, ticket.tenggat) < 0;
}

/** Hari menuju tenggat (negatif = terlambat). */
export function hariTinggal(ticket: Ticket, hariIniISO: string): number {
  return selisihHari(hariIniISO, ticket.tenggat);
}

/** Sisa tagihan pelanggan, tidak pernah negatif. */
export function sisaTagihan(ticket: Ticket): number {
  return Math.max(0, ticket.estimasi - ticket.dp);
}

export function sudahLunas(ticket: Ticket): boolean {
  return ticket.estimasi > 0 && ticket.dp >= ticket.estimasi;
}

/** Tanggal (yyyy-mm-dd) tiket dinyatakan selesai, atau null. */
export function tanggalSelesai(ticket: Ticket): string | null {
  if (ticket.status !== "selesai") return null;
  for (let i = ticket.timeline.length - 1; i >= 0; i -= 1) {
    const ev = ticket.timeline[i];
    if (ev.jenis === "status" && ev.ke === "selesai") return ev.at.slice(0, 10);
  }
  return ticket.diubahPada.slice(0, 10);
}

export function selesaiBulanIni(ticket: Ticket, hariIniISO: string): boolean {
  const selesai = tanggalSelesai(ticket);
  if (!selesai) return false;
  const a = selesai.slice(0, 7);
  return a === hariIniISO.slice(0, 7);
}

export function aktif(ticket: Ticket): boolean {
  return !statusDitutup(ticket.status);
}

/** Tanggal saat tiket masuk status "Siap Diambil" (untuk mengukur waktu tunggu). */
export function tanggalSiapDiambil(ticket: Ticket): string | null {
  if (ticket.status !== "siap_diambil") return null;
  for (let i = ticket.timeline.length - 1; i >= 0; i -= 1) {
    const ev = ticket.timeline[i];
    if (ev.jenis === "status" && ev.ke === "siap_diambil") return ev.at.slice(0, 10);
  }
  return null;
}

/** Berapa hari unit sudah siap tetapi belum diambil pelanggan. */
export function hariMenungguPengambilan(ticket: Ticket, hariIniISO: string): number {
  const siap = tanggalSiapDiambil(ticket);
  if (!siap) return 0;
  return Math.max(0, selisihHari(siap, hariIniISO));
}

/* ------------------------------------------------------------------ *
 * Metrik dasbor
 * ------------------------------------------------------------------ */

export interface Metrik {
  total: number;
  aktif: number;
  terlambat: number;
  siapDiambil: number;
  menungguAmbil: number;
  selesaiBulanIni: number;
  dibatalkan: number;
  estimasiAktif: number;
  sisaAktif: number;
  totalEstimasi: number;
  totalSisa: number;
  rataTinggalHari: number;
}

export function hitungMetrik(tiket: Ticket[], hariIniISO: string): Metrik {
  const listAktif = tiket.filter(aktif);
  const terlambat = tiket.filter((t) => lewatTenggat(t, hariIniISO));
  const tinggal = listAktif.map((t) => hariTinggal(t, hariIniISO));
  return {
    total: tiket.length,
    aktif: listAktif.length,
    terlambat: terlambat.length,
    siapDiambil: tiket.filter((t) => t.status === "siap_diambil").length,
    menungguAmbil: tiket.filter((t) => hariMenungguPengambilan(t, hariIniISO) >= 2).length,
    selesaiBulanIni: tiket.filter((t) => selesaiBulanIni(t, hariIniISO)).length,
    dibatalkan: tiket.filter((t) => t.status === "dibatalkan").length,
    estimasiAktif: listAktif.reduce((n, t) => n + t.estimasi, 0),
    sisaAktif: listAktif.reduce((n, t) => n + sisaTagihan(t), 0),
    totalEstimasi: tiket.reduce((n, t) => n + t.estimasi, 0),
    totalSisa: tiket.reduce((n, t) => n + sisaTagihan(t), 0),
    rataTinggalHari:
      tinggal.length === 0 ? 0 : Math.round(tinggal.reduce((a, b) => a + b, 0) / tinggal.length),
  };
}

export interface HitungStatus {
  status: Status;
  jumlah: number;
  persen: number;
}

export function hitungPerStatus(tiket: Ticket[]): HitungStatus[] {
  const total = tiket.length;
  return DAFTAR_STATUS.map((status) => {
    const jumlah = tiket.filter((t) => t.status === status).length;
    return { status, jumlah, persen: total === 0 ? 0 : Math.round((jumlah / total) * 100) };
  });
}

/* ------------------------------------------------------------------ *
 * Pencarian, filter, urutan
 * ------------------------------------------------------------------ */

function normal(teks: string): string {
  return teks.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

/** Pencarian longgar: nomor, nama pelanggan, perangkat, telepon. */
export function cocokCari(ticket: Ticket, kueri: string): boolean {
  const q = normal(kueri).trim();
  if (q.length === 0) return true;
  return [ticket.nomor, ticket.pelanggan, ticket.perangkat, ticket.telepon, ticket.kategori].some(
    (f) => normal(f).includes(q),
  );
}

const ARAH_AWAL: Record<Urutan, "naik" | "turun"> = {
  tenggat: "naik",
  terbaru: "turun",
  prioritas: "turun",
  nomor: "turun",
  biaya: "turun",
};

export function arahAwal(kunci: Urutan): "naik" | "turun" {
  return ARAH_AWAL[kunci];
}

function bandingkanNaik(a: Ticket, b: Ticket, kunci: Urutan): number {
  switch (kunci) {
    case "tenggat":
      return a.tenggat.localeCompare(b.tenggat);
    case "terbaru":
      return a.dibuatPada.localeCompare(b.dibuatPada);
    case "prioritas":
      return rankPrioritas(a.prioritas) - rankPrioritas(b.prioritas);
    case "nomor":
      return a.nomor.localeCompare(b.nomor);
    case "biaya":
      return a.estimasi - b.estimasi;
    default:
      return 0;
  }
}

export function urutkan(tiket: Ticket[], kunci: Urutan, arah: "naik" | "turun"): Ticket[] {
  const faktor = arah === "naik" ? 1 : -1;
  return [...tiket].sort((a, b) => {
    // Pekerjaan yang sudah ditutup selalu di akhir saat urut tenggat.
    if (kunci === "tenggat") {
      const aTutup = statusDitutup(a.status) ? 1 : 0;
      const bTutup = statusDitutup(b.status) ? 1 : 0;
      if (aTutup !== bTutup) return aTutup - bTutup;
    }
    const utama = bandingkanNaik(a, b, kunci);
    if (utama !== 0) return utama * faktor;
    return a.nomor.localeCompare(b.nomor);
  });
}

export function filterTiket(
  tiket: Ticket[],
  filter: FilterTiket,
  hariIniISO: string,
): Ticket[] {
  const hasil = tiket.filter((t) => {
    if (!cocokCari(t, filter.cari)) return false;
    if (filter.status !== "semua" && t.status !== filter.status) return false;
    if (filter.prioritas !== "semua" && t.prioritas !== filter.prioritas) return false;
    if (filter.terlambat && !lewatTenggat(t, hariIniISO)) return false;
    if (
      filter.menungguPengambilan !== undefined &&
      hariMenungguPengambilan(t, hariIniISO) < filter.menungguPengambilan
    ) {
      return false;
    }
    return true;
  });
  return urutkan(hasil, filter.urut, filter.arah);
}

export function filterAwal(): FilterTiket {
  return {
    cari: "",
    status: "semua",
    prioritas: "semua",
    terlambat: false,
    urut: "tenggat",
    arah: arahAwal("tenggat"),
  };
}

export function tiketAktifTerdekat(tiket: Ticket[], batas = 6): Ticket[] {
  return urutkan(tiket.filter(aktif), "tenggat", "naik").slice(0, batas);
}

export function tiketTerlambat(tiket: Ticket[], hariIniISO: string): Ticket[] {
  return tiket
    .filter((t) => lewatTenggat(t, hariIniISO))
    .sort((a, b) => hariTinggal(a, hariIniISO) - hariTinggal(b, hariIniISO));
}

/* ------------------------------------------------------------------ *
 * Ringkasan teks (untuk toast, palet perintah, dsb.)
 * ------------------------------------------------------------------ */

export function ringkasTiket(ticket: Ticket): string {
  return `${ticket.nomor} · ${ticket.pelanggan} · ${labelStatus(ticket.status)}`;
}

export function ringkasUang(ticket: Ticket): string {
  return `Estimasi ${rupiah(ticket.estimasi)} · DP ${rupiah(ticket.dp)} · sisa ${rupiah(
    sisaTagihan(ticket),
  )}`;
}

export function daftarPrioritas(): Prioritas[] {
  return [...DAFTAR_PRIORITAS];
}
