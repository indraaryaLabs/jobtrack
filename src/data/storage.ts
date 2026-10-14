/**
 * Penyimpanan lokal terversi.
 *
 * - Data demo dimuat otomatis pada kunjungan pertama.
 * - Berkas impor diperlakukan sebagai data tidak dipercaya: setiap tiket
 *   diperiksa satu per satu; bila tidak ada satu pun yang valid, data yang
 *   sedang dipakai TIDAK disentuh.
 * - Skema versi lama dimigrasi lewat pembacaan yang tahan banting, bukan
 *   langsung dibuang.
 */

import type { DataTersimpan, Tema, Ticket, TampilanTersimpan } from "../domain/types";
import { cekTiket } from "../domain/validation";
import { keTimestamp } from "../domain/dates";
import { buatDataContoh } from "./seed";

export const KUNCI_SIMPAN = "jobtrack.v1";
export const VERSI_SKEMA = 2;
export const NAMA_APLIKASI = "jobtrack";

export interface HasilImpor {
  ok: boolean;
  tiket?: Ticket[];
  galat?: string;
  peringatan?: string[];
}

export interface HasilMuat {
  tiket: Ticket[];
  masihDemo: boolean;
  tampilan: TampilanTersimpan[];
  tema: Tema | "sistem";
  sumber: "localStorage" | "contoh" | "pemulihan";
  galat?: string;
}

export function penyimpananTersedia(): boolean {
  try {
    return typeof window !== "undefined" && Boolean(window.localStorage);
  } catch {
    return false;
  }
}

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ *
 * Validasi payload
 * ------------------------------------------------------------------ */

export function validasiDaftarTiket(raw: unknown): HasilImpor {
  if (!Array.isArray(raw)) {
    return { ok: false, galat: "Daftar tiket tidak ditemukan di dalam berkas." };
  }
  if (raw.length > 5000) {
    return { ok: false, galat: "Jumlah tiket terlalu banyak (maksimal 5000 tiket)." };
  }

  const tiket: Ticket[] = [];
  const peringatan: string[] = [];
  const nomorTerpakai = new Set<string>();

  for (let i = 0; i < raw.length; i += 1) {
    const hasil = cekTiket(raw[i], i);
    if (!hasil.ok) {
      if (peringatan.length < 5) peringatan.push(hasil.alasan);
      continue;
    }
    if (nomorTerpakai.has(hasil.ticket.nomor)) {
      if (peringatan.length < 5) {
        peringatan.push(`Tiket #${i + 1}: nomor ${hasil.ticket.nomor} ganda, dilewati.`);
      }
      continue;
    }
    nomorTerpakai.add(hasil.ticket.nomor);
    tiket.push(hasil.ticket);
  }

  if (tiket.length === 0) {
    return {
      ok: false,
      galat: peringatan[0] ?? "Tidak ada tiket valid di dalam berkas. Data Anda tidak diubah.",
      peringatan,
    };
  }

  return { ok: true, tiket, peringatan };
}

/** Membaca berkas cadangan JSON hasil ekspor JobTrack. */
export function ulasCadangan(teks: string): HasilImpor {
  let parsed: unknown;
  try {
    parsed = JSON.parse(teks);
  } catch {
    return {
      ok: false,
      galat: "Berkas bukan JSON yang valid. Pilih berkas hasil Ekspor JSON.",
    };
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, galat: "Berkas tidak berisi objek cadangan JobTrack." };
  }

  const o = parsed as Record<string, unknown>;
  if (o.app !== undefined && o.app !== NAMA_APLIKASI) {
    return { ok: false, galat: `Berkas ini milik aplikasi "${String(o.app)}", bukan JobTrack.` };
  }
  if (typeof o.skemaVersi === "number" && o.skemaVersi > VERSI_SKEMA) {
    return {
      ok: false,
      galat: `Versi skema berkas (${o.skemaVersi}) lebih baru dari aplikasi ini (${VERSI_SKEMA}).`,
    };
  }
  return validasiDaftarTiket(o.tiket);
}

/* ------------------------------------------------------------------ *
 * Bawaan tampilan tersimpan
 * ------------------------------------------------------------------ */

export function tampilanBawaan(): TampilanTersimpan[] {
  return [
    { id: "semua", nama: "Semua pekerjaan", filter: {}, bawaan: true },
    {
      id: "terlambat",
      nama: "Terlambat",
      filter: { terlambat: true, urut: "tenggat", arah: "naik" },
      bawaan: true,
    },
    {
      id: "diproses",
      nama: "Sedang dikerjakan",
      filter: { status: "dikerjakan" },
      bawaan: true,
    },
    {
      id: "siap",
      nama: "Siap diambil",
      filter: { status: "siap_diambil" },
      bawaan: true,
    },
    {
      id: "selesai",
      nama: "Selesai bulan ini",
      filter: { status: "selesai" },
      bawaan: true,
    },
  ];
}

