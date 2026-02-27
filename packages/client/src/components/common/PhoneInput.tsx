import { useState, useMemo, useRef, forwardRef } from "react";
import type { ReactNode } from "react";

import {
  Box,
  Typography,
  InputAdornment,
  Popover,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  useTheme,
} from "@mui/material";

import CustomInput from "./CustomInput";
import type { CustomInputProps } from "./CustomInput";
import { customCountries, formatNationalNumber } from "./phone-input.data"; // ← added formatNationalNumber
import type { Country } from "./phone-input.data";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PhoneInputProps extends Omit<
  CustomInputProps,
  "value" | "onChange" | "type" | "isPassword" | "showPasswordToggle"
> {
  defaultCountry?: string;
  value?: string;
  onChange?: (fullNumber: string) => void;
}

// ─── CountryDropdown ─────────────────────────────────────────────────────────

function CountryDropdown({
  anchorEl,
  open,
  onClose,
  countries,
  selectedCode,
  onSelect,
  inputWidth,
}: {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  countries: Country[];
  selectedCode: string;
  onSelect: (country: Country) => void;
  inputWidth: number;
}) {
  const theme = useTheme();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return countries;
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.countryCode.toLowerCase().includes(q),
    );
  }, [countries, search]);

  const handleClose = () => {
    onClose();
    setSearch("");
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      slotProps={{
        paper: {
          sx: {
            mt: "6px",
            width: inputWidth || 320,
            minWidth: 280,
            maxHeight: 340,
            borderRadius: "10px",
            border: `1.5px solid ${theme.palette.grey[300]}`,
            boxShadow: "0px 8px 24px rgba(0,0,0,0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          },
        },
      }}
    >
      {/* Search */}
      <Box
        sx={{ p: "10px", borderBottom: `1px solid ${theme.palette.grey[200]}` }}
      >
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder="rechercher votre pays"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "8px",
              "& fieldset": { borderColor: theme.palette.grey[300] },
              "&:hover fieldset": { borderColor: theme.palette.grey[600] },
              "&.Mui-focused fieldset": {
                borderColor: theme.palette.primary.main,
                borderWidth: "1.5px",
              },
            },
            "& .MuiOutlinedInput-input": {
              fontFamily: theme.typography.caption.fontFamily,
              fontSize: theme.typography.caption.fontSize,
              padding: "8px 12px",
              "&::placeholder": { color: theme.palette.grey[500], opacity: 1 },
            },
          }}
        />
      </Box>

      {/* List */}
      <List disablePadding sx={{ overflowY: "auto", flex: 1 }}>
        {filtered.length === 0 ? (
          <Box sx={{ py: 3, textAlign: "center" }}>
            <Typography
              sx={{
                fontFamily: theme.typography.caption.fontFamily,
                fontSize: theme.typography.caption.fontSize,
                color: theme.palette.grey[500],
              }}
            >
              No results
            </Typography>
          </Box>
        ) : (
          filtered.map((country, idx) => {
            const isSelected = country.countryCode === selectedCode;
            return (
              <Box key={country.countryCode}>
                <ListItemButton
                  onClick={() => {
                    onSelect(country);
                    handleClose();
                  }}
                  selected={isSelected}
                  sx={{
                    py: "8px",
                    px: "12px",
                    gap: "10px",
                    "&.Mui-selected": {
                      backgroundColor: theme.palette.primary.lighter,
                      "&:hover": {
                        backgroundColor: theme.palette.primary.lighter,
                      },
                    },
                    "&:hover": { backgroundColor: theme.palette.grey[200] },
                  }}
                >
                  <Box
                    component="span"
                    className={`fi fi-${country.countryCode.toLowerCase()}`}
                    sx={{
                      fontSize: "1.125rem",
                      lineHeight: 1,
                      flexShrink: 0,
                      borderRadius: "2px",
                    }}
                  />

                  <ListItemText
                    primary={country.name}
                    slotProps={{
                      primary: {
                        sx: {
                          fontFamily: theme.typography.caption.fontFamily,
                          fontSize: theme.typography.caption.fontSize,
                          fontWeight: isSelected
                            ? theme.typography.fontWeightSemiBold
                            : theme.typography.fontWeightRegular,
                          color: theme.palette.grey[900],
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        },
                      },
                    }}
                  />

                  <Typography
                    sx={{
                      fontFamily: theme.typography.caption.fontFamily,
                      fontSize: theme.typography.caption.fontSize,
                      fontWeight: theme.typography.fontWeightMedium,
                      color: theme.palette.grey[600],
                      flexShrink: 0,
                    }}
                  >
                    {country.dialCode}
                  </Typography>
                </ListItemButton>

                {idx < filtered.length - 1 && (
                  <Divider sx={{ borderColor: theme.palette.grey[200] }} />
                )}
              </Box>
            );
          })
        )}
      </List>
    </Popover>
  );
}

