/**
 * Uji lapisan otomatisasi: tebakan kategori, tenggat hari kerja, dedup
 * pelanggan, dan wawasan otomatis. Semua fungsi murni & lokal.
 */

import { describe, expect, it } from "vitest";
import type { DraftTiket, Ticket } from "../src/domain/types";
import { buatTiket, ubahStatus } from "../src/domain/ticket";
import {
  KATALOG,
  hariKerjaSaran,
  itemKatalog,
  saranUntuk,
  tebakKategori,
  templatCatatan,
} from "../src/domain/catalog";
import { selisihHariKerja, tambahHariKerja } from "../src/domain/dates";
import {
  kunciPelanggan,
  pelangganTeratas,
  profilPelanggan,
  saranPelanggan,
} from "../src/domain/customers";
import { kesehatan, labelLangkahBerikut, ringkasanOtomatis, wawasanOtomatis } from "../src/domain/health";

const HARI_INI = "2026-10-12"; // Senin
const NOW = new Date(2026, 9, 12, 9, 0);

function draft(sebagian: Partial<DraftTiket> = {}): DraftTiket {
  return {
    pelanggan: "Sari Wulandari",
    telepon: "0812-3411-7788",
    perangkat: "Kulkas Sharp 2 Pintu",
    kategori: "Kulkas / Freezer",
    deskripsi: "Kulkas tidak dingin dan air menetes.",
    prioritas: "normal",
    status: "baru",
    tanggalMasuk: HARI_INI,
    tenggat: HARI_INI,
    estimasi: 350000,
    dp: 0,
    catatanInternal: "",
    ...sebagian,
  };
}

function tiket(nomor: string, sebagian: Partial<DraftTiket> = {}, dibuatPada: Date = NOW): Ticket {
  return { ...buatTiket(draft(sebagian), { now: dibuatPada, nomor }), nomor };
}

describe("katalog servis", () => {
  it("menebak kategori dari nama perangkat", () => {
    expect(tebakKategori("Printer Epson L3110")?.key).toBe("printer");
    expect(tebakKategori("AC Panasonic 1 PK")?.key).toBe("ac");
    expect(tebakKategori("iPhone 11 128GB")?.key).toBe("hp");
    expect(tebakKategori("CCTV Hikvision 4 channel")?.key).toBe("cctv");
  });

  it("menebak dari deskripsi bila perangkat generik", () => {
    expect(tebakKategori("Unit foo", "mesin cuci tidak berputar")?.key).toBe("mesin-cuci");
  });

  it("mengabaikan huruf besar dan tanda baca", () => {
    expect(tebakKategori('TV LED SAMSUNG 43"')?.key).toBe("tv");
  });

  it("mengembalikan null bila tidak ada kata kunci", () => {
    expect(tebakKategori("Alat rectangle")).toBeNull();
    expect(tebakKategori("")).toBeNull();
  });

  it("selalu punya kategori cadangan", () => {
    expect(itemKatalog("tidak-ada").label).toBe("Lainnya");
    expect(KATALOG.length).toBeGreaterThan(5);
  });

  it("menyediakan template catatan per status", () => {
    expect(templatCatatan("menunggu")).toContain("Menunggu");
    expect(templatCatatan("baru")).toBe("");
  });
});

describe("saran tenggat (hari kerja)", () => {
  it("melewati hari Minggu", () => {
    // Senin + 2 hari kerja = Rabu
    expect(tambahHariKerja("2026-10-12", 2)).toBe("2026-10-14");
    // Jumat + 2 hari kerja = Senin, Minggu dilewati (Sabtu tetap buka)
    expect(tambahHariKerja("2026-10-16", 2)).toBe("2026-10-19");
  });

  it("menghitung selisih hari kerja", () => {
    expect(selisihHariKerja("2026-10-12", "2026-10-14")).toBe(2);
    expect(selisihHariKerja("2026-10-14", "2026-10-12")).toBe(-2);
  });

  it("prioritas darurat memendekkan tenggat", () => {
    const kulkas = itemKatalog("kulkas");
    expect(hariKerjaSaran(kulkas, "darurat")).toBeLessThan(hariKerjaSaran(kulkas, "normal"));
    expect(hariKerjaSaran(kulkas, "darurat")).toBeGreaterThanOrEqual(1);
  });

  it("saran sekali pakai mengisi kategori, tenggat, estimasi, dan catatan", () => {
    const saran = saranUntuk({
      perangkat: "Printer Epson L3110",
      deskripsi: "Hasil cetak bergaris",
      prioritas: "normal",
      tanggalMasuk: "2026-10-12",
    });
    expect(saran.kategori.key).toBe("printer");
    expect(saran.tenggat).toBe("2026-10-14");
    expect(saran.estimasi).toBeGreaterThan(0);
    expect(saran.catatan.length).toBeGreaterThan(10);
  });
});

