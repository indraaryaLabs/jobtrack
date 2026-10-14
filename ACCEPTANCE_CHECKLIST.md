# JobTrack — Acceptance Checklist (v2)

Status verifikasi terakhir: **14 Oktober 2026**. Semua perintah dijalankan di folder
`projects/04-jobtrack`. Tidak ada kotak yang dicentang tanpa bukti.

## Pemeriksaan yang dilakukan

| Perintah | Hasil |
| --- | --- |
| `npm run typecheck` (`tsc --noEmit`) | **0 error** |
| `npm run lint` (`eslint .`) | **0 error, 0 warning** |
| `npm test` (`vitest run`) | **104/104 lulus** di 5 berkas: `ticket.test.ts`, `validation.test.ts`, `data.test.ts`, `automation.test.ts`, `dates.test.ts` |
| `npm run build` (`tsc --noEmit && vite build`) | **lulus** → `dist/` (JS 360 kB / gzip 109 kB, CSS 42 kB / gzip 8,7 kB, `sw.js` 2,6 kB, font Inter woff2 self-hosted) |
| `npm run preview` + Chromium | build produksi diuji ulang: **9 pemeriksaan lulus** (papan, 24 tiket, tebak kategori, palet Ctrl+K, persistensi setelah reload, mode gelap, service worker) |
| Mode offline (jaringan **benar-benar diputus**) | **lulus** — dasbor & 24 tiket termuat dari cache, tiket baru tetap berhasil dibuat saat offline, UI memberi tahu "Tanpa koneksi" |
| Permintaan jaringan saat runtime | **0** ke domain luar — tidak ada CDN, font, atau aset remote |
| Playwright headless (Chromium, mode dev) | **31 pemeriksaan lulus, 0 gagal**, 0 `console.error`/`warning`, 0 `pageerror` |
| Responsif | 1440 / 768 / 360 px diukur → `scrollWidth - clientWidth = 0` (tanpa overflow horizontal) |

## Produk & interaksi

- [x] **Dasbor memakai nilai terhitung dari state aplikasi.** `hitungMetrik()` dari
      `src/domain/ticket.ts`; 5 kolom papan, wawasan, urutan kerja, dan panel angka
      semuanya turunan dari data tiket. Diuji di unit test + browser (19/7/5/6/2 sama
      sama dengan jumlah baris daftar).
- [x] **Data contoh muncul di kunjungan pertama dan ditandai.** 24 tiket contoh;
      sidebar menampilkan "Data demo · 24 tiket · tersimpan lokal", halaman Data punya
      banner pengantar. Reset mengembalikan data contoh.
- [x] **Buat/baca/ubah/hapus berfungsi.** Create (nomor otomatis `TKT-2026-0025`),
      update (form + edit cepat), delete (dikonfirmasi, bisa di-Undo) — diuji di browser.
- [x] **Pencarian & filter benar.** Tabel filter terlambat → 7 baris = angka papan;
      pencarian "epson" → 1 baris; unit test mencakup kombinasi beberapa filter.
- [x] **Setiap tombol/lakon punya akibat atau disabled dengan penjelasan.** Tombol nonaktif
      selalu punya `title`; aksi konsisten (pakai `aria-label`). Konfirmasi untuk hapus,
      hapus massal, reset, dan ganti-via-impor.
- [x] **Validation wajib ada.** Semua pesan error Bahasa Indonesia per field; isi form tidak
      hilang saat gagal (dicek di browser & unit test).
- [x] **Aksi merusak memakai konfirmasi.** Terverifikasi untuk hapus tiket, hapus massal,
      reset demo, dan ganti data impor.
- [x] **Data bertahan setelah reload.** Diverifikasi (tiket buatan sendiri + status
      yang diubah tetap ada).
- [x] **Reset demo memulihkan dataset contoh.** Diverifikasi setelah konfirmasi.
- [x] **Ekspor jalan; JSON divalidasi dan berkas rusak tidak menghancurkan data.** CSV/BOM,
      cadangan JSON, impor rusak ditolak dengan pesan spesifik + data utuh — diuji browser
      dan unit test.
- [x] **Edge case PRD diuji.** Terlambat (lewat/hari ini/Selesai/Dibatalkan), sisa
      tagihan (DP = estimasi, DP > estimasi, data tidak konsisten), timeline append-only,
      nomor lintas tahun, impor duplikat/rusak/tanggal tidak sah, tanggal 31 Februari,
      label relatif (regresi "NaN tahun lalu" ditemukan & diperbaiki).

