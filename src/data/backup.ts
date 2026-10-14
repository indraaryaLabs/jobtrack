/**
 * Ekspor cadangan JSON, unduhan berkas, dan pembacaan berkas.
 * Semua berjalan lokal lewat Blob/FileReader — tanpa jaringan.
 */

import type { BerkasCadangan, Ticket } from "../domain/types";
import { hariIni, keTimestamp } from "../domain/dates";
import { NAMA_APLIKASI, VERSI_SKEMA } from "./storage";

export function susunCadangan(tiket: Ticket[], now: Date = new Date()): BerkasCadangan {
  return {
    app: NAMA_APLIKASI,
    skemaVersi: VERSI_SKEMA,
    dieksporPada: keTimestamp(now.getTime()),
    jumlahTiket: tiket.length,
    tiket,
  };
}

export function jsonCadangan(tiket: Ticket[], now: Date = new Date()): string {
  return JSON.stringify(susunCadangan(tiket, now), null, 2);
}

export function namaBerkasCadangan(now: Date = new Date()): string {
  return `jobtrack-cadangan-${hariIni(now)}.json`;
}

/** Mengunduh berkas teks. Diam-diam tidak melakukan apa-apa bila tanpa DOM. */
export function unduhBerkas(nama: string, isi: string, tipe: string): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([isi], { type: `${tipe};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const tautan = document.createElement("a");
  tautan.href = url;
  tautan.download = nama;
  tautan.rel = "noopener";
  tautan.style.display = "none";
  document.body.appendChild(tautan);
  tautan.click();
  document.body.removeChild(tautan);
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function bacaBerkas(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Berkas tidak bisa dibaca."));
    reader.onabort = () => reject(new Error("Pembacaan berkas dibatalkan."));
    reader.readAsText(file, "utf-8");
  });
}

export function ukuranReadable(byte: number): string {
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${Math.round(byte / 102.4) / 10} KB`;
  return `${Math.round(byte / (102.4 * 1024)) / 10} MB`;
}
