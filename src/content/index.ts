import { mountNote } from "./note";
import { mountOverlay } from "./overlay";

async function init(): Promise<void> {
  await mountNote();
  await mountOverlay();
}

init().catch((error) => {
  console.error("[waih] failed to init content", error);
});
