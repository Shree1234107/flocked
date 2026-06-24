import { createContext, useContext, useState } from "react";

type FavoritesContextType = {
  favorites: Set<string>;
  toggleFavorite: (id: string) => void;
  isFavorite: (id: string) => boolean;
  favoriteList: string[];
};

const FavoritesContext = createContext<FavoritesContextType>({
  favorites: new Set(),
  toggleFavorite: () => {},
  isFavorite: () => false,
  favoriteList: [],
});

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isFavorite = (id: string) => favorites.has(id);
  const favoriteList = Array.from(favorites);

  return (
    <FavoritesContext.Provider value={{ favorites, toggleFavorite, isFavorite, favoriteList }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export const useFavorites = () => useContext(FavoritesContext);
