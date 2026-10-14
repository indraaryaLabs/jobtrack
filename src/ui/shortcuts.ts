/** Pintasan keyboard global JobTrack. */

export const TOMBOL_DIALOG_SHORTCUT = "?";

/** Label pintasan palet perintah untuk ditampilkan di UI. */
export const TOMBOL_DIALOG_PALET = "Ctrl+K";

export interface Pintasan {
  kunci: string;
  ctrl?: boolean;
  shift?: boolean;
  aksi: string;
  grup: "Umum" | "Navigasi" | "Daftar Tiket" | "Dialog";
}

export const PINTASAN: Pintasan[] = [
  { kunci: "k", ctrl: true, aksi: "Buka palet perintah", grup: "Umum" },
  { kunci: "/", aksi: "Fokus ke kolom pencarian", grup: "Umum" },
  { kunci: "n", aksi: "Buat tiket baru", grup: "Umum" },
  { kunci: "?", shift: true, aksi: "Tampilkan pintasan ini", grup: "Umum" },
  { kunci: "z", ctrl: true, aksi: "Urungkan perubahan terakhir", grup: "Umum" },
  { kunci: "z", ctrl: true, shift: true, aksi: "Ulangi perubahan", grup: "Umum" },
  { kunci: "g", ctrl: true, aksi: "Buka Dasbor", grup: "Navigasi" },
  { kunci: "t", ctrl: true, aksi: "Buka Daftar Tiket", grup: "Navigasi" },
  { kunci: "b", ctrl: true, aksi: "Buka Data & Cadangan", grup: "Navigasi" },
  { kunci: "Escape", aksi: "Tutup dialog atau panel", grup: "Umum" },
  { kunci: "Enter", aksi: "Buka tiket yang dipilih di daftar", grup: "Daftar Tiket" },
  { kunci: "x", aksi: "Pilih/batalkan tiket pada daftar", grup: "Daftar Tiket" },
];

/** Modifier sesuai platform: ⌘ pada Mac, Ctrl di platform lain. */
export const MODIFIER = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
  ? "⌘"
  : "Ctrl";

export function cocokPintasan(
  event: KeyboardEvent,
  p: Pintasan,
): boolean {
  if (event.key.toLowerCase() !== p.kunci.toLowerCase()) return false;
  if (Boolean(p.ctrl) !== (event.ctrlKey || event.metaKey)) return false;
  if (Boolean(p.shift) !== event.shiftKey) return false;
  return true;
}
