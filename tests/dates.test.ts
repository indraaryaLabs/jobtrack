// Uji format tanggal & label relatif: cakupan yang sebelumnya belum diperiksa
// (bug "NaN tahun lalu" ditemukan lewat pengujian browser).

import { describe, expect, it } from "vitest";
import {
  formatTanggal,
  formatTanggalPanjang,
  formatTanggalPendek,
  formatWaktu,
  hariKerja,
  isoValid,
  keISO,
  keTimestamp,
  labelBulan,
  labelSejak,
  labelTenggat,
  selisihHariKerja,
  tambahHariKerja,
  timestampValid,
  uraiISO,
} from "../src/domain/dates";

describe("format tanggal (id-ID)", () => {
  it("format pendek & panjang", () => {
    expect(formatTanggal("2026-10-14")).toBe("14 Okt 2026");
    expect(formatTanggalPanjang("2026-10-14")).toBe("Rabu, 14 Oktober 2026");
    expect(formatTanggalPendek("2026-10-14")).toBe("Rab, 14 Okt 2026");
    expect(labelBulan(new Date(2026, 9, 14))).toBe("Oktober 2026");
  });

  it("format waktu memakai jam Indonesia", () => {
    expect(formatWaktu("2026-10-14T09:05:00")).toBe("14 Okt 2026, 09.05");
    expect(formatWaktu("2026-10-14")).toBe("14 Okt 2026");
  });

  it("tanggal tidak valid ditandai", () => {
    expect(isoValid("2026-02-31")).toBe(false);
    expect(isoValid("2026-10-14")).toBe(true);
    expect(timestampValid("2026-10-14T09:05:00")).toBe(true);
    expect(timestampValid("2026-10-14T09:05")).toBe(true);
    expect(timestampValid("2026-10-14T9:5:0")).toBe(false);
    expect(uraiISO("31-12-2026")).toBeNull();
  });

  it("keISO & keTimestamp konsisten", () => {
    expect(keISO(new Date(2026, 9, 14, 23, 30))).toBe("2026-10-14");
    expect(keTimestamp(new Date(2026, 9, 14, 9, 5, 7).getTime())).toBe("2026-10-14T09:05:07");
  });
});

describe("hari kerja (bengkel: Senin–Sabtu)", () => {
  it("Minggu bukan hari kerja", () => {
    expect(hariKerja("2026-10-18")).toBe(false);
    expect(hariKerja("2026-10-17")).toBe(true);
  });

  it("menambah hari kerja melewati Minggu", () => {
    expect(tambahHariKerja("2026-10-16", 1)).toBe("2026-10-17");
    expect(tambahHariKerja("2026-10-16", 2)).toBe("2026-10-19");
  });

  it("selisih hari kerja bertanda", () => {
    expect(selisihHariKerja("2026-10-16", "2026-10-19")).toBe(2);
    expect(selisihHariKerja("2026-10-19", "2026-10-16")).toBe(-2);
  });

});

describe("label relatif", () => {
  const sekarang = new Date(2026, 9, 14, 12, 0, 0);

  it("label tenggat", () => {
    expect(labelTenggat("2026-10-14", "2026-10-14")).toBe("Jatuh tempo hari ini");
    expect(labelTenggat("2026-10-15", "2026-10-14")).toBe("Jatuh tempo besok");
    expect(labelTenggat("2026-10-12", "2026-10-14")).toBe("Terlambat 2 hari");
    expect(labelTenggat("2026-10-20", "2026-10-14")).toBe("6 hari lagi");
    expect(labelTenggat("2026-12-14", "2026-10-14")).toBe("14 Des 2026");
  });

  it("labelSejak tidak pernah NaN (regresi: 'NaN tahun lalu')", () => {
    expect(labelSejak("2026-10-14T11:30:00", sekarang)).toBe("30 menit lalu");
    expect(labelSejak("2026-10-14T09:00:00", sekarang)).toBe("3 jam lalu");
    expect(labelSejak("2026-10-13T12:00:00", sekarang)).toBe("kemarin");
    expect(labelSejak("2026-10-10T12:00:00", sekarang)).toBe("4 hari lalu");
    expect(labelSejak("2026-09-14T12:00:00", sekarang)).toBe("30 hari lalu");
    expect(labelSejak("2026-08-14T12:00:00", sekarang)).toBe("2 bulan lalu");
    expect(labelSejak("2026-01-14T12:00:00", sekarang)).toBe("9 bulan lalu");
    expect(labelSejak("2024-01-14T12:00:00", sekarang)).toBe("3 tahun lalu");
    expect(labelSejak("2026-10-14T12:00:00", sekarang)).toBe("baru saja");
    expect(labelSejak("bukan timestamp", sekarang)).toBe("");
    expect(labelSejak("2026-10-14T12:00:00", sekarang)).not.toContain("NaN");
  });
});
