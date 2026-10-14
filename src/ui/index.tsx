/**
 * Primitif UI JobTrack (tempat tunggal untuk aturan tampil & akses).
 *
 * Isi: tombol, field/form, dialog, popover, empty state, toast, dan angka
 * beranimasi. Semua komponen UI lain memakai primitif ini agar perilaku
 * aksesibilitas (label, fokus, aria) konsisten di seluruh aplikasi.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Info,
  Loader2,
  Undo2,
  X,
} from "lucide-react";

/* ============================ cx ============================ */

/** Menggabungkan nama kelas secara deterministik. */
export function cx(...bagian: (string | false | null | undefined)[]): string {
  return bagian.filter(Boolean).join(" ");
}

/* ============================ Tombol ============================ */

export type VariasiTombol = "utama" | "sekunder" | "halus" | "aksen" | "bahaya";
export type UkuranTombol = "kecil" | "sedang" | "besar";

export interface TombolProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variasi?: VariasiTombol;
  ukuran?: UkuranTombol;
  ikon?: ReactNode;
  memuat?: boolean;
  /** Tombol yang hanya berisi ikon (label wajib pada aria-label). */
  hanyaIkon?: boolean;
}

export function Tombol({
  variasi = "sekunder",
  ukuran = "sedang",
  ikon,
  memuat = false,
  hanyaIkon = false,
  className,
  children,
  disabled,
  ...sisa
}: TombolProps): ReactNode {
  return (
    <button
      type="button"
      className={cx("tombol", className)}
      data-variasi={variasi}
      data-ukuran={ukuran}
      data-ikon={hanyaIkon || undefined}
      disabled={disabled || memuat}
      {...sisa}
    >
      {memuat ? <Loader2 size={15} className="muter" aria-hidden="true" /> : ikon}
      {children}
    </button>
  );
}

export interface TombolIkonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  ikon: ReactNode;
  variasi?: VariasiTombol;
  ukuran?: UkuranTombol;
  aktif?: boolean;
}

export function TombolIkon({
  label,
  ikon,
  variasi = "halus",
  ukuran = "kecil",
  aktif = false,
  className,
  ...sisa
}: TombolIkonProps): ReactNode {
  return (
    <button
      type="button"
      className={cx("tombol", className)}
      data-variasi={variasi}
      data-ukuran={ukuran}
      data-ikon="true"
      aria-label={label}
      title={label}
      aria-pressed={aktif || undefined}
      {...sisa}
    >
      {ikon}
    </button>
  );
}

export function Kbd({ children }: { children: ReactNode }): ReactNode {
  return <kbd className="kbd">{children}</kbd>;
}

/* ============================ Lencana ============================ */

export interface LencanaProps {
  nada: string;
  children: ReactNode;
  /** Hapus titik penanda (untuk lencana non-status). */
  polos?: boolean;
}

export function Lencana({ nada, children, polos = false }: LencanaProps): ReactNode {
  return (
    <span className="lencana" data-nada={nada} data-polos={polos || undefined}>
      {children}
    </span>
  );
}

/* ============================ Field ============================ */

export interface FieldProps {
  label: string;
  /** Nama field untuk id stabil `field-<nama>` (membantu autofill & uji). */
  nama?: string;
  wajib?: boolean;
  bantuan?: ReactNode;
  galat?: string;
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": true | undefined;
  }) => ReactNode;
}

export function Field({
  label,
  nama,
  wajib = false,
  bantuan,
  galat,
  children,
}: FieldProps): ReactNode {
  const idAcak = useId();
  const id = nama ? `field-${nama}` : idAcak;
  const idBantuan = `${id}-bantuan`;
  const deskripsi = galat ? idBantuan : bantuan ? idBantuan : undefined;
  return (
    <div className="field" data-salah={galat ? "true" : undefined}>
      <label className="field-label" htmlFor={id}>
        {label}
        {wajib ? <span className="wajib" aria-hidden="true"> *</span> : null}
      </label>
      {children({
        id,
        "aria-describedby": deskripsi,
        "aria-invalid": galat ? true : undefined,
      })}
      {galat ? (
        <p className="field-pesan" id={idBantuan}>
          <CircleAlert size={12} aria-hidden="true" />
          {galat}
        </p>
      ) : bantuan ? (
        <p className="field-bantuan" id={idBantuan}>
          {bantuan}
        </p>
      ) : null}
    </div>
  );
}

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className, ...sisa }: InputProps): ReactNode {
  return <input className={className} {...sisa} />;
}

