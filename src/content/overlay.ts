import { matchesTargetDomain, normalizeHostname } from "../shared/domains";
import { getConfig } from "../shared/storage";
import { getActiveIntentionFromBackground, sendMessage } from "./runtime";

const OVERLAY_ID = "waih-overlay-root";
const ACTIVE_INTENTION_KEY = "waih_active_intention";
const SCROLL_LOCK_CLASS = "waih-scroll-lock";
const SCROLL_LOCK_ATTR = "data-waih-scroll-lock";
const SCROLL_TOP_ATTR = "data-waih-scroll-top";
const PILL_POSITION_KEY = "waih_pill_position";
let activeOverlayInput: HTMLInputElement | null = null;

type ActiveIntention = {
  domain: string;
  intention: string;
  createdAt: number;
};

type PillPosition = {
  x: number;
  y: number;
  mode: "center" | "free";
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

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getDefaultPillPosition(): PillPosition {
  return {
    x: window.innerWidth / 2,
    y: 64,
    mode: "center"
  };
}

function loadPillPosition(): PillPosition | null {
  const raw = sessionStorage.getItem(PILL_POSITION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PillPosition;
  } catch {
    return null;
  }
}

function savePillPosition(position: PillPosition): void {
  sessionStorage.setItem(PILL_POSITION_KEY, JSON.stringify(position));
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

function applyPillPosition(pill: HTMLDivElement, position: PillPosition): void {
  pill.style.left = `${position.x}px`;
  pill.style.top = `${position.y}px`;
  if (position.mode === "center") {
    pill.classList.remove("is-free");
  } else {
    pill.classList.add("is-free");
  }
}

function enableDragging(pill: HTMLDivElement, position: PillPosition): void {
  let startX = 0;
  let startY = 0;
  let startLeft = 0;
  let startTop = 0;

  const onPointerMove = (event: PointerEvent): void => {
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    const rect = pill.getBoundingClientRect();
    const nextLeft = clamp(
      startLeft + deltaX,
      16,
      window.innerWidth - rect.width - 16
    );
    const nextTop = clamp(
      startTop + deltaY,
      16,
      window.innerHeight - rect.height - 16
    );

    position.x = nextLeft;
    position.y = nextTop;
    position.mode = "free";
    applyPillPosition(pill, position);
  };

  const onPointerUp = (event: PointerEvent): void => {
    pill.releasePointerCapture(event.pointerId);
    pill.style.cursor = "grab";
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    savePillPosition(position);
  };

  pill.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const rect = pill.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    startLeft = rect.left;
    startTop = rect.top;
    pill.style.cursor = "grabbing";
    pill.setPointerCapture(event.pointerId);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  });
}

type OverlayMode = "gate" | "pill";

