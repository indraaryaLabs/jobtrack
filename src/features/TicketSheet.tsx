/**
 * Panel detail tiket (drawer).
 *
 * Berisi alur status yang bisa diklik, catatan pengerjaan, dan timeline.
 * Aksi merusak (hapus) memakai konfirmasi; status punya tombol cepat
 * "langkah berikutnya" sesuai alur kerja.
 */

import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  History,
  Pencil,
  Phone,
  Printer,
  Trash2,
  User,
  X,
} from "lucide-react";
import type { Status, Ticket } from "../domain/types";
import { hariMenungguPengambilan, lewatTenggat, sisaTagihan } from "../domain/ticket";
import { formatTanggal, formatWaktu, labelTenggat, labelSejak } from "../domain/dates";
import { rupiah } from "../domain/money";
import {
  META_PRIORITAS,
  META_STATUS,
  alasanTerkunci,
  labelStatus,
  langkahBerikutnya,
  transisi,
} from "../domain/status";
import { templatCatatan } from "../domain/catalog";
import { Lencana, Tombol, TombolIkon } from "../ui";

export interface TicketSheetProps {
  ticket: Ticket;
  hariIni: string;
  onTutup: () => void;
  onUbah: () => void;
  onCetak: () => void;
  onHapus: () => void;
  onStatus: (ke: Status, catatan?: string) => void;
  onCatatan: (teks: string) => void;
}

