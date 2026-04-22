import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";

interface HeaderSearchContextValue {
  searchContent: ReactNode;
  setSearchContent: (content: ReactNode) => void;
  clearSearchContent: () => void;
}

const HeaderSearchContext = createContext<HeaderSearchContextValue>({
  searchContent: null,
  setSearchContent: () => {},
  clearSearchContent: () => {},
});

export function HeaderSearchProvider({ children }: { children: ReactNode }) {
  const [searchContent, setSearchContentState] = useState<ReactNode>(null);

  const setSearchContent = useCallback((content: ReactNode) => {
    setSearchContentState(content);
  }, []);

  const clearSearchContent = useCallback(() => {
    setSearchContentState(null);
  }, []);

  return (
    <HeaderSearchContext.Provider
      value={{ searchContent, setSearchContent, clearSearchContent }}
    >
      {children}
    </HeaderSearchContext.Provider>
  );
}

export function useHeaderSearch() {
  return useContext(HeaderSearchContext);
}
