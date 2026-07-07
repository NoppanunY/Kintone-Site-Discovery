import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./theme/global.css";

if (window.kintoneDiscoveryPlatform) {
  document.body.classList.add("desktop-runtime");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
