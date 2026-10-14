/**
 * Data contoh JobTrack — 24 tiket bertema bengkel servis perangkat.
 *
 * Data dibuat relatif terhadap tanggal hari ini sehingga dasbor selalu
 * "hidup": ada yang terlambat, ada yang siap diambil, ada yang selesai bulan
 * ini. Tidak ada angka statis yang disconnection dari data.
 */

import type { CatatanKerja, Prioritas, Status, Ticket, TimelineEvent } from "../domain/types";
import { hariIni, keISO, tambahHari } from "../domain/dates";
import { idBaru } from "../domain/ticket";

const pad = (n: number): string => String(n).padStart(2, "0");

interface Jejak {
  ke: Status;
  /** Berapa hari yang lalu (positif = lampau). */
  lalu: number;
  jam?: [number, number];
}

interface CatatanSeed {
  lalu: number;
  jam?: [number, number];
  teks: string;
}

interface Bibit {
  pelanggan: string;
  telepon: string;
  perangkat: string;
  kategori: string;
  deskripsi: string;
  prioritas: Prioritas;
  status: Status;
  masuk: number;
  tenggat: number;
  estimasi: number;
  dp: number;
  catatan: string;
  jejak?: Jejak[];
  catatanKerja?: CatatanSeed[];
}

/** Offset "hari lalu" -> tanggal; positif berarti sudah lewat. */
function lalu(hariIniISO: string, n: number): string {
  return tambahHari(hariIniISO, -n);
}

function st(hariIniISO: string, hariLalu: number, jam: [number, number] = [9, 0]): string {
  return `${lalu(hariIniISO, hariLalu)}T${pad(jam[0])}:${pad(jam[1])}:00`;
}

