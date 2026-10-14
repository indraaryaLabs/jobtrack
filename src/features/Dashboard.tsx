/**
 * Dasbor — "papan kerja" bengkel.
 *
 * Hierarki sengaja bukan kumpulan kartu seragam: baris teratas adalah papan
 * status yang bisa diklik (sumber aksi), lalu Insights otomatis, lalu
 * worklist padat. Semua angka dihitung dari state.
 */

import type { ReactNode } from "react";
import {
  ArrowUpRight,
  CircleCheck,
  Clock3,
  Lightbulb,
  PackageCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import type { FilterTiket, Ticket } from "../domain/types";
import {
  hariTinggal,
  hitungMetrik,
  hitungPerStatus,
  lewatTenggat,
  sisaTagihan,
  tiketAktifTerdekat,
} from "../domain/ticket";
import { labelTenggat } from "../domain/dates";
import { formatAngka, rupiah, rupiahRingkas } from "../domain/money";
import { META_STATUS } from "../domain/status";
import { ringkasanOtomatis, wawasanOtomatis } from "../domain/health";
import { pelangganTeratas } from "../domain/customers";
import { Angka, Kosong, Lencana, Tombol } from "../ui";

const NADA_WASANA = {
  bahaya: "bahaya",
  waspada: "waspada",
  aksen: "aksen",
  sukses: "sukses",
} as const;

const IKON_WASANA = {
  bahaya: <TriangleAlert size={15} aria-hidden="true" />,
  waspada: <Clock3 size={15} aria-hidden="true" />,
  aksen: <Lightbulb size={15} aria-hidden="true" />,
  sukses: <CircleCheck size={15} aria-hidden="true" />,
} as const;

export interface DashboardProps {
  tiket: Ticket[];
  hariIni: string;
  onPindahFilter: (filter: Partial<FilterTiket>) => void;
  onBukaTiket: (id: string) => void;
  onBuat: () => void;
}

export function Dashboard({
  tiket,
  hariIni,
  onPindahFilter,
  onBukaTiket,
  onBuat,
}: DashboardProps): ReactNode {
  const metrik = hitungMetrik(tiket, hariIni);
  const perStatus = hitungPerStatus(tiket);
  const statusAktif = perStatus.filter((s) => !META_STATUS[s.status].ditutup);
  const aktifTickets = tiketAktifTerdekat(tiket, 7);
  const wawasan = wawasanOtomatis(tiket, hariIni);
  const pelanggan = pelangganTeratas(tiket, 5);
  const puncak = Math.max(1, ...statusAktif.map((s) => s.jumlah));
  const dikerjakan = perStatus.find((s) => s.status === "dikerjakan")?.jumlah ?? 0;

  return (
    <div className="halaman">
      <div className="bagian-kepala" style={{ alignItems: "center" }}>
        <div>
          <h1 className="t-title">Papan kerja hari ini</h1>
          <p className="t-lede">{ringkasanOtomatis(tiket, hariIni)}</p>
        </div>
        <Tombol variasi="halus" ikon={<Sparkles size={15} aria-hidden="true" />} onClick={onBuat}>
          Catat pekerjaan baru
        </Tombol>
      </div>

      <div className="papan" role="group" aria-label="Papan status pekerjaan">
        <SelPapan
          judul="Aktif"
          nilai={metrik.aktif}
          detail={`${rupiahRingkas(metrik.sisaAktif)} belum tertagih`}
          lebar={(metrik.aktif / puncak) * 100}
          nada="aksen"
          onClick={() => onPindahFilter({ status: "semua", terlambat: false })}
        />
        <SelPapan
          judul="Terlambat"
          nilai={metrik.terlambat}
          detail={metrik.terlambat === 0 ? "Semua sesuai jadwal" : "Perlu ditindaklanjuti"}
          lebar={(metrik.terlambat / puncak) * 100}
          nada="bahaya"
          onClick={() => onPindahFilter({ terlambat: true, status: "semua" })}
        />
        <SelPapan
          judul="Siap diambil"
          nilai={metrik.siapDiambil}
          detail={`${metrik.menungguAmbil} menunggu lebih dari 2 hari`}
          lebar={(metrik.siapDiambil / puncak) * 100}
          nada="ungu"
          onClick={() => onPindahFilter({ status: "siap_diambil", terlambat: false })}
        />
        <SelPapan
          judul="Dikerjakan"
          nilai={dikerjakan}
          detail="Di tangan teknisi"
          lebar={(dikerjakan / puncak) * 100}
          nada="info"
          onClick={() => onPindahFilter({ status: "dikerjakan", terlambat: false })}
        />
        <SelPapan
          judul="Selesai bulan ini"
          nilai={metrik.selesaiBulanIni}
          detail={`${metrik.dibatalkan} tiket dibatalkan`}
          lebar={(metrik.selesaiBulanIni / puncak) * 100}
          nada="sukses"
          onClick={() => onPindahFilter({ status: "selesai", terlambat: false })}
        />
      </div>

      <div className="kisi-2" style={{ alignItems: "start" }}>
        <section className="bagian">
          <div className="bagian-kepala">
            <h2>Wawasan otomatis</h2>
            <p>Dihitung dari tenggat dan status. Satu klik untuk menangani.</p>
          </div>

          <div className="wawasan">
            {wawasan.length === 0 ? (
              <Kosong
                judul="Tidak ada yang perlu ditangani"
                pesan="Semua pekerjaan berjalan normal. Wawasan muncul otomatis saat ada yang perlu ditindaklanjuti."
                ikon={<Sparkles size={20} aria-hidden="true" />}
              />
            ) : (
              wawasan.map((w) => (
                <div className="wawasan-item" key={w.id} data-nada={NADA_WASANA[w.nada]}>
                  <span className="wawasan-ikon">{IKON_WASANA[w.nada]}</span>
                  <div className="wawasan-teks">
                    <strong>{w.judul}</strong>
                    <span>{w.detail}</span>
                  </div>
                  {w.aksi ? (
                    <Tombol
                      ukuran="kecil"
                      variasi="halus"
                      onClick={() => onPindahFilter(w.aksi?.filter ?? {})}
                    >
                      {w.aksi.label}
                    </Tombol>
                  ) : null}
                </div>
              ))
            )}
          </div>

          <div className="panel">
            <div className="panel-kepala">
              <h3>Pelanggan berulang</h3>
              <p>Riwayat masuk dan total belanja per pelanggan.</p>
            </div>
            {pelanggan.length === 0 ? (
              <p className="t-lede">Belum ada pelanggan dengan lebih dari satu tiket.</p>
            ) : (
              <div>
                {pelanggan.map((p) => (
                  <div className="baris-angka" key={p.kunci}>
                    <dt>
                      {p.namaTerakhir}
                      <span className="t-faint">
                        {" "}
                        · {p.jumlahTiket}× · {p.perangkatTerakhir}
                      </span>
                    </dt>
                    <dd>{rupiah(p.totalBelanja)}</dd>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="bagian">
          <div className="bagian-kepala">
            <h2>Urutan kerja</h2>
            <p>Yang paling mendesak lebih dulu — klik untuk membuka tiket.</p>
          </div>

          {aktifTickets.length === 0 ? (
            <div className="ledger">
              <Kosong
                judul="Papan masih kosong"
                pesan="Belum ada pekerjaan tercatat. Catat tiket pertama untuk mulai memantau tenggat."
                ikon={<PackageCheck size={20} aria-hidden="true" />}
                aksi={
                  <Tombol variasi="utama" onClick={onBuat}>
                    Buat tiket pertama
                  </Tombol>
                }
              />
            </div>
          ) : (
            <div className="ledger">
              <div className="worklist">
                {aktifTickets.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className="worklist-item"
                    onClick={() => onBukaTiket(t.id)}
                  >
                    <span className="worklist-kiri">
                      <span className="worklist-nama">
                        <span className="mono t-faint">{t.nomor}</span>
                        {t.perangkat}
                      </span>
                      <span className="worklist-meta">
                        {t.pelanggan} · {META_STATUS[t.status].label}
                      </span>
                    </span>
                    <span className="worklist-kanan">
                      <Lencana nada={nadaTenggat(t, hariIni)}>
                        {labelTenggat(t.tenggat, hariIni)}
                      </Lencana>
                      <span>{rupiahRingkas(sisaTagihan(t))}</span>
                    </span>
                    <ArrowUpRight size={14} className="t-faint" aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="panel">
            <div className="panel-kepala">
              <h3>Angka hari ini</h3>
              <p>Dihitung ulang setiap kali data berubah.</p>
            </div>
            <div>
              <div className="baris-angka">
                <dt>Sisa tagihan aktif</dt>
                <dd>
                  <Angka nilai={metrik.sisaAktif} format={rupiah} />
                </dd>
              </div>
              <div className="baris-angka">
                <dt>Estimasi pekerjaan aktif</dt>
                <dd>
                  <Angka nilai={metrik.estimasiAktif} format={rupiah} />
                </dd>
              </div>
              <div className="baris-angka">
                <dt>Rata-rata jarak tenggat</dt>
                <dd>
                  {metrik.rataTinggalHari === 0
                    ? "0 hari"
                    : `${Math.abs(metrik.rataTinggalHari)} hari`}
                  <span className="t-faint">
                    {metrik.rataTinggalHari < 0 ? " terlambat" : " tersisa"}
                  </span>
                </dd>
              </div>
              <div className="baris-angka">
                <dt>Total nilai pekerjaan tercatat</dt>
                <dd>
                  <Angka nilai={metrik.totalEstimasi} format={rupiah} />
                </dd>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function SelPapan({
  judul,
  nilai,
  detail,
  lebar,
  nada,
  onClick,
}: {
  judul: string;
  nilai: number;
  detail: string;
  lebar: number;
  nada: string;
  onClick: () => void;
}): ReactNode {
  return (
    <button type="button" className="papan-sel" onClick={onClick}>
      <span className="papan-sel-judul">{judul}</span>
      <span className="papan-sel-nilai">
        <Angka nilai={nilai} format={formatAngka} />
      </span>
      <span className="papan-sel-kaki">{detail}</span>
      <span className="papan-bilah">
        <span
          style={{
            width: `${Math.min(100, Math.max(2, lebar))}%`,
            background: `var(--${nada})`,
          }}
        />
      </span>
    </button>
  );
}

function nadaTenggat(t: Ticket, hariIni: string): "bahaya" | "waspada" | "netral" | "aksen" {
  if (META_STATUS[t.status].ditutup) return "netral";
  if (lewatTenggat(t, hariIni)) return "bahaya";
  const sisa = hariTinggal(t, hariIni);
  if (sisa <= 1) return "waspada";
  return "aksen";
}
