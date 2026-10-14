import { describe, expect, it } from "vitest";
import type { DraftTiket, Ticket } from "../src/domain/types";
import { buatTiket } from "../src/domain/ticket";
import { ulasCadangan, validasiDaftarTiket, tampilanBawaan, ukuranData } from "../src/data/storage";
import { buatCsv, namaBerkasCsv, ringkasCsv } from "../src/data/csv";
import { jsonCadangan, namaBerkasCadangan, susunCadangan, ukuranReadable } from "../src/data/backup";

const HARI_INI = "2026-10-12";
const NOW = new Date(2026, 9, 12, 10, 0);

function draft(sebagian: Partial<DraftTiket> = {}): DraftTiket {
  return {
    pelanggan: "Sari Wulandari",
    telepon: "0812-3411-7788",
    perangkat: "Kulkas Sharp 2 Pintu",
    kategori: "Kulkas / Freezer",
    deskripsi: "Kulkas tidak dingin dan air menetes di rak bawah.",
    prioritas: "normal",
    status: "baru",
    tanggalMasuk: HARI_INI,
    tenggat: HARI_INI,
    estimasi: 350000,
    dp: 100000,
    catatanInternal: "",
    ...sebagian,
  };
}

function tiket(nomor: string, sebagian: Partial<DraftTiket> = {}): Ticket {
  return buatTiket(draft(sebagian), { now: NOW, nomor });
}

describe("validasi berkas impor", () => {
  it("menerima cadangan yang dibuat aplikasi", () => {
    const hasil = ulasCadangan(jsonCadangan([tiket("TKT-2026-0001"), tiket("TKT-2026-0002")]));
    expect(hasil.ok).toBe(true);
    expect(hasil.tiket).toHaveLength(2);
  });

  it("menolak berkas bukan JSON", () => {
    const hasil = ulasCadangan("{bukan json");
    expect(hasil.ok).toBe(false);
    expect(hasil.galat).toContain("JSON");
  });

  it("menolak berkas aplikasi lain & versi skema lebih baru", () => {
    expect(ulasCadangan(JSON.stringify({ app: "stokapp", tiket: [] })).galat).toContain("stokapp");
    expect(
      ulasCadangan(JSON.stringify({ app: "jobtrack", skemaVersi: 99, tiket: [] })).galat,
    ).toContain("lebih baru");
  });

  it("menolak tanpa daftar tiket", () => {
    expect(ulasCadangan(JSON.stringify({ app: "jobtrack" })).galat).toContain("tidak ditemukan");
  });

  it("melewati baris rusak tetapi menerima baris valid", () => {
    const hasil = validasiDaftarTiket([tiket("TKT-2026-0001"), { nomor: "X" }, tiket("TKT-2026-0003")]);
    expect(hasil.ok).toBe(true);
    expect(hasil.tiket).toHaveLength(2);
    expect(hasil.peringatan).toHaveLength(1);
  });

  it("melewati nomor ganda", () => {
    const hasil = validasiDaftarTiket([
      tiket("TKT-2026-0001"),
      tiket("TKT-2026-0001", { pelanggan: "Bambang Setiawan" }),
    ]);
    expect(hasil.ok).toBe(true);
    expect(hasil.tiket).toHaveLength(1);
    expect(hasil.peringatan?.[0]).toContain("ganda");
  });

  it("menolak berkas kosong tanpa pesan teknis", () => {
    const hasil = ulasCadangan(JSON.stringify({ app: "jobtrack", tiket: [] }));
    expect(hasil.ok).toBe(false);
    expect(hasil.galat).toBeTruthy();
  });

  it("menolak jumlah tiket tidak wajar", () => {
    const banyak = Array.from({ length: 5001 }, (_, i) => tiket(`TKT-2026-${i}`));
    expect(validasiDaftarTiket(banyak).galat).toContain("5000");
  });

  it("memulihkan timeline rusak menjadi entri dasar", () => {
    const rusak = { ...tiket("TKT-2026-0001"), timeline: [{ at: "bukan tanggal", pesan: "x" }] };
    const hasil = validasiDaftarTiket([rusak]);
    expect(hasil.ok).toBe(true);
    expect(hasil.tiket?.[0].timeline).toHaveLength(1);
    expect(hasil.tiket?.[0].timeline[0].jenis).toBe("dibuat");
  });
});

describe("penyimpanan", () => {
  it("menyediakan tampilan bawaan yang unik", () => {
    const tampilan = tampilanBawaan();
    expect(new Set(tampilan.map((t) => t.id)).size).toBe(tampilan.length);
    expect(tampilan.some((t) => t.id === "terlambat")).toBe(true);
  });

  it("menghitung ukuran data tanpa melempar error", () => {
    expect(ukuranData([tiket("TKT-2026-0001")])).toBeGreaterThan(100);
  });
});

describe("berkas cadangan", () => {
  it("memuat jumlah tiket dan versi skema", () => {
    const cadangan = susunCadangan([tiket("TKT-2026-0001")], NOW);
    expect(cadangan.app).toBe("jobtrack");
    expect(cadangan.jumlahTiket).toBe(1);
    expect(cadangan.dieksporPada).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("dapat diimpor kembali tanpa kehilangan field", () => {
    const asli = tiket("TKT-2026-0001", { catatanInternal: "Catatan penting." });
    const hasil = ulasCadangan(jsonCadangan([asli]));
    expect(hasil.ok).toBe(true);
    expect(hasil.tiket?.[0]).toEqual(asli);
  });

  it("nama berkas memakai tanggal", () => {
    expect(namaBerkasCadangan(NOW)).toBe("jobtrack-cadangan-2026-10-12.json");
  });

  it("ukuran berkas terbaca oleh manusia", () => {
    expect(ukuranReadable(512)).toBe("512 B");
    expect(ukuranReadable(2048)).toBe("2 KB");
  });
});

describe("ekspor CSV", () => {
  const daftar = [
    tiket("TKT-2026-0001", { estimasi: 350000, dp: 100000 }),
    tiket("TKT-2026-0002", {
      pelanggan: 'Bambang "Setiawan"',
      perangkat: "Printer; Epson",
      estimasi: 225000,
      dp: 0,
      tenggat: "2026-10-01",
    }),
  ];

  it("memakai pemisah titik koma, BOM, dan baris header", () => {
    const csv = buatCsv(daftar, HARI_INI);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.split("\r\n")[0]).toContain("Nomor Tiket;Pelanggan");
    expect(csv).toContain("TKT-2026-0001");
  });

  it("mengapit kolom berisi tanda kutip atau titik koma", () => {
    const csv = buatCsv(daftar, HARI_INI);
    expect(csv).toContain('"Bambang ""Setiawan"""');
    expect(csv).toContain('"Printer; Epson"');
  });

  it("menandai tiket terlambat dan sisa tagihan", () => {
    const csv = buatCsv(daftar, HARI_INI);
    expect(csv).toContain("Terlambat");
    expect(csv).toContain("250000");
  });

  it("ringkasan angka terbaca", () => {
    const ringkas = ringkasCsv(daftar, HARI_INI);
    expect(ringkas).toContain("2 tiket");
    expect(ringkas).toContain("Rp 575.000");
    expect(ringkas).toContain("1 terlambat");
    expect(namaBerkasCsv(HARI_INI)).toBe("jobtrack-tiket-2026-10-12.csv");
  });
});
