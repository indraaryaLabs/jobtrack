/**
 * Katalog servis â€” dasar dari otomatisasi JobTrack.
 *
 * Bengkel selalu punya pola kerja yang berulang: pemeriksaan awal, estimasi
 * standar per jenis perangkat, dan tenggat lazim per tingkat prioritas.
 * Katalog ini dipakai untuk (a) mengisiestimasi & tenggat secara otomatis
 * saat membuat tiket, (b) membSuggest catatan pemeriksaan, dan (c) memberi
 * placeholder yang relevan per kategori.
 *
 * Semua angka berasal dari kebiasaan bengkel servis Indonesia pada umumnya â€”
 * sebagai titik awal yang bisa diubah pengguna lewat form.
 */

import type { Priority } from "./types";
import { tambahHariKerja } from "./dates";
import { META_PRIORITAS } from "./status";

export interface ItemKatalog {
  key: string;
  label: string;
  /** Kata kunci untuk mengenali kategori dari ketik-an pengguna. */
  kataKunci: string[];
  contohPerangkat: string;
  /** Rentang estimasivej yang wajar (rupiah). */
  estimasiMin: number;
  estimasiMaks: number;
  /** Estimasi yang dipakai sebagai titik awal. */
  estimasiAwal: number;
  /** Lama pengerjaan normal dalam hari kerja. */
  hariKerja: number;
  /** Template catatan pemeriksaan awal. */
  catatanPemeriksaan: string;
}

export const KATALOG: ItemKatalog[] = [
  {
    key: "laptop",
    label: "Laptop / Komputer",
    kataKunci: ["laptop", "notebook", "komputer", "pc", "macbook", "thinkpad", "vivid", "asus", "acer", "lenovo", "dell", "hp pavilion"],
    contohPerangkat: "Laptop ASUS VivoBook 15 A516",
    estimasiMin: 150000,
    estimasiMaks: 3500000,
    estimasiAwal: 350000,
    hariKerja: 2,
    catatanPemeriksaan: "Cek adaptor, baterai, dan modul keyboard sebelum dismantle.",
  },
  {
    key: "printer",
    label: "Printer / Scanner",
    kataKunci: ["printer", "scan", "scanner", "epson", "canon", "brother", "hp laser", "fotokopi"],
    contohPerangkat: "Printer Epson L3110",
    estimasiMin: 120000,
    estimasiMaks: 2500000,
    estimasiAwal: 275000,
    hariKerja: 2,
    catatanPemeriksaan: "Cetak test warna, cek head/roller dan hasil cetakan.",
  },
  {
    key: "ac",
    label: "AC / Pendingin",
    kataKunci: ["ac", "pendingin", "panasonic", "daikin", "inverter", "freon", "split"],
    contohPerangkat: "AC Panasonic 1 PK CS-PN12",
    estimasiMin: 150000,
    estimasiMaks: 1500000,
    estimasiAwal: 450000,
    hariKerja: 2,
    catatanPemeriksaan: "Cek tekanan refrigeran, bebaskan koil, dan bersihkan saluran pembuangan air.",
  },
  {
    key: "kulkas",
    label: "Kulkas / Freezer",
    kataKunci: ["kulkas", "freezer", "kitchen", "sharp", "sanken", "aqua", "lg"],
    contohPerangkat: "Kulkas Sharp 2 Pintu SJ-236M",
    estimasiMin: 180000,
    estimasiMaks: 2000000,
    estimasiAwal: 350000,
    hariKerja: 2,
    catatanPemeriksaan: "Cek kompresor, start relay, dan thermostat suhu.",
  },
  {
    key: "mesin-cuci",
    label: "Mesin Cuci / Pengering",
    kataKunci: ["mesin cuci", "mesin pengering", "washing", "dryer", "samsung", "polytron"],
    contohPerangkat: "Mesin Cuci LG 8kg Front Loading",
    estimasiMin: 200000,
    estimasiMaks: 2000000,
    estimasiAwal: 450000,
    hariKerja: 3,
    catatanPemeriksaan: "Cek door lock, motor pengering, dan jalur air masuk.",
  },
  {
    key: "hp",
    label: "Handphone / Tablet",
    kataKunci: ["hp", "handphone", "ponsel", "iphone", "samsung galaxy", "xiaomi", "realme", "tablet", "ipad"],
    contohPerangkat: "iPhone 11 128GB",
    estimasiMin: 100000,
    estimasiMaks: 2500000,
    estimasiAwal: 450000,
    hariKerja: 1,
    catatanPemeriksaan: "Cek baterai, tombol power, dan jumper sebelum tukar komponen.",
  },
  {
    key: "tv",
    label: "TV / Audio",
    kataKunci: ["tv", "televisi", "led", "polytron", "samsung tv", "speaker", "sound system", "amplifier"],
    contohPerangkat: "TV LED Samsung 43 AU7000",
    estimasiMin: 150000,
    estimasiMaks: 2200000,
    estimasiAwal: 425000,
    hariKerja: 3,
    catatanPemeriksaan: "Cek panel backlight, driver board, dan konektor T-CON.",
  },
  {
    key: "cctv",
    label: "CCTV / Keamanan",
    kataKunci: ["cctv", "dvr", "nvr", "hikvision", "camera", "kamera", "security"],
    contohPerangkat: "CCTV Hikvision 4 Channel + HDD 1TB",
    estimasiMin: 200000,
    estimasiMaks: 5000000,
    estimasiAwal: 780000,
    hariKerja: 3,
    catatanPemeriksaan: "Cek adaptor, harddisk, dan konfigurasi rekaman.",
  },
  {
    key: "dapur",
    label: "Peralatan Dapur",
    kataKunci: ["kompor", "microwave", "oven", "rice cooker", "penanak", "blender", "mixer", "dispenser", "teko", "dispenser"],
    contohPerangkat: "Rice cooker Yongma YMC 2 Liter",
    estimasiMin: 100000,
    estimasiMaks: 1200000,
    estimasiAwal: 200000,
    hariKerja: 1,
    catatanPemeriksaan: "Bersihkan kerak, cek element panas dan thermostat.",
  },
  {
    key: "mesin",
    label: "Mesin / Alat Berat",
    kataKunci: ["pompa", "genset", "mesin jahit", "kompressor", "bor", "gerinda", "impact", "vacuum", "mesinambu"],
    contohPerangkat: "Pompa Air Shimizu PS 128",
    estimasiMin: 150000,
    estimasiMaks: 3000000,
    estimasiAwal: 450000,
    hariKerja: 3,
    catatanPemeriksaan: "Cek poros, bantalan, dan pelumas sebelum overhaul.",
  },
  {
    key: "instalasi",
    label: "Instalasi / Jaringan",
    kataKunci: ["instalasi", "pasang", "kabel", "lan", "wifi", "router", "listrik", "wiring"],
    contohPerangkat: "Instalasi CCTV 2 titik + jaringan",
    estimasiMin: 200000,
    estimasiMaks: 6000000,
    estimasiAwal: 950000,
    hariKerja: 4,
    catatanPemeriksaan: "Survey lokasi dulu, catat jalur kabel dan titik pasok listrik.",
  },
  {
    key: "lainnya",
    label: "Lainnya",
    kataKunci: [],
    contohPerangkat: "Nama perangkat dan tipe",
    estimasiMin: 100000,
    estimasiMaks: 3000000,
    estimasiAwal: 300000,
    hariKerja: 2,
    catatanPemeriksaan: "Cek gejala, catat kondisi unit sebelum dismantle.",
  },
];

