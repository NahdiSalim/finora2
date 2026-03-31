import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import { useTheme, alpha } from "@mui/material/styles";
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

dayjs.locale("fr");

type Tab = { label: string; value: ConversationCategory };

type ConversationsListProps = {
  conversations: Conversation[];
  selectedConversation: number;
  searchTerm: string;
  selectedDateFilter: Dayjs | null;
  tabs: Tab[];
  activeTab: ConversationCategory;
  onTabChange: (tab: ConversationCategory) => void;
  onSearchChange: (value: string) => void;
  onDateFilterChange: (value: Dayjs | null) => void;
  onSelect: (id: number) => void;
  showCreateGroupButton?: boolean;
  onCreateGroup?: () => void;
  showManageGroupButton?: boolean;
  onManageGroup?: (groupId: number) => void;
  allConversations?: Conversation[];
};

export default function ConversationsList({
  conversations,
  selectedConversation,
  searchTerm,
  selectedDateFilter,
  tabs,
  activeTab,
  onTabChange,
  onSearchChange,
  onDateFilterChange,
  onSelect,
  showCreateGroupButton = false,
  onCreateGroup,
  showManageGroupButton = false,
  onManageGroup,
  allConversations = [],
}: ConversationsListProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isMedium = useMediaQuery(theme.breakpoints.between("md", "lg"));

  const [calendarAnchorEl, setCalendarAnchorEl] = useState<null | HTMLElement>(
    null,
  );

  const isCalendarOpen = Boolean(calendarAnchorEl);

  // Calculate unread count per tab
  const getUnreadCountForTab = (category: ConversationCategory) => {
    return allConversations
      .filter((c) => c.category === category)
      .reduce((sum, c) => sum + c.unreadCount, 0);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
      <>
        {tabs.length > 1 && (
          <Box
            sx={{
              mb: isMobile ? 1.25 : 1.5,
              p: isMobile ? "6px" : "5px",
              borderRadius: isMobile ? "18px" : "16px",
              backgroundColor: theme.palette.common.white,
              border: "1px solid",
              borderColor: theme.palette.grey[200],
              flexShrink: 0,
              boxShadow: "0 1px 3px rgba(16, 24, 40, 0.04)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "stretch",
                gap: isMobile ? "6px" : "4px",
                p: isMobile ? "5px" : "4px",
                borderRadius: isMobile ? "14px" : "12px",
                backgroundColor: alpha(theme.palette.grey[100], 0.6),
              }}
            >
              {tabs.map((tab) => {
                const active = activeTab === tab.value;
                const unreadCount = getUnreadCountForTab(tab.value);

                return (
                  <Box
                    key={tab.value}
                    onClick={() => onTabChange(tab.value)}
                    sx={{
                      flex: 1,
                      minHeight: isMobile ? 46 : 42,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.5,
                      borderRadius: isMobile ? "12px" : "10px",
                      cursor: "pointer",
                      userSelect: "none",
                      fontSize: isMobile ? 13.5 : 13,
                      fontWeight: active ? 700 : 600,
                      transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: "relative",
                      backgroundColor: active
                        ? theme.palette.primary.main
                        : "transparent",
                      color: active
                        ? theme.palette.common.white
                        : theme.palette.text.secondary,
                      boxShadow: active
                        ? `0 2px 8px ${alpha(theme.palette.primary.main, 0.25)}`
                        : "none",
                      transform: active ? "scale(1.02)" : "scale(1)",
                      "&:hover": {
                        backgroundColor: active
                          ? theme.palette.primary.main
                          : alpha(theme.palette.grey[300], 0.5),
                        transform: active ? "scale(1.02)" : "scale(1.01)",
                      },
                      "&:active": {
                        transform: "scale(0.98)",
                      },
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        fontSize: "inherit",
                        fontWeight: "inherit",
                        letterSpacing: active ? "0.01em" : "0",
                      }}
                    >
                      {tab.label}
                    </Typography>

                    {/* Unread Badge */}
                    {unreadCount > 0 && (
                      <Box
                        sx={{
                          minWidth: 18,
                          height: 18,
                          px: 0.5,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: "9px",
                          bgcolor: active
                            ? theme.palette.common.white
                            : theme.palette.error.main,
                          color: active
                            ? theme.palette.primary.main
                            : theme.palette.common.white,
                          fontSize: 10,
                          fontWeight: 700,
                          ml: 0.25,
                          boxShadow: active
                            ? "0 1px 3px rgba(0, 0, 0, 0.12)"
                            : "0 1px 4px rgba(244, 63, 94, 0.3)",
                        }}
                      >
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}

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

        <Box
          sx={{
            overflowY: "auto",
            flex: 1,
            pb: isMobile ? 2.5 : isMedium ? 2 : 0,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ flex: 1, overflowY: "auto" }}>
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
          </Box>

          {/* Create Group Button - Only for accountants and only on group tab */}
          {showCreateGroupButton && activeTab === "group" && (
            <Box
              sx={{
                mt: 1.5,
                px: 0.5,
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
