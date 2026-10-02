// The starter `ui` slice — shipped pre-wired so the day-1 example is concrete.
// Manages two patterns every pantry app reaches for:
//
//   - `theme: 'light' | 'dark'` — toggle the `<html data-theme>` attribute to
//     flip the CSS-variable-based design tokens defined in styles/globals.css.
//   - `dialogStack: string[]` — a stack of dialog IDs so multiple shadcn
//     `<Dialog>` instances coexist without prop-drilling open state.
//
// To add a new slice: author it under src/reducers/<name>/slice.ts and wire
// it into src/reducers/index.ts at the marker comments. See alignment.md §3.6
// for the broader state-management framing (`useState` vs Redux vs TanStack
// Query — the "who owns this data?" rule).

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type Theme = 'light' | 'dark';

export interface UiState {
  theme: Theme;
  dialogStack: string[];
}

const initialState: UiState = {
  theme: 'light',
  dialogStack: [],
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
    },
    toggleTheme(state) {
      state.theme = state.theme === 'light' ? 'dark' : 'light';
    },
    pushDialog(state, action: PayloadAction<string>) {
      state.dialogStack.push(action.payload);
    },
    popDialog(state) {
      state.dialogStack.pop();
    },
    closeAllDialogs(state) {
      state.dialogStack = [];
    },
  },
});

export const { setTheme, toggleTheme, pushDialog, popDialog, closeAllDialogs } =
  uiSlice.actions;
