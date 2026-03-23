import { Box, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

interface ColorOption {
  id: string;
  label: string;
  color: string;
}

interface ColorPickerProps {
  options: ColorOption[];
  value: string;
  onChange: (color: string) => void;
}

export default function ColorPicker({
  options,
  value,
  onChange,
}: ColorPickerProps) {
  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        overflowX: "auto",
        pb: 0.5,
        "&::-webkit-scrollbar": { height: 4 },
        "&::-webkit-scrollbar-track": { bgcolor: "transparent" },
        "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 99 },
      }}
    >
      {options.map((option) => {
        const selected = option.id === value;

        return (
          <Box
            key={option.id}
            onClick={() => onChange(option.id)}
            sx={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              p: 1.5,
              border: "1px solid",
              borderColor: selected ? alpha(option.color, 0.6) : "divider",
              borderRadius: 2,
              cursor: "pointer",
              transition: "all .15s",
              backgroundColor: selected
                ? alpha(option.color, 0.08)
                : "transparent",
              "&:hover": {
                borderColor: alpha(option.color, 0.4),
                backgroundColor: alpha(option.color, 0.05),
              },
            }}
          >
            <Box
              sx={{
                width: 18,
                height: 18,
                borderRadius: "4px",
                backgroundColor: option.color,
                border: "1px solid rgba(0,0,0,0.1)",
                flexShrink: 0,
              }}
            />
            <Typography
              variant="body2"
              sx={{
                fontWeight: selected ? 500 : 400,
                color: selected ? option.color : "text.primary",
                transition: "all .15s",
                whiteSpace: "nowrap",
              }}
            >
              {option.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
