import { create } from "zustand";

type State = {
  spreadsheetId: string;
  spreadsheetTitle: string;
  range: string;
  headers: string[];
  values: unknown[][];
  setData: (payload: Partial<State>) => void;
};

export const useZooStore = create<State>(set => ({
  spreadsheetId: "",
  spreadsheetTitle: "",
  range: "A1:H100",
  headers: [],
  values: [],
  setData: payload => set(payload)
}));
