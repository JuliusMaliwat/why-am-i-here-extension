import { normalizeHostname } from "../shared/domains";
import type { ActiveIntentionState } from "../shared/types";
import { getActiveIntentionFromBackground } from "./runtime";

const NOTE_ID = "waih-intention-note";

function createNote(intention: ActiveIntentionState): HTMLDivElement {
  const root = document.createElement("div");
  root.id = NOTE_ID;
  const shadow = root.attachShadow({ mode: "open" });

  const style = document.createElement("style");
  style.textContent = `
    :host { all: initial; }
    .note {
      position: fixed;
      right: 24px;
      bottom: 24px;
      max-width: 320px;
      background: rgba(20, 22, 24, 0.9);
      color: #f4f5f7;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 14px;
      padding: 12px 14px;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.4);
      font-family: "Avenir Next", "Futura", "Segoe UI", sans-serif;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .label {
      text-transform: uppercase;
      letter-spacing: 0.14em;
      font-size: 0.6rem;
      color: #cbb18a;
      margin: 0;
    }
    .text {
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.35;
      color: #f4f5f7;
      word-break: break-word;
    }
  `;

  const note = document.createElement("div");
  note.className = "note";

  const label = document.createElement("p");
  label.className = "label";
  label.textContent = "Intention";

  const text = document.createElement("p");
  text.className = "text";
  text.textContent = intention.intention;

  note.append(label, text);
  shadow.append(style, note);

  return root;
}

export function showNote(intention: ActiveIntentionState): void {
  const existing = document.getElementById(NOTE_ID);
  if (existing) {
    existing.remove();
  }
  document.documentElement.appendChild(createNote(intention));
}

export async function mountNote(): Promise<void> {
  const hostname = normalizeHostname(window.location.hostname);
  if (!hostname) return;

  const active = await getActiveIntentionFromBackground(hostname);
  if (!active) return;

  showNote(active);
}
