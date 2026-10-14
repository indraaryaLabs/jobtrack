import { describe, expect, it } from "vitest";
import {
  BIAYA_MAKS,
  cekTiket,
  draftKeForm,
  formKeDraft,
  validasiForm,
} from "../src/domain/validation";
import type { FormTiket } from "../src/domain/validation";
import { desimal, formatInputRupiah, parseRupiah, persen, rupiah, rupiahRingkas } from "../src/domain/money";

const HARI_INI = "2026-10-12";

function form(sebagian: Partial<FormTiket> = {}): FormTiket {
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
    estimasi: "350000",
    dp: "100000",
    catatanInternal: "",
    ...sebagian,
  };
}

describe("validasi field wajib", () => {
  it("menolak form kosong dengan pesan Bahasa Indonesia", () => {
    const e = validasiForm(
      form({ pelanggan: " ", perangkat: "", deskripsi: "", tanggalMasuk: "", tenggat: "" }),
      HARI_INI,
    );
    expect(e.pelanggan).toBe("Nama pelanggan wajib diisi.");
    expect(e.perangkat).toBe("Nama perangkat wajib diisi.");
    expect(e.deskripsi).toBe("Deskripsi masalah wajib diisi.");
    expect(e.tanggalMasuk).toBe("Tanggal masuk tidak valid.");
    expect(e.tenggat).toBe("Tenggat tidak valid.");
  });

  it("menolak nama pelanggan dan deskripsi terlalu pendek", () => {
    expect(validasiForm(form({ pelanggan: "AB" }), HARI_INI).pelanggan).toContain("minimal");
    expect(validasiForm(form({ deskripsi: "rusak" }), HARI_INI).deskripsi).toContain("minimal");
  });

  it("memeriksa nomor telepon opsional", () => {
    expect(validasiForm(form({ telepon: "bukan" }), HARI_INI).telepon).toContain("tidak valid");
    expect(validasiForm(form({ telepon: "08123" }), HARI_INI).telepon).toBeDefined();
    expect(validasiForm(form({ telepon: "" }), HARI_INI).telepon).toBeUndefined();
  });

  it("menerima form yang lengkap dan benar", () => {
    expect(validasiForm(form(), HARI_INI)).toEqual({});
  });
});

describe("validasi tanggal", () => {
  it("menolak tenggat sebelum tanggal masuk", () => {
    const e = validasiForm(form({ tanggalMasuk: "2026-10-10", tenggat: "2026-10-09" }), HARI_INI);
    expect(e.tenggat).toBe("Tenggat tidak boleh jatuh sebelum tanggal masuk.");
  });

  it("menerima tenggat sama dengan tanggal masuk", () => {
    expect(
      validasiForm(form({ tanggalMasuk: "2026-10-10", tenggat: "2026-10-10" }), HARI_INI).tenggat,
    ).toBeUndefined();
  });

  it("menolak tanggal masuk di masa depan", () => {
    const e = validasiForm(form({ tanggalMasuk: "2026-10-13", tenggat: "2026-10-15" }), HARI_INI);
    expect(e.tanggalMasuk).toBe("Tanggal masuk tidak boleh melebihi hari ini.");
  });

  it("menolak tanggal yang tidak nyata", () => {
    expect(validasiForm(form({ tanggalMasuk: "2026-02-31" }), HARI_INI).tanggalMasuk).toBe(
      "Tanggal masuk tidak valid.",
    );
  });
});

describe("validasi DP vs estimasi (PRD 3.3)", () => {
  it("menolak DP melebihi estimasi", () => {
    const e = validasiForm(form({ estimasi: "350000", dp: "400000" }), HARI_INI);
    expect(e.dp).toBe("DP tidak boleh melebihi biaya estimasi (Rp 350.000).");
  });

  it("menerima DP sama dengan estimasi", () => {
    expect(validasiForm(form({ estimasi: "350000", dp: "350000" }), HARI_INI)).toEqual({});
  });

  it("menolak DP lebih dari nol ketika estimasi masih nol", () => {
    expect(validasiForm(form({ estimasi: "0", dp: "50000" }), HARI_INI).dp).toBe(
      "Biaya estimasi belum diisi, jadi DP harus Rp 0.",
    );
  });

  it("menerima kolom uang kosong sebagai nol", () => {
    expect(validasiForm(form({ estimasi: "", dp: "" }), HARI_INI)).toEqual({});
    expect(formKeDraft(form({ estimasi: "", dp: "" }))?.dp).toBe(0);
  });

  it("menolak nominal melebihi batas dan input bukan angka", () => {
    expect(validasiForm(form({ estimasi: String(BIAYA_MAKS + 1) }), HARI_INI).estimasi).toContain(
      "maksimal",
    );
    expect(validasiForm(form({ estimasi: "abc" }), HARI_INI).estimasi).toContain("angka");
  });
});

