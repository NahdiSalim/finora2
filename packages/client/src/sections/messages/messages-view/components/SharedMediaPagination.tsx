import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import KeyboardArrowLeftRoundedIcon from "@mui/icons-material/KeyboardArrowLeftRounded";
import KeyboardArrowRightRoundedIcon from "@mui/icons-material/KeyboardArrowRightRounded";
import KeyboardDoubleArrowLeftRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowLeftRounded";
import KeyboardDoubleArrowRightRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowRightRounded";

type Props = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

export default function SharedMediaPagination({
  page,
  totalPages,
  onChange,
}: Props) {
  if (totalPages <= 1) {
    return null;
  }

  const goToFirst = () => onChange(1);
  const goToPrevious = () => onChange(Math.max(1, page - 1));
  const goToNext = () => onChange(Math.min(totalPages, page + 1));
  const goToLast = () => onChange(totalPages);

  const pagesToShow = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (page <= 3) {
      return [1, 2, 3];
    }

    if (page >= totalPages - 2) {
      return [totalPages - 2, totalPages - 1, totalPages];
    }

    return [page - 1, page, page + 1];
  };

  const pages = pagesToShow();

  const navButtonSx = {
    width: 28,
    height: 28,
    border: "1px solid #EAECF0",
    borderRadius: "8px",
    color: "#98A2B3",
    backgroundColor: "#FFFFFF",
    "&:hover": {
      backgroundColor: "#F9FAFB",
    },
    "&.Mui-disabled": {
      color: "#D0D5DD",
      borderColor: "#F2F4F7",
      backgroundColor: "#FFFFFF",
    },
  };

  const pageButtonSx = (active: boolean) => ({
    width: 28,
    height: 28,
    borderRadius: "8px",
    border: active ? "1px solid #F59E0B" : "1px solid #EAECF0",
    backgroundColor: active ? "#F59E0B" : "#FFFFFF",
    color: active ? "#FFFFFF" : "#667085",
    fontWeight: active ? 700 : 500,
    fontSize: 11,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      backgroundColor: active ? "#F59E0B" : "#F9FAFB",
    },
  });

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: 0.55,
      }}
    >
      <IconButton onClick={goToFirst} disabled={page === 1} sx={navButtonSx}>
        <KeyboardDoubleArrowLeftRoundedIcon sx={{ fontSize: 14 }} />
      </IconButton>

      <IconButton onClick={goToPrevious} disabled={page === 1} sx={navButtonSx}>
        <KeyboardArrowLeftRoundedIcon sx={{ fontSize: 14 }} />
      </IconButton>

      {pages[0] > 1 && (
        <>
          <Box sx={pageButtonSx(page === 1)} onClick={() => onChange(1)}>
            1
          </Box>

          {pages[0] > 2 && (
            <Typography sx={{ fontSize: 11, color: "#98A2B3", px: 0.15 }}>
              ...
            </Typography>
          )}
        </>
      )}

      {pages.map((pageNumber) => (
        <Box
          key={pageNumber}
          sx={pageButtonSx(pageNumber === page)}
          onClick={() => onChange(pageNumber)}
        >
          {pageNumber}
        </Box>
      ))}

      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && (
            <Typography sx={{ fontSize: 11, color: "#98A2B3", px: 0.15 }}>
              ...
            </Typography>
          )}

          <Box
            sx={pageButtonSx(page === totalPages)}
            onClick={() => onChange(totalPages)}
          >
            {totalPages}
          </Box>
        </>
      )}

      <IconButton
        onClick={goToNext}
        disabled={page === totalPages}
        sx={navButtonSx}
      >
        <KeyboardArrowRightRoundedIcon sx={{ fontSize: 14 }} />
      </IconButton>

      <IconButton
        onClick={goToLast}
        disabled={page === totalPages}
        sx={navButtonSx}
      >
        <KeyboardDoubleArrowRightRoundedIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </Box>
  );
}
