import React from "react"
import ReactDOM from "react-dom/client"
import { MeiaPanel } from "./components/MeiaPanel"
import "./index.css"

document.documentElement.style.visibility = 'hidden';

// Block OSCAR auto-refresh, then init extension
let stopDone = false;
window.addEventListener('load', () => {
  const tags = document.querySelectorAll('meta[http-equiv="refresh"]');
  if (tags.length > 0) {
    console.log('[MEIA] Blocking auto-refresh');
    tags.forEach(el => el.remove());
    window.stop();
  }
  stopDone = true;
  tryInit();
}, { once: true });

function tryInit() {
  if (!stopDone || !document.body) return;
  initExtension();
}

function initExtension() {
  if (
    window.location.port === "8443" &&
    window.location.pathname.startsWith("/oscar/provider")
  ) {
    const container = document.createElement("div");
    container.id = "meia-root";
    document.body.appendChild(container);
    document.body.style.marginRight = "25vw";

    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        <MeiaPanel />
      </React.StrictMode>
    );
  }
  document.documentElement.style.visibility = '';
}

if (document.body) {
  tryInit();
} else {
  const observer = new MutationObserver((mutations, obs) => {
    if (document.body) {
      obs.disconnect();
      tryInit();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
