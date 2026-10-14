/**
 * App JobTrack — perakitan seluruh lapisan:
 * store (state) → routing hash → shell → tampilan per halaman → dialog/drawer/cetak.
 *
 * Tidak ada router library: hanya parsing hash kecil di bawah ini, cukup untuk
 * tiga halaman dan satu parameter (tiket yang dibuka).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Keyboard } from "lucide-react";
import type { DraftTiket, FilterTiket, Status, Ticket, TampilanTersimpan } from "../domain/types";
import { DAFTAR_STATUS } from "../domain/types";
import { filterAwal, filterTiket, nomorBerikutnya } from "../domain/ticket";
import { transisi } from "../domain/status";
import { bacaBerkas, jsonCadangan, namaBerkasCadangan, unduhBerkas } from "../data/backup";
import { buatCsv, namaBerkasCsv } from "../data/csv";
import { ulasCadangan } from "../data/storage";
import { useStore } from "../state/store";
import { useTheme } from "../state/theme";
import { AppShell } from "./AppShell";
import type { Halaman } from "./AppShell";
import { PaletPerintah } from "./CommandPalette";
import { Dashboard } from "../features/Dashboard";
import { TicketList } from "../features/TicketList";
import { TicketSheet } from "../features/TicketSheet";
import { TicketForm } from "../features/TicketForm";
import { DataPage } from "../features/DataPage";
import { DaftarTiketCetak, NotaPekerjaan } from "../features/Print";
import { Dialog, DialogKonfirmasi, Kbd, Tombol, useToast } from "../ui";
import { MODIFIER, PINTASAN } from "../ui/shortcuts";

type HalamanRute = Halaman;

interface Rute {
  halaman: HalamanRute;
  filter: Partial<FilterTiket>;
  bukaId: string | null;
}

function bacaRute(): Rute {
  const dasar: Rute = { halaman: "dasbor", filter: {}, bukaId: null };
  if (typeof window === "undefined") return dasar;
  const hash = window.location.hash.replace(/^#/, "");
  const [path = "", query = ""] = hash.split("?");
  const params = new URLSearchParams(query);

  const halaman: HalamanRute = path.startsWith("/tiket")
    ? "tiket"
    : path.startsWith("/data")
      ? "data"
      : "dasbor";

  const filter: Partial<FilterTiket> = {};
  const status = params.get("status");
  if (status && (DAFTAR_STATUS as readonly string[]).includes(status)) {
    filter.status = status as Status;
  }
  const cari = params.get("cari");
  if (cari) filter.cari = cari;
  if (params.get("terlambat") === "1") filter.terlambat = true;

  return { halaman, filter, bukaId: params.get("buka") };
}

type KerjaCetak =
  | { jenis: "nota"; ticket: Ticket }
  | { jenis: "daftar"; tickets: Ticket[]; ringkasan: string }
  | null;

export function App(): ReactNode {
  const store = useStore();
  const { tampilkan } = useToast();
  const tema = useTheme();

  const [rute, setRute] = useState<Rute>(bacaRute);
  const [filter, setFilter] = useState<FilterTiket>(() => ({ ...filterAwal(), ...bacaRute().filter }));
  const [tampilanAktif, setTampilanAktif] = useState<string | null>(null);
  const [formBuka, setFormBuka] = useState<{ mode: "buat" | "ubah"; ticket?: Ticket } | null>(null);
  const [konfirmasi, setKonfirmasi] = useState<
    | { jenis: "hapus"; ticket: Ticket }
    | { jenis: "hapusBanyak"; ids: string[] }
    | { jenis: "pulihkan" }
    | { jenis: "impor"; tickets: Ticket[]; peringatan: string[] }
    | null
  >(null);
  const [cetak, setCetak] = useState<KerjaCetak>(null);
  const [paletBuka, setPaletBuka] = useState(false);
  const [bantuanBuka, setBantuanBuka] = useState(false);

  const hariIni = store.hariIni;

  /* ---------- Routing ---------- */
  useEffect(() => {
    const onHash = () => {
      const baru = bacaRute();
      setRute(baru);
      setFilter((lama) => ({ ...lama, ...baru.filter }));
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const pindah = useCallback((halaman: Halaman, patch: Partial<FilterTiket> = {}, bukaId?: string) => {
    const params = new URLSearchParams();
    if (patch.status && patch.status !== "semua") params.set("status", patch.status);
    if (patch.cari) params.set("cari", patch.cari);
    if (patch.terlambat) params.set("terlambat", "1");
    if (bukaId) params.set("buka", bukaId);
    const query = params.toString();
    const tujuan =
      halaman === "dasbor" ? "#/" : `#/${halaman}${query ? `?${query}` : ""}`;
    if (window.location.hash === tujuan) {
      setFilter((lama) => ({ ...lama, ...patch }));
    } else {
      window.location.hash = tujuan;
    }
  }, []);

  /* ---------- Toast dari store ---------- */
  const kabarTerlihat = useRef<string | null>(null);
  useEffect(() => {
    const k = store.kabar;
    if (!k || k.id === kabarTerlihat.current) return;
    kabarTerlihat.current = k.id;
    tampilkan({
      judul: k.judul,
      detail: k.detail,
      nada: k.nada,
      aksi: k.bisaUrungkan && store.bisaUndo
        ? { label: "Urungkan", jalankan: () => store.undo() }
        : undefined,
    });
  }, [store, tampilkan]);

  const galatSimpanTerlihat = useRef<string | null>(null);
  useEffect(() => {
    if (!store.galatSimpan || store.galatSimpan === galatSimpanTerlihat.current) return;
    galatSimpanTerlihat.current = store.galatSimpan;
    tampilkan({ judul: "Penyimpanan bermasalah", detail: store.galatSimpan, nada: "galat" });
  }, [store.galatSimpan, tampilkan]);

  /* ---------- Cetak ---------- */
  useEffect(() => {
    if (!cetak) return;
    const timer = window.setTimeout(() => window.print(), 90);
    const selesai = () => setCetak(null);
    window.addEventListener("afterprint", selesai);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("afterprint", selesai);
    };
  }, [cetak]);

  /* ---------- Pintasan keyboard ---------- */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const mengetik =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable);

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletBuka((v) => !v);
        return;
      }
      if (mengetik) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "g") {
        event.preventDefault();
        if (event.shiftKey) return;
        pindah("tiket");
        return;
      }
      if (event.key === "?" ) {
        event.preventDefault();
        setBantuanBuka(true);
        return;
      }
      if (event.key === "n" && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        setFormBuka({ mode: "buat" });
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [pindah, store]);

  // Tombol tema di topbar: nyala/mati mode gelap (dua posisi).
  const ubahTema = () => {
    tema.ubahTema();
    store.setTema(tema.preferensi);
  };

  /* ---------- Data turunan ---------- */
  const hasilFilter = useMemo(
    () => filterTiket(store.tiket, filter, hariIni),
    [store.tiket, filter, hariIni],
  );

  const ticketTerbuka = useMemo(
    () => (rute.bukaId ? store.tiket.find((t) => t.id === rute.bukaId) : undefined),
    [rute.bukaId, store.tiket],
  );

  const tampilanDenganJumlah = useMemo(
    () =>
      store.tampilan.map((t) => ({
        ...t,
        jumlah: filterTiket(store.tiket, { ...filterAwal(), ...t.filter }, hariIni).length,
      })),
    [store.tampilan, store.tiket, hariIni],
  );

  /* ---------- Aksi ---------- */
  const bukaTiket = useCallback(
    (id: string) => {
      pindah("tiket", filter, id);
    },
    [pindah, filter],
  );

  const eksporCsv = useCallback(
    (daftar: Ticket[]) => {
      if (daftar.length === 0) {
        tampilkan({ judul: "Tidak ada tiket untuk diekspor", nada: "galat" });
        return;
      }
      unduhBerkas(namaBerkasCsv(hariIni), buatCsv(daftar, hariIni), "text/csv");
      tampilkan({ judul: `${daftar.length} tiket diekspor ke CSV`, nada: "sukses" });
    },
    [hariIni, tampilkan],
  );

  const eksporJson = useCallback(() => {
    unduhBerkas(namaBerkasCadangan(), jsonCadangan(store.tiket), "application/json");
    tampilkan({ judul: `${store.tiket.length} tiket dicadangkan`, nada: "sukses" });
  }, [store.tiket, tampilkan]);

  const imporBerkas = useCallback(
    async (file: File) => {
      try {
        const teks = await bacaBerkas(file);
        const hasil = ulasCadangan(teks);
        if (!hasil.ok || !hasil.tiket) {
          tampilkan({
            judul: "Berkas ditolak",
            detail: hasil.galat ?? "Data Anda tidak diubah.",
            nada: "galat",
          });
          return;
        }
        setKonfirmasi({
          jenis: "impor",
          tickets: hasil.tiket,
          peringatan: hasil.peringatan ?? [],
        });
      } catch (error) {
        tampilkan({
          judul: "Berkas gagal dibaca",
          detail: error instanceof Error ? error.message : "Data tidak diubah.",
          nada: "galat",
        });
      }
    },
    [tampilkan],
  );

  const simpanTampilan = useCallback(
    (nama: string, isi: Partial<FilterTiket>) => {
      const baru: TampilanTersimpan = {
        id: `custom-${Date.now().toString(36)}`,
        nama,
        filter: isi,
        bawaan: false,
      };
      store.simpanTampilan([...store.tampilan, baru]);
      setTampilanAktif(baru.id);
      tampilkan({ judul: `Tampilan “${nama}” disimpan`, nada: "sukses" });
    },
    [store, tampilkan],
  );

  const pilihTampilan = useCallback(
    (id: string) => {
      const t = store.tampilan.find((x) => x.id === id);
      if (!t) return;
      setTampilanAktif(id);
      setFilter({ ...filterAwal(), ...t.filter });
      pindah("tiket", t.filter);
    },
    [store.tampilan, pindah],
  );

  const simpanDraft = useCallback(
    (draft: DraftTiket) => {
      if (formBuka?.mode === "buat") store.tambah(draft);
      else if (formBuka?.ticket) store.ubah(formBuka.ticket.id, draft);
      setFormBuka(null);
    },
    [formBuka, store],
  );

  /* ---------- Konten ---------- */
  function isiHalaman(): ReactNode {
    if (rute.halaman === "tiket") {
      return (
        <TicketList
          tiket={store.tiket}
          hariIni={hariIni}
          filter={filter}
          hasilFilter={hasilFilter}
          onFilter={setFilter}
          onBuat={() => setFormBuka({ mode: "buat" })}
          onBuka={(id) => bukaTiket(id)}
          onUbah={(t) => setFormBuka({ mode: "ubah", ticket: t })}
          onHapus={(t) => setKonfirmasi({ jenis: "hapus", ticket: t })}
          onUbahStatus={(t, ke) => store.ubahStatus(t.id, ke)}
          onUbahCepat={(t, perubahan) =>
            store.ubah(t.id, {
              pelanggan: t.pelanggan,
              telepon: t.telepon,
              perangkat: t.perangkat,
              kategori: t.kategori,
              deskripsi: t.deskripsi,
              prioritas: t.prioritas,
              status: t.status,
              tanggalMasuk: t.tanggalMasuk,
              tenggat: perubahan.tenggat ?? t.tenggat,
              estimasi: perubahan.estimasi ?? t.estimasi,
              dp: perubahan.dp ?? t.dp,
              catatanInternal: t.catatanInternal,
            })
          }
          onEkspor={eksporCsv}
          onCetak={(daftar) =>
            setCetak({
              jenis: "daftar",
              tickets: daftar,
              ringkasan: `status ${filter.status} · ${daftar.length} tiket`,
            })
          }
          onStatusMassal={(ids, ke) => store.ubahStatusBanyak(ids, ke)}
          onHapusMassal={(ids) => setKonfirmasi({ jenis: "hapusBanyak", ids })}
          onSimpanTampilan={simpanTampilan}
        />
      );
    }

    if (rute.halaman === "data") {
      return (
        <DataPage
          tiket={store.tiket}
          hariIni={hariIni}
          masihDemo={store.masihDemo}
          tersimpanPada={store.tersimpanPada}
          galatMuat={store.galatMuat}
          galatSimpan={store.galatSimpan}
          onEksporCsv={() => eksporCsv(hasilFilter)}
          onEksporJson={eksporJson}
          onImpor={imporBerkas}
          onPulihkan={() => setKonfirmasi({ jenis: "pulihkan" })}
          onBuat={() => setFormBuka({ mode: "buat" })}
        />
      );
    }

    return (
      <Dashboard
        tiket={store.tiket}
        hariIni={hariIni}
        onPindahFilter={(patch) => {
          setFilter({ ...filterAwal(), ...patch });
          pindah("tiket", patch);
        }}
        onBukaTiket={bukaTiket}
        onBuat={() => setFormBuka({ mode: "buat" })}
      />
    );
  }

  return (
    <>
      <AppShell
        halaman={rute.halaman}
        onPindah={(h) => pindah(h)}
        onBuat={() => setFormBuka({ mode: "buat" })}
        onBukaPalet={() => setPaletBuka(true)}
        isDemo={store.masihDemo}
        jumlahTiket={store.tiket.length}
        ciut={localStorage.getItem("jobtrack.rail") === "1"}
        onToggleCiut={() => {
          const sekarang = localStorage.getItem("jobtrack.rail") === "1";
          localStorage.setItem("jobtrack.rail", sekarang ? "0" : "1");
          document.querySelector(".app")?.setAttribute("data-rail", String(!sekarang));
        }}
        tampilan={tampilanDenganJumlah}
        tampilanAktif={tampilanAktif}
        onPilihTampilan={pilihTampilan}
        tema={tema.preferensi}
        onSiklusTema={ubahTema}
      >
        {isiHalaman()}
      </AppShell>

      {formBuka ? (
        <TicketForm
          key={formBuka.mode === "ubah" ? formBuka.ticket?.id : "baru"}
          mode={formBuka.mode}
          ticket={formBuka.ticket}
          semuaTiket={store.tiket}
          hariIni={hariIni}
          nomorBerikut={nomorBerikutnya(store.tiket, hariIni)}
          statusTersedia={
            formBuka.ticket
              ? [formBuka.ticket.status, ...transisi(formBuka.ticket.status)]
              : (["baru", "diperiksa", "dikerjakan", "menunggu", "siap_diambil"] as Status[])
          }
          onTutup={() => setFormBuka(null)}
          onSimpan={simpanDraft}
        />
      ) : null}

      {ticketTerbuka ? (
        <TicketSheet
          ticket={ticketTerbuka}
          hariIni={hariIni}
          onTutup={() => pindah("tiket", filter)}
          onUbah={() => setFormBuka({ mode: "ubah", ticket: ticketTerbuka })}
          onCetak={() => setCetak({ jenis: "nota", ticket: ticketTerbuka })}
          onHapus={() => setKonfirmasi({ jenis: "hapus", ticket: ticketTerbuka })}
          onStatus={(ke, catatan) => store.ubahStatus(ticketTerbuka.id, ke, catatan)}
          onCatatan={(teks) => store.tambahCatatan(ticketTerbuka.id, teks)}
        />
      ) : null}

      {rute.bukaId && !ticketTerbuka ? (
        <DialogKonfirmasi
          judul="Tiket tidak ditemukan"
          pesan="Tiket ini sudah tidak ada di data lokal — mungkin dihapus atau diganti lewat impor."
          labelYa="Tutup"
          bahaya={false}
          onYa={() => pindah("tiket", filter)}
          onTutup={() => pindah("tiket", filter)}
        />
      ) : null}

      {konfirmasi?.jenis === "hapus" ? (
        <DialogKonfirmasi
          judul="Hapus tiket?"
          pesan={
            <>
              Tiket <strong>{konfirmasi.ticket.nomor}</strong> milik{" "}
              <strong>{konfirmasi.ticket.pelanggan}</strong> akan dihapus permanen, termasuk
              timeline dan catatan pengerjaannya.
            </>
          }
          detail="Tindakan ini bisa dikembalikan lewat tombol Urungkan pada notifikasi."
          labelYa="Hapus tiket"
          onYa={() => {
            store.hapus(konfirmasi.ticket.id);
            if (rute.bukaId === konfirmasi.ticket.id) pindah("tiket", filter);
            setKonfirmasi(null);
          }}
          onTutup={() => setKonfirmasi(null)}
        />
      ) : null}

      {konfirmasi?.jenis === "hapusBanyak" ? (
        <DialogKonfirmasi
          judul={`Hapus ${konfirmasi.ids.length} tiket?`}
          pesan="Seluruh tiket yang dipilih akan dihapus. Anda bisa mengurungkannya lewat notifikasi."
          labelYa="Hapus semua"
          onYa={() => {
            store.hapusBanyak(konfirmasi.ids);
            setKonfirmasi(null);
          }}
          onTutup={() => setKonfirmasi(null)}
        />
      ) : null}

      {konfirmasi?.jenis === "pulihkan" ? (
        <DialogKonfirmasi
          judul="Pulihkan data demo?"
          pesan={
            <>
              Seluruh <strong>{store.tiket.length} tiket</strong> yang tersimpan akan dihapus dan
              diganti data contoh JobTrack.
            </>
          }
          detail="Saran: gunakan Ekspor cadangan JSON lebih dulu bila ingin menyimpan salinan."
          labelYa="Ya, pulihkan data demo"
          onYa={() => {
            store.pulihkanDemo();
            setKonfirmasi(null);
          }}
          onTutup={() => setKonfirmasi(null)}
        />
      ) : null}

      {konfirmasi?.jenis === "impor" ? (
        <DialogKonfirmasi
          judul="Ganti data dengan isi berkas?"
          pesan={
            <>
              Berkas berisi <strong>{konfirmasi.tickets.length} tiket valid</strong>. Data saat ini
              berisi <strong>{store.tiket.length} tiket</strong> dan akan diganti seluruhnya.
            </>
          }
          detail={
            konfirmasi.peringatan.length > 0 ? (
              <span>
                {konfirmasi.peringatan.length} baris tidak terbaca dan dilewati:{" "}
                {konfirmasi.peringatan[0]}
              </span>
            ) : (
              "Semua tiket lolos pemeriksaan skema."
            )
          }
          labelYa="Ya, ganti data"
          onYa={() => {
            store.gantiSemua(konfirmasi.tickets);
            setKonfirmasi(null);
          }}
          onTutup={() => setKonfirmasi(null)}
        />
      ) : null}

      {bantuanBuka ? (
        <Dialog
          judul="Pintasan keyboard"
          deskripsi="JobTrack bisa dioperasikan tanpa mouse untuk operator yang hafal alurnya."
          ukuran="kecil"
          ikon={<Keyboard size={16} aria-hidden="true" />}
          onTutup={() => setBantuanBuka(false)}
          kaki={
            <Tombol variasi="utama" onClick={() => setBantuanBuka(false)}>
              Mengerti
            </Tombol>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {["Umum", "Navigasi", "Daftar Tiket"].map((grup) => (
              <div key={grup}>
                <p className="t-eyebrow" style={{ marginBottom: 6 }}>
                  {grup}
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {PINTASAN.filter((p) => p.grup === grup).map((p) => (
                    <div
                      key={`${p.kunci}-${p.grup}`}
                      style={{ display: "flex", justifyContent: "space-between", gap: 12 }}
                    >
                      <span className="t-small">{p.aksi}</span>
                      <span style={{ display: "flex", gap: 3 }}>
                        {p.ctrl ? <Kbd>{MODIFIER}</Kbd> : null}
                        {p.shift ? <Kbd>Shift</Kbd> : null}
                        <Kbd>{p.kunci === "Escape" ? "Esc" : p.kunci}</Kbd>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Dialog>
      ) : null}

      <PaletPerintah
        buka={paletBuka}
        tutup={() => setPaletBuka(false)}
        tiket={store.tiket}
        onPindahFilter={(patch) => {
          setFilter({ ...filterAwal(), ...patch });
          pindah("tiket", patch);
        }}
        onBukaTiket={bukaTiket}
        onBuat={() => setFormBuka({ mode: "buat" })}
        onEksporCsv={() => eksporCsv(hasilFilter)}
        onCetakDaftar={() =>
          setCetak({ jenis: "daftar", tickets: hasilFilter, ringkasan: "tampilan saat ini" })
        }
        onEksporJson={eksporJson}
        onPulihkan={() => setKonfirmasi({ jenis: "pulihkan" })}
        onUndo={() => store.undo()}
        onBukaBantuan={() => setBantuanBuka(true)}
        temaPref={tema.preferensi}
        bisaUrungkan={store.bisaUndo}
        onSiklusTema={ubahTema}
      />

      {cetak ? (
        <div id="area-cetak">
          {cetak.jenis === "nota" ? (
            <NotaPekerjaan ticket={cetak.ticket} now={new Date()} />
          ) : (
            <DaftarTiketCetak
              tiket={cetak.tickets}
              now={new Date()}
              ringkasan={cetak.ringkasan}
            />
          )}
        </div>
      ) : null}
    </>
  );
}
