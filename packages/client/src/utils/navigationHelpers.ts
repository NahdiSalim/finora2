/**
 * Navigation helpers for managing returnPage functionality
 * These utilities help maintain pagination context when navigating between views
 */

/**
 * Builds a URL with returnPage query parameter for edit operations
 *
 * @param basePath - The base path (e.g., '/promotion/edit')
 * @param id - The resource ID
 * @param currentPage - The current page number (1-indexed)
 * @returns URL string with returnPage parameter
 *
 * @example
 * buildEditUrl('/promotion/edit', '123', 3)
 * // Returns: '/promotion/edit/123?returnPage=3'
 */
export function buildEditUrl(basePath: string, id: string, currentPage: number): string {
  return `${basePath}/${id}?returnPage=${currentPage}`;
}

/**
 * Builds a return URL based on whether we're in edit mode
 * - Edit mode: Returns to the page specified in returnPage param
 * - Create mode: Returns to page 1 (default list view)
 *
 * @param listPath - The list view path (e.g., '/promotions')
 * @param isEdit - Whether this is an edit operation
 * @param returnPage - The page to return to (from searchParams)
 * @returns URL string with or without page parameter
 *
 * @example
 * // Edit mode: return to original page
 * buildReturnUrl('/promotions', true, '3')
 * // Returns: '/promotions?page=3'
 *
 * // Create mode: return to page 1
 * buildReturnUrl('/promotions', false, null)
 * // Returns: '/promotions'
 */
export function buildReturnUrl(
  listPath: string,
  isEdit: boolean,
  returnPage: string | null
): string {
  if (isEdit && returnPage) {
    return `${listPath}?page=${returnPage}`;
  }
  return listPath;
}

/**
 * Gets the returnPage parameter from URL search params
 *
 * @param searchParams - URLSearchParams instance
 * @param isEdit - Whether this is an edit operation
 * @returns The page number as string or null
 *
 * @example
 * const returnPage = getReturnPage(searchParams, true);
 * // Returns: '3' or null
 */
export function getReturnPage(searchParams: URLSearchParams, isEdit: boolean): string | null {
  return isEdit ? searchParams.get('returnPage') : null;
}
