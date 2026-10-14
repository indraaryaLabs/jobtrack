/**
 * Form tiket dengan bantuan otomatis.
 *
 * Otomatisasi (semua lokal, tanpa jaringan):
 *  - tebakan kategori perangkat dari ketikan pengguna;
 *  - saran tenggat memakai hari kerja × prioritas;
 *  - deteksi pelanggan berulang → isi otomatis telepon/perangkat/estimasi;
 *  - pratinjau sisa tagihan langsung.
 */

import { useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { ClipboardList, Sparkles, Wand2 } from "lucide-react";
import type { DraftTiket, Status, Ticket } from "../domain/types";
import { DAFTAR_PRIORITAS } from "../domain/types";
import { draftKosong } from "../domain/types";
import { adaKesalahan, draftKeForm, formKeDraft, validasiForm } from "../domain/validation";
import type { FormTiket, KesalahanForm } from "../domain/validation";
import { formatTanggal } from "../domain/dates";
import { rupiah, rupiahRingkas } from "../domain/money";
import { META_PRIORITAS, META_STATUS } from "../domain/status";
import { saranUntuk, tebakKategori } from "../domain/catalog";
import { saranPelanggan } from "../domain/customers";
import { AreaTeks, Dialog, Field, Input, InputRupiah, Pilih, Tombol } from "../ui";

export interface TicketFormProps {
  mode: "buat" | "ubah";
  ticket?: Ticket;
  semuaTiket: Ticket[];
  hariIni: string;
  nomorBerikut: string;
  statusTersedia: Status[];
  onTutup: () => void;
  onSimpan: (draft: DraftTiket) => void;
}

export function TicketForm({
  mode,
  ticket,
  semuaTiket,
  hariIni,
  nomorBerikut,
  statusTersedia,
  onTutup,
  onSimpan,
}: TicketFormProps): ReactNode {
  const [form, setForm] = useState<FormTiket>(() =>
    ticket
      ? draftKeForm({
          pelanggan: ticket.pelanggan,
          telepon: ticket.telepon,
          perangkat: ticket.perangkat,
          kategori: ticket.kategori,
          deskripsi: ticket.deskripsi,
          prioritas: ticket.prioritas,
          status: ticket.status,
          tanggalMasuk: ticket.tanggalMasuk,
          tenggat: ticket.tenggat,
          estimasi: ticket.estimasi,
          dp: ticket.dp,
          catatanInternal: ticket.catatanInternal,
        })
      : draftKeForm(draftKosong(hariIni)),
  );
  const [errors, setErrors] = useState<KesalahanForm>({});
  const [saranganPakai, setSaranganPakai] = useState(false);

  const estimasiAngka = Number(form.estimasi.replace(/\D/g, "")) || 0;
  const dpAngka = Number(form.dp.replace(/\D/g, "")) || 0;
  const sisa = Math.max(0, estimasiAngka - dpAngka);
  const dpTerlaluBesar = dpAngka > estimasiAngka;

  const kategoriTebakan = useMemo(
    () => tebakKategori(form.perangkat, form.deskripsi),
    [form.perangkat, form.deskripsi],
  );

  const saranPelangganAktif = useMemo(
    () => saranPelanggan(semuaTiket, form.pelanggan, form.telepon, hariIni),
    [semuaTiket, form.pelanggan, form.telepon, hariIni],
  );

  function ubah<K extends keyof FormTiket>(field: K, value: FormTiket[K]) {
    const berikut: FormTiket = { ...form, [field]: value };
    setForm(berikut);
    setErrors((lama) => {
      if (Object.keys(lama).length === 0) return lama;
      const hasil = validasiForm(berikut, hariIni);
      const bersih: KesalahanForm = {};
      for (const key of Object.keys(lama) as (keyof FormTiket)[]) {
        if (hasil[key]) bersih[key] = hasil[key];
      }
      return bersih;
    });
  }

  function pakaiSaranOtomatis() {
    const saran = saranUntuk({
      perangkat: form.perangkat,
      deskripsi: form.deskripsi,
      prioritas: form.prioritas,
      tanggalMasuk: form.tanggalMasuk,
    });
    setSaranganPakai(true);
    ubah("tenggat", saran.tenggat);
    if (estimasiAngka === 0) ubah("estimasi", String(saran.estimasi));
    if (!form.catatanInternal) ubah("catatanInternal", saran.catatan);
    if (!form.kategori) ubah("kategori", saran.kategori.label);
  }

  function isiDariPelanggan() {
    if (!saranPelangganAktif) return;
    const p = saranPelangganAktif.profil;
    ubah("telepon", p.telepon);
    if (!form.perangkat) ubah("perangkat", p.perangkatTerakhir);
    if (!form.kategori) ubah("kategori", p.kategoriTerakhir);
    if (estimasiAngka === 0) ubah("estimasi", String(p.estimasiTerakhir));
    if (!form.catatanInternal && p.catatan) ubah("catatanInternal", p.catatan);
  }

  function kirim(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const hasil = validasiForm(form, hariIni);
    setErrors(hasil);
    if (adaKesalahan(hasil)) {
      const fokus = document.querySelector<HTMLElement>('[data-invalid="true"]');
      fokus?.focus();
      return;
    }
    const draft = formKeDraft(form);
    if (!draft) {
      setErrors({ estimasi: "Biaya estimasi harus berupa angka." });
      return;
    }
    onSimpan(draft);
  }

  const judul = mode === "buat" ? "Tiket pekerjaan baru" : `Ubah ${ticket?.nomor ?? "tiket"}`;

  return (
    <Dialog
      judul={judul}
      deskripsi={
        mode === "buat"
          ? `Nomor otomatis ${nomorBerikut} · tenggat dihitung dari hari kerja`
          : "Perubahan status tercatat di timeline tiket."
      }
      ukuran="luas"
      ikon={<ClipboardList size={16} aria-hidden="true" />}
      onTutup={onTutup}
      kaki={
        <>
          <Tombol onClick={onTutup}>Batal</Tombol>
          <Tombol variasi="utama" type="submit" form="form-tiket">
            {mode === "buat" ? "Simpan tiket" : "Simpan perubahan"}
          </Tombol>
        </>
      }
    >
      <form id="form-tiket" onSubmit={kirim} noValidate style={{ display: "flex", flexDirection: "column", gap: "var(--s-4)" }}>
        {saranPelangganAktif?.pelangganBerulang && mode === "buat" ? (
          <div className="banner" data-nada="aksen">
            <Sparkles size={15} aria-hidden="true" />
            <span className="banner-isi">
              <strong>{saranPelangganAktif.profil.namaTerakhir}</strong> pernah servis di sini
              {saranPelangganAktif.hariLalu !== null
                ? ` (${saranPelangganAktif.hariLalu} hari lalu, ${saranPelangganAktif.profil.jumlahTiket}×)`
                : ""}
              . Isi otomatis dari riwayat?
            </span>
            <Tombol ukuran="kecil" variasi="aksen" onClick={isiDariPelanggan}>
              Isi otomatis
            </Tombol>
          </div>
        ) : null}

        <div className="kisi-form" data-kolom="2">
          <Field label="Nama pelanggan" nama="pelanggan" wajib galat={errors.pelanggan}>
            {(p) => (
              <Input
                {...p}
                data-invalid={p["aria-invalid"]}
                value={form.pelanggan}
                placeholder="Contoh: Sari Wulandari"
                autoComplete="off"
                onChange={(e) => ubah("pelanggan", e.target.value)}
              />
            )}
          </Field>

          <Field
            label="Nomor telepon"
  nama="telepon"
            galat={errors.telepon}
            bantuan="Opsional — dipakai untuk menghubungi pelanggan."
          >
            {(p) => (
              <Input
                {...p}
                data-invalid={p["aria-invalid"]}
                type="tel"
                value={form.telepon}
                placeholder="Contoh: 0812-3411-7788"
                onChange={(e) => ubah("telepon", e.target.value)}
              />
            )}
          </Field>

          <Field
            label="Perangkat / item"
  nama="perangkat"
            wajib
            galat={errors.perangkat}
            bantuan={kategoriTebakan ? `Terdeteksi kategori: ${kategoriTebakan.label}` : "Tulis merk dan tipe."}
          >
            {(p) => (
              <Input
                {...p}
                data-invalid={p["aria-invalid"]}
                value={form.perangkat}
                placeholder="Contoh: Printer Epson L3110"
                onChange={(e) => ubah("perangkat", e.target.value)}
              />
            )}
          </Field>

          <Field label="Kategori" nama="kategori" bantuan="Boleh dikosongkan — diisi otomatis dari perangkat.">
            {(p) => (
              <Pilih
                {...p}
                value={form.kategori}
                onChange={(e) => ubah("kategori", e.target.value)}
              >
                <option value="">Otomatis</option>
                {(form.kategori ? [form.kategori] : []).map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
                {kategoriTebakan && !form.kategori ? (
                  <option value={kategoriTebakan.label}>{kategoriTebakan.label}</option>
                ) : null}
              </Pilih>
            )}
          </Field>
        </div>

        <Field
          label="Deskripsi masalah / pekerjaan"
  nama="deskripsi"
          wajib
          galat={errors.deskripsi}
          bantuan="Jelaskan keluhan pelanggan dan ruang lingkup pekerjaan."
        >
          {(p) => (
            <AreaTeks
              {...p}
              data-invalid={p["aria-invalid"]}
              rows={3}
              value={form.deskripsi}
              placeholder="Contoh: Hasil cetak bergaris dan kertas sering tersangkut. Perlu cuci head dan cek roller."
              onChange={(e) => ubah("deskripsi", e.target.value)}
            />
          )}
        </Field>

        <div className="kisi-form" data-kolom="2">
          <Field label="Tanggal masuk" nama="tanggalMasuk" wajib galat={errors.tanggalMasuk}>
            {(p) => (
              <Input
                {...p}
                data-invalid={p["aria-invalid"]}
                type="date"
                value={form.tanggalMasuk}
                max={hariIni}
                onChange={(e) => ubah("tanggalMasuk", e.target.value)}
              />
            )}
          </Field>

          <Field
            label="Tenggat"
  nama="tenggat"
            wajib
            galat={errors.tenggat}
            bantuan={
              mode === "buat" && !saranganPakai ? (
                <button
                  type="button"
                  className="tombol teks"
                  style={{ padding: 0, height: "auto", fontSize: "var(--fs-caption)" }}
                  onClick={pakaiSaranOtomatis}
                >
                  <Wand2 size={12} aria-hidden="true" /> Hitung otomatis
                </button>
              ) : (
                `Target: ${formatTanggal(form.tenggat)}`
              )
            }
          >
            {(p) => (
              <Input
                {...p}
                data-invalid={p["aria-invalid"]}
                type="date"
                value={form.tenggat}
                onChange={(e) => ubah("tenggat", e.target.value)}
              />
            )}
          </Field>

          <Field label="Prioritas" nama="prioritas" wajib bantuan={META_PRIORITAS[form.prioritas].deskripsi}>
            {(p) => (
              <Pilih
                {...p}
                value={form.prioritas}
                onChange={(e) =>
                  ubah("prioritas", e.target.value as FormTiket["prioritas"])
                }
              >
                {DAFTAR_PRIORITAS.map((k) => (
                  <option key={k} value={k}>
                    {META_PRIORITAS[k].label}
                  </option>
                ))}
              </Pilih>
            )}
          </Field>

          <Field label="Status" nama="status" wajib bantuan={META_STATUS[form.status].deskripsi} galat={errors.status}>
            {(p) => (
              <Pilih
                {...p}
                data-invalid={p["aria-invalid"]}
                value={form.status}
                onChange={(e) => ubah("status", e.target.value as Status)}
              >
                {statusTersedia.map((s) => (
                  <option key={s} value={s}>
                    {META_STATUS[s].label}
                  </option>
                ))}
              </Pilih>
            )}
          </Field>
        </div>

        <div className="kisi-form" data-kolom="2">
          <Field
            label="Biaya estimasi (Rp)"
  nama="estimasi"
            wajib
            galat={errors.estimasi}
            bantuan="Isi 0 bila biaya belum diketahui."
          >
            {(p) => (
              <InputRupiah
                {...p}
                data-invalid={p["aria-invalid"]}
                nilai={form.estimasi}
                onUbah={(v) => ubah("estimasi", v)}
                placeholder="0"
              />
            )}
          </Field>

          <Field
            label="DP / uang muka (Rp)"
  nama="dp"
            galat={errors.dp}
            bantuan={
              estimasiAngka > 0
                ? `Maksimal ${rupiah(estimasiAngka)}.`
                : "Wajib Rp 0 bila estimasi belum diisi."
            }
          >
            {(p) => (
              <InputRupiah
                {...p}
                data-invalid={p["aria-invalid"]}
                nilai={form.dp}
                onUbah={(v) => ubah("dp", v)}
                placeholder="0"
              />
            )}
          </Field>
        </div>

        <div className="ringkas" data-salah={dpTerlaluBesar ? "true" : undefined}>
          <div>
            <dt>Estimasi</dt>
            <dd>{rupiah(estimasiAngka)}</dd>
          </div>
          <div>
            <dt>DP</dt>
            <dd>{rupiah(dpAngka)}</dd>
          </div>
          <div data-sorot="true">
            <dt>Sisa tagihan</dt>
            <dd>{rupiahRingkas(sisa)}</dd>
          </div>
        </div>

        <Field
          label="Catatan internal"
  nama="catatanInternal"
          galat={errors.catatanInternal}
          bantuan="Hanya untuk tim bengkel — tidak ikut tercetak pada nota pelanggan."
        >
          {(p) => (
            <AreaTeks
              {...p}
              rows={2}
              value={form.catatanInternal}
              placeholder="Contoh: Data penting belum dibackup — jangan format sebelum konfirmasi."
              onChange={(e) => ubah("catatanInternal", e.target.value)}
            />
          )}
        </Field>

        {mode === "buat" ? (
          <p className="t-faint" style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <Wand2 size={13} aria-hidden="true" />
            Saran kategori, tenggat, dan estimasi dihitung dari katalog servis lokal — tanpa
            mengirim data ke mana pun.
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}
