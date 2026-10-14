# JobTrack - demo portfolio SatuArah Labs

**Pekerjaan dari diterima hingga selesai.** Aplikasi web lokal untuk mencatat tiket
pekerjaan servis (bengkel, perbaikan perangkat, servicedesk kecil): nomor tiket otomatis,
alur status, tenggat, estimasi biaya & DP, catatan pengerjaan, timeline, cetak nota, dan
ekspor data. Seluruh antarmuka berbahasa Indonesia, data contoh realistis bertema servis
perangkat, dan **seluruh data tersimpan di localStorage browser** — tanpa server, tanpa
akun, tanpa layanan berbayar, tanpa permintaan jaringan saat runtime.

> **Catatan isi repo.** Repositori ini berisi JobTrack secara mandiri. `PRD.md` dan
> `BUILD_PROMPT.md` adalah brief asli yang menyebut `../../shared/DESIGN_SYSTEM.md`
> dan `../../shared/REFERENCES.md` — dua dokumen itu berada di struktur portofolio induk,
> di luar repositori ini. Isi dan keputusan desainnya sudah diterjemahkan utuh ke dalam
> kode, `README.md` ini, dan `ACCEPTANCE_CHECKLIST.md`.

---

## 1. Menjalankan aplikasi

Prasyarat Node.js 20+ (diuji pada Node 24).

```bash
npm install          # pasang dependensi
npm run dev          # server pengembangan (default http://localhost:5183)
```

Perintah lain:

```bash
npm run build         # typecheck (tsc --noEmit) + build produksi ke dist/
npm run preview       # pratinjau hasil build produksi
npm run typecheck     # pemeriksaan tipe TypeScript
npm run lint          # ESLint
npm test              # unit test (Vitest) — 104 test, 5 berkas
npm run test:watch    # mode watch
```

Reset data demo: **Data & cadangan → Reset ke data demo** (dengan konfirmasi).

---

## 2. Fitur

### Alur inti (sesuai PRD)

| Area | Detail |
| --- | --- |
| Dasbor | Papan status 5 kolom (aktif, terlambat, siap diambil, dikerjakan, selesai bulan ini), wawasan otomatis, urutan kerja, pelanggan berulang, angka hari ini |
| Tiket | Buat, lihat, ubah, hapus (dengan konfirmasi). Nomor otomatis `TKT-<tahun>-<urutan>` |
| Alur status | Baru → Diperiksa → Dikerjakan → Menunggu Persetujuan/Komponen → Siap Diambil → Selesai / Dibatalkan, dengan peta transisi (lompatan illogical ditolak) |
| Detail tiket | Drawer dengan info lengkap, ringkasan biaya, catatan internal, catatan pengerjaan, timeline perubahan status |
| Cari & filter | Pencarian nomor/nama/perangkat/telepon; filter status, prioritas, "hanya terlambat"; urutan berdasarkan tenggat/terbaru/prioritas/nomor/biaya |
| Validasi | Pesan error Bahasa Indonesia per field, isi form tetap ada saat submit gagal, DP vs estimasi, tenggat vs tanggal masuk, tanggal masuk tidak boleh di masa depan |
| Cetak | Nota pekerjaan per tiket dan daftar tiket hasil filter (dialog print peramban) |
| Data | Ekspor CSV (BOM UTF-8, pemisah titik koma), ekspor JSON cadangan, impor JSON tervalidasi, reset demo, tampilan tersimpan, **status mode offline** |

### Yang membuatnya terasa "premium" (lapisan UX v2)

- **Palet perintah Ctrl/⌘ + K** — buka tiket apa pun, pindah filter, ekspor, cetak, tema,
  pintasan, reset demo. Penuh navigasi keyboard (↑↓ Enter Esc).
- **Undo / Redo (Ctrl+Z / Ctrl+Shift+Z)** untuk setiap perubahan, dengan aksi "Urungkan"
  langsung di dalam toast. Tidak ada perubahan yang hilang tanpa jalan kembali.
- **Edit cepat di tabel** — klik sel estimasi/DP/tenggat, ubah, simpan tanpa dialog.
- **Tindakan massal** — pilih beberapa baris, ubah status atau hapus sekaligus (Undo
  tetap tersedia).
