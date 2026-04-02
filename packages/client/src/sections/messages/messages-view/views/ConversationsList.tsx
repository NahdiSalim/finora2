import { useState, useRef, useCallback, useEffect } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import CircularProgress from "@mui/material/CircularProgress";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { Search, Plus } from "lucide-react";
import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import "dayjs/locale/fr";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateCalendar } from "@mui/x-date-pickers/DateCalendar";

import CustomInput from "../../../../components/common/CustomInput";
import CustomButton from "../../../../components/common/CustomButton";

import type { Conversation, ConversationCategory } from "../data/types";
import ConversationItem from "../components/ConversationItem";
import ConversationFilters from "../components/ConversationFilters";

dayjs.locale("fr");

type ConversationsListProps = {
  conversations: Conversation[];
  selectedConversation: number;
  searchTerm: string;
  selectedDateFilter: Dayjs | null;
  activeFilters: (ConversationCategory | "unread")[];
  onFiltersChange: (filters: (ConversationCategory | "unread")[]) => void;
  onSearchChange: (value: string) => void;
  onDateFilterChange: (value: Dayjs | null) => void;
  onSelect: (id: number) => void;
  showCreateGroupButton?: boolean;
  onCreateGroup?: () => void;
  showManageGroupButton?: boolean;
  onManageGroup?: (groupId: number) => void;
  badgeCounts?: Record<string, number>;
  userRole: "comptable" | "client" | "collaborateur" | "other";
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
};

