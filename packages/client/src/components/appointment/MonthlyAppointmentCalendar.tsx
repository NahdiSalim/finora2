import { useState } from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  List,
  ListItem,
  ListItemText,
  IconButton,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CloseIcon from "@mui/icons-material/Close";
import type { AppointmentItem } from "src/lib/services/appointmentsApi";

const WEEK_DAYS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

function getPalette(color?: string | null) {
  const base = color ?? "#2E86C1";
  return { bg: alpha(base, 0.2), border: base, text: base };
}

function formatTime(dateString: string) {
  const d = new Date(dateString);
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function MonthlyAppointmentCalendar({
  monthDate,
  appointments,
  onSelectAppointment,
}: {
  monthDate: Date;
  appointments: AppointmentItem[];
  onSelectAppointment: (id: number) => void;
}) {
  const theme = useTheme();
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const daysInMonth = end.getDate();
  const jsFirstWeekDay = start.getDay(); // 0 = Sunday
  const firstCol = jsFirstWeekDay === 0 ? 6 : jsFirstWeekDay - 1;
  const totalCells = Math.ceil((firstCol + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells }, (_, i) => i - firstCol + 1);
  const today = new Date();

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDayAppointments, setSelectedDayAppointments] = useState<
    AppointmentItem[]
  >([]);
  const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);

  const appointmentsByDay = appointments.reduce<
    Record<string, AppointmentItem[]>
  >((acc, a) => {
    const d = new Date(a.startTime);
    const k = toKey(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    acc[k] = [...(acc[k] || []), a];
    return acc;
  }, {});

  const handleDayClick = (dayAppointments: AppointmentItem[], date: Date) => {
    if (dayAppointments.length > 0) {
      setSelectedDayAppointments(dayAppointments);
      setSelectedDayDate(date);
      setModalOpen(true);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedDayAppointments([]);
    setSelectedDayDate(null);
  };

  const handleAppointmentSelect = (id: number) => {
    onSelectAppointment(id);
    handleCloseModal();
  };

  return (
    <>
      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "common.white",
          overflowX: "auto", // allow horizontal scroll on narrow screens
        }}
      >
        {/* Week-day header */}
        <Box
          sx={{
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(100px, 1fr))", // min 100px, grow to fill
              width: "100%",
              bgcolor: "grey.50",
            }}
          >
            {WEEK_DAYS.map((d) => (
              <Box
                key={d}
                sx={{
                  p: { xs: 0.75, sm: 1 },
                  textAlign: "center",
                  borderRight: "1px solid",
                  borderColor: "divider",
                  "&:last-child": { borderRight: 0 },
                }}
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{
                    fontSize: { xs: "0.7rem", sm: "0.75rem" },
                    fontWeight: 500,
                  }}
                >
                  {d}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Day cells */}
        <Box>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(100px, 1fr))",
              width: "100%",
            }}
          >
            {cells.map((dayNum, idx) => {
              const d = new Date(
                monthDate.getFullYear(),
                monthDate.getMonth(),
                dayNum,
              );
              const isCurrentMonth = d.getMonth() === monthDate.getMonth();
              const isToday = isSameDay(d, today);
              const dayItems = appointmentsByDay[toKey(d)] || [];
              const col = idx % 7;

              return (
                <Box
                  key={`${toKey(d)}-${idx}`}
                  onClick={() => handleDayClick(dayItems, d)}
                  sx={{
                    position: "relative",
                    height: { xs: 100, sm: 120 }, // fixed height – responsive
                    overflowY: "auto", // scroll if content exceeds height
                    p: { xs: 0.5, sm: 0.75 },
                    borderTop: "1px solid",
                    borderRight: col === 6 ? 0 : "1px solid",
                    borderColor: "divider",
                    bgcolor: isToday
                      ? alpha(theme.palette.primary.main, 0.06)
                      : "transparent",
                    cursor: dayItems.length > 0 ? "pointer" : "default",
                    transition: "background-color 0.15s ease",
                    "&:hover": {
                      bgcolor:
                        dayItems.length > 0 ? "action.hover" : "transparent",
                    },
                  }}
                >
                  {/* Day number */}
                  <Typography
                    variant="caption"
                    sx={{
                      display: "block",
                      fontWeight: 600,
                      fontSize: { xs: "0.8rem", sm: "0.9rem" },
                      mb: 0.5,
                      color: isToday
                        ? "primary.main"
                        : isCurrentMonth
                          ? "text.primary"
                          : "text.disabled",
                    }}
                  >
                    {d.getDate()}
                  </Typography>

                  {/* Single appointment: card */}
                  {dayItems.length === 1 && (
                    <Box
                      sx={{
                        px: { xs: 0.75, sm: 1 },
                        py: { xs: 0.4, sm: 0.6 },
                        bgcolor: getPalette(dayItems[0].color).bg,
                        borderLeft: `2px solid ${getPalette(dayItems[0].color).border}`,
                        overflow: "hidden",
                        // No width: 100% → card shrinks to content
                      }}
                    >
                      <Typography
                        noWrap
                        sx={{
                          display: "block",
                          fontSize: { xs: "0.65rem", sm: "0.72rem" },
                          fontWeight: 600,
                          color: getPalette(dayItems[0].color).text,
                          lineHeight: 1.3,
                          mb: { xs: 0.5, sm: 1 },
                        }}
                      >
                        {dayItems[0].title}
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.4,
                        }}
                      >
                        <AccessTimeIcon
                          sx={{
                            fontSize: { xs: "0.6rem", sm: "0.68rem" },
                            color: getPalette(dayItems[0].color).text,
                          }}
                        />
                        <Typography
                          sx={{
                            fontSize: { xs: "0.6rem", sm: "0.68rem" },
                            fontWeight: 500,
                            color: getPalette(dayItems[0].color).text,
                          }}
                        >
                          {formatTime(dayItems[0].startTime)}
                        </Typography>
                      </Box>
                    </Box>
                  )}

                  {/* Two appointments: both as cards */}
                  {dayItems.length === 2 && (
                    <>
                      {dayItems.map((a) => (
                        <Box
                          key={a.id}
                          sx={{
                            px: { xs: 0.75, sm: 1 },
                            py: { xs: 0.4, sm: 0.6 },
                            bgcolor: getPalette(a.color).bg,
                            borderLeft: `2px solid ${getPalette(a.color).border}`,
                            overflow: "hidden",
                            mb: 0.5,
                          }}
                        >
                          <Typography
                            noWrap
                            sx={{
                              display: "block",
                              fontSize: { xs: "0.65rem", sm: "0.72rem" },
                              fontWeight: 600,
                              color: getPalette(a.color).text,
                              lineHeight: 1.3,
                              mb: { xs: 0.5, sm: 1 },
                            }}
                          >
                            {a.title}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.4,
                            }}
                          >
                            <AccessTimeIcon
                              sx={{
                                fontSize: { xs: "0.6rem", sm: "0.68rem" },
                                color: getPalette(a.color).text,
                              }}
                            />
                            <Typography
                              sx={{
                                fontSize: { xs: "0.6rem", sm: "0.68rem" },
                                fontWeight: 500,
                                color: getPalette(a.color).text,
                              }}
                            >
                              {formatTime(a.startTime)}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </>
                  )}

                  {/* Three or more appointments: extra count badge */}
                  {dayItems.length > 2 && (
                    <Box
                      sx={{
                        backgroundColor: theme.palette.secondary.main,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: { xs: 22, sm: 26 },
                        height: { xs: 22, sm: 26 },
                        borderRadius: "50%",
                        position: "absolute",
                        top: { xs: 4, sm: 6 },
                        right: { xs: 4, sm: 6 },
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: { xs: 10, sm: 12 },
                          fontWeight: 500,
                          color: theme.palette.common.white,
                        }}
                      >
                        +{dayItems.length - 2}
                      </Typography>
                    </Box>
                  )}

                  {/* First two appointments (when more than 2) */}
                  {dayItems.length >= 3 && (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 0.5,
                        mt: { xs: 3, sm: 4 },
                      }}
                    >
                      {dayItems.slice(0, 2).map((a) => (
                        <Box
                          key={a.id}
                          sx={{
                            px: { xs: 0.75, sm: 1 },
                            py: { xs: 0.4, sm: 0.6 },
                            bgcolor: getPalette(a.color).bg,
                            borderLeft: `2px solid ${getPalette(a.color).border}`,
                            overflow: "hidden",
                          }}
                        >
                          <Typography
                            noWrap
                            sx={{
                              display: "block",
                              fontSize: { xs: "0.65rem", sm: "0.72rem" },
                              fontWeight: 600,
                              color: getPalette(a.color).text,
                              lineHeight: 1.3,
                              mb: { xs: 0.5, sm: 1 },
                            }}
                          >
                            {a.title}
                          </Typography>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.4,
                            }}
                          >
                            <AccessTimeIcon
                              sx={{
                                fontSize: { xs: "0.6rem", sm: "0.68rem" },
                                color: getPalette(a.color).text,
                              }}
                            />
                            <Typography
                              sx={{
                                fontSize: { xs: "0.6rem", sm: "0.68rem" },
                                fontWeight: 500,
                                color: getPalette(a.color).text,
                              }}
                            >
                              {formatTime(a.startTime)}
                            </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Modal for day appointments */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedDayDate?.toLocaleDateString(undefined, {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          <IconButton
            aria-label="close"
            onClick={handleCloseModal}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedDayAppointments.length > 0 ? (
            <List>
              {selectedDayAppointments.map((appointment) => {
                const palette = getPalette(appointment.color);
                return (
                  <ListItem
                    key={appointment.id}
                    onClick={() => handleAppointmentSelect(appointment.id)}
                    sx={{
                      mb: 1,
                      bgcolor: palette.bg,
                      borderLeft: `4px solid ${palette.border}`,
                      borderRadius: 1,
                      cursor: "pointer",
                      transition: "filter 0.15s ease",
                      "&:hover": {
                        filter: "brightness(0.95)",
                      },
                    }}
                  >
                    <ListItemText
                      primary={appointment.title}
                      secondary={
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            mt: 0.5,
                          }}
                        >
                          <AccessTimeIcon
                            sx={{ fontSize: "0.75rem", color: palette.text }}
                          />
                          <Typography variant="caption" color={palette.text}>
                            {formatTime(appointment.startTime)}
                          </Typography>
                        </Box>
                      }
                      primaryTypographyProps={{
                        sx: { fontWeight: 600, color: palette.text },
                      }}
                      secondaryTypographyProps={{
                        component: "div",
                      }}
                    />
                  </ListItem>
                );
              })}
            </List>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ textAlign: "center", py: 2 }}
            >
              No appointments for this day.
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