const BIBIT: Bibit[] = [
  {
    pelanggan: "Sari Wulandari",
    telepon: "0812-3411-7788",
    perangkat: "Kulkas Sharp 2 Pintu SJ-236M",
    kategori: "Kulkas / Freezer",
    deskripsi: "Kulkas tidak dingin dua hari. Kompresor berbunyi nyaring dan air menetes di rak bawah.",
    prioritas: "tinggi",
    status: "baru",
    masuk: 0,
    tenggat: 2,
    estimasi: 350000,
    dp: 100000,
    catatan: "Pelanggan minta konfirmasi harga servis kompresor sebelum unit dibongkar.",
  },
  {
    pelanggan: "Bambang Setiawan",
    telepon: "0857-9902-1145",
    perangkat: "Printer Epson L3110",
    kategori: "Printer / Scanner",
    deskripsi: "Hasil cetak bergaris horizontal dan kertas sering tarik dua lembar. Perlu cuci head.",
    prioritas: "normal",
    status: "baru",
    masuk: 0,
    tenggat: 3,
    estimasi: 275000,
    dp: 0,
    catatan: "Pelanggan bisa menunggu satu jam di tempat.",
  },
  {
    pelanggan: "Dewi Lestari",
    telepon: "0813-2276-5409",
    perangkat: "Laptop ASUS VivoBook 15 A516",
    kategori: "Laptop / Komputer",
    deskripsi: "Laptop tidak mau menyala, indikator power kelip tiga kali. Dicurigai RAM atau motherboard.",
    prioritas: "normal",
    status: "diperiksa",
    masuk: 4,
    tenggat: -2,
    estimasi: 450000,
    dp: 150000,
    catatan: "Data penting belum dibackup — jangan format sebelum konfirmasi.",
    jejak: [{ ke: "diperiksa", lalu: 1, jam: [11, 20] }],
    catatanKerja: [
      { lalu: 1, jam: [11, 25], teks: "Adaptor 19V stabil, motherboard belum memberi tanda kehidupan." },
    ],
  },
  {
    pelanggan: "Rizky Pratama",
    telepon: "0895-3310-2267",
    perangkat: "AC Panasonic 1 PK CS-PN12",
    kategori: "AC / Pendingin",
    deskripsi: "AC tidak dingin dan indoor unit menetes es. Perlu cek freon dan saluran pembuangan.",
    prioritas: "tinggi",
    status: "dikerjakan",
    masuk: 3,
    tenggat: 1,
    estimasi: 575000,
    dp: 200000,
    catatan: "Rumah lantai dua — bawa tangga. Jalan akses sempit.",
    jejak: [
      { ke: "diperiksa", lalu: 2, jam: [10, 5] },
      { ke: "dikerjakan", lalu: 2, jam: [13, 40] },
    ],
    catatanKerja: [
      { lalu: 2, jam: [10, 5], teks: "Tekanan refrigeran rendah, bocor di sambungan pipa." },
      { lalu: 2, jam: [13, 40], teks: "Indoor unit dibongkar, koil dibersihkan, selang pembuangan diganti." },
    ],
  },
  {
    pelanggan: "Nurhaliza",
    telepon: "0821-7788-9043",
    perangkat: "Mesin Cuci LG 8kg Front Loading",
    kategori: "Mesin Cuci / Pengering",
    deskripsi: "Pintu tidak terkunci dan mesin berhenti di awal siklus dengan kode dE.",
    prioritas: "normal",
    status: "dikerjakan",
    masuk: 2,
    tenggat: -1,
    estimasi: 425000,
    dp: 100000,
    catatan: "Switch pintu sudah pernah diganti teknisi lain — cek kabel door lock.",
    jejak: [
      { ke: "diperiksa", lalu: 2, jam: [15, 10] },
      { ke: "dikerjakan", lalu: 1, jam: [9, 30] },
    ],
    catatanKerja: [{ lalu: 1, jam: [9, 30], teks: "Door lock normal; kabel harness putus di bagian engsel." }],
  },
  {
    pelanggan: "Ahmad Fauzi",
    telepon: "0811-6543-2210",
    perangkat: "Laptop MacBook Air M1 2020",
    kategori: "Laptop / Komputer",
    deskripsi: "Beberapa tombol keyboard mati setelah terkena air.",
    prioritas: "darurat",
    status: "menunggu",
    masuk: 6,
    tenggat: 2,
    estimasi: 1850000,
    dp: 500000,
    catatan: "Menunggu modul keyboard pengganti dari supplier.",
    jejak: [
      { ke: "diperiksa", lalu: 5, jam: [14, 0] },
      { ke: "menunggu", lalu: 4, jam: [10, 15] },
    ],
    catatanKerja: [
      { lalu: 5, jam: [14, 0], teks: "Baterai, trackpad, dan logic board bersih — kerusakan hanya modul keyboard." },
      { lalu: 4, jam: [10, 15], teks: "Modul keyboard dipesan, estimasi tiba 3–4 hari kerja." },
    ],
  },
  {
    pelanggan: "Maya Sari",
    telepon: "0878-2214-7781",
    perangkat: "CCTV Hikvision 4 Channel + HDD 1TB",
    kategori: "CCTV / Keamanan",
    deskripsi: "DVR tidak merekam dan menu tidak terbuka setelah listrik padam.",
    prioritas: "normal",
    status: "menunggu",
    masuk: 6,
    tenggat: -3,
    estimasi: 780000,
    dp: 0,
    catatan: "Menunggu persetujuan pemilik toko untuk biaya adaptor pengganti.",
    jejak: [
      { ke: "diperiksa", lalu: 1, jam: [16, 0] },
      { ke: "menunggu", lalu: 0, jam: [10, 45] },
    ],
    catatanKerja: [
      { lalu: 1, jam: [16, 0], teks: "Adaptor output 12V terbakar; harddisk masih terbaca di komputer." },
      { lalu: 0, jam: [10, 45], teks: "Penawaran adaptor + cek setting rekam dikirim ke pemilik toko." },
    ],
  },
  {
    pelanggan: "Eko Prasetyo",
    telepon: "0812-8876-3390",
    perangkat: "TV LED Samsung 43 AU7000",
    kategori: "TV / Audio",
    deskripsi: "Garis vertikal di tengah layar dan suara kresek-kresek.",
    prioritas: "normal",
    status: "siap_diambil",
    masuk: 4,
    tenggat: 1,
    estimasi: 640000,
    dp: 300000,
    catatan: "Garis hilang setelah konektor T-CON dipasang ulang. Garansi servis 30 hari.",
    jejak: [
      { ke: "diperiksa", lalu: 4, jam: [10, 30] },
      { ke: "dikerjakan", lalu: 3, jam: [9, 15] },
      { ke: "siap_diambil", lalu: 1, jam: [16, 20] },
    ],
    catatanKerja: [
      { lalu: 3, jam: [9, 15], teks: "Konektor T-CON terkelupas — dibersihkan dan dipasang ulang." },
      { lalu: 1, jam: [16, 20], teks: "Uji tampil dua jam, layar bersih. Pelanggan diberi tahu siap diambil." },
    ],
  },
  {
    pelanggan: "Fitriani",
    telepon: "0852-4410-9988",
    perangkat: "Rice cooker Yongma YMC 2 Liter",
    kategori: "Peralatan Dapur",
    deskripsi: "Nasi tidak matang merata dan tombol cook turun terlalu cepat.",
    prioritas: "rendah",
    status: "siap_diambil",
    masuk: 3,
    tenggat: 2,
    estimasi: 165000,
    dp: 165000,
    catatan: "Thermostat diganti 145°C, sudah diuji masak dua kali.",
    jejak: [
      { ke: "diperiksa", lalu: 3, jam: [13, 0] },
      { ke: "dikerjakan", lalu: 2, jam: [10, 0] },
      { ke: "siap_diambil", lalu: 0, jam: [11, 30] },
    ],
    catatanKerja: [{ lalu: 2, jam: [10, 0], teks: "Thermostat diganti, panci dibersihkan dari kerak." }],
  },
  {
    pelanggan: "Hendra Gunawan",
    telepon: "0819-3344-5512",
    perangkat: "Genset Honda EU22i",
    kategori: "Mesin / Alat Berat",
    deskripsi: "Servis 250 jam: ganti oli, filter udara, cek busi, dan uji beban.",
    prioritas: "normal",
    status: "siap_diambil",
    masuk: 2,
    tenggat: -2,
    estimasi: 520000,
    dp: 200000,
    catatan: "Dipakai untuk warung kopi — pastikan rpm stabil.",
    jejak: [
      { ke: "diperiksa", lalu: 2, jam: [9, 0] },
      { ke: "dikerjakan", lalu: 1, jam: [10, 30] },
      { ke: "siap_diambil", lalu: 0, jam: [15, 0] },
    ],
    catatanKerja: [
      { lalu: 1, jam: [10, 30], teks: "Oli mesin dan filter udara diganti, karburator dibersihkan." },
      { lalu: 0, jam: [15, 0], teks: "Uji beban satu jam, tegangan stabil 220V." },
    ],
  },
  {
    pelanggan: "Ratna Kusuma",
    telepon: "0896-7781-2245",
    perangkat: "Kompor Gas 2 Tungku Modena",
    kategori: "Peralatan Dapur",
    deskripsi: "Api tungku kiri kecil dan tidak stabil, nyala api hitam.",
    prioritas: "normal",
    status: "siap_diambil",
    masuk: 5,
    tenggat: 1,
    estimasi: 285000,
    dp: 100000,
    catatan: "Injektor tersumbat minyak, sudah dibersihkan.",
    jejak: [
      { ke: "diperiksa", lalu: 5, jam: [11, 0] },
      { ke: "dikerjakan", lalu: 4, jam: [9, 45] },
      { ke: "siap_diambil", lalu: 0, jam: [14, 0] },
    ],
    catatanKerja: [{ lalu: 4, jam: [9, 45], teks: "Injektor tungku kiri dibersihkan, api biru merata." }],
  },
  {
    pelanggan: "Yudi Saputra",
    telepon: "0812-6677-3344",
    perangkat: "Speaker Aktif Polytech PMX 300",
    kategori: "TV / Audio",
    deskripsi: "Suara pecah dan volume menurun; tombol volume berubah sendiri.",
    prioritas: "normal",
    status: "dikerjakan",
    masuk: 1,
    tenggat: -1,
    estimasi: 370000,
    dp: 0,
    catatan: "Periksa potentiometer dulu sebelum mengganti komponen.",
    jejak: [
      { ke: "diperiksa", lalu: 1, jam: [10, 0] },
      { ke: "dikerjakan", lalu: 0, jam: [9, 30] },
    ],
    catatanKerja: [
      { lalu: 0, jam: [9, 30], teks: "Potentiometer dibersihkan dengan contact cleaner; suara normal kembali." },
    ],
  },
  {
    pelanggan: "Lia Marlina",
    telepon: "0858-9922-3311",
    perangkat: "TV Polytron 32 Inch LED",
    kategori: "TV / Audio",
    deskripsi: "TV mati sendiri setelah sepuluh menit; lampu indikator berkedip merah.",
    prioritas: "tinggi",
    status: "diperiksa",
    masuk: 4,
    tenggat: 1,
    estimasi: 415000,
    dp: 150000,
    catatan: "Dicurigai panel backlight atau power board — uji lanjutan perlu.",
    jejak: [{ ke: "diperiksa", lalu: 4, jam: [13, 30] }],
    catatanKerja: [
      { lalu: 4, jam: [13, 30], teks: "Backlight hidup sebentar lalu mati; sinyal power board tidak stabil." },
    ],
  },
  {
    pelanggan: "Agus Salim",
    telepon: "0812-1122-7788",
    perangkat: "Laptop Dell Latitude 3420",
    kategori: "Laptop / Komputer",
    deskripsi: "Upgrade RAM 8GB ke 16GB dan tambah SSD 512GB, data dipindahkan.",
    prioritas: "normal",
    status: "dikerjakan",
    masuk: 2,
    tenggat: -1,
    estimasi: 1450000,
    dp: 500000,
    catatan: "Kloning SSD; dokumen penting ada di drive D.",
    jejak: [
      { ke: "diperiksa", lalu: 2, jam: [14, 0] },
      { ke: "dikerjakan", lalu: 0, jam: [10, 0] },
    ],
    catatanKerja: [{ lalu: 0, jam: [10, 0], teks: "SSD terpasang; proses kloning data berjalan normal." }],
  },
  {
    pelanggan: "Putri Maharani",
    telepon: "0899-4455-6677",
    perangkat: "iPhone 11 128GB",
    kategori: "Handphone / Tablet",
    deskripsi: "Baterai cepat habis dan aplikasi tertutup sendiri; ganti baterai original.",
    prioritas: "normal",
    status: "siap_diambil",
    masuk: 3,
    tenggat: 0,
    estimasi: 1100000,
    dp: 1100000,
    catatan: "Baterai original, garansi tiga bulan. Sudah lunas.",
    jejak: [
      { ke: "diperiksa", lalu: 3, jam: [10, 20] },
      { ke: "dikerjakan", lalu: 2, jam: [11, 0] },
      { ke: "siap_diambil", lalu: 1, jam: [15, 30] },
    ],
    catatanKerja: [
      { lalu: 2, jam: [11, 0], teks: "Baterai diganti; kesehatan baterai 100% dan Face ID berfungsi." },
    ],
  },
  {
    pelanggan: "Doni Firmansyah",
    telepon: "0877-8899-1122",
    perangkat: "Mesin Fotokopi Ricoh MP 2001",
    kategori: "Printer / Scanner",
    deskripsi: "Hasil fotokopi berbayang gelap dan kertas sering tersangkut di fuser.",
    prioritas: "darurat",
    status: "baru",
    masuk: 8,
    tenggat: 3,
    estimasi: 975000,
    dp: 300000,
    catatan: "Dipakai seluruh karyawan; sudah hampir sebulan mogok. Segera ditindaklanjuti.",
  },
  {
    pelanggan: "Wulan Sari",
    telepon: "0812-6677-3344",
    perangkat: "Kipas Angin Miyako 16 Inch",
    kategori: "Peralatan Dapur",
    deskripsi: "Putaran kipas lemah dan bergetar; dicurigai bantalan motor aus.",
    prioritas: "rendah",
    status: "diperiksa",
    masuk: 7,
    tenggat: 4,
    estimasi: 195000,
    dp: 0,
    catatan: "Tunggu konfirmasi harga bantalan baru dari pelanggan.",
    jejak: [{ ke: "diperiksa", lalu: 6, jam: [9, 45] }],
    catatanKerja: [{ lalu: 6, jam: [9, 45], teks: "Bantalan depan dan belakang aus; poros masih lurus." }],
  },
  {
    pelanggan: "Teguh Santosa",
    telepon: "0821-4455-8899",
    perangkat: "Kulkas 1 Pintu Sanken",
    kategori: "Kulkas / Freezer",
    deskripsi: "Saluran pembuangan air macet dan air menetes di bawah kulkas.",
    prioritas: "normal",
    status: "selesai",
    masuk: 9,
    tenggat: 5,
    estimasi: 250000,
    dp: 250000,
    catatan: "Saluran dibersihkan; belum ada keluhan ulang.",
    jejak: [
      { ke: "diperiksa", lalu: 9, jam: [10, 0] },
      { ke: "dikerjakan", lalu: 8, jam: [9, 30] },
      { ke: "siap_diambil", lalu: 7, jam: [16, 0] },
      { ke: "selesai", lalu: 6, jam: [13, 15] },
    ],
    catatanKerja: [{ lalu: 8, jam: [9, 30], teks: "Lubang pembuangan dibersihkan dari kerak; aliran lancar." }],
  },
  {
    pelanggan: "Indah Permata",
    telepon: "0856-1122-4455",
    perangkat: "Setrika Philips GC 1743",
    kategori: "Peralatan Dapur",
    deskripsi: "Uap keluar sedikit dan semprotan air tidak rata.",
    prioritas: "rendah",
    status: "selesai",
    masuk: 14,
    tenggat: 11,
    estimasi: 180000,
    dp: 0,
    catatan: "Kerak dibersihkan; sarankan pelanggan memakai air matang.",
    jejak: [
      { ke: "diperiksa", lalu: 13, jam: [14, 30] },
      { ke: "dikerjakan", lalu: 12, jam: [9, 15] },
      { ke: "selesai", lalu: 11, jam: [10, 45] },
    ],
    catatanKerja: [{ lalu: 12, jam: [9, 15], teks: "Tangki dan saluran uap dibersihkan dari kerak kapur." }],
  },
  {
    pelanggan: "Hasan Basri",
    telepon: "0813-3344-2200",
    perangkat: "Pompa Air Shimizu PS 128",
    kategori: "Mesin / Alat Berat",
    deskripsi: "Pompa berbunyi keras dan tekanan air melemah.",
    prioritas: "normal",
    status: "selesai",
    masuk: 40,
    tenggat: 37,
    estimasi: 480000,
    dp: 200000,
    catatan: "Selesai bulan lalu — dipakai sebagai contoh arsip.",
    jejak: [
      { ke: "diperiksa", lalu: 39, jam: [10, 0] },
      { ke: "dikerjakan", lalu: 38, jam: [9, 30] },
      { ke: "selesai", lalu: 37, jam: [15, 0] },
    ],
    catatanKerja: [{ lalu: 38, jam: [9, 30], teks: "Impeler dibersihkan; poros dan bantalan diolesi gemuk." }],
  },
  {
    pelanggan: "Rina Handayani",
    telepon: "0878-9900-5566",
    perangkat: "Dispenser Miyako 1 Kran",
    kategori: "Peralatan Dapur",
    deskripsi: "Air keruh dan tidak mau memanas.",
    prioritas: "rendah",
    status: "dibatalkan",
    masuk: 12,
    tenggat: 9,
    estimasi: 320000,
    dp: 0,
    catatan: "Pelanggan membatalkan karena sudah membeli unit baru.",
    jejak: [
      { ke: "diperiksa", lalu: 12, jam: [11, 0] },
      { ke: "dibatalkan", lalu: 11, jam: [9, 15] },
    ],
  },
  {
    pelanggan: "Fajar Nugroho",
    telepon: "0877-4455-6677",
    perangkat: "Blender Philips HR2115",
    kategori: "Peralatan Dapur",
    deskripsi: "Mata pisau tidak berputar dan keluar bau gosong.",
    prioritas: "normal",
    status: "dibatalkan",
    masuk: 6,
    tenggat: 4,
    estimasi: 275000,
    dp: 100000,
    catatan: "Motor terbakar berat; biaya perbaikan mendekati harga unit baru.",
    jejak: [
      { ke: "diperiksa", lalu: 6, jam: [15, 30] },
      { ke: "dibatalkan", lalu: 5, jam: [10, 0] },
    ],
    catatanKerja: [{ lalu: 6, jam: [15, 30], teks: "Motor brush terbakar; dinamo tidak dapat diperbaiki." }],
  },
  {
    pelanggan: "Sri Rahayu",
    telepon: "0811-2233-4455",
    perangkat: "Mesin Jahit Singer Simple 3223",
    kategori: "Mesin / Alat Berat",
    deskripsi: "Benang sering putus dan putaran jarum macet; perlu servis menyeluruh.",
    prioritas: "normal",
    status: "dikerjakan",
    masuk: 0,
    tenggat: 3,
    estimasi: 385000,
    dp: 0,
    catatan: "Pelanggan kerja sablon — jangan diambil sebelum jam 16.00.",
    jejak: [
      { ke: "diperiksa", lalu: 0, jam: [8, 45] },
      { ke: "dikerjakan", lalu: 0, jam: [10, 30] },
    ],
    catatanKerja: [{ lalu: 0, jam: [10, 30], teks: "Rantai dalam dibersihkan; pengait jarum disetel ulang." }],
  },
  {
    pelanggan: "Bagus Pratama",
    telepon: "0812-4455-9900",
    perangkat: "Router Wi-Fi Linksys EA6400",
    kategori: "Instalasi / Jaringan",
    deskripsi: "Sinyal hilang di lantai dua dan sering putus dari perangkat HP.",
    prioritas: "tinggi",
    status: "dikerjakan",
    masuk: 2,
    tenggat: -2,
    estimasi: 1250000,
    dp: 400000,
    catatan: "Pelanggan minta access point tambahan di lantai atas.",
    jejak: [
      { ke: "diperiksa", lalu: 2, jam: [10, 30] },
      { ke: "dikerjakan", lalu: 1, jam: [14, 0] },
    ],
    catatanKerja: [
      { lalu: 1, jam: [14, 0], teks: "Access point tambahan terpasang; uji kecepatan di lantai atas 42 Mbps." },
    ],
  },
];

