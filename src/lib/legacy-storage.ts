/**
 * Carries localStorage over from the GigHub-era key names to the Mune Work ones,
 * so the rebrand doesn't sign everyone out or reset their theme.
 *
 * Runs as a module side effect and must be imported before any store, since
 * ui.store reads its persisted value at module load to avoid a theme flash.
 * Safe to delete once no active session predates the rename.
 */
const RENAMED_KEYS: Array<[legacy: string, current: string]> = [
  ['gighub-auth', 'munework-auth'],
  ['gighub-ui-store', 'munework-ui-store'],
  ['gighub_remember_email', 'munework_remember_email'],
  ['gighub_remember_me', 'munework_remember_me'],
  ['gighub_email_prefs', 'munework_email_prefs'],
];

try {
  for (const [legacy, current] of RENAMED_KEYS) {
    const value = localStorage.getItem(legacy);
    if (value !== null && localStorage.getItem(current) === null) {
      localStorage.setItem(current, value);
    }
    localStorage.removeItem(legacy);
  }
} catch {
  /* private mode / storage disabled — nothing to carry over */
}

export {};
