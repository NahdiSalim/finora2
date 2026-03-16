import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

type MessagesDateDividerProps = {
  label: string;
};

export default function MessagesDateDivider({
  label,
}: MessagesDateDividerProps) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.75,
        my: 2.5,
        px: 0.5,
      }}
    >
      <Box
        sx={{
          flex: 1,
          height: "1px",
          backgroundColor: "#EAECF0",
        }}
      />

      <Typography
        sx={{
          color: "#98A2B3",
          fontSize: 11.5,
          fontWeight: 500,
          whiteSpace: "nowrap",
          px: 1,
          letterSpacing: "0.01em",
        }}
      >
        {label}
      </Typography>

      <Box
        sx={{
          flex: 1,
          height: "1px",
          backgroundColor: "#EAECF0",
        }}
      />
    </Box>
  );
}
