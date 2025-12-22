import React from "react"
import ReactDOM from "react-dom/client"
import { ProviderPanel } from "./components/ProviderPanel"
import { EncounterPanel } from "./components/EncounterPanel"
import "./index.css"

document.documentElement.style.visibility = 'hidden';

// Block OSCAR auto-refresh, then init extension
let stopDone = false;
window.addEventListener('load', () => {
  const tags = document.querySelectorAll('meta[http-equiv="refresh"]');
  if (tags.length > 0) {
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

async function initExtension() {
  const path = window.location.pathname;
  const isProvider = path.startsWith("/oscar/provider");
  const isEncounter = path.startsWith("/oscar/casemgmt/");

  if (window.location.port === "8443" && (isProvider || isEncounter)) {
    const result = await chrome.storage.local.get("meia_session_id");
    
    // Don't render encounter panel if not authenticated
    if (isEncounter && !result.meia_session_id) {
      document.documentElement.style.visibility = '';
      return;
    }

    // Resize encounter window to full screen on startup
    if (isEncounter) {
      window.resizeTo(screen.availWidth, screen.availHeight);
      window.moveTo(0, 0);
    }

    const container = document.createElement("div");
    container.id = "meia-root";
    document.body.appendChild(container);
    document.body.style.marginRight = "25vw";

    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        {isEncounter ? <EncounterPanel /> : <ProviderPanel />}
      </React.StrictMode>
    );
  }
  document.documentElement.style.visibility = '';
}

if (document.body) {
  tryInit();
} else {
  const observer = new MutationObserver((_mutations, obs) => {
    if (document.body) {
      obs.disconnect();
      tryInit();
    }
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