export function AreaTeks(props: TextareaHTMLAttributes<HTMLTextAreaElement>): ReactNode {
  return <textarea className="bersama" {...props} />;
}

export type PilihProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Pilih({ className, children, ...sisa }: PilihProps): ReactNode {
  return (
    <span className="sel">
      <select className={className} {...sisa}>
        {children}
      </select>
      <ChevronDown size={14} aria-hidden="true" />
    </span>
  );
}

/** Input rupiah: prefix Rp, digit saja, pemisah ribuan. */
export function InputRupiah({
  nilai,
  onUbah,
  ...sisa
}: { nilai: string; onUbah: (v: string) => void } & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
>): ReactNode {
  return (
    <span className="input-uang">
      <span className="input-uang-prefiks">Rp</span>
      <input
        inputMode="numeric"
        value={nilai}
        onChange={(e) => onUbah(e.target.value.replace(/\D+/g, "").replace(/^0+(?=\d)/, ""))}
        {...sisa}
      />
    </span>
  );
}

/* ============================ Dialog ============================ */

let kunciDialog = 0;

export interface DialogProps {
  judul: string;
  deskripsi?: ReactNode;
  ikon?: ReactNode;
  ukuran?: "kecil" | "sedang" | "besar" | "luas";
  onTutup: () => void;
  kaki?: ReactNode;
  children: ReactNode;
}

export function Dialog({
  judul,
  deskripsi,
  ikon,
  ukuran = "sedang",
  onTutup,
  kaki,
  children,
}: DialogProps): ReactNode {
  const panel = useRef<HTMLDivElement>(null);
  const idJudul = useId();

  useEffect(() => {
    const sebelumnya = document.activeElement as HTMLElement | null;
    kunciDialog += 1;
    document.body.style.overflow = "hidden";

    const raf = requestAnimationFrame(() => {
      const node = panel.current;
      if (!node) return;
      const target =
        node.querySelector<HTMLElement>("[data-autofocus='true']") ??
        node.querySelector<HTMLElement>("input, textarea, select") ??
        node;
      target.focus();
    });

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onTutup();
        return;
      }
      if (event.key !== "Tab") return;
      const node = panel.current;
      if (!node) return;
      const daftar = Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null);
      if (daftar.length === 0) return;
      const pertama = daftar[0];
      const terakhir = daftar[daftar.length - 1];
      if (event.shiftKey && (document.activeElement === pertama || document.activeElement === node)) {
        event.preventDefault();
        terakhir.focus();
      } else if (!event.shiftKey && document.activeElement === terakhir) {
        event.preventDefault();
        pertama.focus();
      }
    };

    document.addEventListener("keydown", onKey, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey, true);
      kunciDialog -= 1;
      if (kunciDialog <= 0) {
        kunciDialog = 0;
        document.body.style.overflow = "";
      }
      sebelumnya?.focus?.();
    };
  }, [onTutup]);

  return createPortal(
    <div
      className="dialog-tirai"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onTutup();
      }}
    >
      <div
        className="dialog"
        data-ukuran={ukuran}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idJudul}
        ref={panel}
      >
        <header className="dialog-kepala">
          {ikon ? <span className="rail-lampu">{ikon}</span> : null}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id={idJudul}>{judul}</h2>
            {deskripsi ? <p>{deskripsi}</p> : null}
          </div>
          <TombolIkon label="Tutup dialog" ikon={<X size={16} aria-hidden="true" />} onClick={onTutup} />
        </header>
        <div className="dialog-isi">{children}</div>
        {kaki ? <footer className="dialog-kaki">{kaki}</footer> : null}
      </div>
    </div>,
    document.body,
  );
}