- **Tampilan tersimpan** — filter berat (Terlambat, Sedang dikerjakan, Siap diambil,
  Selesai bulan ini, custom) muncul di navigasi kiri beserta jumlahnya.
- **Mode gelap** penuh lewat tombol di topbar; "sistem" tersedia di palet perintah.
- **Pintasan keyboard** — `Ctrl K` palet, `Ctrl G/T/B` pindah halaman, `N` tiket baru,
  `/` fokus pencarian, `?` daftar pintasan, `Esc` tutup panel.
- **Aksesibilitas** — semua ikon punya label, dialog menahan fokus & mengembalikannya,
  form punya `label`/`aria-describedby`/`aria-invalid`, toast memakai `aria-live`.

### Otomasi tanpa biaya (seluruhnya lokal)

| Fitur | Cara kerja |
| --- | --- |
| Katalog servis | 11 kategori (laptop, printer, AC, kulkas, mesin cuci, handphone, TV, CCTV, peralatan dapur, mesin, instalasi) dengan estimasi awal, contoh perangkat, dan template catatan pemeriksaan |
| Tebak kategori | Menebak kategori dari nama perangkat/deskripsi yang diketik (berbasis posisi kata kunci) |
| Saran tenggat | Menghitung tenggat otomatis memakai **hari kerja** (Minggu libur) × pengali prioritas |
| Deteksi pelanggan | Mengenali pelanggan lama (nama inti + nomor telepon dinormalkan) dan menawarkan "Isi otomatis" dari riwayatnya |
| Wawasan otomatis | Menghitung apa yang perlu ditangani hari ini: terlambat, kritis, unit siap belum diambil, tertahan menunggu komponen, akan jatuh tempo, tiket Baru macet, rekap bulanan — masing-masing dengan satu klik tindakan |
| Kesehatan tiket | Kategori "sehat / perlu perhatian / kritis / ditutup" untuk kolom/meter |
| Nomor tiket | Nomor berurutan per tahun, tidak akan bertabrakan setelah impor data lama |
| Mode offline | Service worker (hanya build produksi) menyimpan kerangka aplikasi; halaman, data, dan semua aksi tetap berfungsi saat koneksi putus. Halaman Data menampilkan statusnya secara jujur |

### Bekerja tanpa koneksi (terverifikasi)

Saat build produksi dijalankan, aplikasi installation-serviceable:

- Navigasi: **jaringan dulu**, jatuh ke cache halaman bila gagal.
- Aset (JS/CSS/font): **stale-while-revalidate** — pakai cache, perbarui di belakang.
- Data tetap utuh karena ada di localStorage, bukan di jaringan.

Diuji dengan jaringan benar-benar diputus (`set_offline`): dasbor termuat, 24 tiket
terbaca, dan tiket baru **tetap berhasil dibuat** saat offline. Halaman Data
menampilkan "Tanpa koneksi — aplikasi tetap terbuka dari cache".

---

## 3. Arsitektur

