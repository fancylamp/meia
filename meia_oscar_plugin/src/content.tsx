import React from "react"
import ReactDOM from "react-dom/client"
import { MeiaPanel } from "./components/MeiaPanel"
import "./index.css"

// Block meta refresh by intercepting before browser schedules it
const blockRefresh = () => {
  document.querySelectorAll('meta[http-equiv="refresh"]').forEach(el => el.remove());
};
blockRefresh();

// Override document.write to catch dynamically written meta tags
const originalWrite = document.write.bind(document);
document.write = (html: string) => {
  originalWrite(html.replace(/<meta[^>]*http-equiv=["']?refresh["']?[^>]*>/gi, ''));
};

new MutationObserver(blockRefresh).observe(document.documentElement, { childList: true, subtree: true });

document.documentElement.style.visibility = 'hidden';

function initExtension() {
  if (
    window.location.port === "8443" &&
    window.location.pathname.startsWith("/oscar/provider")
  ) {
    const container = document.createElement("div");
    container.id = "meia-root";
    document.body.appendChild(container);
    document.body.style.marginRight = "380px";

    ReactDOM.createRoot(container).render(
      <React.StrictMode>
        <MeiaPanel />
      </React.StrictMode>
    );
  }
  document.documentElement.style.visibility = '';
}

if (document.body) {
  initExtension();
} else {
  const observer = new MutationObserver((mutations, obs) => {
    if (document.body) {
      obs.disconnect();
      initExtension();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
}