export interface DialogKonfirmasiProps {
  judul: string;
  pesan: ReactNode;
  detail?: ReactNode;
  labelYa?: string;
  labelBatal?: string;
  /** true = aksi destruktif (tombol merah). */
  bahaya?: boolean;
  onYa: () => void;
  onTutup: () => void;
}

export function DialogKonfirmasi({
  judul,
  pesan,
  detail,
  labelYa = "Ya, lanjutkan",
  labelBatal = "Batal",
  bahaya = true,
  onYa,
  onTutup,
}: DialogKonfirmasiProps): ReactNode {
  return (
    <Dialog
      judul={judul}
      ukuran="kecil"
      ikon={<CircleAlert size={16} aria-hidden="true" />}
      onTutup={onTutup}
      kaki={
        <>
          <Tombol onClick={onTutup}>{labelBatal}</Tombol>
          <Tombol
            variasi={bahaya ? "bahaya" : "utama"}
            data-autofocus="true"
            onClick={onYa}
          >
            {labelYa}
          </Tombol>
        </>
      }
    >
      <p style={{ color: "var(--ink-2)" }}>{pesan}</p>
      {detail ? (
        <p className="banner-isi t-faint" style={{ marginTop: "var(--s-3)" }}>
          {detail}
        </p>
      ) : null}
    </Dialog>
  );
}

/* ============================ Popover ============================ */

export interface PopoverProps {
  pemicu: (props: {
    onClick: () => void;
    "aria-expanded": boolean;
  }) => ReactNode;
  children: (tutup: () => void) => ReactNode;
  sisi?: "kanan" | "kiri";
  label?: string;
}

export function Popover({ pemicu, children, sisi = "kanan", label }: PopoverProps): ReactNode {
  const [terbuka, setTerbuka] = useState(false);
  const anchor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!terbuka) return;
    const tutupKlik = (event: MouseEvent) => {
      if (!anchor.current?.contains(event.target as Node)) setTerbuka(false);
    };
    const tutupEsc = (event: KeyboardEvent) => {
      if (event.key === "Escape") setTerbuka(false);
    };
    document.addEventListener("mousedown", tutupKlik);
    document.addEventListener("keydown", tutupEsc);
    return () => {
      document.removeEventListener("mousedown", tutupKlik);
      document.removeEventListener("keydown", tutupEsc);
    };
  }, [terbuka]);

  return (
    <div className="popover-anchor" ref={anchor}>
      {pemicu({ onClick: () => setTerbuka((v) => !v), "aria-expanded": terbuka })}
      {terbuka ? (
        <div className="popover" data-sisi={sisi} role="menu" aria-label={label}>
          {children(() => setTerbuka(false))}
        </div>
      ) : null}
    </div>
  );
}

export function ItemPopover({
  children,
  onClick,
  aktif,
}: {
  children: ReactNode;
  onClick: () => void;
  aktif?: boolean;
}): ReactNode {
  return (
    <button type="button" className="popover-item" data-aktif={aktif || undefined} onClick={onClick}>
      {children}
    </button>
  );
}

/* ============================ Empty state ============================ */

export interface KosongProps {
  judul: string;
  pesan: string;
  ikon?: ReactNode;
  aksi?: ReactNode;
}

export function Kosong({ judul, pesan, ikon, aksi }: KosongProps): ReactNode {
  return (
    <div className="kosong">
      {ikon ? <span className="kosong-ilustrasi">{ikon}</span> : null}
      <h3>{judul}</h3>
      <p>{pesan}</p>
      {aksi ? <div className="kosong-aksi">{aksi}</div> : null}
    </div>
  );
}

/* ============================ Toast ============================ */

type NadaToast = "sukses" | "info" | "peringatan" | "galat";

