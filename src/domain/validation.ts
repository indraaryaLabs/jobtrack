/**
 * Validasi form tiket + skema data untuk impor.
 *
 * Prinsip: pesan error harus menjelaskan cara memperbaikinya, dan isi form
 * tidak boleh hilang saat submit gagal.
 */

import { DAFTAR_PRIORITAS, DAFTAR_STATUS } from "./types";
import type { DraftTiket, Prioritas, Status, Ticket } from "./types";
import { isoValid, selisihHari, timestampValid } from "./dates";
import { parseRupiah, rupiah } from "./money";

export const BIAYA_MAKS = 999_999_999;

export interface FormTiket {
  pelanggan: string;
  telepon: string;
  perangkat: string;
  kategori: string;
  deskripsi: string;
  prioritas: Prioritas;
  status: Status;
  tanggalMasuk: string;
  tenggat: string;
  estimasi: string;
  dp: string;
  catatanInternal: string;
}

export type KesalahanForm = Partial<Record<keyof FormTiket, string>>;

const POLA_TELEPON = /^\+?[\d\s()-]+$/;

export function draftKeForm(draft: DraftTiket): FormTiket {
  return {
    pelanggan: draft.pelanggan,
    telepon: draft.telepon,
    perangkat: draft.perangkat,
    kategori: draft.kategori,
    deskripsi: draft.deskripsi,
    prioritas: draft.prioritas,
    status: draft.status,
    tanggalMasuk: draft.tanggalMasuk,
    tenggat: draft.tenggat,
    estimasi: draft.estimasi === 0 ? "" : String(draft.estimasi),
    dp: draft.dp === 0 ? "" : String(draft.dp),
    catatanInternal: draft.catatanInternal,
  };
}

function hitungDigit(telepon: string): number {
  return telepon.replace(/\D+/g, "").length;
}

/**
 * Memeriksa seluruh field. Objek kosong berarti form valid.
 * Kolom uang boleh dikosongkan = belum ada estimasi (Rp 0).
 */
export function validasiForm(form: FormTiket, hariIniISO: string): KesalahanForm {
  const e: KesalahanForm = {};

  const pelanggan = form.pelanggan.trim();
  if (pelanggan.length === 0) e.pelanggan = "Nama pelanggan wajib diisi.";
  else if (pelanggan.length < 3) e.pelanggan = "Nama pelanggan minimal 3 karakter.";
  else if (pelanggan.length > 60) e.pelanggan = "Nama pelanggan maksimal 60 karakter.";

  const telepon = form.telepon.trim();
  if (telepon.length > 0) {
    const digit = hitungDigit(telepon);
    if (!POLA_TELEPON.test(telepon) || digit < 8 || digit > 15) {
      e.telepon = "Nomor telepon tidak valid — gunakan 8–15 digit angka.";
    }
  }

  const perangkat = form.perangkat.trim();
  if (perangkat.length === 0) e.perangkat = "Nama perangkat wajib diisi.";
  else if (perangkat.length < 3) e.perangkat = "Nama perangkat minimal 3 karakter.";
  else if (perangkat.length > 80) e.perangkat = "Nama perangkat maksimal 80 karakter.";

  const deskripsi = form.deskripsi.trim();
  if (deskripsi.length === 0) e.deskripsi = "Deskripsi masalah wajib diisi.";
  else if (deskripsi.length < 10) {
    e.deskripsi = "Deskripsi minimal 10 karakter supaya teknisi paham pekerjaannya.";
  } else if (deskripsi.length > 1000) e.deskripsi = "Deskripsi maksimal 1000 karakter.";

  if (!DAFTAR_PRIORITAS.includes(form.prioritas)) e.prioritas = "Pilih prioritas yang tersedia.";
  if (!DAFTAR_STATUS.includes(form.status)) e.status = "Pilih status yang tersedia.";

  if (!isoValid(form.tanggalMasuk)) {
    e.tanggalMasuk = "Tanggal masuk tidak valid.";
  } else if (selisihHari(hariIniISO, form.tanggalMasuk) > 0) {
    e.tanggalMasuk = "Tanggal masuk tidak boleh melebihi hari ini.";
  }

  if (!isoValid(form.tenggat)) {
    e.tenggat = "Tenggat tidak valid.";
  } else if (isoValid(form.tanggalMasuk) && form.tenggat < form.tanggalMasuk) {
    e.tenggat = "Tenggat tidak boleh jatuh sebelum tanggal masuk.";
  }

  const estimasiParse = parseRupiah(form.estimasi);
  const adaIsiEstimasi = form.estimasi.trim().length > 0;
  if (adaIsiEstimasi && estimasiParse === null) {
    e.estimasi = "Biaya estimasi harus berupa angka, misalnya 250000.";
  } else {
    const estimasi = estimasiParse ?? 0;
    if (estimasi > BIAYA_MAKS) e.estimasi = `Biaya estimasi maksimal ${rupiah(BIAYA_MAKS)}.`;

    const dpParse = parseRupiah(form.dp);
    const adaIsiDp = form.dp.trim().length > 0;
    if (adaIsiDp && dpParse === null) {
      e.dp = "DP harus berupa angka, misalnya 100000.";
    } else {
      const dp = dpParse ?? 0;
      if (estimasi === 0 && dp > 0) e.dp = "Biaya estimasi belum diisi, jadi DP harus Rp 0.";
      else if (dp > estimasi) e.dp = `DP tidak boleh melebihi biaya estimasi (${rupiah(estimasi)}).`;
    }
  }

  if (form.catatanInternal.length > 1000) e.catatanInternal = "Catatan internal maksimal 1000 karakter.";

  return e;
}