function createOverlay(
  mode: OverlayMode,
  intentionText?: string
): HTMLDivElement {
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
      z-index: 2147483646;
      font-family: "Avenir Next", "Futura", "Segoe UI", sans-serif;
      color: #f4f5f7;
      padding-top: 72px;
    }
    .pill {
      position: fixed;
      z-index: 2147483647;
      left: 50%;
      top: 64px;
      transform: translateX(-50%);
      background: rgba(255, 255, 255, 0.9);
      color: #171a1d;
      border: 1px solid rgba(0, 0, 0, 0.08);
      border-radius: 999px;
      padding: 12px 18px;
      min-width: 220px;
      max-width: 420px;
      box-shadow: 0 18px 40px rgba(0, 0, 0, 0.25);
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: text;
      user-select: none;
    }
    .pill.is-pill {
      cursor: grab;
    }
    .pill.is-pill input {
      cursor: grab;
      user-select: none;
      pointer-events: none;
    }
    .pill.is-free {
      transform: none;
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
      color: inherit;
      font-size: 1.1rem;
      outline: none;
    }
    input::placeholder {
      color: rgba(23, 26, 29, 0.45);
    }
    button {
      background: transparent;
      color: rgba(23, 26, 29, 0.6);
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
    .pill.is-typing button {
      opacity: 1;
      pointer-events: auto;
    }
    .error {
      position: absolute;
      top: calc(100% + 2.2rem);
      left: 50%;
      transform: translateX(-50%);
      color: #e7b3b3;
      font-size: 0.85rem;
      margin: 0;
      min-height: 1.1em;
    }
    .timebox-row {
      position: absolute;
      top: calc(100% + 0.45rem);
      left: 50%;
      transform: translateX(-50%);
      display: none;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.75rem;
      color: rgba(23, 26, 29, 0.7);
      z-index: 2147483647;
    }
    .timebox-row.is-visible {
      display: inline-flex;
    }
    .timebox-chip {
      border: none;
      background: rgba(255, 255, 255, 0.7);
      color: rgba(23, 26, 29, 0.75);
      font-size: 0.75rem;
      padding: 0.35em 0.9em;
      border-radius: 999px;
      cursor: pointer;
      transition: background 0.15s ease, color 0.15s ease;
    }
    .timebox-chip.is-selected {
      background: rgba(255, 255, 255, 1);
      color: rgba(23, 26, 29, 0.95);
      font-weight: 600;
    }
    .timebox-custom {
      position: relative;
      white-space: nowrap;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 6.5ch;
    }
    .timebox-custom .custom-label {
      letter-spacing: 0.06em;
      font-size: 0.7rem;
    }
    .timebox-custom .custom-edit {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.25em;
      opacity: 0;
      pointer-events: none;
    }
    .timebox-custom.is-editing .custom-label {
      opacity: 0;
    }
    .timebox-custom.is-editing .custom-edit {
      opacity: 1;
      pointer-events: auto;
    }
    .timebox-custom input {
      border: none;
      background: transparent;
      font-size: 0.75rem;
      text-align: right;
      outline: none;
      width: 2ch;
    }
    .timebox-custom .custom-suffix {
      font-size: 0.7rem;
      color: rgba(23, 26, 29, 0.7);
    }
    .sizer {
      position: absolute;
      visibility: hidden;
      white-space: pre;
      font-size: 1.1rem;
      font-family: "Avenir Next", "Futura", "Segoe UI", sans-serif;
      padding: 0;
    }
  `;

  const overlay = document.createElement("div");
  overlay.className = "overlay";

  const pill = document.createElement("div");
  pill.className = `pill ${mode === "gate" ? "is-gate" : "is-pill"}`;

  const form = document.createElement("form");
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = "Why am I here?";

  const error = document.createElement("p");
  error.className = "error";

  const sizer = document.createElement("span");
  sizer.className = "sizer";

  const button = document.createElement("button");
  button.type = "submit";
  button.textContent = "Enter";

  const timeboxRow = document.createElement("div");
  timeboxRow.className = "timebox-row";

  const presetValues = [5, 10, 20];
  const presetButtons = presetValues.map((value) => {
    const preset = document.createElement("button");
    preset.type = "button";
    preset.className = "timebox-chip";
    preset.textContent = `${value}M`;
    preset.dataset.value = String(value);
    return preset;
  });

  const customButton = document.createElement("button");
  customButton.type = "button";
  customButton.className = "timebox-chip timebox-custom";

  const customLabel = document.createElement("span");
  customLabel.className = "custom-label";
  customLabel.textContent = "CUSTOM";

  const customInput = document.createElement("input");
  customInput.type = "text";
  customInput.inputMode = "numeric";
  customInput.setAttribute("pattern", "[0-9]*");
  customInput.setAttribute("aria-label", "Custom minutes");
  customInput.placeholder = "10";

  const customSuffix = document.createElement("span");
  customSuffix.className = "custom-suffix";
  customSuffix.textContent = "M";

  const customEdit = document.createElement("span");
  customEdit.className = "custom-edit";
  customEdit.append(customInput, customSuffix);

  customButton.append(customLabel, customEdit);
  timeboxRow.append(...presetButtons, customButton);

  const updateSizing = (): void => {
    const value = input.value.trim() || input.placeholder;
    sizer.textContent = value;
    const width = sizer.getBoundingClientRect().width;
    const padded = clamp(width + 40, 180, 380);
    input.style.width = `${padded}px`;
  };

  const updateTypingState = (): void => {
    if (input.value.trim().length > 0) {
      pill.classList.add("is-typing");
      timeboxRow.classList.add("is-visible");
    } else {
      pill.classList.remove("is-typing");
      timeboxRow.classList.remove("is-visible");
      setSelectedMinutes(null, "clear");
    }
  };

  let selectedMinutes: number | null = null;

  const syncMinutes = (): void => {
    if (selectedMinutes == null) {
      form.dataset.timerMinutes = "";
    } else {
      form.dataset.timerMinutes = String(selectedMinutes);
    }
  };

  const setSelectedMinutes = (
    value: number | null,
    source: "preset" | "custom" | "clear"
  ): void => {
    const toggled =
      source !== "clear" &&
      value != null &&
      selectedMinutes != null &&
      value === selectedMinutes;

    selectedMinutes = toggled ? null : value;

    presetButtons.forEach((preset) => {
      const presetValue = Number(preset.dataset.value || 0);
      if (selectedMinutes != null && presetValue === selectedMinutes) {
        preset.classList.add("is-selected");
      } else {
        preset.classList.remove("is-selected");
      }
    });

    if (source === "custom") {
      customButton.classList.add("is-selected");
      customButton.classList.add("is-editing");
    } else if (selectedMinutes == null) {
      customButton.classList.remove("is-selected");
      customButton.classList.remove("is-editing");
      customInput.value = "";
    } else {
      customButton.classList.remove("is-selected");
      customButton.classList.remove("is-editing");
      customInput.value = "";
    }

    syncMinutes();
  };

  presetButtons.forEach((preset) => {
    preset.addEventListener("click", () => {
      const value = Number(preset.dataset.value || 0);
      setSelectedMinutes(value, "preset");
    });
  });

  customButton.addEventListener("click", () => {
    customButton.classList.add("is-selected");
    customButton.classList.add("is-editing");
    setSelectedMinutes(null, "custom");
    customInput.focus();
  });

  customInput.addEventListener("input", () => {
    const raw = customInput.value.replace(/\D/g, "");
    customInput.value = raw;
    if (!raw) {
      setSelectedMinutes(null, "custom");
      return;
    }
    const value = clamp(Number(raw), 1, 60);
    if (Number(raw) !== value) {
      customInput.value = String(value);
    }
    setSelectedMinutes(value, "custom");
  });

  let hasDrag = false;
  if (mode === "gate") {
    input.addEventListener("input", () => {
      updateTypingState();
      updateSizing();
    });
    activeOverlayInput = input;
    setTimeout(() => {
      input.focus();
    }, 0);

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

      overlay.remove();
      error.remove();
      timeboxRow.remove();
      input.value = intention;
      input.readOnly = true;
      input.blur();
      button.remove();
      pill.classList.remove("is-typing");
      pill.classList.remove("is-gate");
      pill.classList.add("is-pill");
      updateSizing();

      if (!hasDrag) {
        enableDragging(pill, position);
        savePillPosition(position);
        hasDrag = true;
      }

      unlockScroll();
      activeOverlayInput = null;
    });
  } else {
    input.value = intentionText ?? "";
    input.readOnly = true;
    input.setAttribute("aria-readonly", "true");
    button.remove();
    error.remove();
    pill.classList.remove("is-typing");
  }

  updateSizing();

    if (mode === "gate") {
      form.append(input, button);
      pill.append(form, error, timeboxRow);
      shadow.append(style, sizer, overlay, pill);
    } else {
    form.append(input);
    pill.append(form);
    shadow.append(style, sizer, pill);
  }

  const position = loadPillPosition() ?? getDefaultPillPosition();
  applyPillPosition(pill, position);
  if (mode === "pill") {
    enableDragging(pill, position);
    savePillPosition(position);
    hasDrag = true;
  }

  return root;
}

export async function mountOverlay(): Promise<void> {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) return;

  const hostname = normalizeHostname(window.location.hostname);
  if (!hostname) return;

  const config = await getConfig();
  if (!matchesTargetDomain(hostname, config.targetDomains || [])) {
    return;
  }

  const backgroundIntention = await getActiveIntentionFromBackground(hostname);
  const existingIntention = backgroundIntention ?? getActiveIntention(hostname);
  if (existingIntention) {
    document.documentElement.appendChild(
      createOverlay("pill", existingIntention.intention)
    );
    return;
  }

  lockScroll();
  void sendMessage({
    type: "overlay_shown",
    payload: { domain: hostname, timestamp: Date.now() }
  });

  document.documentElement.appendChild(createOverlay("gate"));
}