```
src/
  main.tsx                 bootstrap: font self-hosted + token CSS + provider
  offline.ts               pendaftaran service worker (hanya produksi)
  app/
    App.tsx                perakitan: routing hash → halaman → dialog/drawer/cetak/palet
    AppShell.tsx           navigasi kiri (bisa diciutkan), top bar, tampilan tersimpan
    CommandPalette.tsx     palet perintah Ctrl+K + pencocokan sederhana
  domain/                  *** logika bisnis murni *** (tanpa React, tanpa DOM/network)
    types.ts               model data (Ticket, DraftTiket, FilterTiket, Tampilan…)
    dates.ts               tanggal lokal "yyyy-mm-dd", format id-ID, hari kerja, label relatif
    money.ts               rupiah & angka format Indonesia, parse input
    status.ts              metadata status/prioritas + peta transisi + alur utama
    ticket.ts              aturan: terlambat, sisa tagihan, nomor, timeline, metrik, filter
    validation.ts          validasi form + skema tiket untuk data tak dipercaya
    catalog.ts             katalog servis & saran otomatis
    customers.ts           deduplikasi & profil pelanggan
    health.ts              kesehatan tiket + wawasan otomatis
    selectors.ts           (lihat data/) derivasi metrik untuk UI
  data/                    penyimpanan & berkas
    storage.ts             localStorage terversi, migrasi, impor tervalidasi, kuota
    seed.ts                24 tiket contoh relatif tanggal hari ini
    csv.ts                 ekspor CSV (BOM + titik koma)
    backup.ts              ekspor JSON cadangan, unduh berkas, baca berkas
  state/
    store.tsx              reducer tunggal + riwayat Undo/Redo + persistensi
    theme.ts               tema terang/gelap/sistem
  ui/                      primitif (tombol, field, dialog, popover, toast, angka animasi)
    index.tsx
    shortcuts.ts           daftar pintasan keyboard
  features/                satu folder per fitur (fitur vs lapisan data rapi terpisah)
    Dashboard.tsx          papan kerja + wawasan + urutan kerja
    TicketList.tsx         ledger padat + edit cepat + aksi massal + kartu mobile
    TicketSheet.tsx        drawer detail + timeline + catatan
    TicketForm.tsx         form dengan otomasi
    DataPage.tsx           ekspor/impor/reset + kondisi penyimpanan + batasan
    Print.tsx              dokumen cetak (nota & daftar)
  styles/
    tokens.css             warna, tipografi, spasi, geometri, mode gelap
    base.css               reset ringan, tipografi, fokus, utilitas, gerak
    layout.css             kerangka, navigasi, papan, drawer, dialog, palet, responsif
    components.css         tombol, lencana, field, timeline, meter, toast, kartu
    print.css              aturan @media print untuk dokumen
tests/                     104 test: aturan tiket, validasi, data/impor, otomasi, tanggal
public/sw.js               service worker offline (asli, tanpa dependensi)
```

Prinsip arsitektur yang dipertahankan:

1. **Logika bisnis murni.** Semua aturan (keterlambatan, sisa tagihan, metrik, tebak
   kategori, wawasan) ada di `src/domain` tanpa React/DOM/network, sehingga bisa diuji
   langsung — itulah sebabnya 104 test berjalan <1 detik tanpa mock.
2. **State tunggal + riwayat.** Satu reducer untuk seluruh tiket, ditambah `riwayat`
   undo/redo sehingga setiap perubahan punya jalan kembali.
3. **Data tidak dipercaya.** Berkas impor diperiksa per tiket; gagal impor tidak akan
   menyentuh data yang sedang dipakai. Skema localStorage berversi.
4. **Styling tokenized.** CSS biasa (tanpa framework) dengan token warna/spasi/geometri
   yang konsisten; mode gelap memakai token yang sama.
5. **Tanpa aset eksternal.** Font Inter di-bundle melalui `@fontsource-variable/inter`
   (file woff2 lokal), ikon dari `lucide-react`, ilustrasi dari CSS/SVG. Tidak ada CDN.

---

## 4. Referensi (pola, bukan penjiplakan)

Produk global: **Linear** (palet perintah, keyboard-first, optimistic), **Stripe Dashboard**
(ketelitian angka & tabel padat), **Zendesk/Freshdesk/Attio** (siklus tiket, SLA aging,
pantauan "butuh perhatian", deduplikasi pelanggan), **RepairDesk/AutoLeap/Jobber**
(alur kerja servis: intake → diagnosis → pengerjaan → siap diambil → tutup).

Produk lokal/Indonesia: **Accurate Online, BeeAccounting, Jurnalku** (aplikasi SME
Bahasa Indonesia yang tenang dan langsung), **majoo / Kasir Pintar** (daftar + status
chip + filter + ekspor, kartu di mobile), **Tokopedia/Shopee Seller Center** (pola
merchant: filter, ekspor, cetak, bahasa status lokal).

Semua referensi dipakai untuk memahami pola; tidak ada aset, teks, maupun tampilan
yang disalin.

---

## 5. Batasan yang diketahui (jujur)

1. **Local-first, bukan produksi.** Data hanya di peramban ini; menghapus data situs atau
   memakai peramban lain kehilangan data. Tidak ada sinkronisasi antar-perangkat.
