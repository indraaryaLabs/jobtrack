/**
 * Store global JobTrack.
 *
 * Sumber kebenaran tunggal: daftar tiket beserta riwayat perubahan
 * (Undo/Redo), status "masih data demo", tampilan tersimpan, dan tema.
 * Setiap perubahan langsung ditulis ke localStorage.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from "react";
import type { ReactNode } from "react";
import type { DraftTiket, Status, Tema, Ticket, TampilanTersimpan } from "../domain/types";
import {
  buatTiket,
  idBaru,
  nomorBerikutnya,
  tambahCatatan,
  terapkanDraft,
  ubahStatus,
} from "../domain/ticket";
import { hariIni } from "../domain/dates";
import { labelStatus } from "../domain/status";
import { buatDataContoh } from "../data/seed";
import { muatData, simpanData, tampilanBawaan } from "../data/storage";

const BATAS_RIWAYAT = 40;

export type NadaKabar = "sukses" | "info" | "peringatan" | "galat";

export interface Kabar {
  id: string;
  judul: string;
  detail?: string;
  nada: NadaKabar;
  bisaUrungkan: boolean;
}

interface RiwayatTiket {
  sekarang: Ticket[];
  lalu: Ticket[][];
  depan: Ticket[][];
}

interface State {
  tiket: RiwayatTiket;
  masihDemo: boolean;
  tampilan: TampilanTersimpan[];
  tema: Tema | "sistem";
  tersimpanPada: string | null;
  galatMuat: string | null;
  galatSimpan: string | null;
  kabar: Kabar | null;
}

type Aksi =
  | { jenis: "tambah"; draft: DraftTiket }
  | { jenis: "ubah"; id: string; draft: DraftTiket }
  | { jenis: "hapus"; id: string }
  | { jenis: "hapusBanyak"; ids: string[] }
  | { jenis: "status"; id: string; ke: Status; catatan?: string }
  | { jenis: "statusBanyak"; ids: string[]; ke: Status }
  | { jenis: "catatan"; id: string; teks: string }
  | { jenis: "ganti"; tiket: Ticket[] }
  | { jenis: "pulihkan" }
  | { jenis: "undo" }
  | { jenis: "redo" }
  | { jenis: "tampilan"; tampilan: TampilanTersimpan[] }
  | { jenis: "tema"; tema: Tema | "sistem" }
  | { jenis: "simpan-ok"; pada: string }
  | { jenis: "simpan-galat"; galat: string }
  | { jenis: "bubar-kabar" };

function buatKabar(judul: string, nada: NadaKabar = "sukses", detail?: string, bisaUrungkan = false): Kabar {
  return { id: idBaru("kab"), judul, nada, detail, bisaUrungkan };
}

/** Membungkus daftar baru beserta riwayat undo/redo. */
function denganRiwayat(state: RiwayatTiket, berikut: Ticket[]): RiwayatTiket {
  if (berikut === state.sekarang) return state;
  return {
    sekarang: berikut,
    lalu: [...state.lalu, state.sekarang].slice(-BATAS_RIWAYAT),
    depan: [],
  };
}

