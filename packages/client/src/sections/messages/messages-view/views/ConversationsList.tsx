import { useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import Popover from "@mui/material/Popover";
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

import type { Conversation } from "../data/types";
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
  const [calendarAnchorEl, setCalendarAnchorEl] = useState<null | HTMLElement>(
    null,
  );

  const isCalendarOpen = Boolean(calendarAnchorEl);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
      <>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            mb: 1.25,
            flexShrink: 0,
            alignItems: "center",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <CustomInput
              placeholder="Rechercher ..."
              value={searchTerm}
              onChange={(event) => onSearchChange(event.target.value)}
              backgroundColor="#FFFFFF"
              border
              startIcon={<Search size={15} />}
            />
          </Box>

          <IconButton
            onClick={(event) => setCalendarAnchorEl(event.currentTarget)}
            sx={{
              width: 46,
              height: 46,
              border: "1px solid #EAECF0",
              borderRadius: "12px",
              color: "#98A2B3",
              flexShrink: 0,
              backgroundColor: "#FFFFFF",
              "&:hover": {
                backgroundColor: "#F9FAFB",
              },
            }}
          >
            <CalendarMonthOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {selectedDateFilter && (
          <Box
            sx={{
              mb: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              px: 1.25,
              py: 0.9,
              borderRadius: "12px",
              backgroundColor: "#F9FAFB",
              border: "1px solid #EAECF0",
            }}
          >
            <Typography
              sx={{
                fontSize: 13,
                color: "#475467",
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
                color: "#98A2B3",
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
              border: "1px solid #EAECF0",
              boxShadow: "0px 12px 32px rgba(16, 24, 40, 0.08)",
              overflow: "hidden",
            },
          }}
        >
          <Box
            sx={{
              width: 320,
              backgroundColor: "#FFFFFF",
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: "1px solid #F2F4F7",
              }}
            >
              <Typography
                sx={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#344054",
                }}
              >
                Filtrer par date
              </Typography>

              <IconButton
                size="small"
                onClick={() => setCalendarAnchorEl(null)}
                sx={{
                  width: 28,
                  height: 28,
                  color: "#98A2B3",
                }}
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
              sx={{
                width: "100%",
                maxHeight: 380,
                "& .MuiPickersDay-root": {
                  fontSize: 13,
                  borderRadius: "10px",
                },
              }}
            />

            <Box
              sx={{
                px: 2,
                pb: 2,
                pt: 0.5,
              }}
            >
              <CustomButton
                fullWidth
                onClick={() => {
                  onDateFilterChange(null);
                  setCalendarAnchorEl(null);
                }}
                sx={{
                  height: 40,
                  borderRadius: "12px",
                  border: "1px solid #EAECF0",
                  fontSize: 13.5,
                  fontWeight: 500,
                  color: "#667085",
                  backgroundColor: "#FFFFFF",
                  boxShadow: "none",
                  "&:hover": {
                    backgroundColor: "#F9FAFB",
                    boxShadow: "none",
                  },
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
            pr: 0.25,
            flex: 1,
            minHeight: 0,
            "&::-webkit-scrollbar": {
              width: 6,
            },
            "&::-webkit-scrollbar-thumb": {
              backgroundColor: "#E4E7EC",
              borderRadius: "999px",
            },
          }}
        >
          {conversations.length === 0 ? (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                py: 6,
                height: "100%",
              }}
            >
              <Typography
                sx={{
                  fontSize: 14,
                  color: "#98A2B3",
                  textAlign: "center",
                }}
              >
                Aucun résultat trouvé.
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {conversations.map((conversation) => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  selected={selectedConversation === conversation.id}
                  onClick={() => onSelect(conversation.id)}
                />
              ))}
            </Box>
          )}
        </Box>
      </>
    </LocalizationProvider>
  );
}
