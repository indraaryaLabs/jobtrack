import { describe, expect, it } from "vitest";
import type { DraftTiket, FilterTiket, Status, Ticket } from "../src/domain/types";
import {
  aktif,
  buatTiket,
  filterTiket,
  hariMenungguPengambilan,
  hariTinggal,
  lewatTenggat,
  nomorBerikutnya,
  sisaTagihan,
  terapkanDraft,
  tambahCatatan,
  tiketAktifTerdekat,
  ubahStatus,
  hitungMetrik,
  hitungPerStatus,
  arahAwal,
  filterAwal,
  cocokCari,
  selesaiBulanIni,
  urutkan,
  tiketTerlambat,
} from "../src/domain/ticket";
import { bolehBerpindah, langkahBerikutnya, transisi } from "../src/domain/status";
import { buatDataContoh } from "../src/data/seed";

const HARI_INI = "2026-10-12";
const NOW = new Date(2026, 9, 12, 9, 0, 0);

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

function tiket(sebagian: Partial<Ticket> = {}, isi: Partial<DraftTiket> = {}): Ticket {
  return {
    ...buatTiket(draft(isi), { now: NOW, nomor: "TKT-2026-0001" }),
    ...sebagian,
  };
}

describe("keterlambatan (PRD 3.1)", () => {
  it("menandai terlambat bila tenggat lewat dan belum ditutup", () => {
    expect(lewatTenggat(tiket({ tenggat: "2026-10-11" }), HARI_INI)).toBe(true);
  });

  it("tidak menandai terlambat bila tenggat hari ini atau masih di depan", () => {
    expect(lewatTenggat(tiket({ tenggat: HARI_INI }), HARI_INI)).toBe(false);
    expect(lewatTenggat(tiket({ tenggat: "2026-10-13" }), HARI_INI)).toBe(false);
  });

  it("tidak menandai terlambat untuk Selesai maupun Dibatalkan", () => {
    expect(lewatTenggat(tiket({ tenggat: "2026-10-01", status: "selesai" }), HARI_INI)).toBe(false);
    expect(lewatTenggat(tiket({ tenggat: "2026-10-01", status: "dibatalkan" }), HARI_INI)).toBe(false);
  });

  it("menghitung hari tinggal bertanda negatif saat terlambat", () => {
    expect(hariTinggal(tiket({ tenggat: "2026-10-09" }), HARI_INI)).toBe(-3);
    expect(hariTinggal(tiket({ tenggat: "2026-10-14" }), HARI_INI)).toBe(2);
  });
});

describe("sisa tagihan (PRD 3.3)", () => {
  it("estimasi dikurangi DP", () => {
    expect(sisaTagihan(tiket({}, { estimasi: 750000, dp: 250000 }))).toBe(500000);
  });

  it("nol ketika DP sama dengan estimasi", () => {
    expect(sisaTagihan(tiket({}, { estimasi: 750000, dp: 750000 }))).toBe(0);
  });

  it("tidak pernah negatif meski data tidak konsisten", () => {
    expect(sisaTagihan(tiket({}, { estimasi: 100000, dp: 900000 }))).toBe(0);
  });
});

describe("nomor tiket otomatis", () => {
  it("mulai dari 0001 saat kosong", () => {
    expect(nomorBerikutnya([], HARI_INI)).toBe("TKT-2026-0001");
  });

  it("melanjutkan nomor tertinggi pada tahun berjalan", () => {
    expect(nomorBerikutnya([tiket({ nomor: "TKT-2026-0007" }), tiket({ nomor: "TKT-2026-0003" })], HARI_INI)).toBe(
      "TKT-2026-0008",
    );
  });

  it("mengabaikan tahun lain", () => {
    expect(nomorBerikutnya([tiket({ nomor: "TKT-2025-0099" })], HARI_INI)).toBe("TKT-2026-0001");
  });
});

