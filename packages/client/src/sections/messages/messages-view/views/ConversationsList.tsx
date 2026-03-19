import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { Search } from "lucide-react";
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

type ConversationsListProps = {
  conversations: Conversation[];
  selectedConversation: number;
  searchTerm: string;
  selectedDateFilter: Dayjs | null;
  onSearchChange: (value: string) => void;
  onDateFilterChange: (value: Dayjs | null) => void;
  onSelect: (id: number) => void;
};

export default function ConversationsList({
  conversations,
  selectedConversation,
  searchTerm,
  selectedDateFilter,
  onSearchChange,
  onDateFilterChange,
  onSelect,
}: ConversationsListProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const [calendarAnchorEl, setCalendarAnchorEl] = useState<null | HTMLElement>(
    null,
  );
  const [selectedTab, setSelectedTab] =
    useState<ConversationCategory>("collaborateur");

  const isCalendarOpen = Boolean(calendarAnchorEl);

  const filteredConversations = conversations.filter(
    (conversation) => conversation.category === selectedTab,
  );

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
      <>
        <Box
          sx={{
            mb: isMobile ? 1.25 : 1.5,
            p: isMobile ? 0.875 : 0.75,
            borderRadius: isMobile ? "18px" : "16px",
            backgroundColor: theme.palette.common.white,
            border: "1px solid",
            borderColor: theme.palette.grey[200],
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 1 : 0.75,
              p: isMobile ? "4px" : "6px",
              borderRadius: isMobile ? "14px" : "8px",
              backgroundColor: theme.palette.grey[100],
            }}
          >
            {[
              { label: "Clients", value: "client" },
              { label: "Collaborateurs", value: "collaborateur" },
            ].map((tab) => {
              const active = selectedTab === tab.value;

              return (
                <Box
                  key={tab.value}
                  onClick={() =>
                    setSelectedTab(tab.value as ConversationCategory)
                  }
                  sx={{
                    flex: 1,
                    height: isMobile ? 48 : 42,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: isMobile ? "12px" : "6px",
                    cursor: "pointer",
                    userSelect: "none",
                    fontSize: isMobile ? 14 : 14,
                    fontWeight: active ? 600 : 500,
                    transition: "all 0.2s ease",
                    backgroundColor: active
                      ? theme.palette.primary.main
                      : "transparent",
                    color: active
                      ? theme.palette.common.white
                      : theme.palette.info.main,
                    boxShadow: "none",
                    "&:hover": {
                      backgroundColor: active
                        ? theme.palette.primary.main
                        : theme.palette.grey[200],
                    },
                  }}
                >
                  {tab.label}
                </Box>
              );
            })}
          </Box>
        </Box>

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
            pb: isMobile ? 2.5 : 0,
          }}
        >
          {filteredConversations.map((conversation) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              selected={selectedConversation === conversation.id}
              onClick={() => onSelect(conversation.id)}
            />
          ))}
        </Box>
      </>
    </LocalizationProvider>
  );
}
