// Redux store root. One slice ships pre-wired (`ui`); add more by:
//
//   1. Author the slice at src/reducers/<name>/slice.ts using `createSlice`.
//   2. Add an import here at the `importRef` marker comment below.
//   3. Add the reducer to `configureStore({ reducer: { ... } })` at the
//      `reducerRef` marker comment.
//
// The marker comments (`//-- importRef`, `//-- reducerRef`) are a codegen-
// friendly convention so a future Plop or skill-based generator can wire a
// new slice without an LLM round-trip. See alignment.md §3.2.
//
// The two-library state split (alignment.md §3.6.2):
//   - Redux Toolkit (this file) — owned client state: theme, dialog stacks,
//     chat history, tool registry, navigation, anything the app owns.
//   - TanStack Query (src/lib/query-client.ts) — async remote state: every
//     Domo platform read (dataset alias, AppDB, Code Engine, AI).

import { configureStore } from '@reduxjs/toolkit';
import { type TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

import { uiSlice } from './ui/slice';
//-- importRef (do not remove; codegen marker)

export const store = configureStore({
  reducer: {
    ui: uiSlice.reducer,
    //-- reducerRef (do not remove; codegen marker)
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