export default function ConversationsList({
  conversations,
  selectedConversation,
  searchTerm,
  selectedDateFilter,
  activeFilters,
  onFiltersChange,
  onSearchChange,
  onDateFilterChange,
  onSelect,
  showCreateGroupButton = false,
  onCreateGroup,
  showManageGroupButton = false,
  onManageGroup,
  badgeCounts = {},
  userRole,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}: ConversationsListProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isMedium = useMediaQuery(theme.breakpoints.between("md", "lg"));

  const [calendarAnchorEl, setCalendarAnchorEl] = useState<null | HTMLElement>(
    null,
  );

  const isCalendarOpen = Boolean(calendarAnchorEl);

  // Infinite scroll implementation
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const handleScroll = useCallback(() => {
    if (!onLoadMore || isLoadingMore || !hasMore) return;

    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    // Trigger when 200px from bottom
    if (scrollBottom < 200) {
      onLoadMore();
    }
  }, [onLoadMore, isLoadingMore, hasMore]);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return undefined;

    container.addEventListener("scroll", handleScroll, { passive: true });
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
      <>
        <Box
          sx={{
            display: "flex",
            gap: isMobile ? 1 : 1,
            mb: isMobile ? 1.25 : 1.25,
            flexShrink: 0,
            alignItems: "center",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <CustomInput
              placeholder="Rechercher ..."
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              backgroundColor={theme.palette.common.white}
              border
              startIcon={<Search size={15} />}
            />
          </Box>

          <IconButton
            onClick={(event) => setCalendarAnchorEl(event.currentTarget)}
            sx={{
              width: isMobile ? 44 : 46,
              height: isMobile ? 44 : 46,
              border: "1px solid",
              borderColor: theme.palette.grey[300],
              borderRadius: isMobile ? "12px" : "12px",
              color: theme.palette.info.light,
              flexShrink: 0,
              backgroundColor: theme.palette.common.white,
              "&:hover": {
                backgroundColor: theme.palette.grey[100],
              },
            }}
          >
            <CalendarMonthOutlinedIcon sx={{ fontSize: isMobile ? 18 : 18 }} />
          </IconButton>
        </Box>

        {selectedDateFilter && (
          <Box
            sx={{
              mb: 1.25,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              px: 1.25,
              py: 0.9,
              borderRadius: "12px",
              backgroundColor: theme.palette.grey[100],
              border: "1px solid",
              borderColor: theme.palette.grey[300],
            }}
          >
            <Typography
              sx={{
                fontSize: 13,
                color: theme.palette.grey[900],
                fontWeight: 500,
              }}
            >
              {`Filtre : ${selectedDateFilter.format("DD/MM/YYYY")}`}
            </Typography>

            <IconButton
              size="small"
              onClick={() => onDateFilterChange(null)}
              sx={{
                width: 24,
                height: 24,
                color: theme.palette.info.light,
              }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        )}

        <Popover
          anchorEl={calendarAnchorEl}
          open={isCalendarOpen}
          onClose={() => setCalendarAnchorEl(null)}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "right",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "right",
          }}
          PaperProps={{
            sx: {
              mt: 1,
              borderRadius: "18px",
              border: "1px solid",
              borderColor: theme.palette.grey[300],
              boxShadow: "0px 12px 32px rgba(16, 24, 40, 0.08)",
              overflow: "hidden",
            },
          }}
        >
          <Box sx={{ width: 320, backgroundColor: theme.palette.common.white }}>
            <Box
              sx={{
                px: 2,
                py: 1.5,
                display: "flex",
                justifyContent: "space-between",
                borderBottom: "1px solid",
                borderColor: theme.palette.grey[200],
              }}
            >
              <Typography sx={{ fontSize: 14, fontWeight: 600 }}>
                Filtrer par date
              </Typography>

              <IconButton
                size="small"
                onClick={() => setCalendarAnchorEl(null)}
              >
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Box>

            <DateCalendar
              value={selectedDateFilter}
              onChange={(value: Dayjs | null) => {
                onDateFilterChange(value);
                setCalendarAnchorEl(null);
              }}
            />

            <Box sx={{ p: 2 }}>
              <CustomButton
                fullWidth
                variant="outlined"
                color="info"
                onClick={() => {
                  onDateFilterChange(null);
                  setCalendarAnchorEl(null);
                }}
              >
                Réinitialiser
              </CustomButton>
            </Box>
          </Box>
        </Popover>

        {/* Conversation Filters */}
        <ConversationFilters
          activeFilters={activeFilters}
          onFiltersChange={onFiltersChange}
          badgeCounts={badgeCounts}
          userRole={userRole}
        />

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Scrollable Conversations List */}
          <Box
            ref={scrollContainerRef}
            sx={{
              overflowY: "auto",
              flex: 1,
              display: "flex",
              flexDirection: "column",
              "&::-webkit-scrollbar": {
                width: 6,
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#E4E7EC",
                borderRadius: "999px",
              },
            }}
          >
            {conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                selected={selectedConversation === conversation.id}
                onClick={() => onSelect(conversation.id)}
                showManageButton={conversation.isGroup && showManageGroupButton}
                onManage={
                  onManageGroup
                    ? () => onManageGroup(conversation.id)
                    : undefined
                }
              />
            ))}

            {/* Loading indicator for infinite scroll */}
            {isLoadingMore && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  py: 2,
                }}
              >
                <CircularProgress
                  size={24}
                  sx={{ color: theme.palette.primary.main }}
                />
              </Box>
            )}
          </Box>

          {/* Create Group Button - Always visible at bottom */}
          {showCreateGroupButton && (
            <Box
              sx={{
                mt: 1.5,
                px: 0.5,
                pb: isMobile ? 1 : 0.5,
                flexShrink: 0,
              }}
            >
              <CustomButton
                fullWidth
                variant="contained"
                color="primary"
                onClick={(e) => {
                  e.stopPropagation();
                  console.log(
                    "[ConversationsList] Create group button clicked",
                  );
                  onCreateGroup?.();
                }}
                sx={{
                  py: 1.5,
                  borderRadius: "14px",
                  fontSize: 14,
                  fontWeight: 600,
                  textTransform: "none",
                  gap: 1,
                  boxShadow: "none",
                  "&:hover": {
                    boxShadow: theme.shadows[2],
                  },
                }}
              >
                <Plus size={18} />
                Créer un groupe
              </CustomButton>
            </Box>
          )}
        </Box>
      </>
    </LocalizationProvider>
  );
}