export function TicketSheet({
  ticket,
  hariIni,
  onTutup,
  onUbah,
  onCetak,
  onHapus,
  onStatus,
  onCatatan,
}: TicketSheetProps): ReactNode {
  const panel = useRef<HTMLElement>(null);
  const [catatan, setCatatan] = useState("");
  const [mintaAlasan, setMintaAlasan] = useState<Status | null>(null);

  useEffect(() => {
    const sebelumnya = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onTutup();
      }
    };
    document.addEventListener("keydown", onKey, true);
    panel.current?.querySelector<HTMLElement>("[data-fokus]")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = "";
      sebelumnya?.focus?.();
    };
  }, [onTutup]);

  useEffect(() => {
    setCatatan("");
    setMintaAlasan(null);
  }, [ticket.id]);

  const berikut = langkahBerikutnya(ticket.status);
  const kunci = alasanTerkunci(ticket.status);
  const sisa = sisaTagihan(ticket);
  const telat = lewatTenggat(ticket, hariIni);

  function kirimCatatan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const teks = catatan.trim();
    if (!teks) return;
    onCatatan(teks);
    setCatatan("");
  }

  function ubahStatusDenganAlasan(status: Status) {
    if (status === "menunggu") {
      setMintaAlasan(status);
      return;
    }
    onStatus(status);
  }

  return createPortal(
    <div
      className="tirai"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onTutup();
      }}
    >
      <aside
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={`Detail tiket ${ticket.nomor}`}
        ref={panel}
      >
        <header className="sheet-kepala">
          <div className="sheet-kepala-judul">
            <span className="mono t-faint">{ticket.nomor}</span>
            <h2>{ticket.perangkat}</h2>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <Lencana nada={META_STATUS[ticket.status].nada}>
                {META_STATUS[ticket.status].label}
              </Lencana>
              <Lencana nada={META_PRIORITAS[ticket.prioritas].nada} polos>
                Prioritas {META_PRIORITAS[ticket.prioritas].label}
              </Lencana>
              {telat ? <Lencana nada="bahaya">Terlambat</Lencana> : null}
            </div>
          </div>
          <TombolIkon label="Tutup detail" ikon={<X size={16} aria-hidden="true" />} onClick={onTutup} />
        </header>

        <div className="sheet-isi">
          {berikut ? (
            <div className="banner" data-nada="aksen">
              <ArrowRight size={15} aria-hidden="true" />
              <span className="banner-isi">
                Langkah berikutnya: <strong>{labelStatus(berikut)}</strong>
              </span>
              <Tombol
                ukuran="kecil"
                variasi="aksen"
                data-fokus="true"
                onClick={() => ubahStatusDenganAlasan(berikut)}
              >
                {labelStatus(berikut)}
              </Tombol>
            </div>
          ) : null}

          {kunci ? (
            <div className="banner">
              <ClipboardList size={15} aria-hidden="true" />
              <span className="banner-isi">{kunci}</span>
            </div>
          ) : null}

          {mintaAlasan ? (
            <div className="banner" data-nada="waspada">
              <History size={15} aria-hidden="true" />
              <span className="banner-isi">
                <input
                  autoFocus
                  value={catatan}
                  aria-label="Alasan menunggu"
                  placeholder="Contoh: menunggu modul keyboard dari supplier"
                  onChange={(e) => setCatatan(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      onStatus(mintaAlasan, catatan);
                      setCatatan("");
                      setMintaAlasan(null);
                    }
                  }}
                  style={{
                    width: "100%",
                    padding: "6px 8px",
                    border: "1px solid var(--line-2)",
                    borderRadius: "var(--r-sm)",
                    background: "var(--paper)",
                  }}
                />
              </span>
              <Tombol
                ukuran="kecil"
                onClick={() => {
                  onStatus(mintaAlasan, catatan);
                  setCatatan("");
                  setMintaAlasan(null);
                }}
              >
                Simpan
              </Tombol>
            </div>
          ) : null}

          <section className="panel">
            <div className="info">
              <div>
                <dt>
                  <User size={12} aria-hidden="true" /> Pelanggan
                </dt>
                <dd>{ticket.pelanggan}</dd>
              </div>
              <div>
                <dt>
                  <Phone size={12} aria-hidden="true" /> Telepon
                </dt>
                <dd>{ticket.telepon || "—"}</dd>
              </div>
              <div>
                <dt>Masuk</dt>
                <dd>{formatTanggal(ticket.tanggalMasuk)}</dd>
              </div>
              <div>
                <dt>Tenggat</dt>
                <dd className={telat ? "t-bahaya" : undefined}>
                  {formatTanggal(ticket.tenggat)}
                  <span className="info-ket">{labelTenggat(ticket.tenggat, hariIni)}</span>
                </dd>
              </div>
              {ticket.kategori ? (
                <div>
                  <dt>Kategori</dt>
                  <dd>{ticket.kategori}</dd>
                </div>
              ) : null}
              {ticket.status === "siap_diambil" ? (
                <div>
                  <dt>Menunggu diambil</dt>
                  <dd>{hariMenungguPengambilan(ticket, hariIni)} hari</dd>
                </div>
              ) : null}
            </div>
          </section>

          <section className="panel">
            <h3 className="t-eyebrow" style={{ marginBottom: 6 }}>
              Masalah / pekerjaan
            </h3>
            <p style={{ whiteSpace: "pre-wrap", color: "var(--ink-2)" }}>{ticket.deskripsi}</p>
          </section>

          <section className="panel">
            <h3 className="t-eyebrow" style={{ marginBottom: 8 }}>
              Ringkasan biaya
            </h3>
            <div className="ringkas">
              <div>
                <dt>Estimasi</dt>
                <dd>{rupiah(ticket.estimasi)}</dd>
              </div>
              <div>
                <dt>DP</dt>
                <dd>{rupiah(ticket.dp)}</dd>
              </div>
              <div data-sorot="true">
                <dt>Sisa tagihan</dt>
                <dd>{rupiah(sisa)}</dd>
              </div>
            </div>
          </section>

          {ticket.catatanInternal ? (
            <section className="panel">
              <h3 className="t-eyebrow" style={{ marginBottom: 6 }}>
                Catatan internal
              </h3>
              <p style={{ color: "var(--ink-2)", whiteSpace: "pre-wrap" }}>
                {ticket.catatanInternal}
              </p>
            </section>
          ) : null}

          <section className="panel">
            <h3 className="t-eyebrow" style={{ marginBottom: 8 }}>
              <History size={13} aria-hidden="true" /> Timeline ({ticket.timeline.length})
            </h3>
            <ol className="linimasa">
              {[...ticket.timeline]
                .reverse()
                .slice(0, 12)
                .map((ev) => (
                  <li className="linimasa-item" key={ev.id} data-jenis={ev.jenis}>
                    <span className="linimasa-titik" aria-hidden="true">
                      {ev.jenis === "status" ? (
                        <ArrowRight size={11} />
                      ) : ev.jenis === "catatan" ? (
                        <ClipboardList size={11} />
                      ) : (
                        <History size={11} />
                      )}
                    </span>
                    <div className="linimasa-isi">
                      <p>{ev.pesan}</p>
                      <span className="linimasa-waktu">
                        {formatWaktu(ev.at)} · {labelSejak(ev.at)}
                      </span>
                    </div>
                  </li>
                ))}
            </ol>
          </section>

          <section className="panel">
            <h3 className="t-eyebrow" style={{ marginBottom: 8 }}>
              Catatan pengerjaan ({ticket.catatanKerja.length})
            </h3>
            {ticket.catatanKerja.length === 0 ? (
              <p className="t-lede" style={{ marginBottom: 8 }}>
                Belum ada catatan. Tulis temuan teknisi agar tidak lupa saat unit diambil.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
                {ticket.catatanKerja.map((c) => (
                  <div className="catatan-item" key={c.id}>
                    <p>{c.teks}</p>
                    <span className="linimasa-waktu">{formatWaktu(c.at)}</span>
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={kirimCatatan} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <textarea
                className="bersama"
                rows={2}
                value={catatan}
                placeholder={templatCatatan(ticket.status) || "Tulis catatan pengerjaan…"}
                onChange={(e) => setCatatan(e.target.value)}
              />
              <div>
                <Tombol
                  type="submit"
                  ukuran="kecil"
                  variasi="utama"
                  ikon={<CheckCircle2 size={13} aria-hidden="true" />}
                  disabled={catatan.trim().length === 0}
                  title={catatan.trim().length === 0 ? "Tulis catatan terlebih dahulu" : "Simpan catatan"}
                >
                  Simpan catatan
                </Tombol>
              </div>
            </form>
          </section>

          {transisi(ticket.status).length > 0 ? (
            <section className="panel">
              <h3 className="t-eyebrow" style={{ marginBottom: 8 }}>
                Ubah status
              </h3>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {transisi(ticket.status).map((s) => (
                  <Tombol key={s} ukuran="kecil" onClick={() => ubahStatusDenganAlasan(s)}>
                    {labelStatus(s)}
                  </Tombol>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <footer className="sheet-kaki">
          <Tombol variasi="utama" ikon={<Pencil size={14} aria-hidden="true" />} onClick={onUbah}>
            Ubah tiket
          </Tombol>
          <Tombol ikon={<Printer size={14} aria-hidden="true" />} onClick={onCetak}>
            Cetak nota
          </Tombol>
          <Tombol
            variasi="bahaya"
            ikon={<Trash2 size={14} aria-hidden="true" />}
            onClick={onHapus}
            style={{ marginLeft: "auto" }}
          >
            Hapus
          </Tombol>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}
