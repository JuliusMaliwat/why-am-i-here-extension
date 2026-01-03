import { mountOverlay } from "./overlay";

async function init(): Promise<void> {
  await mountOverlay();
}

init().catch((error) => {
  console.error("[waih] failed to init content", error);
});