describe("timeline append-only (PRD 3.2)", () => {
  it("menambah entri tanpa mengubah entri lama", () => {
    const asli = buatTiket(draft(), { now: new Date(2026, 9, 10, 8, 0), nomor: "TKT-2026-0001" });
    const jalan = ubahStatus(asli, "dikerjakan", { now: new Date(2026, 9, 10, 11, 0) });
    const hasil = terapkanDraft(
      jalan,
      draft({ status: "dikerjakan", tenggat: "2026-10-20", catatanInternal: "Cek ulang kabel." }),
      { now: new Date(2026, 9, 11, 13, 0) },
    );

    expect(hasil.ticket.timeline).toHaveLength(jalan.timeline.length + 1);
    expect(hasil.ticket.timeline[0]).toEqual(jalan.timeline[0]);
    expect(hasil.ticket.timeline[1]).toEqual(jalan.timeline[1]);
    expect(hasil.ticket.timeline[2].jenis).toBe("pembaruan");
    expect(hasil.ticket.timeline[2].pesan).toContain("Tenggat");
  });

  it("mencatat entri status tersendiri saat status berubah lewat form", () => {
    const asli = buatTiket(draft(), { now: NOW, nomor: "TKT-2026-0001" });
    const hasil = terapkanDraft(asli, draft({ status: "diperiksa" }), { now: NOW });
    expect(hasil.statusBerubah).toBe(true);
    expect(hasil.ticket.timeline).toHaveLength(2);
    expect(hasil.ticket.timeline[1].jenis).toBe("status");
    expect(hasil.ticket.timeline[1].dari).toBe("baru");
    expect(hasil.ticket.timeline[1].ke).toBe("diperiksa");
  });

  it("tidak menambah entri bila tidak ada perubahan", () => {
    const asli = buatTiket(draft(), { now: NOW, nomor: "TKT-2026-0001" });
    const hasil = terapkanDraft(asli, draft(), { now: NOW });
    expect(hasil.perubahan).toHaveLength(0);
    expect(hasil.ticket.timeline).toHaveLength(1);
  });

  it("catatan pengerjaan menambah catatan dan jejak", () => {
    const asli = buatTiket(draft(), { now: NOW, nomor: "TKT-2026-0001" });
    const hasil = tambahCatatan(asli, "Ganti bantalan motor.", { now: NOW });
    expect(hasil.catatanKerja).toHaveLength(1);
    expect(hasil.timeline[1].jenis).toBe("catatan");
  });
});

describe("transisi status", () => {
  it("tidak mengizinkan lompatan illogical", () => {
    expect(bolehBerpindah("baru", "siap_diambil")).toBe(false);
    expect(bolehBerpindah("baru", "dikerjakan")).toBe(true);
  });

  it("tidak ada transisi keluar dari status tertutup", () => {
    expect(transisi("selesai")).toHaveLength(0);
    expect(transisi("dibatalkan")).toHaveLength(0);
  });

  it("langkah berikutnya mengikuti alur kerja", () => {
    expect(langkahBerikutnya("baru")).toBe("diperiksa");
    expect(langkahBerikutnya("dikerjakan")).toBe("siap_diambil");
    expect(langkahBerikutnya("selesai")).toBeNull();
  });
});

describe("metrik dasbor", () => {
  const daftar: Ticket[] = [
    tiket({ nomor: "TKT-2026-0001" }, { tanggalMasuk: "2026-10-12", tenggat: "2026-10-14" }),
    tiket({ nomor: "TKT-2026-0002" }, { tanggalMasuk: "2026-10-11", tenggat: "2026-10-11" }),
    tiket({ nomor: "TKT-2026-0003" }, { tanggalMasuk: "2026-10-10", tenggat: "2026-10-01" }),
    tiket({ nomor: "TKT-2026-0004" }, { tanggalMasuk: "2026-10-05", tenggat: "2026-10-06" }),
  ];

  it("menghitung metrik utama dari data", () => {
    const metrik = hitungMetrik(daftar, HARI_INI);
    expect(metrik.total).toBe(4);
    expect(metrik.aktif).toBe(4);
    expect(metrik.terlambat).toBe(3);
    expect(metrik.siapDiambil).toBe(0);
    expect(metrik.sisaAktif).toBe(4 * 250000);
  });

  it("tidak menghitung tiket tertutup sebagai aktif", () => {
    const selesai = ubahStatus(daftar[0], "selesai", { now: new Date(2026, 9, 10, 16, 0) });
    const batal = ubahStatus(daftar[1], "dibatalkan", { now: new Date(2026, 9, 10, 16, 0) });
    const metrik = hitungMetrik([daftar[2], selesai, batal], HARI_INI);
    expect(metrik.aktif).toBe(1);
    expect(metrik.selesaiBulanIni).toBe(1);
    expect(selesaiBulanIni(selesai, HARI_INI)).toBe(true);
  });

  it("tidak menghitung selesai bulan lalu", () => {
    const selesai = ubahStatus(daftar[0], "selesai", { now: new Date(2026, 8, 20, 16, 0) });
    expect(hitungMetrik([selesai], HARI_INI).selesaiBulanIni).toBe(0);
  });

  it("data kosong menghasilkan nol konsisten", () => {
    expect(hitungMetrik([], HARI_INI)).toMatchObject({
      total: 0,
      aktif: 0,
      terlambat: 0,
      siapDiambil: 0,
      sisaAktif: 0,
      rataTinggalHari: 0,
    });
  });

  it("menghitung sebaran per status", () => {
    const hasil = hitungPerStatus([daftar[0], daftar[1], { ...daftar[2], status: "dikerjakan" }]);
    expect(hasil.find((s) => s.status === "baru")?.jumlah).toBe(2);
    expect(hasil.find((s) => s.status === "dikerjakan")?.jumlah).toBe(1);
  });
});

