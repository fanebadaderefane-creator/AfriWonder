import { InteractionManager } from 'react-native';

/** runAfterInteractions — garde si API absente (certaines WebView / builds). */
export function runAfterCallUiInteractions(task: () => void): void {
  const run = InteractionManager?.runAfterInteractions;
  if (typeof run === 'function') {
    run(task);
    return;
  }
  task();
}
