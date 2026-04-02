import { useEffect, useRef, type ReactNode } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  IconButton,
  Typography,
  CircularProgress,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { X, Plus } from "lucide-react";

type AttachmentSelectionModalProps<T extends { id: number }> = {
  open: boolean;
  onClose: () => void;
  title: string;
  items: T[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSelect: (item: T) => void;
  renderItem: (item: T) => ReactNode;
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
};

export default function AttachmentSelectionModal<T extends { id: number }>({
  open,
  onClose,
  title,
  items,
  isLoading,
  hasMore,
  onLoadMore,
  onSelect,
  renderItem,
  emptyMessage = "Aucun élément disponible",
  emptyAction,
}: AttachmentSelectionModalProps<T>) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    const sentinel = sentinelRef.current;
    if (!sentinel) return undefined;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      {
        root: scrollContainerRef.current,
        threshold: 0.1,
      },
    );

    observerRef.current.observe(sentinel);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [open, hasMore, isLoading, onLoadMore]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen={isMobile}
      maxWidth="sm"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: isMobile ? 0 : 3,
          // Fixed height so the list scrolls inside, not the whole modal
          maxHeight: isMobile ? "100dvh" : "80vh",
          height: isMobile ? "100dvh" : "auto",
          display: "flex",
          flexDirection: "column",
        },
      }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: { xs: 2, sm: 3 },
          py: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          flexShrink: 0, // header never shrinks
        }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            fontSize: { xs: 16, sm: 18 },
            color: theme.palette.text.primary,
          }}
        >
          {title}
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: theme.palette.text.secondary,
            "&:hover": {
              bgcolor: theme.palette.action.hover,
            },
          }}
        >
          <X size={20} />
        </IconButton>
      </DialogTitle>

      <DialogContent
        ref={scrollContainerRef}
        sx={{
          p: 0,
          flex: 1, // takes all remaining height
          overflowY: "auto", // scroll only here
          overflowX: "hidden",
          minHeight: 0, // required for flex children to scroll correctly
        }}
      >
        {isLoading && items.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              py: 6,
            }}
          >
            <CircularProgress size={32} />
          </Box>
        ) : items.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              py: 6,
              px: 3,
              gap: 2,
            }}
          >
            <Typography
              variant="body2"
              sx={{
                color: theme.palette.text.disabled,
                fontStyle: "italic",
                textAlign: "center",
              }}
            >
              {emptyMessage}
            </Typography>
            {emptyAction && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<Plus size={18} />}
                onClick={emptyAction.onClick}
                sx={{
                  mt: 1,
                  borderRadius: 2,
                  textTransform: "none",
                  fontWeight: 600,
                  px: 3,
                }}
              >
                {emptyAction.label}
              </Button>
            )}
          </Box>
        ) : (
          <Box sx={{ p: { xs: 1.5, sm: 2 } }}>
            {items.map((item) => (
              <Box
                key={item.id}
                onClick={() => onSelect(item)}
                sx={{
                  cursor: "pointer",
                  "&:hover": {
                    bgcolor: theme.palette.action.hover,
                  },
                }}
              >
                {renderItem(item)}
              </Box>
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} style={{ height: 1 }} />

            {isLoading && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  py: 2,
                }}
              >
                <CircularProgress size={24} />
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
