/**
 * Kesehatan pekerjaan & wawasan otomatis.
 *
 * Ini lapisan semi-otomasi JobTrack: dari data yang sama, sistem menghitung
 * apa yang perlu ditangani hari ini dan menawarkan tindakan sekali klik
 * (filter/status). Semua perhitungan lokal, tanpa jaringan.
 */

import type { Ticket, Wawasan } from "./types";
import {
  aktif,
  hariMenungguPengambilan,
  hariTinggal,
  lewatTenggat,
  sisaTagihan,
  selesaiBulanIni,
} from "./ticket";
import { rupiahRingkas } from "./money";
import { statusDitutup } from "./status";

/** Ambang keterlambatan yang dianggap kritis (hari). */
export const AMBANG_KRITIS = 3;
export const AMBANG_MENUNGGU_AMBIL = 2;

/** Kategori kesehatan satu tiket (dipakai untuk bar/meter di daftar). */
export type Kesehatan = "sehat" | "perlu_perhatian" | "kritis" | "ditutup";

export function kesehatan(ticket: Ticket, hariIniISO: string): Kesehatan {
  if (statusDitutup(ticket.status)) return "ditutup";
  if (lewatTenggat(ticket, hariIniISO)) {
    const hari = Math.abs(hariTinggal(ticket, hariIniISO));
    return hari >= AMBANG_KRITIS ? "kritis" : "perlu_perhatian";
  }
  if (hariMenungguPengambilan(ticket, hariIniISO) >= AMBANG_MENUNGGU_AMBIL) {
    return "perlu_perhatian";
  }
  return "sehat";
}

/**
 * Daftarwnsights yang bisa langsung ditindaklanjuti, diurutkan dari paling
 * mendesak. Tiap insights punya satu tindakan (filter) sehingga operator
 * cukup satu klik untuk menangani kelompoknya.
 */