export function adaKesalahan(e: KesalahanForm): boolean {
  return Object.keys(e).length > 0;
}

/** Mengubah form menjadi draft; null bila ada kolom uang yang tak terbaca. */
export function formKeDraft(form: FormTiket): DraftTiket | null {
  const estimasi = parseRupiah(form.estimasi);
  const dp = parseRupiah(form.dp);
  if (form.estimasi.trim().length > 0 && estimasi === null) return null;
  if (form.dp.trim().length > 0 && dp === null) return null;
  return {
    pelanggan: form.pelanggan.trim(),
    telepon: form.telepon.trim(),
    perangkat: form.perangkat.trim(),
    kategori: form.kategori.trim(),
    deskripsi: form.deskripsi.trim(),
    prioritas: form.prioritas,
    status: form.status,
    tanggalMasuk: form.tanggalMasuk,
    tenggat: form.tenggat,
    estimasi: estimasi ?? 0,
    dp: dp ?? 0,
    catatanInternal: form.catatanInternal.trim(),
  };
}

/* ------------------------------------------------------------------ *
 * Skema tiket untuk data yang tidak dipercaya (impor/localStorage)
 * ------------------------------------------------------------------ */

const JENIS_EVENT = ["dibuat", "status", "catatan", "pembaruan"] as const;

function teks(v: unknown, bawaan = ""): string {
  return typeof v === "string" ? v.trim() : bawaan;
}

function uang(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v)) return null;
  if (!Number.isInteger(v) || v < 0) return null;
  return v;
}

function timestampDari(v: unknown): string | null {
  const s = teks(v);
  return timestampValid(s) ? s : null;
}

function bersihkanTimeline(v: unknown, bawaan: string): Ticket["timeline"] {
  if (!Array.isArray(v)) {
    return [{ id: newIdSkema("ev"), at: bawaan, jenis: "dibuat", pesan: "Tiket dibuat" }];
  }
  const hasil: Ticket["timeline"] = [];
  for (const item of v) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const at = timestampDari(o.at);
    if (!at) continue;
    const jenis = JENIS_EVENT.includes(o.jenis as (typeof JENIS_EVENT)[number])
      ? (o.jenis as (typeof JENIS_EVENT)[number])
      : "pembaruan";
    const dari = DAFTAR_STATUS.includes(o.dari as Status) ? (o.dari as Status) : undefined;
    const ke = DAFTAR_STATUS.includes(o.ke as Status) ? (o.ke as Status) : undefined;
    hasil.push({
      id: teks(o.id) || newIdSkema("ev"),
      at,
      jenis,
      pesan: teks(o.pesan, "Perubahan pada tiket"),
      ...(dari ? { dari } : {}),
      ...(ke ? { ke } : {}),
    });
  }
  hasil.sort((a, b) => a.at.localeCompare(b.at));
  if (hasil.length === 0) {
    return [{ id: newIdSkema("ev"), at: bawaan, jenis: "dibuat", pesan: "Tiket dibuat" }];
  }
  return hasil;
}

let penghitungSkema = 0;
function newIdSkema(awalan: string): string {
  penghitungSkema += 1;
  return `${awalan}_imp${penghitungSkema.toString(36)}`;
}

