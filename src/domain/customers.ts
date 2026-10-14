/**
 * Deduplikasi & profil pelanggan.
 *
 * Bengkel sering ketemu pelanggan yang sama dengan nama ditulis berbeda
 * ("Sari Wulandari" vs "Sari"), jadi pencarian pelanggan memakai kunci
 * normalisasi: huruf kecil, tanpa gelar/sapaan, tanpa tanda baca. Dari situ
 * form bisa mengisi otomatis perangkat, kategori, dan estimasi terakhir —
 * tanpa server dan tanpa data yang dikirim ke mana pun.
 */

import type { Ticket } from "./types";
import { itemKatalog, normalisasiTeks, tebakKategori } from "./catalog";
import { selisihHari } from "./dates";

const GELAR = ["bapak", "bpk", "ibu", "hj", "sdri", "sa", "pak", "bu", "h", "hj"];

function intiNama(nama: string): string {
  const bersih = normalisasiTeks(nama)
    .replace(/\b\d+\b/g, "")
    .split(" ")
    .filter((kata) => kata.length > 0 && !GELAR.includes(kata));
  return bersih.join(" ");
}

/** Nomor telepon dinormalkan ke digit saja agar "0812-11" = "081211". */
export function normalTelepon(telepon: string): string {
  return telepon.replace(/\D+/g, "");
}

/**
 * Kunci unik pelanggan: nomor telepon bila ada (paling kuat), jika tidak
 * memakai nama inti. Call-prefix 62/0 disamakan agar 0812… = +62812….
 */
export function kunciPelanggan(nama: string, telepon: string): string {
  const t = normalTelepon(telepon);
  if (t.length >= 9) {
    let inti = t;
    if (inti.startsWith("62")) inti = `0${inti.slice(2)}`;
    else if (inti.startsWith("8") && t.length >= 11) inti = `0${inti}`;
    return `t:${inti}`;
  }
  const n = intiNama(nama);
  return `n:${n.length > 0 ? n : normalisasiTeks(nama)}`;
}

export interface ProfilPelanggan {
  kunci: string;
  nama: string;
  telepon: string;
  /** Nama persis seperti terakhir ditulis pengguna. */
  namaTerakhir: string;
  jumlahTiket: number;
  perangkatTerakhir: string;
  kategoriTerakhir: string;
  estimasiTerakhir: number;
  totalBelanja: number;
  terakhirMasuk: string | null;
  catatan: string | null;
  /** Index tiket terakhir agar bisa dibuka langsung. */
  tiketTerakhirId: string | null;
}

/** Mengelompokkan seluruh tiket menjadi profil pelanggan. */
export function profilPelanggan(tiket: Ticket[]): ProfilPelanggan[] {
  const peta = new Map<string, ProfilPelanggan>();

  for (const t of [...tiket].sort((a, b) => a.dibuatPada.localeCompare(b.dibuatPada))) {
    const kunci = kunciPelanggan(t.pelanggan, t.telepon);
    const ada = peta.get(kunci);
    if (!ada) {
      peta.set(kunci, {
        kunci,
        nama: t.pelanggan,
        telepon: t.telepon,
        namaTerakhir: t.pelanggan,
        jumlahTiket: 1,
        perangkatTerakhir: t.perangkat,
        kategoriTerakhir: t.kategori || itemKatalog(tebakKategori(t.perangkat)?.key ?? "lainnya").label,
        estimasiTerakhir: t.estimasi,
        totalBelanja: t.estimasi,
        terakhirMasuk: t.tanggalMasuk,
        catatan: t.catatanInternal || null,
        tiketTerakhirId: t.id,
      });
      continue;
    }
    ada.namaTerakhir = t.pelanggan;
    if (t.telepon) ada.telepon = t.telepon;
    ada.jumlahTiket += 1;
    ada.perangkatTerakhir = t.perangkat;
    ada.kategoriTerakhir = t.kategori || ada.kategoriTerakhir;
    ada.estimasiTerakhir = t.estimasi;
    ada.totalBelanja += t.estimasi;
    ada.terakhirMasuk = t.tanggalMasuk;
    if (t.catatanInternal) ada.catatan = t.catatanInternal;
    ada.tiketTerakhirId = t.id;
  }

  return [...peta.values()].sort((a, b) => b.jumlahTiket - a.jumlahTiket);
}

export interface SaranPelanggan {
  profil: ProfilPelanggan;
  /** Kapan pelanggan terakhir menyetor unit (null bila belum ada data). */
  hariLalu: number | null;
  /**true bila profil ini pernah punya lebih dari satu tiket. */
  pelangganBerulang: boolean;
}

/**
 * Mencari pelanggan yang cocok untuk isian form saat ini. Cocok bila nama
 * inti sama ATAU nomor telepon sama — cukup untuk mengisi otomatis tanpa
 * membuat pengguna mencari-cari.
 */
export function saranPelanggan(
  tiket: Ticket[],
  nama: string,
  telepon: string,
  hariIniISO: string,
): SaranPelanggan | null {
  const namaInti = intiNama(nama);
  const tel = normalTelepon(telepon);
  if (namaInti.length < 3 && tel.length < 9) return null;

  const semua = profilPelanggan(tiket);
  const cocok = semua.find((p) => {
    if (tel.length >= 9 && normalTelepon(p.telepon) === tel) return true;
    const intiProfil = intiNama(p.namaTerakhir);
    return namaInti.length >= 3 && (intiProfil === namaInti || intiProfil.includes(namaInti));
  });

  if (!cocok) return null;
  const hariLalu = cocok.terakhirMasuk
    ? Math.max(0, selisihHari(cocok.terakhirMasuk, hariIniISO))
    : null;
  return {
    profil: cocok,
    hariLalu,
    pelangganBerulang: cocok.jumlahTiket > 1,
  };
}

/** Pelanggan yang paling sering muncul — ditampilkan di dasbor. */
export function pelangganTeratas(tiket: Ticket[], batas = 5): ProfilPelanggan[] {
  return profilPelanggan(tiket)
    .filter((p) => p.jumlahTiket > 1)
    .slice(0, batas);
}