## Kualitas visual

- [x] **UI Bahasa Indonesia penuh; tanpa lorem ipsum.** Seluruh string diperiksa (termasuk
      deskripsi kategori perangkat pada data contoh); angka/date format id-ID.
- [x] **Responsif 360/768/1440.** Screenshot di-review pada ketiga lebar; tabel berubah
      menjadi kartu di <760px, drawer menjadi full-screen, pesan topbar melipat.
- [x] **Tanpa overflow horizontal.** Selisih 0 px di 360 & 768 pada papan, daftar, dan
      dialog (bug overflow 41px pada topbar ditemukan lewat pengukuran & diperbaiki).
- [x] **Fokus keyboard, label, kontras, tombol ikon aksesibel.** `:focus-visible` ring,
      dialog menahan & mengembalikan fokus, `aria-label`/`aria-describedby`/`aria-invalid`
      pada kontrol, Escape menutup dialog/drawer, `aria-live` pada toast.
- [x] **Empty state & umpan balik masuk akal.** Empty state untuk "belum ada tiket" dan
      "tidak ada yang cocok" dengan aksi lanjutan; toast sukses/info/galat + aksi
      "Urungkan"; tidak ada spinner palsu karena semua data lokal dan sinkron.
- [x] **Tanpa error konsol pada alur inti.** 0 error, 0 warning (Chromium). **Batas:**
      hanya Chromium; Firefox/WebKit belum diuji.

## Teknik

- [x] **`npm run build` lulus.**
- [x] **`tsc --noEmit` & `eslint .` lulus, hasil dicatat jujur** (0 error, 0 warning).
- [x] **Aturan bisnis punya test fokus.** 104 test; aturan tiket, validasi form & skema
      impor, penyimpanan/cadangan/CSV, otomasi (katalog, hari kerja, dedup pelanggan,
      wawasan), format tanggal & label relatif.
- [x] **README memuat cara install/run/build/test, fitur, arsitektur, dan batasan.**
- [x] **Tanpa secret/API key/layanan berbayar/aset wajib remote.** Hanya
      `react`, `react-dom`, `lucide-react`, `@fontsource-variable/inter` (font di-bundle
      lokal) + toolchain dev. Dibuktikan: 0 permintaan ke domain luar saat runtime.
- [x] **Bisa dipakai tanpa koneksi (build produksi).** Service worker menyimpan kerangka
      aplikasi; diuji dengan jaringan diputus — dasbor, daftar, dan pembuatan tiket tetap
      berfungsi. Halaman Data melaporkan statusnya secara jujur.
- [x] **Klaim README diverifikasi, bukan diasumsikan.** Daftar bug nyata yang ditemukan
      pengujian (label "NaN tahun lalu", topbar meluber 41px di 360px, palet tidak
      menutup, service worker hilang, angka "22 tiket" yang salah, undo tidak tersedia
      untuk tiket baru) ada di README bagian 6 beserta cara penemuannya.
- [x] **Dijelaskan sebagai demo lokal portfolio**, bukan produk produksi (README & halaman
      Data menyatakan ini).

## Keputusan akhir

- [ ] PASS — semua pemeriksaan release-critical diverifikasi.
- [x] **PASS WITH LIMITATIONS** — alur inti & kualitas visual berjalan; batasan terdokumentasi.
- [ ] BLOCKED — alur inti/build gagal.

### Batasan yang dicatat (lihat README bagian 5)

1. Uji visual hanya di Chromium; Firefox/WebKit belum diuji.
2. Dialog cetak asli diverifikasi lewat isi dokumen + `@media print`, bukan tampilan
   jendela cetak peramban.
3. Undo/Redo maksimal 40 langkah dan tidak bertahan antar sesi.
4. Saran tenggat otomatis berpijak pada asumsi hari kerja Senin–Sabtu (bisa diedit).
5. Pencarian daftar masih substring (bukan fuzzy seperti palet perintah).
6. Tanpa pagination; ratusan baris membuat tabel panjang.
7. Mode offline hanya aktif pada build produksi dan hanya di origin aman (`https://` atau
   `localhost`).
8. Belum divalidasi dengan pengguna/pemilik usaha nyata.
