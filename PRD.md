# JobTrack — FastTrack MVP PRD

## 1. Product brief
- **Product:** JobTrack
- **Positioning:** Pantau pekerjaan dari diterima hingga selesai.
- **Audience:** Small Indonesian businesses; use realistic Indonesian sample data and Bahasa Indonesia UI.
- **Purpose:** Demo ticket pekerjaan untuk bengkel servis, percetakan, atau bisnis yang menerima pekerjaan custom. Gunakan contoh data bertema servis/perbaikan perangkat.
- **Portfolio goal:** demonstrate a working business workflow, polished UI, reliable calculations, validation, and maintainable frontend code.
- **Reference products:** RepairDesk work orders, repair tickets, job status and due-date patterns: https://www.repairdesk.co/features/ ; Jobber workflow overview: https://help.getjobber.com/en/articles/jobber-workflow-overview/

## 2. MVP features — must implement
- Dashboard: pekerjaan aktif, terlambat, siap diambil, selesai bulan ini.
- CRUD tiket dengan nomor otomatis, pelanggan, item/perangkat, deskripsi masalah/pekerjaan, prioritas, tanggal masuk, tenggat, biaya estimasi, DP, catatan internal.
- Workflow: Baru, Diperiksa, Dikerjakan, Menunggu Persetujuan/Komponen, Siap Diambil, Selesai, Dibatalkan.
- Detail tiket menampilkan timeline perubahan status yang dicatat di browser dan catatan pengerjaan.
- Pencarian tiket berdasarkan nomor/nama; filter status, prioritas, dan terlambat.
- Cetak ringkasan tiket/nota melalui browser print; ekspor CSV daftar tiket.
- localStorage, seeded demo data, ekspor/impor JSON, Reset Demo dengan konfirmasi.

## 3. Business rules and edge cases
- Tenggat < tanggal hari ini dan status bukan Selesai/Dibatalkan dianggap terlambat.
- Perubahan status membuat event timeline dengan timestamp; hindari mengubah timeline lama saat tiket diedit.
- DP tidak boleh negatif atau lebih besar dari total estimasi bila total tersedia; tampilkan sisa dengan benar.


## 4. UX/UI requirements
Follow `../../shared/DESIGN_SYSTEM.md`. Use a cohesive, premium SaaS workspace; a distinct app identity; responsive layout; consistent sidebar/top bar; good typography; thoughtful spacing; real loading-free local state; meaningful empty states; accessible forms; and natural Bahasa Indonesia throughout. Make the first view impressive with seeded data but ensure all metrics and tables derive from actual application state.

## 5. Technical constraints
- Standalone frontend app in this folder. Use **Vite + React + TypeScript**.
- Keep dependencies small and stable. Use `lucide-react` for icons. Use plain CSS/CSS modules or the lightest reliable styling setup already present. Do not spend time configuring a complex monorepo or design system package.
- No paid services, no API keys, no mandatory server, no login requirement, no paid fonts/images, no runtime dependency on external URLs.
- Persist demo data using versioned `localStorage`; initialize with realistic seed data on first run. Add a reset-to-demo control with confirmation. Provide export/import backup where specified.
- Currency in IDR; display dates in Indonesian locale (`id-ID`). Store numeric money values as integers in rupiah where appropriate.
- Treat imported JSON as untrusted: validate its basic schema before replacing local data; failed import must not destroy current data.
- Avoid `any` unless there is a documented reason. Extract business calculations into pure, testable functions.
- No remote messaging/payment automation. If a share action exists, use clipboard or `wa.me` link only, and never claim a message was sent automatically.

## 6. Out of scope — do not build
- Authentication, multi-user permissions, backend/API, cloud sync, payments, email/SMS/WhatsApp APIs, AI features, multi-tenant SaaS, mobile native apps, elaborate charts, or features not listed in this PRD.
- Do not add features merely to make the app appear bigger. Finish and test this MVP first.

## 7. Definition of done
- All must-have features in this PRD work end-to-end.
- UI is in Bahasa Indonesia; no lorem ipsum, broken links, dead buttons, fake chart values, or console errors from normal use.
- Data survives reload and the reset-demo flow works.
- Forms validate edge cases; important destructive actions require confirmation.
- `npm run build` succeeds; run lint/typecheck/tests if configured and fix findings. Include at least focused tests for key business rules.
- `README.md` includes install/run/build/test commands, features, architecture notes, demo limitations, and how to reset demo data.
- Include a final report distinguishing tests actually run from checks not performed. Never claim “zero bugs”; list known limitations honestly.

## 8. Scope boundary
MVP single-user lokal; tidak ada portal pelanggan publik, notifikasi SMS/email, atau multi-user.
