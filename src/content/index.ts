import { mountOverlay } from "./overlay";

type NavigationCallback = () => void;

function observeNavigation(callback: NavigationCallback): void {
  const dispatch = (): void => {
    window.dispatchEvent(new Event("waih:navigation"));
  };

  const pushState = history.pushState;
  history.pushState = function (...args) {
    pushState.apply(this, args);
    dispatch();
  };

  const replaceState = history.replaceState;
  history.replaceState = function (...args) {
    replaceState.apply(this, args);
    dispatch();
  };

  window.addEventListener("popstate", dispatch);
  window.addEventListener("waih:navigation", callback);
}

async function init(): Promise<void> {
  await mountOverlay();
  observeNavigation(() => {
    void mountOverlay();
  });
}

init().catch((error) => {
  console.error("[waih] failed to init content", error);
});