describe("deduplikasi pelanggan", () => {
  it("menyamakan nomor telepon dengan format berbeda", () => {
    expect(kunciPelanggan("Sari", "0812-3411-7788")).toBe(kunciPelanggan("Sari W", "+6281234117788"));
  });

  it("mengabaikan gelar saat mencocokkan nama", () => {
    const a = profilPelanggan([tiket("TKT-2026-0001", { pelanggan: "Bapak Budi Santoso" })]);
    const b = profilPelanggan([tiket("TKT-2026-0001", { pelanggan: "budi santoso" })]);
    expect(a[0].kunci).toBe(b[0].kunci);
  });

  it("menggabungkan riwayat menjadi satu profil", () => {
    const profil = profilPelanggan([
      tiket("TKT-2026-0001", { pelanggan: "Sari", estimasi: 100000 }, new Date(2026, 0, 1)),
      tiket("TKT-2026-0002", { pelanggan: "Sari", estimasi: 200000 }, new Date(2026, 1, 1)),
    ]);
    expect(profil).toHaveLength(1);
    expect(profil[0].jumlahTiket).toBe(2);
    expect(profil[0].totalBelanja).toBe(300000);
    expect(profil[0].estimasiTerakhir).toBe(200000);
  });

  it("menyarankan profil untuk mengisi otomatis form", () => {
    const daftar = [
      tiket("TKT-2026-0001", { pelanggan: "Sari Wulandari", telepon: "0812-3411-7788" }),
    ];
    expect(saranPelanggan(daftar, "Sari Wulandari", "0812-3411-7788", HARI_INI)?.pelangganBerulang).toBe(
      false,
    );

    const banyak = [
      ...daftar,
      tiket("TKT-2026-0002", { pelanggan: "Sari Wulandari", telepon: "0812-3411-7788" }),
    ];
    expect(saranPelanggan(banyak, "Sari Wulandari", "0812-3411-7788", HARI_INI)?.pelangganBerulang).toBe(
      true,
    );
  });

  it("tidak menyarankan apa pun untuk isian terlalu pendek", () => {
    expect(saranPelanggan([], "Sa", "", HARI_INI)).toBeNull();
  });

  it("menampilkan pelanggan dengan lebih dari satu tiket", () => {
    const daftar = [
      tiket("TKT-2026-0001", { pelanggan: "Sari Wulandari" }),
      tiket("TKT-2026-0002", { pelanggan: "Sari Wulandari", telepon: "0812-3411-7788" }),
      tiket("TKT-2026-0003", { pelanggan: "Bambang Setiawan", telepon: "0857-9902-1145" }),
    ];
    const atas = pelangganTeratas(daftar, 5);
    expect(atas).toHaveLength(1);
    expect(atas[0].namaTerakhir).toBe("Sari Wulandari");
  });
});

describe("kesehatan & wawasan otomatis", () => {
  it("menandai kritis bila terlambat â‰¥ ambang", () => {
    expect(kesehatan(tiket("TKT-2026-0001", { tenggat: "2026-10-01" }), HARI_INI)).toBe("kritis");
    expect(kesehatan(tiket("TKT-2026-0002", { tenggat: "2026-10-11" }), HARI_INI)).toBe(
      "perlu_perhatian",
    );
    expect(kesehatan(tiket("TKT-2026-0003", { tenggat: "2026-10-20" }), HARI_INI)).toBe("sehat");
  });

  it("tidak menandai tiket tertutup sebagai bermasalah", () => {
    const selesai = ubahStatus(tiket("TKT-2026-0001", { tenggat: "2026-09-01" }), "selesai", {
      now: NOW,
    });
    expect(kesehatan(selesai, HARI_INI)).toBe("ditutup");
  });

  it("insights terlambat punya tindakan filter dan urut mendesak", () => {
    const daftar = [
      tiket("TKT-2026-0001", { tenggat: "2026-10-01" }),
      tiket("TKT-2026-0002", { tenggat: "2026-10-02" }),
    ];
    const insights = wawasanOtomatis(daftar, HARI_INI);
    const terlambat = insights.find((w) => w.id === "terlambat");
    expect(terlambat?.nada).toBe("bahaya");
    expect(terlambat?.aksi?.filter.terlambat).toBe(true);
    expect(insights[0].urut).toBeLessThanOrEqual(insights[1]?.urut ?? 99);
  });

  it("memberi kabar baik saat tidak ada yang terlambat", () => {
    const daftar = [tiket("TKT-2026-0001", { tenggat: "2026-10-20" })];
    expect(wawasanOtomatis(daftar, HARI_INI).some((w) => w.id === "aman")).toBe(true);
    expect(ringkasanOtomatis(daftar, HARI_INI)).toContain("sesuai jadwal");
  });

  it("mendeteksi unit siap yang belum diambil", () => {
    const siap = ubahStatus(tiket("TKT-2026-0001", { tenggat: "2026-10-14" }), "siap_diambil", {
      now: new Date(2026, 9, 9, 16, 0),
    });
    expect(wawasanOtomatis([siap], HARI_INI).some((w) => w.id === "menunggu-ambil")).toBe(true);
  });

  it("menyediakan label langkah berikutnya per status", () => {
    expect(labelLangkahBerikut(tiket("TKT-2026-0001", { status: "baru" }))).toBe("Mulai pemeriksaan");
    expect(labelLangkahBerikut(tiket("TKT-2026-0002", { status: "selesai" }))).toBe("");
  });
});


