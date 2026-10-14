/*
 * JobTrack - service worker (mode offline).
 *
 * Tujuan: aplikasi tetap terbuka & berfungsi saat koneksi putus, karena seluruh
 * data JobTrack sudah berada di localStorage peramban.
 *
 * Strategi:
 *   - Navigasi  : jaringan dulu, jatuh ke cache saat gagal (halaman tetap tampil).
 *   - Aset statis: pakai cache bila ada, perbarui di belakang (stale-while-revalidate).
 *   - Cache berversi: cache lama dibersihkan saat aktivasi.
 *
 * Berkas ini statis (disalin apa adanya dari folder public/) dan sengaja tidak
 * memakai tooling atau dependensi apa pun.
 */

const VERSI = "jobtrack-v2";
const INTI = `${VERSI}-inti`;
const KERANG = ["/", "/index.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(INTI)
      // addAll gagal seluruhnya bila satu URL hilang; karena itu di-tolerant.
      .then((cache) => Promise.allSettled(KERANG.map((url) => cache.add(url))))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((kunci) =>
        Promise.all(kunci.filter((k) => !k.startsWith(VERSI)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const permintaan = event.request;
  if (permintaan.method !== "GET") return;

  const url = new URL(permintaan.url);
  if (url.origin !== self.location.origin) return;

  if (permintaan.mode === "navigate") {
    event.respondWith(
      fetch(permintaan)
        .then((jawaban) => {
          const salinan = jawaban.clone();
          caches.open(INTI).then((cache) => cache.put("/index.html", salinan));
          return jawaban;
        })
        .catch(() =>
          caches.match("/index.html").then((tersimpan) => tersimpan || caches.match("/")),
        ),
    );
    return;
  }

  event.respondWith(
    caches.match(permintaan).then((tersimpan) => {
      const dariJaringan = fetch(permintaan)
        .then((jawaban) => {
          if (jawaban.ok && jawaban.type === "basic") {
            const salinan = jawaban.clone();
            caches.open(INTI).then((cache) => cache.put(permintaan, salinan));
          }
          return jawaban;
        })
        .catch(() => tersimpan);
      return tersimpan || dariJaringan;
    }),
  );
});

/* Permintaan paksa memperbarui dari menu Data ("Perbarui versi offline"). */
self.addEventListener("message", (event) => {
  if (event.data === "perbarui-cache") {
    event.waitUntil(
      caches.open(INTI).then((cache) => cache.addAll(KERANG).catch(() => undefined)),
    );
  }
});