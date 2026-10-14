/**
 * Daftar Tiket — "ledger" padat ala kasir/bengkel.
 *
 * Interaksi premium yang dipakai di sini:
 *  - edit sel cepat (estimasi, DP, tenggat, status) tanpa membuka dialog;
 *  - seleksi banyak + tindakan massal;
 *  - filter & tampilan tersimpan;
 *  - di layar sempit, tabel otomatis berubah menjadi kartu.
 */

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowUpDown,
  Check,
  Download,
  Filter,
  Printer,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  Pencil,
} from "lucide-react";
import type { FilterTiket, Prioritas, Status, Ticket, Urutan } from "../domain/types";
import { DAFTAR_PRIORITAS } from "../domain/types";
import {
  arahAwal,
  hariTinggal,
  lewatTenggat,
  sisaTagihan,
  urutkan,
} from "../domain/ticket";
import { formatTanggal } from "../domain/dates";
import { formatInputRupiah, rupiah } from "../domain/money";
import {
  META_PRIORITAS,
  META_STATUS,
  URUTAN_STATUS,
  labelStatus,
  langkahBerikutnya,
  transisi,
} from "../domain/status";
import { labelLangkahBerikut } from "../domain/health";
import { ItemPopover, Kosong, Lencana, Pilih, Popover, Tombol, TombolIkon } from "../ui";

export interface TicketListProps {
  tiket: Ticket[];
  hariIni: string;
  filter: FilterTiket;
  onFilter: (filter: FilterTiket) => void;
  onBuat: () => void;
  onBuka: (id: string) => void;
  onUbah: (t: Ticket) => void;
  onHapus: (t: Ticket) => void;
  onUbahStatus: (t: Ticket, ke: Status) => void;
  onUbahCepat: (t: Ticket, perubahan: Partial<Pick<Ticket, "estimasi" | "dp" | "tenggat">>) => void;
  onEkspor: (t: Ticket[]) => void;
  onCetak: (t: Ticket[]) => void;
  onStatusMassal: (ids: string[], ke: Status) => void;
  onHapusMassal: (ids: string[]) => void;
  hasilFilter: Ticket[];
  onSimpanTampilan: (nama: string, filter: Partial<FilterTiket>) => void;
}

