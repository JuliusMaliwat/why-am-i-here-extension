import { matchesTargetDomain, normalizeHostname } from "../shared/domains";
import { getConfig } from "../shared/storage";
import { showNote } from "./note";
import { getActiveIntentionFromBackground, sendMessage } from "./runtime";

const OVERLAY_ID = "waih-overlay-root";
const ACTIVE_INTENTION_KEY = "waih_active_intention";

type ActiveIntention = {
  domain: string;
  intention: string;
  createdAt: number;
};

function getActiveIntention(domain: string): ActiveIntention | null {
  const raw = sessionStorage.getItem(ACTIVE_INTENTION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as ActiveIntention;
    if (parsed.domain !== domain) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setActiveIntention(intention: ActiveIntention): void {
  sessionStorage.setItem(ACTIVE_INTENTION_KEY, JSON.stringify(intention));
}

async function shouldShowOverlay(): Promise<boolean> {
  const hostname = normalizeHostname(window.location.hostname);
  if (!hostname) return false;

  const config = await getConfig();
  if (!matchesTargetDomain(hostname, config.targetDomains || [])) {
    return false;
  }

  const backgroundIntention = await getActiveIntentionFromBackground(hostname);
  const existing = backgroundIntention ?? getActiveIntention(hostname);
  return !existing;
}

function createOverlay(): HTMLDivElement {
  const root = document.createElement("div");
  root.id = OVERLAY_ID;
  const shadow = root.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    .overlay {
      position: fixed;
      inset: 0;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      background: rgba(18, 20, 22, 0.72);
      backdrop-filter: blur(10px);
      z-index: 2147483647;
      font-family: "Avenir Next", "Futura", "Segoe UI", sans-serif;
      color: #f4f5f7;
      padding-top: 72px;
    }
    .card {
      background: #1c2024;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 18px;
      padding: 28px;
      width: min(520px, 92vw);
      box-shadow: 0 30px 80px rgba(0, 0, 0, 0.4);
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .title {
      font-size: 1.35rem;
      margin: 0;
    }
    .subtitle {
      color: #b9c0c8;
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.4;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-top: 6px;
    }
    input {
      background: #131619;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 12px 14px;
      color: #f4f5f7;
      font-size: 1rem;
      outline: none;
    }
    input:focus {
      border-color: rgba(205, 179, 138, 0.7);
      box-shadow: 0 0 0 2px rgba(205, 179, 138, 0.2);
    }
    button {
      align-self: flex-end;
      background: #e7c595;
      color: #101213;
      border: none;
      border-radius: 12px;
      padding: 10px 16px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
    }
    .error {
      color: #e7b3b3;
      font-size: 0.9rem;
      margin: 0;
      min-height: 1.2em;
    }
  `;

  const overlay = document.createElement("div");
  overlay.className = "overlay";

  const card = document.createElement("div");
  card.className = "card";

  const title = document.createElement("h1");
  title.className = "title";
  title.textContent = "Why am I here?";

  const subtitle = document.createElement("p");
  subtitle.className = "subtitle";
  subtitle.textContent =
    "Write a short intention to keep this visit purposeful.";

  const form = document.createElement("form");
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Example: watch one tutorial";

  const error = document.createElement("p");
  error.className = "error";

  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "Continue";

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    error.textContent = "";

    const intention = input.value.trim();
    if (!intention) {
      error.textContent = "Add a short intention to continue.";
      input.focus();
      return;
    }

    const hostname = normalizeHostname(window.location.hostname);
    if (!hostname) {
      error.textContent = "This page does not have a valid domain.";
      return;
    }

    const timestamp = Date.now();
    const activeIntention = {
      domain: hostname,
      intention,
      createdAt: timestamp
    };

    setActiveIntention(activeIntention);

    void sendMessage({
      type: "intention_submitted",
      payload: { domain: hostname, intention, timestamp }
    });

    showNote({
      ...activeIntention,
      tabId: -1
    });

    root.remove();
  });

  form.append(input, error, button);
  card.append(title, subtitle, form);
  overlay.append(card);
  shadow.append(style, overlay);

  return root;
}

export async function mountOverlay(): Promise<void> {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) return;

  if (!(await shouldShowOverlay())) {
    return;
  }

  const hostname = normalizeHostname(window.location.hostname);
  if (hostname) {
    void sendMessage({
      type: "overlay_shown",
      payload: { domain: hostname, timestamp: Date.now() }
    });
  }

  document.documentElement.appendChild(createOverlay());
}