function bacaTampilan(raw: unknown): TampilanTersimpan[] {
  if (!Array.isArray(raw)) return tampilanBawaan();
  const hasil: TampilanTersimpan[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" ? o.id : "";
    const nama = typeof o.nama === "string" ? o.nama : "";
    if (!id || !nama) continue;
    hasil.push({
      id,
      nama,
      filter: (typeof o.filter === "object" && o.filter !== null
        ? (o.filter as TampilanTersimpan["filter"])
        : {}),
      bawaan: o.bawaan === true,
    });
  }
  return hasil.length > 0 ? hasil : tampilanBawaan();
}

function bacaTema(raw: unknown): Tema | "sistem" {
  return raw === "terang" || raw === "gelap" || raw === "sistem" ? raw : "sistem";
}

/* ------------------------------------------------------------------ *
 * Muat & simpan
 * ------------------------------------------------------------------ */

export function muatData(): HasilMuat {
  const s = storage();
  if (!s) {
    return {
      tiket: buatDataContoh(),
      masihDemo: true,
      tampilan: tampilanBawaan(),
      tema: "sistem",
      sumber: "contoh",
      galat:
        "Penyimpanan browser tidak tersedia (mis. mode privat). JobTrack memakai data contoh selama sesi ini.",
    };
  }

  let mentah: string | null;
  try {
    mentah = s.getItem(KUNCI_SIMPAN);
  } catch {
    mentah = null;
  }

  if (!mentah) {
    return {
      tiket: buatDataContoh(),
      masihDemo: true,
      tampilan: tampilanBawaan(),
      tema: "sistem",
      sumber: "contoh",
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(mentah);
  } catch {
    return {
      tiket: buatDataContoh(),
      masihDemo: true,
      tampilan: tampilanBawaan(),
      tema: "sistem",
      sumber: "pemulihan",
      galat: "Data tersimpan rusak, sehingga data contoh dimuat ulang.",
    };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return {
      tiket: buatDataContoh(),
      masihDemo: true,
      tampilan: tampilanBawaan(),
      tema: "sistem",
      sumber: "pemulihan",
      galat: "Struktur data tersimpan tidak valid, sehingga data contoh dimuat ulang.",
    };
  }

  const o = parsed as Record<string, unknown>;

  // Migrasi ringan: payload versi 1 (bahasa lama) -> versi 2.
  const tiketMentah = Array.isArray(o.tiket) ? o.tiket : (o.tickets as unknown[] | undefined);
  const versi = typeof o.skemaVersi === "number" ? o.skemaVersi : undefined;

  if (versi !== undefined && versi > VERSI_SKEMA) {
    return {
      tiket: buatDataContoh(),
      masihDemo: true,
      tampilan: tampilanBawaan(),
      tema: "sistem",
      sumber: "pemulihan",
      galat: "Data dibuat oleh versi JobTrack yang lebih baru. Data contoh dimuat.",
    };
  }

  const hasil = validasiDaftarTiket(tiketMentah);
  if (!hasil.ok || !hasil.tiket) {
    return {
      tiket: buatDataContoh(),
      masihDemo: true,
      tampilan: tampilanBawaan(),
      tema: "sistem",
      sumber: "pemulihan",
      galat: "Data tersimpan tidak lolos validasi, sehingga data contoh dimuat.",
    };
  }

  return {
    tiket: hasil.tiket,
    masihDemo: o.masihDemo !== false && o.isDemo !== false,
    tampilan: bacaTampilan(o.tampilan),
    tema: bacaTema(o.tema ?? o.theme),
    sumber: "localStorage",
  };
}

export type HasilSimpan = { ok: true; tersimpanPada: string } | { ok: false; galat: string };

export function simpanData(
  tiket: Ticket[],
  masihDemo: boolean,
  tampilan: TampilanTersimpan[],
  tema: Tema | "sistem",
): HasilSimpan {
  const s = storage();
  const tersimpanPada = keTimestamp(Date.now());
  if (!s) {
    return {
      ok: false,
      galat: "Penyimpanan browser tidak tersedia. Perubahan hanya bertahan sampai halaman dimuat ulang.",
    };
  }

  const muatan: DataTersimpan = {
    app: NAMA_APLIKASI,
    skemaVersi: VERSI_SKEMA,
    tiket,
    masihDemo,
    tersimpanPada,
    tampilan,
    tema,
  };

  try {
    s.setItem(KUNCI_SIMPAN, JSON.stringify(muatan));
    return { ok: true, tersimpanPada };
  } catch {
    return {
      ok: false,
      galat: "Gagal menyimpan ke browser (kemungkinan kuota penuh). Perubahan tidak tersimpan permanen.",
    };
  }
}

export function hapusSimpanan(): void {
  try {
    storage()?.removeItem(KUNCI_SIMPAN);
  } catch {
    /* diabaikan: penyimpanan tidak tersedia */
  }
}

/** Perkiraan ukuran data dalam byte (untuk diagnostics). */
export function ukuranData(tiket: Ticket[]): number {
  try {
    return JSON.stringify(tiket).length;
  } catch {
    return 0;
  }
}
