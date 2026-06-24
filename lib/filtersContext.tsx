import { createContext, useContext, useState } from "react";

export type DayFilter = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";
export type TimeFilter = "morning" | "afternoon" | "evening";

export type Filters = {
  days: DayFilter[];
  times: TimeFilter[];
  maxPrice: number;
};

const DEFAULT_FILTERS: Filters = {
  days: [],
  times: [],
  maxPrice: 50,
};

type FiltersContextType = {
  filters: Filters;
  setFilters: (f: Filters) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
};

const FiltersContext = createContext<FiltersContextType>({
  filters: DEFAULT_FILTERS,
  setFilters: () => {},
  clearFilters: () => {},
  hasActiveFilters: false,
});

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);

  const clearFilters = () => setFilters(DEFAULT_FILTERS);

  const hasActiveFilters =
    filters.days.length > 0 || filters.times.length > 0 || filters.maxPrice < 50;

  return (
    <FiltersContext.Provider value={{ filters, setFilters, clearFilters, hasActiveFilters }}>
      {children}
    </FiltersContext.Provider>
  );
}

export const useFilters = () => useContext(FiltersContext);
