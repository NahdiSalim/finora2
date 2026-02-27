import { Box, IconButton, Typography, useTheme } from "@mui/material";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CustomPaginationProps {
  page: number;
  count: number;
  rowsPerPage: number;
  onPageChange: (event: unknown, newPage: number) => void;
}

export function CustomPagination({
  page,
  count,
  rowsPerPage,
  onPageChange,
}: CustomPaginationProps) {
  const theme = useTheme();

  const totalPages = Math.ceil(count / rowsPerPage);
  const currentPage = page + 1; // Convert 0-based to 1-based

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 7; // Maximum number of page buttons to show

    if (totalPages <= maxVisible) {
      // Show all pages if total is less than max
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      if (currentPage > 3) {
        pages.push("...");
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push("...");
      }

      // Always show last page
      pages.push(totalPages);
    }

    return pages;
  };

  const handlePageClick = (pageNumber: number) => {
    onPageChange(null, pageNumber - 1); // Convert back to 0-based
  };

  const handlePrevious = () => {
    if (page > 0) {
      onPageChange(null, page - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages - 1) {
      onPageChange(null, page + 1);
    }
  };

  //   if (totalPages <= 1) return null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 1,
        py: 2,
      }}
    >
      {/* Previous Button */}
      <IconButton
        onClick={handlePrevious}
        disabled={page === 0}
        size="small"
        sx={{
          width: 32,
          height: 32,
          borderRadius: 2,
          border: 1,
          borderColor: theme.palette.divider,
          backgroundColor: "transparent",
          color: theme.palette.text.secondary,
          "&:hover": {
            backgroundColor: theme.palette.action.hover,
          },
          "&.Mui-disabled": {
            borderColor: theme.palette.divider,
            color: theme.palette.action.disabled,
          },
        }}
      >
        <ChevronLeft size={18} />
      </IconButton>

      {/* Page Numbers */}
      {getPageNumbers().map((pageNum, index) => {
        if (pageNum === "...") {
          return (
            <Box
              key={`ellipsis-${index}`}
              sx={{
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: theme.palette.text.secondary,
              }}
            >
              <Typography variant="body2">...</Typography>
            </Box>
          );
        }

        const isActive = pageNum === currentPage;

        return (
          <Box
            key={pageNum}
            onClick={() => handlePageClick(pageNum as number)}
            sx={{
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 2,
              cursor: "pointer",
              transition: theme.transitions.create([
                "background-color",
                "border-color",
                "color",
              ]),
              // Active page style
              ...(isActive && {
                backgroundColor: theme.palette.secondary.main,
                color: theme.palette.common.white,
                fontWeight: 600,
              }),
              // Inactive page style
              ...(!isActive && {
                backgroundColor: "transparent",
                border: 1,
                borderColor: theme.palette.divider,
                color: theme.palette.text.primary,
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                  borderColor: theme.palette.secondary.main,
                },
              }),
            }}
          >
            <Typography
              variant="body2"
              sx={{
                fontWeight: isActive ? 600 : 500,
                fontSize: 14,
              }}
            >
              {pageNum}
            </Typography>
          </Box>
        );
      })}

      {/* Next Button */}
      <IconButton
        onClick={handleNext}
        disabled={page >= totalPages - 1}
        size="small"
        sx={{
          width: 32,
          height: 32,
          borderRadius: 2,
          border: 1,
          borderColor: theme.palette.divider,
          backgroundColor: "transparent",
          color: theme.palette.text.secondary,
          "&:hover": {
            backgroundColor: theme.palette.action.hover,
          },
          "&.Mui-disabled": {
            borderColor: theme.palette.divider,
            color: theme.palette.action.disabled,
          },
        }}
      >
        <ChevronRight size={18} />
      </IconButton>

      {/* Page Info */}
      <Typography
        variant="caption"
        sx={{
          ml: 2,
          color: theme.palette.text.secondary,
        }}
      >
        Page {currentPage} sur {totalPages}
      </Typography>
    </Box>
  );
}