2. **Tidak ada backend/akun/multi-pengguna** (sesuai batasan PRD).
3. **Uji visual hanya di Chromium** (Playwright headless). Firefox dan WebKit belum diuji.
4. **Jendela cetak asli diverifikasi secara terbatas**: yang diuji adalah isi dokumen
   yang dikirim ke `window.print()` dan hasil `@media print` (kerangka aplikasi
   disembunyikan, hanya dokumen tercetak). Kotak dialog "Simpan sebagai PDF" milik
   peramban tidak diuji otomatis.
5. **Undo/Redo hanya sejauh 40 langkah** dan tidak tersedia antar sesi (setelah reload,
   riwayat mulai lagi).
6. **Estimasi tenggat otomatis** berpatokan pada kebiasaan bengkel (Senin–Sabtu) dan
   bisa disetel manual di form — ia saran, bukan pengikat.
7. **Pencarian daftar** sederhana (substring pada nomor/nama/perangkat/telepon),
   belum ada fuzzy search di daftar tabel (fuzzy ada di palet perintah).
8. **Tanpa pagination**: ratusan baris membuat tabel panjang (tetap dapat digulir).
9. **Mode offline hanya pada build produksi** dan hanya di origin yang aman
   (`https://` atau `localhost`). Cache keeping berumur satu versi build; setelah
   versi baru, aset lama dibersihkan otomatis.
10. **Belum divalidasi pengguna riil.** Ini demo portfolio; klaim "cocok untuk bengkel X"
    belum diuji dengan pemilik usaha.

---

## 6. Ringkasan verifikasi

| Perintah / pengujian | Hasil |
| --- | --- |
| `npm run typecheck` | 0 error |
| `npm run lint` | 0 error, 0 warning |
| `npm test` | 104/104 test lulus (5 berkas) |
| `npm run build` | lulus — JS 360 kB (gzip 109 kB), CSS 42 kB (gzip 8,7 kB), `sw.js` 2,6 kB, font woff2 self-hosted |
| Uji browser **mode dev** (Chromium) | 31 pemeriksaan alur inti lulus, 0 `console.error`/`warning`, 0 `pageerror` |
| Uji browser **build produksi** (Chromium + `vite preview`) | 9 pemeriksaan lulus, termasuk mode offline sungguhan (jaringan diputus) |
| Permintaan jaringan saat runtime | **0** ke domain luar (tidak ada CDN/aset remote) |
| Responsif | 360px, 768px, 1440px tanpa overflow horizontal; tabel → kartu di ponsel |

### Bug nyata yang ditemukan oleh pengujian (bukan asumsi)

| Temuan | Cara ditemukan | Perbaikan |
| --- | --- | --- |
| Timeline menampilkan "**NaN tahun lalu**" | Screenshot drawer detail | Regex `labelSejak` menangkap tanggal sebagai satu grup → `new Date("2026-10-14", ...)` = NaN. Diperbaiki + 9 test regresi baru (`tests/dates.test.ts`) |
| **Topbar meluber 41px di 360px** | Pengukuran `scrollWidth - clientWidth` | Topbar tidak wrapping + teks pemicu palet terlalu panjang → `flex-wrap` + sembunyikan teks < 560px |
| Palet perintah **tidak menutup** setelah menjalankan aksi | Klik tombol "Langkah berikutnya" tertahan (elementFromPoint = `.palet`) | Semua perintah kini menutup palet setelah dijalankan |
| Service worker **tidak pernah terdaftar** | Uji build produksi (`getRegistrations()` = 0) | `public/sw.js` hilang dari proyek sehingga pendaftaran gagal diam-diam; berkas dibuat, ESLint diberi konteks service worker, dan mode offline diuji dengan jaringan diputus |
| Banner demo menyebut "22 tiket" padahal seed 24 | Pemeriksaan konsistensi | Angka kini diturunkan dari data (`tiket.length`), tidak bisa meleset lagi |
| Toast "Urungkan" tidak muncul untuk tiket baru | Uji alur undo | Aksi undo kini tersedia untuk pembuatan tiket juga |

Rincian per butir ada di `ACCEPTANCE_CHECKLIST.md`. Tidak ada klaim "nol bug" — daftar
keterbatasan di atas menyebut hal yang **tidak** diverifikasi.
