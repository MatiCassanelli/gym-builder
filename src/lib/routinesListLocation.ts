/**
 * Remembers the routines list's URL query (search, trainer chip, active/expired tab) so links
 * that lead back to "/" from the builder or the viewer restore the list as it was left.
 */
let lastListSearch = '';

export const rememberRoutinesListSearch = (search: string): void => {
  lastListSearch = search;
};

export const routinesListPath = (): string => `/${lastListSearch}`;