function reducer(state: State, aksi: Aksi): State {
  const now = new Date();
  const list = state.tiket.sekarang;

  switch (aksi.jenis) {
    case "tambah": {
      const baru = buatTiket(aksi.draft, {
        now,
        nomor: nomorBerikutnya(list, hariIni(now)),
      });
      return {
        ...state,
        tiket: denganRiwayat(state.tiket, [baru, ...list]),
        masihDemo: false,
        kabar: buatKabar(
          `Tiket ${baru.nomor} dibuat`,
          "sukses",
          `${baru.pelanggan} · ${labelStatus(baru.status)}`,
          true,
        ),
      };
    }

    case "ubah": {
      const target = list.find((t) => t.id === aksi.id);
      if (!target) return state;
      const hasil = terapkanDraft(target, aksi.draft, { now });
      if (hasil.perubahan.length === 0) {
        return { ...state, kabar: buatKabar(`Tidak ada perubahan pada ${target.nomor}`, "info") };
      }
      return {
        ...state,
        tiket: denganRiwayat(
          state.tiket,
          list.map((t) => (t.id === aksi.id ? hasil.ticket : t)),
        ),
        masihDemo: false,
        kabar: buatKabar(
          `${target.nomor} diperbarui`,
          "sukses",
          hasil.perubahan.join(", "),
          true,
        ),
      };
    }

    case "hapus": {
      const target = list.find((t) => t.id === aksi.id);
      if (!target) return state;
      return {
        ...state,
        tiket: denganRiwayat(
          state.tiket,
          list.filter((t) => t.id !== aksi.id),
        ),
        masihDemo: false,
        kabar: buatKabar(
          `Tiket ${target.nomor} dihapus`,
          "info",
          target.pelanggan,
          true,
        ),
      };
    }

    case "hapusBanyak": {
      if (aksi.ids.length === 0) return state;
      return {
        ...state,
        tiket: denganRiwayat(
          state.tiket,
          list.filter((t) => !aksi.ids.includes(t.id)),
        ),
        masihDemo: false,
        kabar: buatKabar(
          `${aksi.ids.length} tiket dihapus`,
          "info",
          "Bisa dikembalikan dengan Undo.",
          true,
        ),
      };
    }

    case "status": {
      const target = list.find((t) => t.id === aksi.id);
      if (!target || target.status === aksi.ke) return state;
      return {
        ...state,
        tiket: denganRiwayat(
          state.tiket,
          list.map((t) => (t.id === aksi.id ? ubahStatus(t, aksi.ke, { now, catatan: aksi.catatan }) : t)),
        ),
        masihDemo: false,
        kabar: buatKabar(
          `${target.nomor} → ${labelStatus(aksi.ke)}`,
          "sukses",
          aksi.catatan?.trim() || target.perangkat,
          true,
        ),
      };
    }

    case "statusBanyak": {
      const ids = new Set(
        aksi.ids.filter((id) => {
          const t = list.find((x) => x.id === id);
          return t !== undefined && t.status !== aksi.ke;
        }),
      );
      if (ids.size === 0) return state;
      return {
        ...state,
        tiket: denganRiwayat(
          state.tiket,
          list.map((t) => (ids.has(t.id) ? ubahStatus(t, aksi.ke, { now }) : t)),
        ),
        masihDemo: false,
        kabar: buatKabar(
          `${ids.size} tiket → ${labelStatus(aksi.ke)}`,
          "sukses",
          undefined,
          true,
        ),
      };
    }

    case "catatan": {
      const target = list.find((t) => t.id === aksi.id);
      if (!target) return state;
      return {
        ...state,
        tiket: denganRiwayat(
          state.tiket,
          list.map((t) => (t.id === aksi.id ? tambahCatatan(t, aksi.teks, { now }) : t)),
        ),
        masihDemo: false,
        kabar: buatKabar("Catatan pengerjaan disimpan", "sukses", target.nomor),
      };
    }

    case "ganti":
      return {
        ...state,
        tiket: denganRiwayat(state.tiket, aksi.tiket),
        masihDemo: false,
        kabar: buatKabar(`${aksi.tiket.length} tiket diimpor`, "sukses"),
      };

    case "pulihkan":
      return {
        ...state,
        tiket: denganRiwayat(state.tiket, buatDataContoh(now)),
        masihDemo: true,
        kabar: buatKabar("Data demo dipulihkan", "sukses", "Semua perubahan lokal diganti."),
      };

    case "undo": {
      const sebelum = state.tiket.lalu.at(-1);
      if (!sebelum) return state;
      return {
        ...state,
        tiket: {
          sekarang: sebelum,
          lalu: state.tiket.lalu.slice(0, -1),
          depan: [state.tiket.sekarang, ...state.tiket.depan].slice(0, BATAS_RIWAYAT),
        },
        kabar: buatKabar("Perubahan dibatalkan", "info"),
      };
    }

    case "redo": {
      const sesudah = state.tiket.depan[0];
      if (!sesudah) return state;
      return {
        ...state,
        tiket: {
          sekarang: sesudah,
          lalu: [...state.tiket.lalu, state.tiket.sekarang].slice(-BATAS_RIWAYAT),
          depan: state.tiket.depan.slice(1),
        },
        kabar: buatKabar("Perubahan diulang", "info"),
      };
    }

    case "tampilan":
      return { ...state, tampilan: aksi.tampilan };

    case "tema":
      return { ...state, tema: aksi.tema };

    case "simpan-ok":
      return { ...state, tersimpanPada: aksi.pada, galatSimpan: null };

    case "simpan-galat":
      return { ...state, galatSimpan: aksi.galat };

    case "bubar-kabar":
      return { ...state, kabar: null };

    default:
      return state;
  }
}

function stateAwal(): State {
  const dimuat = muatData();
  return {
    tiket: { sekarang: dimuat.tiket, lalu: [], depan: [] },
    masihDemo: dimuat.masihDemo,
    tampilan: dimuat.tampilan,
    tema: dimuat.tema,
    tersimpanPada: null,
    galatMuat: dimuat.galat ?? null,
    galatSimpan: null,
    kabar: null,
  };
}