function buatBibit(bibit: Bibit, hariIniISO: string, nomor: string): Ticket {
  const dibuat = st(hariIniISO, bibit.masuk, [8, 45]);
  const timeline: TimelineEvent[] = [
    { id: idBaru("ev"), at: dibuat, jenis: "dibuat", pesan: "Tiket dibuat dengan status Baru" },
  ];

  let sebelumnya: Status = "baru";
  for (const langkah of bibit.jejak ?? []) {
    timeline.push({
      id: idBaru("ev"),
      at: st(hariIniISO, langkah.lalu, langkah.jam ?? [10, 0]),
      jenis: "status",
      pesan: `Status ${sebelumnya === langkah.ke ? sebelumnya : sebelumnya} → ${langkah.ke}`,
      dari: sebelumnya,
      ke: langkah.ke,
    });
    sebelumnya = langkah.ke;
  }

  const catatanKerja: CatatanKerja[] = (bibit.catatanKerja ?? []).map((c) => ({
    id: idBaru("ctt"),
    at: st(hariIniISO, c.lalu, c.jam ?? [11, 0]),
    teks: c.teks,
  }));

  timeline.sort((a, b) => a.at.localeCompare(b.at));
  const terakhir = timeline[timeline.length - 1]?.at ?? dibuat;

  return {
    id: idBaru("tkt"),
    nomor,
    pelanggan: bibit.pelanggan,
    telepon: bibit.telepon,
    perangkat: bibit.perangkat,
    kategori: bibit.kategori,
    deskripsi: bibit.deskripsi,
    prioritas: bibit.prioritas,
    status: bibit.status,
    tanggalMasuk: lalu(hariIniISO, bibit.masuk),
    // `tenggat` pada benih ditulis sebagai "berapa hari lagi" (negatif = lewat).
    tenggat: lalu(hariIniISO, -bibit.tenggat),
    estimasi: bibit.estimasi,
    dp: bibit.dp,
    catatanInternal: bibit.catatan,
    catatanKerja,
    timeline,
    dibuatPada: dibuat,
    diubahPada: terakhir,
  };
}

/**
 * Membuat data contoh. Deterministik untuk tanggal acuan yang sama
 * (hanya id yang acak), sehingga bisa dipakai pada unit test.
 */
export function buatDataContoh(now: Date = new Date()): Ticket[] {
  const acuan = keISO(now);
  const tahun = acuan.slice(0, 4);
  return BIBIT.map((bibit, index) =>
    buatBibit(bibit, acuan, `TKT-${tahun}-${String(index + 1).padStart(4, "0")}`),
  );
}

export const JUMLAH_DATA_CONTOH = BIBIT.length;

export { hariIni };
