import { mountOverlay } from "./overlay";

mountOverlay().catch((error) => {
  console.error("[waih] failed to mount overlay", error);
});
