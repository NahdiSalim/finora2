import { Box, LinearProgress, Typography, useTheme } from "@mui/material";
import { forwardRef, useMemo, useState, useEffect } from "react";
import type { ChangeEvent } from "react";
import CheckCircle from "@mui/icons-material/CheckCircle";
import RadioButtonUnchecked from "@mui/icons-material/RadioButtonUnchecked";
import CustomInput from "./CustomInput";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PasswordFieldProps {
  label?: string;
  mode?: "create" | "login";
  value?: string;
  onChange?: (value: string) => void;
  error?: boolean;
  helperText?: string;
  required?: boolean;
  disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────
const PasswordField = forwardRef<HTMLDivElement, PasswordFieldProps>(
  (
    {
      label = "Mot de passe",
      mode = "login",
      value = "",
      onChange,
      error,
      helperText,
      required,
      disabled,
    },
    ref,
  ) => {
    const theme = useTheme();
    const [password, setPassword] = useState(value);

    // Sync external value (controlled support)
    useEffect(() => {
      setPassword(value);
    }, [value]);

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setPassword(newValue);
      onChange?.(newValue);
    };

    // ─── Password Rules ─────────────────────────────────────────────────────
    const rules = useMemo(
      () => ({
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        number: /\d/.test(password),
        special: /[^A-Za-z0-9]/.test(password),
      }),
      [password],
    );

    const score = Object.values(rules).filter(Boolean).length;
    const progress = (score / 4) * 100;

    const progressColor =
      score <= 1
        ? theme.palette.error.main
        : score === 2
          ? theme.palette.warning.main
          : score === 3
            ? theme.palette.primary.main
            : theme.palette.success.dark;

    return (
      <Box sx={{ width: "100%" }}>
        <CustomInput
          ref={ref}
          label={label}
          isPassword
          value={password}
          onChange={handleChange}
          error={error}
          helperText={helperText}
          required={required}
          disabled={disabled}
          placeholder="Entrer votre mot de passe"
          fullWidth
        />

        {mode === "create" && (
          <Box mt={1}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                mb: 2.5,
                backgroundColor: theme.palette.grey[200],
                "& .MuiLinearProgress-bar": {
                  borderRadius: 3,
                  backgroundColor: progressColor,
                },
              }}
            />

            <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1.5}>
              <CriteriaItem
                label="One lowercase character"
                valid={rules.lowercase}
              />
              <CriteriaItem label="One number" valid={rules.number} />
              <CriteriaItem
                label="One uppercase character"
                valid={rules.uppercase}
              />
              <CriteriaItem
                label="One special character"
                valid={rules.special}
              />
            </Box>
          </Box>
        )}
      </Box>
    );
  },
);

// ─── Sub Component ───────────────────────────────────────────────────────────
interface CriteriaItemProps {
  label: string;
  valid: boolean;
}

const CriteriaItem = ({ label, valid }: CriteriaItemProps) => {
  const theme = useTheme();

  return (
    <Box display="flex" alignItems="center" gap={1}>
      {valid ? (
        <CheckCircle
          sx={{
            fontSize: 18,
            color: theme.palette.success.dark,
          }}
        />
      ) : (
        <RadioButtonUnchecked
          sx={{
            fontSize: 18,
            color: theme.palette.grey[400],
          }}
        />
      )}

      <Typography
        variant="caption"
        sx={{
          color: valid ? theme.palette.text.primary : theme.palette.grey[800],
          fontSize: theme.typography.caption.fontSize,
          fontWeight: valid
            ? theme.typography.fontWeightMedium
            : theme.typography.fontWeightRegular,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
};

PasswordField.displayName = "PasswordField";

export default PasswordField;
