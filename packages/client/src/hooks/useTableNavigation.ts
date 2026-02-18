import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * Hook to manage table pagination with URL sync
 * Syncs table page state with URL query parameters
 *
 * @param table - The table instance from useTable hook
 * @param autoSync - Whether to automatically sync page changes to URL (default: true)
 *
 * @example
 * const table = useTable();
 * useTableNavigation(table);
 *
 * // Later when navigating to edit:
 * navigate(`/promotion/edit/${id}?returnPage=${table.page + 1}`);
 */
export function useTableNavigation(
  table: { page: number; onChangePage: (event: unknown, newPage: number) => void },
  autoSync = true
) {
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const pageFromUrl = searchParams.get('page');
    if (pageFromUrl) {
      const pageNumber = parseInt(pageFromUrl, 10) - 1;
      if (pageNumber >= 0 && pageNumber !== table.page) {
        table.onChangePage(null, pageNumber);
      }
    }
  }, []);

  useEffect(() => {
    if (autoSync) {
      setSearchParams({ page: String(table.page + 1) }, { replace: true });
    }
  }, [table.page, setSearchParams, autoSync]);

  return {
    currentPage: table.page + 1,
  };
}
