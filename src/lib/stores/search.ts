import { create } from "zustand";

// The one search box.
//
// There were two: a stub in the topbar that opened nothing, and a real
// one inside the Carnet that filtered the rows under it. A host looking
// for a booking had to know which of the two did the work, and the
// answer changed per screen.
//
// So the topbar's is the real one and the only one. A screen that has a
// searchable list claims the box on mount — it supplies the placeholder,
// so the chrome says what *this* screen searches rather than something
// generic about the workspace — and the list reads the query back from
// here. A store rather than props because the two ends are the chrome
// and a row deep inside a rendered spec, with the whole page between
// them.
interface SearchState {
  query: string;
  /** Set by the screen that owns a searchable list; null when none does. */
  placeholder: string | null;
  setQuery: (query: string) => void;
  /** Claims the box. Returns a release for the effect's cleanup. */
  claim: (placeholder: string) => void;
  release: () => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  query: "",
  placeholder: null,
  setQuery: (query) => set({ query }),
  // The query resets with the claim: a term typed on Réservations is not
  // a term anyone meant to still be filtering after they navigated.
  claim: (placeholder) => set({ placeholder, query: "" }),
  release: () => set({ placeholder: null, query: "" }),
}));