describe("pencarian, filter, urutan", () => {
  const a = tiket(
    { nomor: "TKT-2026-0001" },
    { pelanggan: "Sari Wulandari", perangkat: "Printer Epson L3110", tanggalMasuk: "2026-10-10", tenggat: "2026-10-12" },
  );
  const b = tiket(
    { nomor: "TKT-2026-0002" },
    { pelanggan: "Bambang Setiawan", perangkat: "Kulkas 1 Pintu", prioritas: "darurat", tanggalMasuk: "2026-10-11", tenggat: "2026-10-11" },
  );
  const daftar = [a, b];

  const base = (): FilterTiket => filterAwal();

  it("mencari nomor, nama, perangkat, telepon, dan kategori", () => {
    expect(cocokCari(b, "tkt-2026-0002")).toBe(true);
    expect(cocokCari(a, "SARI")).toBe(true);
    expect(cocokCari(a, "epson")).toBe(true);
    expect(cocokCari(a, "0812")).toBe(true);
    expect(cocokCari(b, "epson")).toBe(false);
  });

  it("filter status, prioritas, terlambat", () => {
    expect(filterTiket(daftar, { ...base(), status: "baru" }, HARI_INI)).toHaveLength(2);
    expect(filterTiket(daftar, { ...base(), prioritas: "darurat" }, HARI_INI).map((t) => t.nomor)).toEqual([
      "TKT-2026-0002",
    ]);
    expect(filterTiket(daftar, { ...base(), terlambat: true }, HARI_INI).map((t) => t.nomor)).toEqual([
      "TKT-2026-0002",
    ]);
  });

  it("menggabungkan beberapa filter", () => {
    const hasil = filterTiket(daftar, { ...base(), status: "baru", cari: "sari" }, HARI_INI);
    expect(hasil).toHaveLength(1);
  });

  it("mengurutkan tenggat terdekat lebih dulu dan menutup di akhir", () => {
    const dekat = { ...a, tenggat: "2026-10-12" };
    const jauh = { ...b, tenggat: "2026-10-20" };
    const naik = urutkan([jauh, dekat], "tenggat", "naik");
    expect(naik.map((t) => t.nomor)).toEqual(["TKT-2026-0001", "TKT-2026-0002"]);

    const ditutup = { ...b, status: "selesai" as Status, tenggat: "2026-09-01" };
    const urut = urutkan([ditutup, dekat], "tenggat", "naik");
    expect(urut[urut.length - 1].status).toBe("selesai");
  });

  it("arah bawaan tiap kolom masuk akal", () => {
    expect(arahAwal("tenggat")).toBe("naik");
    expect(arahAwal("terbaru")).toBe("turun");
    expect(arahAwal("biaya")).toBe("turun");
  });

  it("menghitung waktu tunggu pengambilan", () => {
    const siap = ubahStatus(a, "siap_diambil", { now: new Date(2026, 9, 9, 16, 0) });
    expect(hariMenungguPengambilan(siap, HARI_INI)).toBe(3);
  });

  it("menghasilkan daftar kerja dan daftar terlambat", () => {
    expect(tiketAktifTerdekat(daftar, 5).length).toBe(2);
    expect(tiketTerlambat(daftar, HARI_INI).map((t) => t.nomor)).toEqual(["TKT-2026-0002"]);
    expect(aktif(tiket({ status: "selesai" }))).toBe(false);
  });
});

describe("data contoh", () => {
  const contoh = buatDataContoh(NOW);

  it("nummer unik dan berurutan", () => {
    const nomor = new Set(contoh.map((t) => t.nomor));
    expect(nomor.size).toBe(contoh.length);
    expect(contoh[0].nomor).toBe("TKT-2026-0001");
  });

  it("tidak melanggar aturan bentuk data", () => {
    for (const t of contoh) {
      expect(t.tenggat >= t.tanggalMasuk).toBe(true);
      expect(t.dp).toBeLessThanOrEqual(t.estimasi);
      expect(t.timeline.length).toBeGreaterThan(0);
      expect(t.pelanggan.length).toBeGreaterThan(2);
      expect(t.deskripsi.length).toBeGreaterThan(9);
    }
  });

  it("membuat dasbor hidup: ada terlambat, siap diambil, dan selesai bulan ini", () => {
    const metrik = hitungMetrik(contoh, HARI_INI);
    expect(metrik.aktif).toBeGreaterThan(0);
    expect(metrik.terlambat).toBeGreaterThan(0);
    expect(metrik.siapDiambil).toBeGreaterThan(0);
    expect(metrik.selesaiBulanIni).toBeGreaterThan(0);
  });
});