const BAWAAN: ItemKatalog = KATALOG[KATALOG.length - 1];

export function itemKatalog(key: string): ItemKatalog {
  return KATALOG.find((item) => item.key === key) ?? BAWAAN;
}

/** Normalisasi teks untuk pencocokan kata kunci. */
export function normalisasiTeks(teks: string): string {
  return teks
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Menebak kategori dari teks perangkat/deskripsi.
 * Mengembalikan null bila tidak ada kata kunci yang cocok — pemanggil memakai
 * kategori "lainnya" sebagai gantinya.
 */
/**
 * Menebak kategori dari teks perangkat/deskripsi.
 *
 * Kata kunci yang muncul lebih dulu pada teks diberi bobot besar karena
 * nama perangkat biasanya dimulai dengan jenisnya ("PRINTER Epson …"),
 * bukan merknya. Mengembalikan null bila tidak ada yang cocok.
 */
export function tebakKategori(...teks: string[]): ItemKatalog | null {
  const gabungan = normalisasiTeks(teks.join(" "));
  if (gabungan.length === 0) return null;

  let terbaik: { item: ItemKatalog; skor: number } | null = null;
  for (const item of KATALOG) {
    if (item === BAWAAN) continue;
    for (const kunci of item.kataKunci) {
      const bentuk = normalisasiTeks(kunci);
      if (bentuk.length < 3) continue;
      const posisi = gabungan.indexOf(bentuk);
      if (posisi === -1) continue;
      // posisi 0 = jenis perangkat menyebut diri sendiri: diutamakan setara 2× panjang kata
      const skor = 200 - posisi * 2 + bentuk.length;
      if (!terbaik || skor > terbaik.skor) {
        terbaik = { item, skor };
      }
    }
  }
  return terbaik?.item ?? null;
}

/** Saran tenggat: hari kerja Ã— pengali prioritas, dihitung dari tanggal masuk. */
export function hariKerjaSaran(item: ItemKatalog, prioritas: Priority): number {
  const dasar = item.hariKerja * META_PRIORITAS[prioritas].pengaliTenggat;
  return Math.max(1, Math.round(dasar));
}

export interface SaranOtomatis {
  kategori: ItemKatalog;
  hariKerja: number;
  tenggat: string;
  estimasi: number;
  catatan: string;
}

/**
 * Saran sekali-pakai untuk mengisi form: kategori, tenggat, estimasi, dan
 * catatan pemeriksaan awal. Semua dihitung lokal tanpa jaringan.
 */
export function saranUntuk(
  masukan: { perangkat: string; deskripsi: string; prioritas: Priority; tanggalMasuk: string },
): SaranOtomatis {
  const tebakan = tebakKategori(masukan.perangkat, masukan.deskripsi);
  const item = tebakan ?? BAWAAN;
  const hariKerja = hariKerjaSaran(item, masukan.prioritas);
  return {
    kategori: item,
    hariKerja,
    tenggat: tambahHariKerja(masukan.tanggalMasuk, hariKerja),
    estimasi: item.estimasiAwal,
    catatan: item.catatanPemeriksaan,
  };
}

/** Template catatan cepat sesuai status tujuan (dipakai di drawer detail). */
export function templatCatatan(status: string): string {
  switch (status) {
    case "diperiksa":
      return "Hasil pemeriksaan: ";
    case "dikerjakan":
      return "Pengerjaan dimulai: ";
    case "menunggu":
      return "Menunggu: ";
    case "siap_diambil":
      return "Unit siap diambil, sudah diuji: ";
    case "selesai":
      return "Sudah diambil pelanggan: ";
    default:
      return "";
  }
}

