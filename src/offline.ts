/**
 * Pendaftaran service worker (mode offline).
 *
 * Service worker dibuat sebagai berkas statis di /sw.js agar tidak menambah
 * proses build; hanya didaftarkan pada mode produksi.
 */

/** Status mode offline yang bisa ditampilkan di UI. */
export interface StatusOffline {
  /** Peramban mendukung service worker di origin aman. */
  didukung: boolean;
  /** Service worker sudah memegang kendali halaman ini. */
  terdaftar: boolean;
  /** true ketika peramban sedang tidak terhubung (bukan error). */
  tanpaJaringan: boolean;
  /** Mode offline hanya aktif pada build produksi. */
  produksi: boolean;
}

/**
 * Mendaftarkan service worker bila build produksi.
 *
 * Aman dipanggil setelah halaman selesai dimuat maupun belum: bila event
 * `load` sudah lewat, pendaftaran dijalankan langsung.
 */
export function daftarkanServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

  const daftar = (): void => {
    const url = `${import.meta.env.BASE_URL}sw.js`;
    navigator.serviceWorker.register(url).catch(() => {
      /* offline bukan fitur kritis — kegagalan didiamkan dengan sengaja */
    });
  };

  if (document.readyState === "complete") daftar();
  else window.addEventListener("load", daftar, { once: true });
}

/** Status offline saat ini (untuk indikator di halaman Data). */
export function bacaStatusOffline(): StatusOffline {
  const produksi = import.meta.env.PROD;
  const didukung =
    typeof navigator !== "undefined" &&
    "serviceWorker" in navigator &&
    typeof window !== "undefined" &&
    window.isSecureContext;
  const terdaftar = !!didukung && !!import.meta.env.PROD && navigator.serviceWorker.controller !== null;
  const tanpaJaringan = typeof navigator !== "undefined" && navigator.onLine === false;
  return { didukung, terdaftar, tanpaJaringan, produksi };
}

/** Meminta service worker memperbarui cache kerangka aplikasi. */
export function perbaruiCacheOffline(): void {
  navigator.serviceWorker?.controller?.postMessage("perbarui-cache");
}