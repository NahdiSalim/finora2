import type { ReactNode } from "react";

import {
  Box,
  Typography,
  useTheme,
  Breadcrumbs,
  Link,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";

import { Link as RouterLink, useNavigate } from "react-router-dom";

import { NavigateNext as NavigateNextIcon } from "@mui/icons-material";

import { MoveLeft, Search } from "lucide-react";

import { DashboardContent } from "src/layouts/dashboard";
import CustomButton from "src/components/common/CustomButton";

// ----------------------------------------------------------------------

type BreadcrumbItem = {
  label: string;
  path?: string;
  /** In-page navigation (e.g. folder level); used when path is not set */
  onClick?: () => void;
};

type ActionButton = {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: "contained" | "outlined" | "text";
  color?: "primary" | "secondary" | "error" | "warning" | "info" | "success";
};

type BackButton = {
  onClick?: () => void;
  path?: string;
};

export type PageHeaderProps = {
  title: string;
  caption?: string;
  subheader?: ReactNode;
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
  backButton?: BackButton;
  sx?: any;
  children?: ReactNode;
};

export function PageHeader({
  title,
  caption,
  subheader,
  breadcrumbs,
  documentsProcessed,
  searchbar,
  actions = [],
  backButton,
  children,
  sx,
}: PageHeaderProps) {
  const theme = useTheme();
  const navigate = useNavigate();

  const handleBack = () => {
    if (backButton?.onClick) backButton.onClick();
    else if (backButton?.path) navigate(backButton.path);
    else navigate(-1);
  };

  return (
    <DashboardContent
      maxWidth={false}
      sx={{
        pt: 0,
        pl: { lg: 0 },
        pr: { lg: 1.5 },
      }}
    >
      <Box
        sx={{
          bgcolor: "white",
          borderRadius: 3,
          overflow: "hidden",
          p: 2,
          mb: 1.5,
          ...sx,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Main Header Row */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            alignItems: { xs: "flex-start", md: "center" },
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          {/* LEFT SIDE */}
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              gap: 1.5,
              flex: 1,
              minWidth: 0,
              width: { xs: "100%", md: "auto" },
            }}
          >
            {/* Back Button */}
            {backButton && (
              <IconButton
                size="small"
                onClick={handleBack}
                sx={{
                  mt: 0.5,
                }}
              >
                <MoveLeft fontSize="small" />
              </IconButton>
            )}

            {/* Title + Caption Column */}
            <Box sx={{ minWidth: 0, width: "100%" }}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  flexWrap: "wrap",
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
                      borderRadius: 1,
                      border: `1px solid ${theme.palette.divider}`,
                      backgroundColor: theme.palette.grey[200],
                      color: theme.palette.grey[800],
                    }}
                  >
                    {`docs traités: ${documentsProcessed.processed}/${documentsProcessed.total}`}
                  </Box>
                )}
              </Box>

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

              {subheader && <Box sx={{ mt: 1 }}>{subheader}</Box>}
              {/* Breadcrumbs */}
              {breadcrumbs && breadcrumbs.length > 0 && (
                <Breadcrumbs
                  separator={<NavigateNextIcon fontSize="small" />}
                  sx={{
                    "& .MuiBreadcrumbs-separator": {
                      mx: 0.5,
                    },
                  }}
                >
                  {breadcrumbs.map((crumb, index) => {
                    const isLast = index === breadcrumbs.length - 1;

                    return isLast ? (
                      <Typography
                        key={`${crumb.label}-${index}`}
                        variant="body2"
                        sx={{
                          color: theme.palette.text.primary,
                          fontWeight: 500,
                        }}
                      >
                        {crumb.label}
                      </Typography>
                    ) : crumb.onClick ? (
                      <Link
                        key={`${crumb.label}-${index}`}
                        component="button"
                        variant="body2"
                        underline="hover"
                        onClick={(e: React.MouseEvent) => {
                          e.preventDefault();
                          crumb.onClick?.();
                        }}
                        sx={{
                          color: theme.palette.text.secondary,
                          fontSize: 14,
                          cursor: "pointer",
                          border: "none",
                          background: "none",
                          p: 0,
                          fontFamily: "inherit",
                          "&:hover": { color: theme.palette.primary.main },
                        }}
                      >
                        {crumb.label}
                      </Link>
                    ) : (
                      <Link
                        key={`${crumb.label}-${index}`}
                        component={crumb.path ? RouterLink : "span"}
                        to={crumb.path || ""}
                        underline="hover"
                        sx={{
                          color: theme.palette.text.secondary,
                          fontSize: 14,
                          cursor: crumb.path ? "pointer" : "default",
                          "&:hover": crumb.path
                            ? { color: theme.palette.primary.main }
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

          {/* RIGHT SIDE */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
              width: { xs: "100%", md: "auto" },
              justifyContent: { xs: "flex-start", md: "flex-end" },
            }}
          >
            {/* Search */}
            {searchbar && (
              <TextField
                size="small"
                placeholder={searchbar.placeholder || "Search..."}
                value={searchbar.value}
                onChange={(e) => searchbar.onChange(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={20} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  minWidth: { xs: "100%", md: 280 },
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 2,
                  },
                }}
              />
            )}

            {/* Actions */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 2,
                flexWrap: "wrap",
                width: { xs: "100%", md: "auto" },
              }}
            >
              {actions.map((action, index) => (
                <CustomButton
                  key={index}
                  variant={action.variant || "contained"}
                  color={action.color || "primary"}
                  startIcon={action.icon}
                  onClick={action.onClick}
                  size="medium"
                  sx={{
                    flex: { xs: 1, md: "none" },
                  }}
                >
                  {action.label}
                </CustomButton>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>

      {children}
    </DashboardContent>
  );
}