function bersihkanCatatan(v: unknown): Ticket["catatanKerja"] {
  if (!Array.isArray(v)) return [];
  const hasil: Ticket["catatanKerja"] = [];
  for (const item of v) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const teksCatatan = teks(o.teks ?? o.text);
    const at = timestampDari(o.at);
    if (teksCatatan.length === 0 || !at) continue;
    hasil.push({ id: teks(o.id) || newIdSkema("ctt"), at, teks: teksCatatan });
  }
  return hasil.sort((a, b) => a.at.localeCompare(b.at));
}

export type HasilCek = { ok: true; ticket: Ticket } | { ok: false; alasan: string };

/** Memeriksa satu objek menjadi Ticket; dipakai untuk impor & localStorage. */
export function cekTiket(raw: unknown, posisi: number): HasilCek {
  const label = `Tiket #${posisi + 1}`;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    return { ok: false, alasan: `${label}: format tiket tidak dikenali.` };
  }
  const o = raw as Record<string, unknown>;

  const nomor = teks(o.nomor);
  if (nomor.length === 0 || nomor.length > 30) {
    return { ok: false, alasan: `${label}: nomor tiket kosong atau terlalu panjang.` };
  }
  const pelanggan = teks(o.pelanggan);
  if (pelanggan.length < 3) {
    return { ok: false, alasan: `${label} (${nomor}): nama pelanggan minimal 3 karakter.` };
  }
  const perangkat = teks(o.perangkat);
  if (perangkat.length < 3) {
    return { ok: false, alasan: `${label} (${nomor}): nama perangkat minimal 3 karakter.` };
  }
  const deskripsi = teks(o.deskripsi);
  if (deskripsi.length < 10) {
    return { ok: false, alasan: `${label} (${nomor}): deskripsi minimal 10 karakter.` };
  }
  if (!DAFTAR_STATUS.includes(o.status as Status)) {
    return { ok: false, alasan: `${label} (${nomor}): status "${String(o.status)}" tidak dikenali.` };
  }
  if (!DAFTAR_PRIORITAS.includes(o.prioritas as Prioritas)) {
    return { ok: false, alasan: `${label} (${nomor}): prioritas "${String(o.prioritas)}" tidak dikenali.` };
  }

  const tanggalMasuk = teks(o.tanggalMasuk);
  const tenggat = teks(o.tenggat);
  if (!isoValid(tanggalMasuk)) {
    return { ok: false, alasan: `${label} (${nomor}): tanggal masuk bukan format yyyy-mm-dd.` };
  }
  if (!isoValid(tenggat)) {
    return { ok: false, alasan: `${label} (${nomor}): tenggat bukan format yyyy-mm-dd.` };
  }
  if (tenggat < tanggalMasuk) {
    return {
      ok: false,
      alasan: `${label} (${nomor}): tenggat (${tenggat}) jatuh sebelum tanggal masuk (${tanggalMasuk}).`,
    };
  }

  const estimasi = uang(o.estimasi);
  if (estimasi === null) {
    return { ok: false, alasan: `${label} (${nomor}): biaya estimasi harus angka bulat rupiah.` };
  }
  if (estimasi > BIAYA_MAKS) {
    return { ok: false, alasan: `${label} (${nomor}): biaya estimasi melebihi batas maksimum.` };
  }
  const dp = uang(o.dp) ?? 0;
  if (dp > estimasi) {
    return { ok: false, alasan: `${label} (${nomor}): DP ${dp} melebihi biaya estimasi ${estimasi}.` };
  }

  const dibuatPada = timestampDari(o.dibuatPada) ?? `${tanggalMasuk}T08:45:00`;
  const diubahPada = timestampDari(o.diubahPada) ?? dibuatPada;

  return {
    ok: true,
    ticket: {
      id: teks(o.id) || newIdSkema("tkt"),
      nomor,
      pelanggan,
      telepon: teks(o.telepon),
      perangkat,
      kategori: teks(o.kategori),
      deskripsi,
      prioritas: o.prioritas as Prioritas,
      status: o.status as Status,
      tanggalMasuk,
      tenggat,
      estimasi,
      dp,
      catatanInternal: teks(o.catatanInternal),
      catatanKerja: bersihkanCatatan(o.catatanKerja),
      timeline: bersihkanTimeline(o.timeline, dibuatPada),
      dibuatPada,
      diubahPada,
    },
  };
}