export function TicketList({
  tiket,
  hariIni,
  filter,
  onFilter,
  onBuat,
  onBuka,
  onUbah,
  onHapus,
  onUbahStatus,
  onUbahCepat,
  onEkspor,
  onCetak,
  onStatusMassal,
  onHapusMassal,
  hasilFilter,
  onSimpanTampilan,
}: TicketListProps): ReactNode {
  const [terpilih, setTerpilih] = useState<string[]>([]);
  const [panelFilter, setPanelFilter] = useState(false);

  const urut = useMemo(
    () => urutkan(hasilFilter, filter.urut, filter.arah),
    [hasilFilter, filter.urut, filter.arah],
  );

  function ubah(sebagian: Partial<FilterTiket>) {
    onFilter({ ...filter, ...sebagian });
    setTerpilih([]);
  }

  function ubahUrutan(kunci: Urutan) {
    if (kunci === filter.urut) ubah({ arah: filter.arah === "naik" ? "turun" : "naik" });
    else ubah({ urut: kunci, arah: arahAwal(kunci) });
  }

  function togglePilih(id: string) {
    setTerpilih((n) => (n.includes(id) ? n.filter((x) => x !== id) : [...n, id]));
  }

  const semuaTerpilih = urut.length > 0 && urut.every((t) => terpilih.includes(t.id));
  const adaFilter =
    filter.cari.trim() !== "" ||
    filter.status !== "semua" ||
    filter.prioritas !== "semua" ||
    filter.terlambat;

  return (
    <div className="halaman">
      <div className="ledger">
        <div className="ledger-alat">
          <div className="cari omni" style={{ maxWidth: "360px" }}>
            <Search size={15} className="omni-ikon" aria-hidden="true" />
            <input
              type="search"
              value={filter.cari}
              placeholder="Cari nomor, pelanggan, perangkat…"
              aria-label="Cari tiket"
              onChange={(e) => ubah({ cari: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", gap: "var(--s-2)", flexWrap: "wrap" }}>
            <Tombol
              variasi="halus"
              ukuran="kecil"
              ikon={<Filter size={14} aria-hidden="true" />}
              aria-expanded={panelFilter}
              onClick={() => setPanelFilter((v) => !v)}
              title="Buka filter lanjutan"
            >
              Filter
            </Tombol>

            <Popover
              label="Urutkan"
              pemicu={(props) => (
                <Tombol
                  {...props}
                  variasi="halus"
                  ukuran="kecil"
                  ikon={<ArrowUpDown size={14} aria-hidden="true" />}
                >
                  {OPSI_URUT.find((o) => o.value === filter.urut)?.label}
                </Tombol>
              )}
            >
              {(tutup) => (
                <>
                  {OPSI_URUT.map((o) => (
                    <ItemPopover
                      key={o.value}
                      aktif={filter.urut === o.value}
                      onClick={() => {
                        ubahUrutan(o.value);
                        tutup();
                      }}
                    >
                      {o.label}
                    </ItemPopover>
                  ))}
                </>
              )}
            </Popover>

            <TombolIkon
              label="Ekspor hasil daftar ke CSV"
              ikon={<Download size={14} aria-hidden="true" />}
              onClick={() => onEkspor(hasilFilter)}
              disabled={hasilFilter.length === 0}
            />
            <TombolIkon
              label="Cetak hasil daftar"
              ikon={<Printer size={14} aria-hidden="true" />}
              onClick={() => onCetak(hasilFilter)}
              disabled={hasilFilter.length === 0}
            />
          </div>
        </div>

        {panelFilter ? (
          <div className="ledger-alat" style={{ background: "var(--paper)" }}>
            <Pilih
              value={filter.status}
              aria-label="Filter status"
              onChange={(e) => ubah({ status: e.target.value as Status | "semua" })}
            >
              <option value="semua">Semua status</option>
              {URUTAN_STATUS.map((s) => (
                <option key={s} value={s}>
                  {META_STATUS[s].label}
                </option>
              ))}
            </Pilih>
            <Pilih
              value={filter.prioritas}
              aria-label="Filter prioritas"
              onChange={(e) => ubah({ prioritas: e.target.value as Prioritas | "semua" })}
            >
              <option value="semua">Semua prioritas</option>
              {DAFTAR_PRIORITAS.map((p) => (
                <option key={p} value={p}>
                  {META_PRIORITAS[p].label}
                </option>
              ))}
            </Pilih>
            <label className="t-small" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <input
                type="checkbox"
                checked={filter.terlambat}
                onChange={(e) => ubah({ terlambat: e.target.checked })}
              />
              Hanya terlambat
            </label>
            {adaFilter ? (
              <Tombol
                variasi="halus"
                ukuran="kecil"
                ikon={<RotateCcw size={13} aria-hidden="true" />}
                onClick={() =>
                  onFilter({
                    cari: "",
                    status: "semua",
                    prioritas: "semua",
                    terlambat: false,
                    urut: "tenggat",
                    arah: "naik",
                  })
                }
              >
                Reset
              </Tombol>
            ) : null}
            <Tombol
              variasi="halus"
              ukuran="kecil"
              onClick={() => {
                const nama = window.prompt("Nama tampilan tersimpan", filter.cari || "Tampilan saya");
                if (nama && nama.trim()) onSimpanTampilan(nama.trim(), filter);
              }}
            >
              Simpan tampilan
            </Tombol>
          </div>
        ) : null}

        {terpilih.length > 0 ? (
          <div className="baris-bulk">
            <span className="t-eyebrow">{terpilih.length} dipilih</span>
            <Popover
              label="Ubah status terpilih"
              pemicu={(props) => (
                <Tombol {...props} ukuran="kecil" variasi="aksen">
                  Ubah status
                </Tombol>
              )}
            >
              {(tutup) =>
                URUTAN_STATUS.map((s) => (
                  <ItemPopover
                    key={s}
                    onClick={() => {
                      onStatusMassal(terpilih, s);
                      setTerpilih([]);
                      tutup();
                    }}
                  >
                    {META_STATUS[s].label}
                  </ItemPopover>
                ))
              }
            </Popover>
            <Tombol
              ukuran="kecil"
              variasi="bahaya"
              ikon={<Trash2 size={13} aria-hidden="true" />}
              onClick={() => {
                onHapusMassal(terpilih);
                setTerpilih([]);
              }}
            >
              Hapus terpilih
            </Tombol>
            <TombolIkon
              label="Batalkan seleksi"
              ikon={<Check size={13} aria-hidden="true" />}
              onClick={() => setTerpilih([])}
            />
          </div>
        ) : null}

        {urut.length === 0 ? (
          <Kosong
            judul={adaFilter ? "Tidak ada tiket yang cocok" : "Belum ada tiket"}
            pesan={
              adaFilter
                ? "Ubah kata kunci atau atur ulang filter untuk melihat tiket lain."
                : "Catat pekerjaan pertama untuk mulai memantau tenggat dan tagihan."
            }
            ikon={<Search size={20} aria-hidden="true" />}
            aksi={
              adaFilter ? (
                <Tombol
                  onClick={() =>
                    onFilter({
                      cari: "",
                      status: "semua",
                      prioritas: "semua",
                      terlambat: false,
                      urut: "tenggat",
                      arah: "naik",
                    })
                  }
                >
                  Atur ulang filter
                </Tombol>
              ) : (
                <Tombol variasi="utama" onClick={onBuat}>
                  Buat tiket pertama
                </Tombol>
              )
            }
          />
        ) : (
          <>
            <div className="tabel-gulir">
              <table className="tabel">
                <thead>
                  <tr>
                    <th scope="col" style={{ width: 36 }}>
                      <input
                        type="checkbox"
                        checked={semuaTerpilih}
                        aria-label="Pilih semua yang tampil"
                        onChange={() =>
                          setTerpilih(
                            semuaTerpilih ? [] : urut.map((t) => t.id),
                          )
                        }
                      />
                    </th>
                    <th scope="col">
                      <TombolKolom aktif={filter.urut === "nomor"} onClick={() => ubahUrutan("nomor")}>
                        Nomor
                      </TombolKolom>
                    </th>
                    <th scope="col">Pelanggan</th>
                    <th scope="col">Perangkat</th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <TombolKolom aktif={filter.urut === "tenggat"} onClick={() => ubahUrutan("tenggat")}>
                        Tenggat
                      </TombolKolom>
                    </th>
                    <th scope="col" className="kanan">
                      <TombolKolom aktif={filter.urut === "biaya"} onClick={() => ubahUrutan("biaya")}>
                        Estimasi
                      </TombolKolom>
                    </th>
                    <th scope="col" className="kanan">Sisa</th>
                    <th scope="col" className="kanan">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {urut.map((t) => (
                    <BarisTiket
                      key={t.id}
                      ticket={t}
                      hariIni={hariIni}
                      terpilih={terpilih.includes(t.id)}
                      onPilih={() => togglePilih(t.id)}
                      onBuka={() => onBuka(t.id)}
                      onUbah={() => onUbah(t)}
                      onHapus={() => onHapus(t)}
                      onUbahStatus={(ke) => onUbahStatus(t, ke)}
                      onUbahCepat={(perubahan) => onUbahCepat(t, perubahan)}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="kartu-daftar">
              {urut.map((t) => (
                <li key={t.id}>
                  <button type="button" className="kartu-tiket" onClick={() => onBuka(t.id)}>
                    <span className="kartu-kepala">
                      <span className="mono t-faint">{t.nomor}</span>
                      <Lencana nada={nadaStatus(t.status)}>{META_STATUS[t.status].labelPendek}</Lencana>
                    </span>
                    <span className="kartu-nama">{t.perangkat}</span>
                    <span className="kartu-meta">
                      {t.pelanggan} · {formatTanggal(t.tanggalMasuk)}
                    </span>
                    <span className="kartu-kanan">
                      <span>
                        <small className="kartu-label">Tenggat</small>
                        {formatTanggal(t.tenggat)}
                      </span>
                      <span>
                        <small className="kartu-label">Sisa</small>
                        {rupiah(sisaTagihan(t))}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>

            <div
              className="ledger-alat"
              style={{ justifyContent: "space-between", borderTop: "1px solid var(--line)", borderBottom: "none" }}
            >
              <span className="t-small t-muted">
                Menampilkan {urut.length} dari {tiket.length} tiket
              </span>
              <span className="t-small t-faint">
                Tekan <span className="kbd">Ctrl</span> <span className="kbd">K</span> untuk
                membuka tiket mana pun
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const OPSI_URUT: { value: Urutan; label: string }[] = [
  { value: "tenggat", label: "Tenggat" },
  { value: "terbaru", label: "Terbaru" },
  { value: "prioritas", label: "Prioritas" },
  { value: "nomor", label: "Nomor" },
  { value: "biaya", label: "Biaya" },
];

function TombolKolom({
  children,
  onClick,
  aktif,
}: {
  children: ReactNode;
  onClick: () => void;
  aktif: boolean;
}): ReactNode {
  return (
    <button
      type="button"
      className="tabel-kolom-judul"
      data-urut={aktif || undefined}
      onClick={onClick}
    >
      {children}
      <ArrowUpDown size={12} aria-hidden="true" />
    </button>
  );
}

function nadaStatus(status: Status): string {
  return META_STATUS[status].nada;
}

interface BarisProps {
  ticket: Ticket;
  hariIni: string;
  terpilih: boolean;
  onPilih: () => void;
  onBuka: () => void;
  onUbah: () => void;
  onHapus: () => void;
  onUbahStatus: (ke: Status) => void;
  onUbahCepat: (perubahan: Partial<Pick<Ticket, "estimasi" | "dp" | "tenggat">>) => void;
}

function BarisTiket({
  ticket,
  hariIni,
  terpilih,
  onPilih,
  onBuka,
  onUbah,
  onHapus,
  onUbahStatus,
  onUbahCepat,
}: BarisProps): ReactNode {
  const [sunting, setSunting] = useState(false);
  const [estimasi, setEstimasi] = useState(String(ticket.estimasi));
  const [dp, setDp] = useState(String(ticket.dp));
  const [tenggat, setTenggat] = useState(ticket.tenggat);

  function mulaiSunting() {
    setEstimasi(String(ticket.estimasi));
    setDp(String(ticket.dp));
    setTenggat(ticket.tenggat);
    setSunting(true);
  }

  function simpanSunting() {
    const estimasiBaru = Number(estimasi.replace(/\D/g, "")) || 0;
    const dpBaru = Number(dp.replace(/\D/g, "")) || 0;
    setSunting(false);
    if (
      estimasiBaru !== ticket.estimasi ||
      dpBaru !== ticket.dp ||
      tenggat !== ticket.tenggat
    ) {
      onUbahCepat({ estimasi: estimasiBaru, dp: dpBaru, tenggat });
    }
  }

  const berikut = langkahBerikutnya(ticket.status);

  if (sunting) {
    return (
      <tr>
        <td />
        <td colSpan={7} style={{ background: "var(--paper-2)" }}>
          <div style={{ display: "flex", gap: "var(--s-2)", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="text"
              inputMode="numeric"
              value={formatInputRupiah(estimasi)}
              onChange={(e) => setEstimasi(e.target.value.replace(/\D/g, ""))}
              aria-label="Estimasi baru"
              style={{ width: 110, padding: "6px 8px", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)" }}
            />
            <input
              type="text"
              inputMode="numeric"
              value={formatInputRupiah(dp)}
              onChange={(e) => setDp(e.target.value.replace(/\D/g, ""))}
              aria-label="DP baru"
              style={{ width: 110, padding: "6px 8px", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)" }}
            />
            <input
              type="date"
              value={tenggat}
              onChange={(e) => setTenggat(e.target.value)}
              aria-label="Tenggat baru"
              style={{ padding: "6px 8px", border: "1px solid var(--line-2)", borderRadius: "var(--r-sm)" }}
            />
            <span className="t-small t-muted">
              Sisa: {rupiah(Math.max(0, (Number(estimasi.replace(/\D/g, "")) || 0) - (Number(dp.replace(/\D/g, "")) || 0)))}
            </span>
            <Tombol ukuran="kecil" variasi="utama" onClick={simpanSunting}>
              Simpan
            </Tombol>
            <Tombol ukuran="kecil" onClick={() => setSunting(false)}>
              Batal
            </Tombol>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr data-terpilih={terpilih || undefined}>
      <td>
        <input
          type="checkbox"
          checked={terpilih}
          onChange={onPilih}
          aria-label={`Pilih ${ticket.nomor}`}
        />
      </td>
      <td>
        <button type="button" className="tabel-kolom-judul mono" onClick={onBuka}>
          {ticket.nomor}
        </button>
      </td>
      <td>
        <button type="button" className="tabel-kolom-judul" onClick={onBuka} style={{ fontWeight: 500 }}>
          {ticket.pelanggan}
        </button>
      </td>
      <td className="sel" title={ticket.perangkat}>
        {ticket.perangkat}
      </td>
      <td>
        <Popover
          label={`Ubah status ${ticket.nomor}`}
          pemicu={(props) => (
            <button type="button" className="tabel-kolom-judul" {...props}>
              <Lencana nada={nadaStatus(ticket.status)}>{META_STATUS[ticket.status].labelPendek}</Lencana>
            </button>
          )}
        >
          {(tutup) =>
            transisi(ticket.status).map((s) => (
              <ItemPopover
                key={s}
                onClick={() => {
                  onUbahStatus(s);
                  tutup();
                }}
              >
                {META_STATUS[s].label}
              </ItemPopover>
            ))
          }
        </Popover>
      </td>
      <td>
        <span className={lewatTenggat(ticket, hariIni) ? "t-bahaya" : undefined}>
          {formatTanggal(ticket.tenggat)}
        </span>
        <span className="t-faint" style={{ display: "block", fontSize: "var(--fs-micro)" }}>
          {META_STATUS[ticket.status].ditutup ? "ditutup" : `${hariTinggal(ticket, hariIni)} hari`}
        </span>
      </td>
      <td className="kanan">{rupiah(ticket.estimasi)}</td>
      <td className="kanan">{rupiah(sisaTagihan(ticket))}</td>
      <td className="kanan">
        <span className="selisip-tombol" style={{ justifyContent: "flex-end" }}>
          {berikut ? (
            <TombolIkon
              label={`${labelLangkahBerikut(ticket)} (${labelStatus(berikut)})`}
              ikon={<Check size={13} aria-hidden="true" />}
              variasi="aksen"
              onClick={() => onUbahStatus(berikut)}
            />
          ) : null}
          <TombolIkon label="Ubah cepat nilai" ikon={<SlidersHorizontal size={13} aria-hidden="true" />} onClick={mulaiSunting} />
          <TombolIkon label="Ubah tiket" ikon={<Pencil size={13} aria-hidden="true" />} onClick={onUbah} />
          <TombolIkon label="Hapus tiket" ikon={<Trash2 size={13} aria-hidden="true" />} variasi="bahaya" onClick={onHapus} />
        </span>
      </td>
    </tr>
  );
}
