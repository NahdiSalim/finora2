import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  TextField,
  InputAdornment,
  useTheme,
} from "@mui/material";
import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";
import { Link as RouterLink } from "react-router-dom";
import CustomButton from "src/components/common/CustomButton";
import { Search } from "lucide-react";

// ----------------------------------------------------------------------

type BreadcrumbItem = {
  label: string;
  path?: string;
};

type ActionButton = {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "contained" | "outlined" | "text";
  color?: "primary" | "secondary" | "error" | "warning" | "info" | "success";
};

export type PageTitleHeaderProps = {
  title: string;
  caption?: string;
  breadcrumbs?: BreadcrumbItem[];
  documentsProcessed?: {
    processed: number;
    total: number;
  };
  searchbar?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  actions?: ActionButton[];
  sx?: any;
};

export function PageTitleHeader({
  title,
  caption,
  breadcrumbs,
  documentsProcessed,
  searchbar,
  actions = [],
  sx,
}: PageTitleHeaderProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        mb: 2,
        ...sx,
      }}
    >
      {/* Main Header Row */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        {/* Left Side - Title, Caption, Documents Chip */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flex: 1,
            minWidth: 0,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                mb: caption ? 0.5 : 0,
              }}
            >
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 500,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {title}
              </Typography>

              {/* Documents Processed Chip */}
              {documentsProcessed && (
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 24,
                    px: 1.5,
                    fontWeight: 600,
                    fontSize: 12,
                    borderRadius: 1, // Light border radius (8px)
                    border: `1px solid ${theme.palette.divider}`,
                    backgroundColor: theme.palette.grey[200],
                    color: theme.palette.grey[800],
                  }}
                >
                  <Typography variant="caption">
                    Docs Traités:{" "}
                    {`${documentsProcessed.processed}/${documentsProcessed.total}`}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Caption */}
            {caption && (
              <Typography
                variant="body2"
                sx={{
                  color: theme.palette.text.secondary,
                  mt: 0.5,
                }}
              >
                {caption}
              </Typography>
            )}
            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 && (
              <Breadcrumbs
                separator={<NavigateNextIcon fontSize="small" />}
                sx={{
                  mb: 2,
                  "& .MuiBreadcrumbs-separator": {
                    mx: 0.5,
                  },
                }}
              >
                {breadcrumbs.map((crumb, index) => {
                  const isLast = index === breadcrumbs.length - 1;

                  return isLast ? (
                    <Typography
                      key={crumb.label}
                      variant="body2"
                      sx={{
                        color: theme.palette.text.primary,
                        fontWeight: 500,
                      }}
                    >
                      {crumb.label}
                    </Typography>
                  ) : (
                    <Link
                      key={crumb.label}
                      component={crumb.path ? RouterLink : "span"}
                      to={crumb.path || ""}
                      underline="hover"
                      sx={{
                        color: theme.palette.text.secondary,
                        fontSize: 14,
                        cursor: crumb.path ? "pointer" : "default",
                        "&:hover": crumb.path
                          ? {
                              color: theme.palette.primary.main,
                            }
                          : {},
                      }}
                    >
                      {crumb.label}
                    </Link>
                  );
                })}
              </Breadcrumbs>
            )}
          </Box>
        </Box>

        {/* Right Side - Searchbar and Actions */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            flexWrap: "wrap",
          }}
        >
          {/* Searchbar */}
          {searchbar && (
            <TextField
              size="small"
              placeholder={searchbar.placeholder || "Search..."}
              value={searchbar.value}
              onChange={(e) => searchbar.onChange(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              sx={{
                minWidth: 280,
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                },
              }}
            />
          )}

          {/* Action Buttons */}
          {actions.map((action, index) => (
            <CustomButton
              key={index}
              variant={action.variant || "contained"}
              color={action.color || "primary"}
              startIcon={action.icon}
              onClick={action.onClick}
              size="large"
            >
              {action.label}
            </CustomButton>
          ))}
        </Box>
      </Box>
    </Box>
  );
}
