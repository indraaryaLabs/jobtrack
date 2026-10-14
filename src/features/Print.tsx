/**
 * Dokumen cetak (nota pekerjaan & daftar tiket).
 *
 * Dirender ke #area-cetak di luar kerangka aplikasi; @media print hanya
 * menampilkan bagian ini sehingga nota tercetak rapi tanpa navigasi.
 */

import type { ReactNode } from "react";
import type { Ticket } from "../domain/types";
import { formatTanggal, formatTanggalPanjang, formatWaktu } from "../domain/dates";
import { rupiah } from "../domain/money";
import { lewatTenggat, sisaTagihan } from "../domain/ticket";
import { META_PRIORITAS, META_STATUS } from "../domain/status";

function Kop({
  judul,
  subjudul,
}: {
  judul: string;
  subjudul: string;
}): ReactNode {
  return (
    <header className="cetak-kop">
      <div>
        <p className="cetak-merek">JobTrack · SatuArah Labs</p>
        <h1>{judul}</h1>
      </div>
      <p className="cetak-sub">{subjudul}</p>
    </header>
  );
}

function stempelWaktu(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(
    now.getHours(),
  )}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

export function NotaPekerjaan({
  ticket,
  now,
}: {
  ticket: Ticket;
  now: Date;
}): ReactNode {
  return (
    <article className="cetak">
      <Kop
        judul={`Nota Pekerjaan ${ticket.nomor}`}
        subjudul={`Dicetak ${formatTanggalPanjang(
          `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
            now.getDate(),
          ).padStart(2, "0")}`,
        )} · ${String(now.getHours()).padStart(2, "0")}.${String(now.getMinutes()).padStart(2, "0")}`}
      />

      <section className="cetak-kisi">
        <div>
          <span className="cetak-label">Pelanggan</span>
          <p>{ticket.pelanggan}</p>
        </div>
        <div>
          <span className="cetak-label">Telepon</span>
          <p>{ticket.telepon || "—"}</p>
        </div>
        <div>
          <span className="cetak-label">Perangkat / item</span>
          <p>{ticket.perangkat}</p>
        </div>
        <div>
          <span className="cetak-label">Status pekerjaan</span>
          <p>{META_STATUS[ticket.status].label}</p>
        </div>
        <div>
          <span className="cetak-label">Tanggal masuk</span>
          <p>{formatTanggal(ticket.tanggalMasuk)}</p>
        </div>
        <div>
          <span className="cetak-label">Tenggat</span>
          <p>
            {formatTanggal(ticket.tenggat)}
            {lewatTenggat(ticket, stempelWaktu(now).slice(0, 10)) ? " (tenggat telah lewat)" : ""}
          </p>
        </div>
        <div>
          <span className="cetak-label">Prioritas</span>
          <p>{META_PRIORITAS[ticket.prioritas].label}</p>
        </div>
        <div>
          <span className="cetak-label">Nomor tiket</span>
          <p className="mono">{ticket.nomor}</p>
        </div>
      </section>

      <section className="cetak-bagian">
        <h2>Deskripsi pekerjaan</h2>
        <p>{ticket.deskripsi}</p>
      </section>

      <section className="cetak-bagian">
        <h2>Ringkasan biaya</h2>
        <table className="cetak-tabel">
          <tbody>
            <tr>
              <th scope="row">Biaya estimasi</th>
              <td className="angka">{rupiah(ticket.estimasi)}</td>
            </tr>
            <tr>
              <th scope="row">DP / uang muka</th>
              <td className="angka">{rupiah(ticket.dp)}</td>
            </tr>
            <tr className="cetak-total">
              <th scope="row">Sisa tagihan</th>
              <td className="angka">{rupiah(sisaTagihan(ticket))}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {ticket.catatanKerja.length > 0 ? (
        <section className="cetak-bagian">
          <h2>Catatan pengerjaan</h2>
          <ul className="cetak-daftar">
            {ticket.catatanKerja.map((c) => (
              <li key={c.id}>
                {formatWaktu(c.at)} — {c.teks}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {ticket.catatanInternal ? (
        <section className="cetak-bagian">
          <h2>Catatan internal (tidak untuk pelanggan)</h2>
          <p>{ticket.catatanInternal}</p>
        </section>
      ) : null}

      <section className="cetak-bagian">
        <h2>Riwayat status</h2>
        <ul className="cetak-daftar">
          {ticket.timeline.map((ev) => (
            <li key={ev.id}>
              {formatWaktu(ev.at)} — {ev.pesan}
            </li>
          ))}
        </ul>
      </section>

      <footer className="cetak-kaki">
        <p>
          Dokumen demo JobTrack (SatuArah Labs) · data disimpan lokal di browser · sisa tagihan{" "}
          {rupiah(sisaTagihan(ticket))}
        </p>
        <div className="cetak-tanda">
          <div>
            <span />
            <p>Tanda tangan teknisi</p>
          </div>
          <div>
            <span />
            <p>Tanda tangan pelanggan</p>
          </div>
        </div>
      </footer>
    </article>
  );
}

export function DaftarTiketCetak({
  tiket,
  now,
  ringkasan,
}: {
  tiket: Ticket[];
  now: Date;
  ringkasan: string;
}): ReactNode {
  const totalEstimasi = tiket.reduce((n, t) => n + t.estimasi, 0);
  const totalSisa = tiket.reduce((n, t) => n + sisaTagihan(t), 0);

  return (
    <article className="cetak">
      <Kop
        judul="Daftar Tiket Pekerjaan"
        subjudul={`Dicetak ${formatWaktu(stempelWaktu(now))} · ${tiket.length} tiket`}
      />
      <p className="cetak-filter">Filter: {ringkasan}</p>

      <table className="cetak-tabel">
        <thead>
          <tr>
            <th scope="col">Nomor</th>
            <th scope="col">Pelanggan</th>
            <th scope="col">Perangkat</th>
            <th scope="col">Status</th>
            <th scope="col">Tenggat</th>
            <th scope="col" className="angka">Estimasi</th>
            <th scope="col" className="angka">Sisa</th>
          </tr>
        </thead>
        <tbody>
          {tiket.map((t) => (
            <tr key={t.id}>
              <td className="mono">{t.nomor}</td>
              <td>{t.pelanggan}</td>
              <td>{t.perangkat}</td>
              <td>{META_STATUS[t.status].labelPendek}</td>
              <td>{formatTanggal(t.tenggat)}</td>
              <td className="angka">{rupiah(t.estimasi)}</td>
              <td className="angka">{rupiah(sisaTagihan(t))}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="cetak-total">
            <th scope="row" colSpan={5}>
              Total {tiket.length} tiket
            </th>
            <td className="angka">{rupiah(totalEstimasi)}</td>
            <td className="angka">{rupiah(totalSisa)}</td>
          </tr>
        </tfoot>
      </table>

      <footer className="cetak-kaki">
        <p>Dokumen demo JobTrack (SatuArah Labs) · data disimpan lokal di browser.</p>
      </footer>
    </article>
  );
}
