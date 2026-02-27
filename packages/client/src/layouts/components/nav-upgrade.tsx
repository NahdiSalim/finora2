import type { StackProps } from "@mui/material/Stack";

import Box from "@mui/material/Box";
import CustomButton from "src/components/common/CustomButton";

// ----------------------------------------------------------------------

export function NavUpgrade({ sx, ...other }: StackProps) {
  return (
    <Box
      sx={[
        {
          mb: 2,
          display: "flex",
          textAlign: "center",
          alignItems: "center",
          flexDirection: "column",
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...other}
    >
      <CustomButton variant="outlined" size="large" color="error" fullWidth>
        Se deconnecter
      </CustomButton>
    </Box>
  );
}