// ─── CountryTrigger ───────────────────────────────────────────────────────────

function CountryTrigger({
  country,
  onClick,
  disabled,
}: {
  country: Country;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
}) {
  const theme = useTheme();

  return (
    <Box
      component="button"
      type="button"
      onClick={onClick}
      disabled={disabled}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "5px",
        alignSelf: "stretch",
        px: "10px",
        ml: "-14px",
        mr: "8px",
        border: "none",
        borderRight: `1.5px solid ${theme.palette.grey[300]}`,
        borderRadius: "8px 0 0 8px",
        backgroundColor: "transparent",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background-color 0.15s ease",
        flexShrink: 0,
        outline: "none",
        "&:hover:not(:disabled)": { backgroundColor: theme.palette.grey[200] },
        "&:focus-visible": { backgroundColor: theme.palette.grey[200] },
      }}
    >
      <Box
        component="span"
        className={`fi fi-${country.countryCode.toLowerCase()}`}
        sx={{
          fontSize: "1.125rem",
          lineHeight: 1,
          flexShrink: 0,
          borderRadius: "2px",
        }}
      />

      <Typography
        component="span"
        sx={{
          fontFamily: theme.typography.caption.fontFamily,
          fontSize: theme.typography.caption.fontSize,
          fontWeight: theme.typography.fontWeightMedium,
          color: disabled ? theme.palette.grey[400] : theme.palette.grey[900],
          whiteSpace: "nowrap",
        }}
      >
        {country.dialCode}
      </Typography>

      <Box
        component="span"
        sx={{
          display: "flex",
          alignItems: "center",
          color: disabled ? theme.palette.grey[400] : theme.palette.grey[600],
        }}
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 4.5L6 8L9.5 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Box>
    </Box>
  );
}

// ─── PhoneInput ───────────────────────────────────────────────────────────────

const PhoneInput = forwardRef<HTMLDivElement, PhoneInputProps>(
  (
    {
      defaultCountry = "TN",
      value,
      onChange,
      disabled,
      placeholder,
      slotProps,
      sx,
      ...rest
    },
    ref,
  ) => {
    const defaultCountryObj =
      customCountries.find((c) => c.countryCode === defaultCountry) ??
      customCountries[0];

    const [selectedCountry, setSelectedCountry] =
      useState<Country>(defaultCountryObj);

    // ── Raw digits only — no spaces or separators ─────────────────────────────
    const [rawDigits, setRawDigits] = useState<string>(value ?? "");

    const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // ── Formatted display value (e.g. "12 123 123" for TN) ───────────────────
    const formattedValue = formatNationalNumber(
      rawDigits,
      selectedCountry.countryCode,
    );

    const handleCountrySelect = (country: Country) => {
      setSelectedCountry(country);
      setRawDigits(""); // reset digits on country change
      onChange?.(`${country.dialCode}`);
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Strip separators/spaces the formatter added — keep digits only
      const raw = e.target.value.replace(/\D/g, "");
      // Clamp to this country's max digit length
      const clamped = raw.slice(0, selectedCountry.maxLength);
      setRawDigits(clamped);
      onChange?.(`${selectedCountry.dialCode}${clamped}`);
    };

    const startAdornment: ReactNode = (
      <InputAdornment
        position="start"
        sx={{ height: "100%", maxHeight: "none", mr: 0 }}
      >
        <CountryTrigger
          country={selectedCountry}
          disabled={disabled}
          onClick={(e) => setAnchorEl(e.currentTarget)}
        />
      </InputAdornment>
    );

    return (
      <Box ref={wrapperRef} sx={{ width: "100%", ...sx }}>
        <CustomInput
          ref={ref}
          inputMode="numeric"
          // Show formatted value (spaces included) but parse raw digits on change
          value={formattedValue}
          onChange={handlePhoneChange}
          // Use country-specific placeholder unless caller overrides
          placeholder={placeholder ?? selectedCountry.placeholder}
          disabled={disabled}
          slotProps={{
            ...slotProps,
            input: {
              ...slotProps?.input,
              startAdornment,
            },
          }}
          sx={{ "& .MuiOutlinedInput-input": { pl: "8px" } }}
          {...rest}
        />

        <CountryDropdown
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          countries={customCountries}
          selectedCode={selectedCountry.countryCode}
          onSelect={handleCountrySelect}
          inputWidth={wrapperRef.current?.offsetWidth ?? 320}
        />
      </Box>
    );
  },
);

PhoneInput.displayName = "PhoneInput";

export default PhoneInput;