describe("konversi form <-> draft", () => {
  it("memangkas spasi dan mengubah rupiah menjadi integer", () => {
    const d = formKeDraft(form({ pelanggan: "  Sari Wulandari  ", estimasi: "1.250.000", dp: "250000" }));
    expect(d?.pelanggan).toBe("Sari Wulandari");
    expect(d?.estimasi).toBe(1250000);
    expect(d?.dp).toBe(250000);
  });

  it("mengembalikan null bila uang tak terbaca", () => {
    expect(formKeDraft(form({ estimasi: "abc" }))).toBeNull();
  });

  it("bolak-balik draft ke form tanpa kehilangan nilai (isi form saat validasi gagal)", () => {
    const d = {
      pelanggan: "Bambang Setiawan",
      telepon: "0857-9902-1145",
      perangkat: "Printer Epson L3110",
      kategori: "Printer / Scanner",
      deskripsi: "Hasil cetak bergaris horizontal dan kertas menarik dua lembar.",
      prioritas: "tinggi" as const,
      status: "dikerjakan" as const,
      tanggalMasuk: "2026-10-01",
      tenggat: "2026-10-14",
      estimasi: 225000,
      dp: 50000,
      catatanInternal: "Antar sendiri.",
    };
    expect(formKeDraft(draftKeForm(d))).toEqual(d);
  });
});

describe("format rupiah", () => {
  it("memisahkan ribuan konvensi Indonesia", () => {
    expect(rupiah(1250000)).toBe("Rp 1.250.000");
    expect(rupiah(0)).toBe("Rp 0");
    expect(rupiahRingkas(1250000)).toBe("Rp 1,3 jt");
  });

  it("mengubah input berformat menjadi digit", () => {
    expect(parseRupiah("Rp 1.250.000")).toBe(1250000);
    expect(parseRupiah("abc")).toBeNull();
    expect(formatInputRupiah("1250000")).toBe("1.250.000");
  });

  it("desimal & persen memakai koma", () => {
    expect(desimal(1.46)).toBe("1,5");
    expect(persen(42.5)).toBe("42,5%");
  });
});

describe("skema tiket untuk data tak dipercaya", () => {
  const dasar = {
    id: "tkt_1",
    nomor: "TKT-2026-0001",
    pelanggan: "Sari Wulandari",
    telepon: "0812",
    perangkat: "Kulkas Sharp",
    kategori: "Kulkas / Freezer",
    deskripsi: "Kulkas tidak dingin dan air menetes.",
    prioritas: "normal",
    status: "baru",
    tanggalMasuk: "2026-10-12",
    tenggat: "2026-10-14",
    estimasi: 350000,
    dp: 100000,
    catatanInternal: "",
    catatanKerja: [],
    timeline: [],
    dibuatPada: "2026-10-12T08:45:00",
    diubahPada: "2026-10-12T08:45:00",
  };

  it("menerima tiket yang valid dan membuat timeline default", () => {
    const hasil = cekTiket(dasar, 0);
    expect(hasil.ok).toBe(true);
    if (hasil.ok) {
      expect(hasil.ticket.nomor).toBe("TKT-2026-0001");
      expect(hasil.ticket.timeline).toHaveLength(1);
      expect(hasil.ticket.timeline[0].jenis).toBe("dibuat");
    }
  });

  it("menolak status, prioritas, tanggal, dan uang yang tidak valid", () => {
    const salahStatus = cekTiket({ ...dasar, status: "entah" }, 0);
    expect(salahStatus.ok).toBe(false);

    const salahPrioritas = cekTiket({ ...dasar, prioritas: "sangat-kayas" }, 0);
    expect(salahPrioritas.ok).toBe(false);

    const tenggatDulu = cekTiket({ ...dasar, tanggalMasuk: "2026-10-10", tenggat: "2026-10-01" }, 0);
    expect(tenggatDulu.ok).toBe(false);

    const dpLebih = cekTiket({ ...dasar, estimasi: 100000, dp: 500000 }, 0);
    expect(dpLebih.ok).toBe(false);

    const uangString = cekTiket({ ...dasar, estimasi: "350000" }, 0);
    expect(uangString.ok).toBe(false);
  });

  it("menolak bentuk bukan objek", () => {
    expect(cekTiket(["bukan"], 0).ok).toBe(false);
    expect(cekTiket(null, 0).ok).toBe(false);
  });
});

