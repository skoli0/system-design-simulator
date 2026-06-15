/** Single reusable tab for all concept tutorials — avoids spawning a new tab per click. */
export const LEARN_TAB_ID = "learn";

export function isLearnTab(tabId: string | null | undefined): boolean {
  return tabId === LEARN_TAB_ID;
}