interface ToastItem {
  id: string;
  judul: string;
  detail?: string;
  nada: NadaToast;
  aksi?: { label: string; jalankan: () => void };
}

export interface OpsiToast {
  judul: string;
  detail?: string;
  nada?: NadaToast;
  /** Aksi singkat (mis. "Urungkan") yang muncul di dalam toast. */
  aksi?: { label: string; jalankan: () => void };
}

interface ToastApi {
  tampilkan: (opsi: OpsiToast) => void;
}

const IKON_NADA: Record<NadaToast, ReactNode> = {
  sukses: <CheckCircle2 size={16} aria-hidden="true" />,
  info: <Info size={16} aria-hidden="true" />,
  peringatan: <AlertTriangle size={16} aria-hidden="true" />,
  galat: <CircleAlert size={16} aria-hidden="true" />,
};

const KonteksToast = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }): ReactNode {
  const [items, setItems] = useState<ToastItem[]>([]);
  const urutan = useRef(0);

  const tutup = useCallback((id: string) => {
    setItems((sekarang) => sekarang.filter((t) => t.id !== id));
  }, []);

  const tampilkan = useCallback<ToastApi["tampilkan"]>(
    (opsi) => {
      urutan.current += 1;
      const id = `toast-${urutan.current}`;
      const item: ToastItem = { ...opsi, id, nada: opsi.nada ?? "sukses" };
      setItems((sekarang) => [...sekarang.slice(-2), item]);
      window.setTimeout(() => tutup(id), opsi.aksi ? 9000 : 5500);
    },
    [tutup],
  );

  const api = useMemo<ToastApi>(() => ({ tampilkan }), [tampilkan]);

  return (
    <KonteksToast.Provider value={api}>
      {children}
      {createPortal(
        <div className="toast-tumpukan" role="status" aria-live="polite">
          {items.map((item) => (
            <div className="toast" key={item.id} data-nada={item.nada}>
              <span className="toast-ikon">{IKON_NADA[item.nada]}</span>
              <div className="toast-isi">
                <strong>{item.judul}</strong>
                {item.detail ? <span>{item.detail}</span> : null}
                {item.aksi ? (
                  <div className="toast-aksi">
                    <Tombol
                      ukuran="kecil"
                      variasi="halus"
                      ikon={<Undo2 size={13} aria-hidden="true" />}
                      onClick={() => {
                        item.aksi?.jalankan();
                        tutup(item.id);
                      }}
                    >
                      {item.aksi.label}
                    </Tombol>
                  </div>
                ) : null}
              </div>
              <TombolIkon
                label="Tutup notifikasi"
                ikon={<X size={13} />}
                onClick={() => tutup(item.id)}
              />
            </div>
          ))}
        </div>,
        document.body,
      )}
    </KonteksToast.Provider>
  );
}

export function useToast(): ToastApi {
  const api = useContext(KonteksToast);
  if (!api) throw new Error("useToast harus dipakai di dalam ToastProvider.");
  return api;
}

/* ============================ Angka beranimasi ============================ */

/**
 * Angka yang menghitung naik saat nilainya berubah. Transitri ini sengaja
 * hanya merespons perubahan data (bukan scroll/entrance) dan diringkas oleh
 * `prefers-reduced-motion`.
 */
export function Angka({ nilai, format }: { nilai: number; format: (n: number) => string }): ReactNode {
  const [tampil, setTampil] = useState(nilai);
  const sebelumnya = useRef(nilai);

  useEffect(() => {
    const dari = sebelumnya.current;
    sebelumnya.current = nilai;
    if (dari === nilai) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setTampil(nilai);
      return;
    }
    let langkah = 0;
    const total = 14;
    const timer = window.setInterval(() => {
      langkah += 1;
      const t = langkah / total;
      setTampil(Math.round(dari + (nilai - dari) * (1 - Math.pow(1 - t, 3))));
      if (langkah >= total) window.clearInterval(timer);
    }, 16);
    return () => window.clearInterval(timer);
  }, [nilai]);

  return <>{format(tampil)}</>;
}
