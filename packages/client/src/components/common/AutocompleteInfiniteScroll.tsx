import { useState, useRef, useEffect, useMemo, forwardRef } from 'react';
import { Box, Autocomplete, TextField, Chip } from '@mui/material';
import DotSpinner from './DotSpinner';
type AutocompleteInfiniteScrollProps = {
  label: string;
  value: string | string[];
  onChange: (value: string | string[], selectedItem?: Record<string, unknown>) => void;
  useInfiniteQuery: unknown;
  queryArg?: Record<string, unknown>;
  disabled?: boolean;
  multiple?: boolean;
  itemLabelKey?: string;
  itemValueKey?: string;
  emptyMessage?: string;
  error?: boolean;
  helperText?: string;
  initialSelectedItems?: Record<string, unknown>[];
  excludeIds?: string[];
};
const AutocompleteInfiniteScroll = forwardRef<HTMLDivElement, AutocompleteInfiniteScrollProps>(
  ({
    label,
    value,
    onChange,
    useInfiniteQuery,
    queryArg,
    disabled,
    multiple = false,
    itemLabelKey = 'code',
    itemValueKey = 'id',
    emptyMessage = 'Aucun élément trouvé',
    error = false,
    helperText,
    initialSelectedItems = [],
    excludeIds = [],
  }) => {
    const [open, setOpen] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const selectedItemsCache = useRef<Map<string, Record<string, unknown>>>(new Map());
    const observer = useRef<IntersectionObserver | null>(null);
    const sentinelRef = useRef<HTMLLIElement>(null);
    useEffect(() => {
      if (initialSelectedItems && initialSelectedItems.length > 0) {
        initialSelectedItems.forEach((item) => {
          const itemId = String(item[itemValueKey as keyof typeof item]);
          if (itemId && !selectedItemsCache.current.has(itemId)) {
            selectedItemsCache.current.set(itemId, item);
          }
        });
      }
    }, [initialSelectedItems, itemValueKey]);
    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedSearch(searchText);
      }, 500);
      return () => clearTimeout(timer);
    }, [searchText]);

    const shouldFetch = useMemo(() => {
      if (!open) return false;
      return true;
    }, [open]);

    const queryWithSearch = useMemo(() => {
      return {
        ...queryArg,
        search: debouncedSearch || undefined,
      };
    }, [queryArg, debouncedSearch]);

    const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = (
      useInfiniteQuery as (
        arg: Record<string, unknown>,
        options: { skip?: boolean }
      ) => {
        data?: {
          pages?: { results?: Record<string, unknown>[]; data?: Record<string, unknown>[] }[];
        };
        fetchNextPage: () => void;
        hasNextPage?: boolean;
        isFetchingNextPage: boolean;
        isLoading: boolean;
      }
    )(queryWithSearch, {
      skip: !shouldFetch,
    });
    const options: Record<string, unknown>[] = useMemo(() => {
      const allOptions = data?.pages?.flatMap((page) => page.results || page.data || []) || [];
      if (excludeIds.length > 0) {
        return allOptions.filter((option) => {
          const optionId = String(option[itemValueKey as keyof typeof option]);
          return !excludeIds.includes(optionId);
        });
      }
      return allOptions;
    }, [data?.pages, excludeIds, itemValueKey]);
    useEffect(() => {
      if (!open || !hasNextPage) {
        observer.current?.disconnect();
        return undefined;
      }
      const timer = setTimeout(() => {
        if (!sentinelRef.current) return;
        if (observer.current) {
          observer.current.disconnect();
        }
        observer.current = new IntersectionObserver(
          (entries) => {
            if (entries[0].isIntersecting && !isFetchingNextPage) {
              fetchNextPage();
            }
          },
          { threshold: 0.1 }
        );
        observer.current.observe(sentinelRef.current);
      }, 50);
      return () => {
        clearTimeout(timer);
        observer.current?.disconnect();
      };
    }, [open, hasNextPage, isFetchingNextPage, fetchNextPage]);
    const getOptionLabel = (option: unknown) => {
      if (!option || typeof option !== 'object') return '';
      const item = option as Record<string, unknown>;
      return (
        (itemLabelKey in item ? String(item[itemLabelKey]) : undefined) ||
        ('name' in item ? String(item.name) : undefined) ||
        ('code' in item ? String(item.code) : '') ||
        String(item[itemValueKey] || '')
      );
    };
    const getSelectedValue = () => {
      if (!value) return multiple ? [] : null;
      if (multiple && Array.isArray(value)) {
        return value
          .map((id) => {
            const foundInOptions = options.find(
              (opt) => String(opt[itemValueKey as keyof typeof opt]) === id
            );
            if (foundInOptions) return foundInOptions;
            return selectedItemsCache.current.get(id);
          })
          .filter(Boolean) as Record<string, unknown>[];
      }
      const foundItem = options.find(
        (opt) => String(opt[itemValueKey as keyof typeof opt]) === value
      );
      if (foundItem) return foundItem;
      return selectedItemsCache.current.get(value as string) || null;
    };
    const handleChange = (_event: unknown, newValue: unknown) => {
      if (!multiple && newValue && typeof newValue === 'object') {
        const item = newValue as Record<string, unknown>;
        const itemValue = String(item[itemValueKey as keyof typeof item]);
        const selectedItem = options.find(
          (opt) => opt && itemValueKey in opt && opt[itemValueKey as keyof typeof opt] === itemValue
        );
        if (selectedItem) {
          selectedItemsCache.current.set(itemValue, selectedItem);
        }
        onChange(itemValue, selectedItem);
      } else if (multiple && Array.isArray(newValue)) {
        newValue.forEach((item) => {
          const itemId = String(item[itemValueKey as keyof typeof item]);
          selectedItemsCache.current.set(itemId, item);
        });
        const selectedIds = newValue.map((item) => String(item[itemValueKey as keyof typeof item]));
        onChange(selectedIds);
        setSearchText('');
      } else {
        onChange(multiple ? [] : '');
        if (!multiple) {
          setSearchText('');
        }
      }
    };
    return (
      <Autocomplete
        multiple={multiple}
        fullWidth
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => {
          setOpen(false);
          setSearchText('');
        }}
        value={getSelectedValue()}
        onChange={handleChange}
        inputValue={searchText}
        clearOnBlur={false}
        onInputChange={(_event, newValue, reason) => {
          if (multiple) {
            if (reason === 'input' || reason === 'clear') {
              setSearchText(newValue);
            }
          } else {
            if (reason === 'input' && newValue !== getOptionLabel(getSelectedValue())) {
              onChange('');
            }
            setSearchText(newValue);
          }
        }}
        options={options}
        loading={isLoading}
        disabled={disabled || isLoading}
        getOptionLabel={getOptionLabel}
        isOptionEqualToValue={(option, val) => {
          const optionValue = String((option as Record<string, unknown>)[itemValueKey]);
          const valValue = String((val as Record<string, unknown>)[itemValueKey]);
          return optionValue === valValue;
        }}
        filterOptions={(x) => x}
        noOptionsText={emptyMessage}
        slotProps={{
          listbox: {
            style: { maxHeight: 250 },
          },
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            error={error}
            helperText={helperText}
            slotProps={{
              input: {
                ...params.InputProps,
                endAdornment: (
                  <>
                    {isLoading ? <DotSpinner size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
        renderOption={(props, option) => {
          const { key, ...otherProps } = props;
          const item = option as Record<string, unknown>;
          const isLast = options.indexOf(item) === options.length - 1;
          const itemLabel = getOptionLabel(option);
          return (
            <Box component="li" key={key} {...otherProps}>
              <Box sx={{ width: '100%' }}>
                {itemLabel}
                {isLast && hasNextPage && (
                  <Box
                    ref={sentinelRef}
                    sx={{
                      height: 1,
                      width: '100%',
                      visibility: 'hidden',
                    }}
                  />
                )}
              </Box>
              {isLast && hasNextPage && isFetchingNextPage && (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 1 }}>
                  <DotSpinner size={16} />
                </Box>
              )}
            </Box>
          );
        }}
        renderTags={
          multiple
            ? (tagValue, getTagProps) =>
                tagValue.map((option, index) => {
                  const { key, ...chipProps } = getTagProps({ index });
                  return <Chip key={key} label={getOptionLabel(option)} {...chipProps} />;
                })
            : undefined
        }
      />
    );
  }
);
AutocompleteInfiniteScroll.displayName = 'AutocompleteInfiniteScroll';
export default AutocompleteInfiniteScroll;
