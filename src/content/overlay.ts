import { matchesTargetDomain, normalizeHostname } from "../shared/domains";
import { getConfig } from "../shared/storage";
import { showNote } from "./note";
import { getActiveIntentionFromBackground, sendMessage } from "./runtime";

const OVERLAY_ID = "waih-overlay-root";
const ACTIVE_INTENTION_KEY = "waih_active_intention";
const SCROLL_LOCK_CLASS = "waih-scroll-lock";
const SCROLL_LOCK_ATTR = "data-waih-scroll-lock";
const SCROLL_TOP_ATTR = "data-waih-scroll-top";
let activeOverlayInput: HTMLInputElement | null = null;

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

function lockScroll(): void {
  const scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
  document.documentElement.setAttribute(SCROLL_TOP_ATTR, String(scrollTop));

  document.documentElement.classList.add(SCROLL_LOCK_CLASS);
  document.body.classList.add(SCROLL_LOCK_CLASS);

  document.documentElement.setAttribute(SCROLL_LOCK_ATTR, "true");
  document.body.setAttribute(SCROLL_LOCK_ATTR, "true");

  document.body.style.position = "fixed";
  document.body.style.top = `-${scrollTop}px`;
  document.body.style.left = "0";
  document.body.style.right = "0";
  document.body.style.width = "100%";
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";

  document.addEventListener("wheel", preventScroll, { passive: false });
  document.addEventListener("touchmove", preventScroll, { passive: false });
  document.addEventListener("keydown", preventKeyScroll, true);
}

function unlockScroll(): void {
  const scrollTopValue =
    document.documentElement.getAttribute(SCROLL_TOP_ATTR) || "0";
  const scrollTop = Number(scrollTopValue) || 0;

  document.documentElement.classList.remove(SCROLL_LOCK_CLASS);
  document.body.classList.remove(SCROLL_LOCK_CLASS);
  document.documentElement.removeAttribute(SCROLL_LOCK_ATTR);
  document.body.removeAttribute(SCROLL_LOCK_ATTR);

  document.body.style.position = "";
  document.body.style.top = "";
  document.body.style.left = "";
  document.body.style.right = "";
  document.body.style.width = "";
  document.body.style.overflow = "";
  document.documentElement.style.overflow = "";

  document.removeEventListener("wheel", preventScroll);
  document.removeEventListener("touchmove", preventScroll);
  document.removeEventListener("keydown", preventKeyScroll, true);

  window.scrollTo(0, scrollTop);
  document.documentElement.removeAttribute(SCROLL_TOP_ATTR);
}

function preventScroll(event: Event): void {
  event.preventDefault();
}

function preventKeyScroll(event: KeyboardEvent): void {
  if (activeOverlayInput) {
    const path = event.composedPath();
    if (path.includes(activeOverlayInput)) {
      return;
    }
    const root = activeOverlayInput.getRootNode();
    if ("activeElement" in root && root.activeElement === activeOverlayInput) {
      return;
    }
  }

  const keys = [
    "ArrowUp",
    "ArrowDown",
    "PageUp",
    "PageDown",
    "Home",
    "End",
    " "
  ];
  if (keys.includes(event.key)) {
    event.preventDefault();
  }
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
    :host, :host * { box-sizing: border-box; }
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
      background: rgba(28, 32, 36, 0.9);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 999px;
      padding: 10px 16px;
      width: min(340px, 88vw);
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
      display: flex;
      align-items: center;
      gap: 10px;
    }
    form {
      display: flex;
      flex: 1;
      align-items: center;
      gap: 10px;
    }
    input {
      flex: 1;
      background: transparent;
      border: none;
      color: #f4f5f7;
      font-size: 1.05rem;
      outline: none;
    }
    input::placeholder {
      color: #c8cdd2;
    }
    button {
      background: transparent;
      color: #c8cdd2;
      border: none;
      padding: 0;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.15s ease;
    }
    .card.is-typing button {
      opacity: 1;
      pointer-events: auto;
    }
    .error {
      position: absolute;
      top: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
      color: #e7b3b3;
      font-size: 0.85rem;
      margin: 0;
      min-height: 1.1em;
    }
  `;

  const overlay = document.createElement("div");
  overlay.className = "overlay";

  const card = document.createElement("div");
  card.className = "card";

  const form = document.createElement("form");
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Why am I here?";

  const error = document.createElement("p");
  error.className = "error";

  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "Enter";

  const updateTypingState = (): void => {
    if (input.value.trim().length > 0) {
      card.classList.add("is-typing");
    } else {
      card.classList.remove("is-typing");
    }
  };

  input.addEventListener("input", updateTypingState);
  activeOverlayInput = input;

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    error.textContent = "";

    const intention = input.value.trim();
    if (!intention) {
      error.textContent = "Add a short intention to continue.";
      input.focus();
      updateTypingState();
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
    activeOverlayInput = null;
    unlockScroll();
  });

  form.append(input, button);
  card.append(form, error);
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

  lockScroll();
  const hostname = normalizeHostname(window.location.hostname);
  if (hostname) {
    void sendMessage({
      type: "overlay_shown",
      payload: { domain: hostname, timestamp: Date.now() }
    });
  }

  document.documentElement.appendChild(createOverlay());
}