export interface AppStore {
  tiket: Ticket[];
  masihDemo: boolean;
  tampilan: TampilanTersimpan[];
  tema: Tema | "sistem";
  tersimpanPada: string | null;
  galatMuat: string | null;
  galatSimpan: string | null;
  kabar: Kabar | null;
  bisaUndo: boolean;
  bisaRedo: boolean;
  hariIni: string;
  tambah: (draft: DraftTiket) => void;
  ubah: (id: string, draft: DraftTiket) => void;
  hapus: (id: string) => void;
  hapusBanyak: (ids: string[]) => void;
  ubahStatus: (id: string, ke: Status, catatan?: string) => void;
  ubahStatusBanyak: (ids: string[], ke: Status) => void;
  tambahCatatan: (id: string, teks: string) => void;
  gantiSemua: (tiket: Ticket[]) => void;
  pulihkanDemo: () => void;
  undo: () => void;
  redo: () => void;
  simpanTampilan: (tampilan: TampilanTersimpan[]) => void;
  setTema: (tema: Tema | "sistem") => void;
  tutupKabar: () => void;
}

const Konteks = createContext<AppStore | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }): ReactNode {
  const [state, dispatch] = useReducer(reducer, undefined, stateAwal);

  useEffect(() => {
    const hasil = simpanData(
      state.tiket.sekarang,
      state.masihDemo,
      state.tampilan,
      state.tema,
    );
    if (hasil.ok) dispatch({ jenis: "simpan-ok", pada: hasil.tersimpanPada });
    else dispatch({ jenis: "simpan-galat", galat: hasil.galat });
  }, [state.tiket.sekarang, state.masihDemo, state.tampilan, state.tema]);

  const tambah = useCallback((draft: DraftTiket) => dispatch({ jenis: "tambah", draft }), []);
  const ubah = useCallback(
    (id: string, draft: DraftTiket) => dispatch({ jenis: "ubah", id, draft }),
    [],
  );
  const hapus = useCallback((id: string) => dispatch({ jenis: "hapus", id }), []);
  const hapusBanyak = useCallback((ids: string[]) => dispatch({ jenis: "hapusBanyak", ids }), []);
  const ubahStatus = useCallback(
    (id: string, ke: Status, catatan?: string) => dispatch({ jenis: "status", id, ke, catatan }),
    [],
  );
  const ubahStatusBanyak = useCallback(
    (ids: string[], ke: Status) => dispatch({ jenis: "statusBanyak", ids, ke }),
    [],
  );
  const tambahCatatan = useCallback(
    (id: string, teks: string) => dispatch({ jenis: "catatan", id, teks }),
    [],
  );
  const gantiSemua = useCallback((tiket: Ticket[]) => dispatch({ jenis: "ganti", tiket }), []);
  const pulihkanDemo = useCallback(() => dispatch({ jenis: "pulihkan" }), []);
  const undo = useCallback(() => dispatch({ jenis: "undo" }), []);
  const redo = useCallback(() => dispatch({ jenis: "redo" }), []);
  const simpanTampilan = useCallback(
    (tampilan: TampilanTersimpan[]) => dispatch({ jenis: "tampilan", tampilan }),
    [],
  );
  const setTema = useCallback((tema: Tema | "sistem") => dispatch({ jenis: "tema", tema }), []);
  const tutupKabar = useCallback(() => dispatch({ jenis: "bubar-kabar" }), []);

  const nilai = useMemo<AppStore>(
    () => ({
      tiket: state.tiket.sekarang,
      masihDemo: state.masihDemo,
      tampilan: state.tampilan.length > 0 ? state.tampilan : tampilanBawaan(),
      tema: state.tema,
      tersimpanPada: state.tersimpanPada,
      galatMuat: state.galatMuat,
      galatSimpan: state.galatSimpan,
      kabar: state.kabar,
      bisaUndo: state.tiket.lalu.length > 0,
      bisaRedo: state.tiket.depan.length > 0,
      hariIni: hariIni(),
      tambah,
      ubah,
      hapus,
      hapusBanyak,
      ubahStatus,
      ubahStatusBanyak,
      tambahCatatan,
      gantiSemua,
      pulihkanDemo,
      undo,
      redo,
      simpanTampilan,
      setTema,
      tutupKabar,
    }),
    [
      state,
      tambah,
      ubah,
      hapus,
      hapusBanyak,
      ubahStatus,
      ubahStatusBanyak,
      tambahCatatan,
      gantiSemua,
      pulihkanDemo,
      undo,
      redo,
      simpanTampilan,
      setTema,
      tutupKabar,
    ],
  );

  return <Konteks.Provider value={nilai}>{children}</Konteks.Provider>;
}

export function useStore(): AppStore {
  const nilai = useContext(Konteks);
  if (!nilai) throw new Error("useStore harus dipakai di dalam AppStoreProvider.");
  return nilai;
}
