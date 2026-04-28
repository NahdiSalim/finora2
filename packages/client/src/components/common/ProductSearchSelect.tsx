import { useMemo, useState, useEffect } from "react";
import { Autocomplete, Box, TextField, Typography } from "@mui/material";
import {
  useGetProductsQuery,
  type Product,
} from "src/lib/services/productsApi";

interface Props {
  /** Called when a product is selected — passes name and unitPrice to fill the line */
  onSelect: (product: Product) => void;
  /** Whether the parent modal is open (used to skip the query when closed) */
  open?: boolean;
}

/**
 * A standalone autocomplete that searches the product catalogue.
 * When a product is selected it fires onSelect and immediately clears itself,
 * so it acts as a "quick-fill" helper rather than a persistent field.
 */
export default function ProductSearchSelect({ onSelect, open = true }: Props) {
  const [inputValue, setInputValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(inputValue), 400);
    return () => clearTimeout(t);
  }, [inputValue]);

  const { data, isLoading } = useGetProductsQuery(
    { page: 1, limit: 50, search: debouncedSearch || undefined },
    { skip: !open },
  );

  const options = useMemo(() => data?.data || [], [data]);

  return (
    <Autocomplete
      freeSolo={false}
      options={options}
      value={null}
      inputValue={inputValue}
      onInputChange={(_, val, reason) => {
        if (reason !== "reset") setInputValue(val);
      }}
      onChange={(_, product) => {
        if (product) {
          onSelect(product);
          setInputValue("");
        }
      }}
      getOptionLabel={(o) => o.name}
      isOptionEqualToValue={(o, v) => o.id === v.id}
      loading={isLoading}
      filterOptions={(x) => x}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Ajouter depuis le catalogue"
          placeholder="Rechercher un produit..."
          size="small"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {isLoading && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mr: 1 }}
                  >
                    Chargement...
                  </Typography>
                )}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderOption={(props, option) => {
        const { key, ...rest } = props;
        return (
          <Box component="li" key={key} {...rest}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
                gap: 2,
              }}
            >
              <Typography variant="body2" fontWeight={600}>
                {option.name}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ whiteSpace: "nowrap" }}
              >
                {new Intl.NumberFormat("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(option.unitPrice)}{" "}
                DT
              </Typography>
            </Box>
          </Box>
        );
      }}
    />
  );
}
