import React from "react"
import ReactDOM from "react-dom/client"
import { ProviderPanel } from "./components/ProviderPanel"
import { EncounterPanel } from "./components/EncounterPanel"
import "./index.css"

// Only run in top frame, not inside our iframe
if (window.self === window.top) {
  // Block Oscar auto-refresh on load
  window.addEventListener('load', () => {
    document.querySelectorAll('meta[http-equiv="refresh"]').forEach(el => el.remove());
    window.stop();
    initExtension();
  }, { once: true });
}

async function initExtension() {
  const path = window.location.pathname;
  const isProvider = path.startsWith("/oscar/provider");
  const isEncounter = path.startsWith("/oscar/casemgmt/");

  if (window.location.port !== "8443" || (!isProvider && !isEncounter)) return;

  const result = await chrome.storage.local.get("meia_session_id");
  if (isEncounter && !result.meia_session_id) return;

  // Resize encounter window to full screen
  if (isEncounter) {
    window.resizeTo(screen.availWidth, screen.availHeight);
    window.moveTo(0, 0);
  }

  // Create iframe with current page content
  const iframe = document.createElement("iframe");
  iframe.id = "oscar-frame";
  iframe.src = window.location.href;
  iframe.style.cssText = "position:fixed;top:0;left:0;width:75vw;height:100vh;border:none;";

  // Create plugin container
  const container = document.createElement("div");
  container.id = "meia-root";

  // Replace page content
  document.body.innerHTML = "";
  document.body.style.margin = "0";
  document.body.appendChild(iframe);
  document.body.appendChild(container);

  // Expose reload function globally
  (window as any).reloadOscar = () => iframe.contentWindow?.location.reload();

  ReactDOM.createRoot(container).render(
    <React.StrictMode>
      {isEncounter ? <EncounterPanel /> : <ProviderPanel />}
    </React.StrictMode>
  );
}
