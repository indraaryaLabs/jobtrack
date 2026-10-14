/**
 * Utilitas tanggal & kalender kerja.
 *
 * Semua tanggal tiket berupa "yyyy-mm-dd" waktu lokal; event berupa
 * "yyyy-mm-ddTHH:mm:ss". Bengkel umumnya buka Senin–Sabtu, jadi perkiraan
 * tenggat otomatis memakai hitungan hari kerja (Minggu dilewati).
 */

const BULAN_PENDEK = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

const BULAN_PANJANG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const HARI_PANJANG = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** 0 = Minggu … 6 = Sabtu. */
export const HARI_MINGGU = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"] as const;

const pad = (n: number): string => String(n).padStart(2, "0");

export function keISO(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function keTimestamp(ms: number): string {
  const d = new Date(ms);
  return `${keISO(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

export function hariIni(now: Date = new Date()): string {
  return keISO(now);
}

export function uraiISO(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const date = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (
    date.getFullYear() !== Number(m[1]) ||
    date.getMonth() !== Number(m[2]) - 1 ||
    date.getDate() !== Number(m[3])
  ) {
    return null;
  }
  return date;
}

export function isoValid(iso: string): boolean {
  return uraiISO(iso) !== null;
}

export function timestampValid(iso: string): boolean {
  const bersih = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(bersih)) return false;
  return uraiISO(bersih.slice(0, 10)) !== null;
}

export function tambahHari(iso: string, hari: number): string {
  const d = uraiISO(iso);
  if (!d) return iso;
  d.setDate(d.getDate() + hari);
  return keISO(d);
}

export function selisihHari(dariISO: string, keISO_: string): number {
  const a = uraiISO(dariISO);
  const b = uraiISO(keISO_);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function hariKerja(iso: string): boolean {
  const d = uraiISO(iso);
  if (!d) return false;
  return d.getDay() !== 0; // Minggu = tutup
}

/**
 * Menambah hari kerja (Minggu dilewati) — dasar dari saran tenggat otomatis.
 * Nilai negatif mengurangi hari kerja.
 */
export function tambahHariKerja(iso: string, jumlah: number): string {
  let hasil = iso;
  const arah = jumlah < 0 ? -1 : 1;
  let sisa = Math.abs(jumlah);
  while (sisa > 0) {
    hasil = tambahHari(hasil, arah);
    if (hariKerja(hasil)) sisa -= 1;
  }
  return hasil;
}

/** Selisih hari kerja antara dua tanggal (negatif bila "ke" lebih awal). */
export function selisihHariKerja(dari: string, ke: string): number {
  const a = uraiISO(dari);
  const b = uraiISO(ke);
  if (!a || !b) return 0;
  const tanda = b.getTime() < a.getTime() ? -1 : 1;
  const awal = tanda < 0 ? b : a;
  const akhir = tanda < 0 ? a : b;
  const jarakHari = Math.round((akhir.getTime() - awal.getTime()) / 86_400_000);
  let n = 0;
  for (let i = 1; i <= jarakHari; i += 1) {
    if (hariKerja(tambahHari(keISO(awal), i))) n += 1;
  }
  return n * tanda;
}

/** "12 Okt 2026" */
export function formatTanggal(iso: string): string {
  const d = uraiISO(iso);
  if (!d) return "—";
  return `${d.getDate()} ${BULAN_PENDEK[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Senin, 12 Oktober 2026" */
export function formatTanggalPanjang(iso: string): string {
  const d = uraiISO(iso);
  if (!d) return "—";
  return `${HARI_PANJANG[d.getDay()]}, ${d.getDate()} ${
    BULAN_PANJANG[d.getMonth()]
  } ${d.getFullYear()}`;
}

/** "Sen, 12 Okt 2026" */
export function formatTanggalPendek(iso: string): string {
  const d = uraiISO(iso);
  if (!d) return "—";
  return `${HARI_MINGGU[d.getDay()]}, ${d.getDate()} ${
    BULAN_PENDEK[d.getMonth()]
  } ${d.getFullYear()}`;
}

/** "12 Okt 2026, 09.12" */
export function formatWaktu(iso: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(iso.trim());
  if (!m) return formatTanggal(iso);
  return `${formatTanggal(m[1])}, ${m[2]}.${m[3]}`;
}

/** Label relatif untuk tenggat. */
export function labelTenggat(iso: string, hariIniISO: string): string {
  const n = selisihHari(hariIniISO, iso);
  if (n < -1) return `Terlambat ${Math.abs(n)} hari`;
  if (n === -1) return "Terlambat kemarin";
  if (n === 0) return "Jatuh tempo hari ini";
  if (n === 1) return "Jatuh tempo besok";
  if (n <= 7) return `${n} hari lagi`;
  return formatTanggal(iso);
}

/** "baru saja", "12 menit lalu", "3 hari lalu". */
export function labelSejak(iso: string, now: Date = new Date()): string {
  const bersih = iso.trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(bersih);
  if (!m) return "";
  const lalu = new Date(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
  ).getTime();
  if (Number.isNaN(lalu)) return "";

  const menit = Math.round((now.getTime() - lalu) / 60_000);
  if (menit < 1) return "baru saja";
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.round(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.round(jam / 24);
  if (hari === 1) return "kemarin";
  if (hari < 31) return `${hari} hari lalu`;
  const bulan = Math.round(hari / 30);
  if (bulan < 12) return `${bulan} bulan lalu`;
  return `${Math.max(1, Math.round(bulan / 12))} tahun lalu`;
}

export function labelBulan(now: Date = new Date()): string {
  return `${BULAN_PANJANG[now.getMonth()]} ${now.getFullYear()}`;
}
