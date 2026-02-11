import { matchesTargetDomain, normalizeHostname } from "../shared/domains";
import { getConfig } from "../shared/storage";
import { getActiveIntentionFromBackground, sendMessage } from "./runtime";

const OVERLAY_ID = "waih-overlay-root";
const ACTIVE_INTENTION_KEY = "waih_active_intention";
const SCROLL_LOCK_CLASS = "waih-scroll-lock";
const SCROLL_LOCK_ATTR = "data-waih-scroll-lock";
const SCROLL_TOP_ATTR = "data-waih-scroll-top";
const MIN_INTENTION_LENGTH = 5;
const PILL_POSITION_KEY = "waih_pill_position";
let activeOverlayInput: HTMLInputElement | null = null;
const overlayEditableElements = new Set<HTMLElement>();
let activeMathConfirm: (() => void) | null = null;
let mathGateActive = false;
let mathGateArmed = false;

type ActiveIntention = {
  domain: string;
  intention: string;
  createdAt: number;
  timerMinutes?: number;
  timerEndsAt?: number;
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

function focusOverlayInput(): void {
  if (!activeOverlayInput) return;
  activeOverlayInput.focus({ preventScroll: true });
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
  window.addEventListener("keydown", handleOverlayKeyEvent, true);
  window.addEventListener("keyup", handleOverlayKeyEvent, true);
  window.addEventListener("focusin", keepOverlayFocus, true);
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
  window.removeEventListener("keydown", handleOverlayKeyEvent, true);
  window.removeEventListener("keyup", handleOverlayKeyEvent, true);
  window.removeEventListener("focusin", keepOverlayFocus, true);

  window.scrollTo(0, scrollTop);
  document.documentElement.removeAttribute(SCROLL_TOP_ATTR);
}

function preventScroll(event: Event): void {
  event.preventDefault();
}

function isOverlayEditableEvent(event: KeyboardEvent): boolean {
  const path = event.composedPath?.() ?? [];
  const target =
    event.target instanceof HTMLElement ? event.target : null;
  const overlayRoot = document.getElementById(OVERLAY_ID);
  const shadowActive = overlayRoot?.shadowRoot?.activeElement;
  if (
    shadowActive instanceof HTMLElement &&
    (overlayEditableElements.has(shadowActive) ||
      shadowActive.dataset.waihEditable === "true")
  ) {
    return true;
  }
  let inOverlay = false;

  for (const node of path) {
    if (!(node instanceof HTMLElement)) continue;
    if (
      overlayEditableElements.has(node) ||
      node.dataset.waihEditable === "true"
    ) {
      return true;
    }
    if (node === overlayRoot) {
      inOverlay = true;
    }
    if (overlayRoot?.shadowRoot?.contains(node)) {
      inOverlay = true;
    }
  }

  if (!inOverlay && target && overlayRoot?.shadowRoot?.contains(target)) {
    inOverlay = true;
  }

  if (!inOverlay) return false;

  for (const node of path) {
    if (!(node instanceof HTMLElement)) continue;
    if (
      node.tagName === "INPUT" ||
      node.tagName === "TEXTAREA" ||
      node.isContentEditable
    ) {
      return true;
    }
  }

  return false;
}

function handleOverlayKeyEvent(event: KeyboardEvent): void {
  if (
    event.key === "Enter" &&
    mathGateActive &&
    mathGateArmed &&
    activeMathConfirm &&
    !isOverlayEditableEvent(event)
  ) {
    event.preventDefault();
    event.stopPropagation();
    activeMathConfirm();
    return;
  }
  if (isOverlayEditableEvent(event)) {
    if (event.key !== "Enter") {
      event.stopPropagation();
    }
    return;
  }

  event.preventDefault();
  event.stopPropagation();
}

function keepOverlayFocus(event: FocusEvent): void {
  if (!activeOverlayInput) return;
  const path = event.composedPath?.() ?? [];
  for (const node of path) {
    if (node instanceof HTMLElement && node.id === OVERLAY_ID) {
      return;
    }
  }
  focusOverlayInput();
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

function keepPillCenteredOnResize(
  pill: HTMLDivElement,
  position: PillPosition
): () => void {
  const onResize = (): void => {
    if (position.mode !== "center") return;
    position.x = window.innerWidth / 2;
    applyPillPosition(pill, position);
  };
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
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
    if (!pill.classList.contains("is-pill")) {
      return;
    }
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

type OverlayInit = {
  mode: OverlayMode;
  intentionText?: string;
  timerEndsAt?: number;
  timerMinutes?: number;
};

function createOverlay(init: OverlayInit): HTMLDivElement {
  const { mode, intentionText, timerEndsAt } = init;
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
      backdrop-filter: blur(14px);
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
      background: linear-gradient(
        180deg,
        rgba(255, 255, 255, 0.92),
        rgba(255, 255, 255, 0.82)
      );
      color: #171a1d;
      border: 1px solid rgba(0, 0, 0, 0.06);
      border-radius: 999px;
      padding: 14px 20px;
      min-width: 220px;
      max-width: 420px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.18);
      display: flex;
      align-items: center;
      gap: 10px;
      cursor: text;
      user-select: none;
    }
    .pill.is-gate {
      max-width: 420px;
    }
    .pill.is-error {
      border-color: rgba(231, 197, 149, 0.7);
      box-shadow: 0 0 0 3px rgba(231, 197, 149, 0.15),
        0 20px 60px rgba(0, 0, 0, 0.18);
    }
    .pill.is-pill {
      cursor: grab;
      max-width: min(640px, calc(100vw - 32px));
      width: auto;
    }
    .pill.is-pill input {
      cursor: grab;
      user-select: none;
      pointer-events: none;
    }
    .pill.is-pill .intent-submit {
      display: none;
    }
    .pill.is-locked .intention-input {
      pointer-events: none;
      opacity: 0.7;
      cursor: default;
      caret-color: transparent;
    }
    .pill.is-free {
      transform: none;
    }
    form {
      display: flex;
      flex: 1;
      align-items: center;
      gap: 10px;
      min-width: 0;
      width: 100%;
    }
    .intention-input {
      flex: 1;
      min-width: 0;
      background: transparent;
      border: none;
      color: inherit;
      font-size: 1.05rem;
      font-weight: 500;
      outline: none;
      width: 100%;
    }
    .intention-input::placeholder {
      color: rgba(23, 26, 29, 0.42);
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
    .intent-submit {
      flex: 0 0 auto;
      white-space: nowrap;
    }
    .pill.is-typing button {
      opacity: 1;
      pointer-events: auto;
    }
    .pill.is-locked .intent-submit {
      opacity: 0;
      pointer-events: none;
    }
    .timer-text {
      font-size: 0.7rem;
      color: rgba(23, 26, 29, 0.45);
      white-space: nowrap;
      flex: 0 0 auto;
    }
    .error {
      position: absolute;
      top: calc(100% + 2.2rem);
      left: 50%;
      transform: translateX(-50%);
      color: rgba(231, 197, 149, 0.85);
      font-size: 0.8rem;
      margin: 0;
      min-height: 1.1em;
      white-space: nowrap;
    }
    .math-gate {
      position: absolute;
      top: calc(100% + 0.9rem);
      left: 50%;
      transform: translateX(-50%);
      display: none;
      align-items: center;
      gap: 0.6rem;
      padding: 8px 12px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.78);
      color: rgba(23, 26, 29, 0.85);
      border: 1px solid rgba(0, 0, 0, 0.08);
      font-size: 0.8rem;
      box-shadow: 0 10px 24px rgba(0, 0, 0, 0.15);
      white-space: nowrap;
    }
    .math-gate.is-visible {
      display: inline-flex;
    }
    .math-gate .math-question {
      flex: 0 1 auto;
      white-space: nowrap;
    }
    .math-gate .math-input {
      flex: 0 0 auto;
      box-sizing: content-box;
      width: 8.5ch;
      min-width: 8.5ch;
      max-width: 10.5ch;
      border: none;
      background: rgba(255, 255, 255, 0.85);
      border-radius: 999px;
      padding: 3px 8px;
      font-size: 0.8rem;
      text-align: center;
      outline: none;
      color: rgba(23, 26, 29, 0.9);
      cursor: text;
      user-select: text;
      pointer-events: auto;
    }
    .math-gate .math-input::placeholder {
      color: rgba(23, 26, 29, 0.4);
    }
    .math-gate,
    .math-gate * {
      pointer-events: auto;
    }
    .math-gate .math-ok {
      flex: 0 0 auto;
      border: none;
      background: rgba(23, 26, 29, 0.08);
      color: rgba(23, 26, 29, 0.85);
      font-size: 0.7rem;
      font-weight: 600;
      cursor: pointer;
      padding: 3px 10px;
      border-radius: 999px;
    }
    .math-gate .math-error {
      color: rgba(214, 108, 108, 0.9);
      font-size: 0.7rem;
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
    .timebox-row.is-highlight {
      box-shadow: 0 0 0 2px rgba(231, 197, 149, 0.2),
        0 10px 20px rgba(0, 0, 0, 0.2);
      border-radius: 999px;
      padding: 2px 6px;
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
  input.className = "intention-input";
  input.type = "text";
  input.placeholder = "Why am I here?";
  input.dataset.waihEditable = "true";
  overlayEditableElements.add(input);

  const error = document.createElement("p");
  error.className = "error";

  const mathGate = document.createElement("div");
  mathGate.className = "math-gate";
  const mathQuestion = document.createElement("span");
  mathQuestion.className = "math-question";
  const mathInput = document.createElement("input");
  mathInput.className = "math-input";
  mathInput.type = "text";
  mathInput.inputMode = "numeric";
  mathInput.setAttribute("pattern", "[0-9]*");
  mathInput.setAttribute("aria-label", "Solve the challenge to continue");
  mathInput.placeholder = "Answer";
  mathInput.dataset.waihEditable = "true";
  overlayEditableElements.add(mathInput);
  const mathOk = document.createElement("button");
  mathOk.className = "math-ok";
  mathOk.type = "button";
  mathOk.textContent = "OK";
  const mathError = document.createElement("span");
  mathError.className = "math-error";
  mathGate.append(mathQuestion, mathInput, mathOk, mathError);

  const sizer = document.createElement("span");
  sizer.className = "sizer";

  const button = document.createElement("button");
  button.className = "intent-submit";
  button.type = "submit";
  button.textContent = "Enter";

  const timerText = document.createElement("span");
  timerText.className = "timer-text";
  timerText.style.display = "none";
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
  customInput.dataset.waihEditable = "true";
  overlayEditableElements.add(customInput);

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
    const textWidth = sizer.getBoundingClientRect().width;
    const isPillMode = pill.classList.contains("is-pill");
    const maxPillWidth = Math.min(window.innerWidth - 32, isPillMode ? 640 : 420);
    const timerWidth =
      timerText.style.display === "none"
        ? 0
        : timerText.getBoundingClientRect().width + 10;
    const submitWidth = button.style.display === "none" ? 0 : 58;
    const horizontalPadding = 40;
    const gapAllowance = 12;
    const reservedWidth =
      horizontalPadding + gapAllowance + timerWidth + submitWidth;
    const inputMax = Math.max(180, maxPillWidth - reservedWidth);
    const inputMin = isPillMode ? 200 : 180;
    const adaptiveWidth = clamp(textWidth + 20, inputMin, inputMax);
    input.style.width = `${adaptiveWidth}px`;
  };

  const updateTypingState = (): void => {
    if (mathGateVisible) {
      pill.classList.add("is-typing");
      timeboxRow.classList.remove("is-visible");
      return;
    }
    if (input.value.trim().length > 0) {
      pill.classList.add("is-typing");
      timeboxRow.classList.add("is-visible");
    } else {
      pill.classList.remove("is-typing");
      timeboxRow.classList.remove("is-visible");
      setSelectedMinutes(null, "clear");
    }
  };

  const position = loadPillPosition() ?? getDefaultPillPosition();

  let countdownId: number | null = null;
  let latestIntentionText = "";
  if (intentionText) {
    latestIntentionText = intentionText;
  }

  const stopCountdown = (): void => {
    if (countdownId != null) {
      window.clearInterval(countdownId);
      countdownId = null;
    }
  };

  const showGate = (minutes?: number): void => {
    const timestamp = Date.now();
    const domain = normalizeHostname(window.location.hostname) || "";

    position.mode = "center";
    position.x = window.innerWidth / 2;
    applyPillPosition(pill, position);

    overlay.style.display = "";
    error.style.display = "none";
    error.textContent = "";
    hideMathGate();
    pill.classList.remove("is-error");
    pill.classList.remove("is-pill");
    pill.classList.remove("is-locked");
    pill.classList.add("is-gate");
    button.style.display = "";
    input.readOnly = false;
    input.removeAttribute("aria-readonly");
    input.value = latestIntentionText;
    activeOverlayInput = input;
    focusOverlayInput();
    window.requestAnimationFrame(focusOverlayInput);
    timerText.textContent = "";
    timerText.style.display = "none";
    updateTypingState();
    updateSizing();
    lockScroll();
    if (latestIntentionText && domain) {
      void sendMessage({
        type: "timer_expired",
        payload: {
          domain,
          timestamp,
          minutes
        }
      });
    }
    if (domain) {
      void sendMessage({
        type: "overlay_shown",
        payload: { domain, timestamp }
      });
    }
  };

  const startCountdown = (
    endsAt: number | null | undefined,
    minutes?: number
  ): void => {
    if (!endsAt) {
      timerText.textContent = "";
      timerText.style.display = "none";
      return;
    }

    timerText.style.display = "inline";

    const update = (): void => {
      const remainingMs = endsAt - Date.now();
      const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
      const mins = Math.floor(remainingSec / 60);
      const secs = remainingSec % 60;
      timerText.textContent = `${mins}m ${secs}s`;
      updateSizing();
      if (remainingMs <= 0) {
        stopCountdown();
        timerText.textContent = "";
        timerText.style.display = "none";
        updateSizing();
        if (mode === "pill") {
          const domain = normalizeHostname(window.location.hostname) || "";
          const timestamp = Date.now();
          if (latestIntentionText && domain) {
            void sendMessage({
              type: "timer_expired",
              payload: {
                domain,
                timestamp,
                minutes
              }
            });
          }
          if (domain) {
            void sendMessage({
              type: "overlay_shown",
              payload: { domain, timestamp }
            });
          }
          const gateRoot = createOverlay({
            mode: "gate",
            intentionText: latestIntentionText
          });
          root.replaceWith(gateRoot);
          lockScroll();
          return;
        }
        showGate(minutes);
      }
    };

    update();
    stopCountdown();
    countdownId = window.setInterval(update, 1000);
  };

  let selectedMinutes: number | null = null;
  let mathGateVisible = false;
  let currentMathAnswer = 0;

  const generateMathChallenge = (): string => {
    const a = Math.floor(Math.random() * 100) + 1;
    const b = Math.floor(Math.random() * 100) + 1;
    const useAddition = Math.random() < 0.5;
    if (useAddition) {
      currentMathAnswer = a + b;
      return `Solve ${a} + ${b}`;
    }
    const max = Math.max(a, b);
    const min = Math.min(a, b);
    currentMathAnswer = max - min;
    return `Solve ${max} - ${min}`;
  };

  const showMathGate = (): void => {
    if (!mathGateVisible) {
      mathQuestion.textContent = generateMathChallenge();
    }
    mathGateVisible = true;
    mathGateActive = true;
    mathGateArmed = false;
    mathGate.classList.add("is-visible");
    mathInput.value = "";
    mathError.textContent = "";
    activeOverlayInput = mathInput;
    input.readOnly = true;
    input.setAttribute("aria-readonly", "true");
    pill.classList.add("is-locked");
    timeboxRow.classList.remove("is-visible");
    updateTypingState();
    mathInput.focus();
    window.requestAnimationFrame(() => mathInput.focus());
    window.requestAnimationFrame(() => {
      mathGateArmed = true;
    });
  };

  const hideMathGate = (): void => {
    mathGateVisible = false;
    mathGateActive = false;
    mathGateArmed = false;
    mathGate.classList.remove("is-visible");
    mathError.textContent = "";
    activeOverlayInput = input;
    input.readOnly = false;
    input.removeAttribute("aria-readonly");
    pill.classList.remove("is-locked");
  };

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
      focusOverlayInput();
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

  customInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    focusOverlayInput();
    form.requestSubmit();
  });

  let hasDrag = false;
  if (mode === "gate") {
    input.addEventListener("input", () => {
      const current = input.value.trim();
      const wordCount = current ? current.split(/\s+/).length : 0;
      if (
        error.textContent &&
        current.length >= MIN_INTENTION_LENGTH &&
        wordCount >= 2
      ) {
        error.textContent = "";
        error.style.display = "none";
        pill.classList.remove("is-error");
      }
      if (!current) {
        hideMathGate();
      }
      updateTypingState();
      updateSizing();
    });
    if (intentionText) {
      input.value = intentionText;
    }
    updateTypingState();
    activeOverlayInput = input;
    focusOverlayInput();
    window.requestAnimationFrame(focusOverlayInput);

    const clearInlineError = (): void => {
      error.textContent = "";
      error.style.display = "none";
      pill.classList.remove("is-error");
    };

    const showInlineError = (message: string): void => {
      error.textContent = message;
      error.style.display = "block";
      pill.classList.add("is-error");
    };

    const getValidatedIntention = (): string | null => {
      clearInlineError();

      const intention = input.value.trim();
      if (!intention) {
        showInlineError("Add a short intention to continue.");
        focusOverlayInput();
        updateTypingState();
        return null;
      }
      if (intention.length < MIN_INTENTION_LENGTH) {
        showInlineError(
          `Add at least ${MIN_INTENTION_LENGTH} characters to continue.`
        );
        focusOverlayInput();
        updateTypingState();
        return null;
      }
      const wordCount = intention.split(/\s+/).length;
      if (wordCount < 2) {
        showInlineError("Add at least two words to continue.");
        focusOverlayInput();
        updateTypingState();
        return null;
      }

      return intention;
    };

    const finalizeSubmission = (intention: string, minutes: number): void => {
      const hostname = normalizeHostname(window.location.hostname);
      if (!hostname) {
        showInlineError("This page does not have a valid domain.");
        return;
      }

      const timestamp = Date.now();
      const endsAt = timestamp + minutes * 60 * 1000;

      const activeIntention = {
        domain: hostname,
        intention,
        createdAt: timestamp,
        timerMinutes: minutes,
        timerEndsAt: endsAt
      };

      setActiveIntention(activeIntention);

      void sendMessage({
        type: "intention_submitted",
        payload: {
          domain: hostname,
          intention,
          timestamp,
          timerMinutes: minutes
        }
      });

      overlay.style.display = "none";
      error.style.display = "none";
      pill.classList.remove("is-error");
      timeboxRow.classList.remove("is-visible");
      input.value = intention;
      latestIntentionText = intention;
      input.readOnly = true;
      input.blur();
      pill.classList.remove("is-typing");
      pill.classList.remove("is-gate");
      pill.classList.add("is-pill");
      button.style.display = "none";
      updateSizing();
      startCountdown(endsAt, minutes);

      if (!hasDrag) {
        enableDragging(pill, position);
        savePillPosition(position);
        hasDrag = true;
      }

      unlockScroll();
      activeOverlayInput = null;
    };

    const attemptSubmit = (): void => {
      hideMathGate();

      const intention = getValidatedIntention();
      if (!intention) return;

      const minutes = Number(form.dataset.timerMinutes || 0);
      if (minutes === 0) {
        showMathGate();
        return;
      }

      finalizeSubmission(intention, minutes);
    };

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      attemptSubmit();
    });

    const handleMathConfirm = (): void => {
      const intention = getValidatedIntention();
      if (!intention) return;
      if (!mathInput.value.trim()) {
        mathError.textContent = "";
        mathInput.focus();
        return;
      }
      const answer = Number(mathInput.value.trim());
      if (!Number.isFinite(answer) || answer !== currentMathAnswer) {
        mathError.textContent = "Try again.";
        mathInput.focus();
        return;
      }
      hideMathGate();
      input.readOnly = false;
      input.removeAttribute("aria-readonly");
      pill.classList.remove("is-locked");
      form.dataset.timerMinutes = "1";
      finalizeSubmission(intention, 1);
    };

    activeMathConfirm = handleMathConfirm;

    mathInput.addEventListener("input", () => {
      const digitsOnly = mathInput.value.replace(/\D/g, "");
      if (mathInput.value !== digitsOnly) {
        mathInput.value = digitsOnly;
      }
      mathError.textContent = "";
    });

    mathOk.addEventListener("click", handleMathConfirm);
    mathInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      handleMathConfirm();
    });

    mathInput.addEventListener("keyup", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      handleMathConfirm();
    });
  } else {
    input.value = intentionText ?? "";
    latestIntentionText = intentionText ?? "";
    input.readOnly = true;
    input.setAttribute("aria-readonly", "true");
    button.remove();
    error.remove();
    pill.classList.remove("is-typing");
    startCountdown(timerEndsAt, init.timerMinutes);
  }

  updateSizing();

  if (mode === "gate") {
    form.append(input, button);
    pill.append(form, timerText, error, mathGate, timeboxRow);
    shadow.append(style, sizer, overlay, pill);
  } else {
    overlay.style.display = "none";
    form.append(input);
    pill.append(form, timerText);
    shadow.append(style, sizer, overlay, pill);
  }

  applyPillPosition(pill, position);
  const cleanupResize = keepPillCenteredOnResize(pill, position);
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
    if (
      existingIntention.timerEndsAt &&
      existingIntention.timerEndsAt <= Date.now()
    ) {
      const timestamp = Date.now();
      void sendMessage({
        type: "timer_expired",
        payload: {
          domain: hostname,
          timestamp,
          minutes: existingIntention.timerMinutes
        }
      });
      void sendMessage({
        type: "overlay_shown",
        payload: { domain: hostname, timestamp }
      });
      lockScroll();
      document.documentElement.appendChild(
        createOverlay({
          mode: "gate",
          intentionText: existingIntention.intention
        })
      );
      return;
    }
    document.documentElement.appendChild(
      createOverlay({
        mode: "pill",
        intentionText: existingIntention.intention,
        timerEndsAt: existingIntention.timerEndsAt,
        timerMinutes: existingIntention.timerMinutes
      })
    );
    return;
  }

  lockScroll();
  void sendMessage({
    type: "overlay_shown",
    payload: { domain: hostname, timestamp: Date.now() }
  });

  document.documentElement.appendChild(createOverlay({ mode: "gate" }));
}
