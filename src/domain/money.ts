/**
 * Format angka & rupiah (konvensi Indonesia: Rp 1.250.000).
 * Uang selalu integer; tidak ada pecahan sen di seluruh aplikasi.
 */

const ANGKA = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
const DESIMAL = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

export function formatAngka(nilai: number): string {
  if (!Number.isFinite(nilai)) return "0";
  return ANGKA.format(Math.round(nilai));
}

export function rupiah(nilai: number): string {
  if (!Number.isFinite(nilai)) return "Rp 0";
  return `Rp ${formatAngka(nilai)}`;
}

/** Bentuk ringkas untuk metrik: 1.250.000 -> "Rp 1,3 jt". */
export function rupiahRingkas(nilai: number): string {
  if (!Number.isFinite(nilai) || nilai === 0) return "Rp 0";
  const abs = Math.abs(nilai);
  if (abs >= 1_000_000_000) return `Rp ${DESIMAL.format(Math.round((nilai / 1e9) * 10) / 10)} M`;
  if (abs >= 1_000_000) return `Rp ${DESIMAL.format(Math.round((nilai / 1e6) * 10) / 10)} jt`;
  if (abs >= 10_000) return `Rp ${DESIMAL.format(Math.round((nilai / 1e3) * 10) / 10)} rb`;
  return `Rp ${formatAngka(nilai)}`;
}

/** Ambil digit dari input pengguna: "Rp 1.250.000" -> "1250000". */
export function digitRupiah(mentah: string): string {
  return mentah.replace(/\D+/g, "").replace(/^0+(?=\d)/, "");
}

/** Parse input rupiah -> integer; null bila bukan angka / negatif. */
export function parseRupiah(mentah: string): number | null {
  const d = digitRupiah(mentah);
  if (d.length === 0) return null;
  const n = Number(d);
  if (!Number.isSafeInteger(n) || n < 0) return null;
  return n;
}

/** Tampilkan digit rupiah dengan pemisah ribuan: "1250000" -> "1.250.000". */
export function formatInputRupiah(digit: string): string {
  const bersih = digitRupiah(digit);
  return bersih.length === 0 ? "" : formatAngka(Number(bersih));
}

export function desimal(nilai: number): string {
  return Number.isFinite(nilai) ? DESIMAL.format(Math.round(nilai * 10) / 10) : "0";
}

export function persen(nilai: number): string {
  return `${DESIMAL.format(Math.round(nilai * 10) / 10)}%`;
}
