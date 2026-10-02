// Syncs `state.ui.theme` to the document root so the `.dark` block in
// styles/globals.css engages. Mount once near the app root.

import { useEffect } from 'react';

import { useAppSelector } from '..';

export function useThemeEffect() {
  const theme = useAppSelector((state) => state.ui.theme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);
}
