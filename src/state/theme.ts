/**
 * Tema terang/gelap. "sistem" mengikuti preferensi peramban dan ikut berubah
 * otomatis saat sistem berpindah.
 */

import { useCallback, useEffect, useState } from "react";
import type { Tema } from "../domain/types";

export type PreferensiTema = Tema | "sistem";

const KUNCI_TEMA = "jobtrack.tema";

export function terapkanTema(
  preferensi: PreferensiTema,
  sistemGelap: boolean,
): Tema {
  if (preferensi !== "sistem") return preferensi;
  return sistemGelap ? "gelap" : "terang";
}

export function pasangTema(preferensi: PreferensiTema): void {
  if (typeof document === "undefined") return;
  const sistemGelap =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.tema = terapkanTema(preferensi, sistemGelap);
}

function bacaTema(): PreferensiTema {
  try {
    const v = window.localStorage.getItem(KUNCI_TEMA);
    return v === "terang" || v === "gelap" || v === "sistem" ? v : "sistem";
  } catch {
    return "sistem";
  }
}

function simpanTema(preferensi: PreferensiTema): void {
  try {
    window.localStorage.setItem(KUNCI_TEMA, preferensi);
  } catch {
    /* penyimpanan tidak tersedia — tema hanya berlaku di sesi ini */
  }
}

export interface ThemeApi {
  preferensi: PreferensiTema;
  /** Tema yang benar-benar aktif sekarang (setelah resolve "sistem"). */
  tema: Tema;
  setPreferensi: (p: PreferensiTema) => void;
  /** Siklus tiga posisi: terang → gelap → sistem (untuk palet perintah). */
  siklus: () => void;
  /** Akses langsung nyala/mati mode gelap berdasarkan tema aktif. */
  ubahTema: () => void;
}

/** Hook tema: memasang atribut <html data-tema> dan menyimpan pilihan. */
export function useTheme(preferensiAwal: PreferensiTema = "sistem"): ThemeApi {
  const [preferensi, setPreferensiState] = useState<PreferensiTema>(
    preferensiAwal === "sistem" ? bacaTema() : preferensiAwal,
  );
  const [sistemGelap, setSistemGelap] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const dengar = (e: MediaQueryListEvent) => setSistemGelap(e.matches);
    mq.addEventListener("change", dengar);
    return () => mq.removeEventListener("change", dengar);
  }, []);

  const tema = terapkanTema(preferensi, sistemGelap);

  useEffect(() => {
    pasangTema(preferensi);
  }, [preferensi, sistemGelap]);

  const setPreferensi = useCallback((p: PreferensiTema) => {
    simpanTema(p);
    setPreferensiState(p);
  }, []);

  const siklus = useCallback(() => {
    setPreferensiState((sekarang) => {
      const berikut: PreferensiTema =
        sekarang === "terang" ? "gelap" : sekarang === "gelap" ? "sistem" : "terang";
      simpanTema(berikut);
      return berikut;
    });
  }, []);

  const ubahTema = useCallback(() => {
    const berikut: Tema = tema === "gelap" ? "terang" : "gelap";
    simpanTema(berikut);
    setPreferensiState(berikut);
  }, [tema]);

  return { preferensi, tema, setPreferensi, siklus, ubahTema };
}

/** Membaca preferensi tersimpan tanpa React (dipakai saat bootstrap). */
export function preferensiTersimpan(): PreferensiTema {
  return bacaTema();
}