export function wawasanOtomatis(tiket: Ticket[], hariIniISO: string): Wawasan[] {
  const hasil: Wawasan[] = [];
  const listAktif = tiket.filter(aktif);

  // 1) Terlambat
  const terlambat = tiket.filter((t) => lewatTenggat(t, hariIniISO));
  if (terlambat.length > 0) {
    const kritis = terlambat.filter(
      (t) => Math.abs(hariTinggal(t, hariIniISO)) >= AMBANG_KRITIS,
    );
    const palingLama = [...terlambat].sort(
      (a, b) => hariTinggal(a, hariIniISO) - hariTinggal(b, hariIniISO),
    )[0];
    const nilai = terlambat.reduce((n, t) => n + sisaTagihan(t), 0);
    hasil.push({
      id: "terlambat",
      nada: kritis.length > 0 ? "bahaya" : "waspada",
      judul: `${terlambat.length} pekerjaan lewat tenggat`,
      detail:
        kritis.length > 0
          ? `${kritis.length} sudah lewat ${AMBANG_KRITIS} hari. Paling lama ${palingLama.nomor} (${palingLama.pelanggan}); sisa tagihan ${rupiahRingkas(nilai)}.`
          : `Belum ada yang kritis. Paling lama ${palingLama.nomor} (${palingLama.pelanggan}).`,
      aksi: { label: "Tampilkan yang terlambat", filter: { terlambat: true } },
      urut: kritis.length > 0 ? 1 : 3,
    });
  }

  // 2) Sudah siap tapi belum diambil pelanggan
  const menunggu = tiket
    .filter(
      (t) =>
        t.status === "siap_diambil" &&
        hariMenungguPengambilan(t, hariIniISO) >= AMBANG_MENUNGGU_AMBIL,
    )
    .sort(
      (a, b) =>
        hariMenungguPengambilan(b, hariIniISO) - hariMenungguPengambilan(a, hariIniISO),
    );
  if (menunggu.length > 0) {
    const terlama = menunggu[0];
    hasil.push({
      id: "menunggu-ambil",
      nada: "waspada",
      judul: `${menunggu.length} unit siap tapi belum diambil`,
      detail: `Paling lama menunggu ${hariMenungguPengambilan(
        terlama,
        hariIniISO,
      )} hari: ${terlama.nomor} (${terlama.pelanggan}). Segera hubungi pelanggan.`,
      aksi: { label: "Tampilkan unit siap", filter: { status: "siap_diambil" } },
      urut: 4,
    });
  }

  // 3) Tertahan menunggu komponen/persetujuan
  const macet = listAktif.filter((t) => t.status === "menunggu" && hariTinggal(t, hariIniISO) <= 1);
  if (macet.length > 0) {
    hasil.push({
      id: "menunggu-macet",
      nada: "aksen",
      judul: `${macet.length} pekerjaan tertahan menunggu komponen/persetujuan`,
      detail: `${macet
        .slice(0, 3)
        .map((t) => `${t.nomor} (${t.pelanggan})`)
        .join(", ")}. Tindak lanjuti supplier atau pelanggan.`,
      aksi: { label: "Tampilkan yang menunggu", filter: { status: "menunggu" } },
      urut: 5,
    });
  }

  // 4) Pekerjaan yang akan segera jatuh tempo
  const akanTenggat = listAktif.filter((t) => {
    const n = hariTinggal(t, hariIniISO);
    return n >= 0 && n <= 1;
  });
  if (akanTenggat.length > 0) {
    hasil.push({
      id: "akan-tenggat",
      nada: "aksen",
      judul: `${akanTenggat.length} pekerjaan jatuh tempo dalam 2 hari`,
      detail: `${akanTenggat
        .slice(0, 3)
        .map((t) => `${t.nomor} ${t.pelanggan}`)
        .join(", ")}. Pastikan komponen siap sebelum tenggat.`,
      urut: 6,
    });
  }

  // 5) Tiket yang belum disentuh sama sekali
  const baruLama = listAktif.filter(
    (t) => t.status === "baru" && hariTinggal(t, hariIniISO) <= 0,
  );
  if (baruLama.length > 0) {
    hasil.push({
      id: "baru-terlama",
      nada: "waspada",
      judul: `${baruLama.length} tiket masih berstatus Baru`,
      detail: "Tiket Baru tidak bergerak sampai unit diperiksa. Mulai dari pemeriksaan.",
      aksi: { label: "Tampilkan tiket Baru", filter: { status: "baru" } },
      urut: 7,
    });
  }

  // 6) Rekap bulanan
  const selesai = tiket.filter((t) => selesaiBulanIni(t, hariIniISO));
  if (selesai.length >= 3) {
    hasil.push({
      id: "bulanan",
      nada: "sukses",
      judul: `${selesai.length} pekerjaan selesai bulan ini`,
      detail: "Rekap bulanan bisa dicetak dari halaman Tiket (cetak daftar hasil filter).",
      urut: 8,
    });
  }

  // 7) Kabar baik — selalu di akhir bila tidak ada yang terlambat
  if (terlambat.length === 0 && listAktif.length > 0) {
    hasil.push({
      id: "aman",
      nada: "sukses",
      judul: "Semua pekerjaan aktif masih sesuai tenggat",
      detail: `${listAktif.length} pekerjaan berjalan, tidak ada yang terlambat hari ini.`,
      urut: 9,
    });
  }

  return hasil.sort((a, b) => a.urut - b.urut);
}

/** Ringkasan satu kalimat untuk di bawah judul dasbor. */
export function ringkasanOtomatis(tiket: Ticket[], hariIniISO: string): string {
  if (tiket.length === 0) return "Belum ada pekerjaan tercatat.";
  const terlambat = tiket.filter((t) => lewatTenggat(t, hariIniISO)).length;
  if (terlambat === 0) {
    return `${tiket.length} tiket tercatat, semuanya masih sesuai jadwal.`;
  }
  return `${tiket.length} tiket tercatat · ${terlambat} perlu ditangani hari ini.`;
}

/** Label tombol aksi cepat untuk langkah berikutnya pada tiap status. */
export function labelLangkahBerikut(ticket: Ticket): string {
  switch (ticket.status) {
    case "baru":
      return "Mulai pemeriksaan";
    case "diperiksa":
      return "Mulai kerjakan";
    case "dikerjakan":
      return "Tandai siap diambil";
    case "menunggu":
      return "Lanjutkan pengerjaan";
    case "siap_diambil":
      return "Tandai selesai";
    default:
      return "";
  }
}
