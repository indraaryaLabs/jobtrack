/**
 * Titik masuk JobTrack.
 *
 * Urutan lapisan yang disengaja:
 *   font → token → base → layout → komponen → print
 */

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/inter";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/layout.css";
import "./styles/components.css";
import "./styles/print.css";
import { App } from "./app/App";
import { AppStoreProvider } from "./state/store";
import { pasangTema } from "./state/theme";
import { ToastProvider } from "./ui";
import { daftarkanServiceWorker } from "./offline";

pasangTema("sistem");

const wadah = document.getElementById("root");
if (!wadah) throw new Error("Elemen #root tidak ditemukan pada index.html.");

createRoot(wadah).render(
  <StrictMode>
    <ToastProvider>
      <AppStoreProvider>
        <App />
      </AppStoreProvider>
    </ToastProvider>
  </StrictMode>,
);

// Mode offline: hanya didaftarkan pada build produksi.
daftarkanServiceWorker();
