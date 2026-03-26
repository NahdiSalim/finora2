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
  useMediaQuery,
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
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  // const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md')); // if needed later

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

  // Week days display (abbreviated on mobile)
  const weekDaysDisplay = isMobile
    ? ["L", "M", "M", "J", "V", "S", "D"]
    : WEEK_DAYS;

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
        {/* Week header */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            bgcolor: "grey.50",
            minWidth: isMobile ? 560 : "auto", // ensure minimum width for scrolling
          }}
        >
          {weekDaysDisplay.map((d, idx) => (
            <Box
              key={d}
              sx={{
                p: { xs: 0.5, sm: 1 },
                borderRight: idx === 6 ? 0 : "1px solid",
                borderColor: "divider",
                textAlign: "center",
              }}
            >
              <Typography
                variant={isMobile ? "caption" : "body2"}
                color="text.secondary"
                sx={{ fontWeight: isMobile ? 500 : 400 }}
              >
                {d}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Day cells */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            minWidth: isMobile ? 560 : "auto",
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
                  minHeight: { xs: 70, sm: 100, md: 120 },
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
                  variant={isMobile ? "body2" : "caption"}
                  sx={{
                    display: "block",
                    fontWeight: 600,
                    fontSize: { xs: "0.85rem", sm: "0.9rem" },
                    mb: { xs: 0.25, sm: 0.5 },
                    color: isToday
                      ? "primary.main"
                      : isCurrentMonth
                        ? "text.primary"
                        : "text.disabled",
                  }}
                >
                  {d.getDate()}
                </Typography>

                {/* Mobile simplified view */}
                {isMobile ? (
                  <>
                    {dayItems.length === 1 && (
                      <Box
                        sx={{
                          bgcolor: getPalette(dayItems[0].color).bg,
                          borderLeft: `2px solid ${getPalette(dayItems[0].color).border}`,
                          borderRadius: 0.5,
                          px: 0.5,
                          py: 0.25,
                          mb: 0.25,
                        }}
                      >
                        <Typography
                          noWrap
                          sx={{
                            fontSize: "0.65rem",
                            fontWeight: 600,
                            color: getPalette(dayItems[0].color).text,
                            lineHeight: 1.2,
                          }}
                        >
                          {dayItems[0].title}
                        </Typography>
                      </Box>
                    )}
                    {dayItems.length === 2 && (
                      <>
                        {dayItems.map((a) => (
                          <Box
                            key={a.id}
                            sx={{
                              bgcolor: getPalette(a.color).bg,
                              borderLeft: `2px solid ${getPalette(a.color).border}`,
                              borderRadius: 0.5,
                              px: 0.5,
                              py: 0.25,
                              mb: 0.25,
                            }}
                          >
                            <Typography
                              noWrap
                              sx={{
                                fontSize: "0.65rem",
                                fontWeight: 600,
                                color: getPalette(a.color).text,
                              }}
                            >
                              {a.title}
                            </Typography>
                          </Box>
                        ))}
                      </>
                    )}
                    {dayItems.length > 2 && (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 20,
                          height: 20,
                          bgcolor: "secondary.main",
                          borderRadius: "50%",
                          position: "absolute",
                          top: 4,
                          right: 4,
                        }}
                      >
                        <Typography
                          fontSize={10}
                          fontWeight={600}
                          color="common.white"
                        >
                          +{dayItems.length}
                        </Typography>
                      </Box>
                    )}
                  </>
                ) : (
                  /* Desktop / tablet view */
                  <>
                    {dayItems.length === 1 && (
                      <Box
                        sx={{
                          px: 1,
                          py: 0.6,
                          bgcolor: getPalette(dayItems[0].color).bg,
                          borderLeft: `2px solid ${getPalette(dayItems[0].color).border}`,
                          overflow: "hidden",
                        }}
                      >
                        <Typography
                          noWrap
                          sx={{
                            display: "block",
                            fontSize: "0.72rem",
                            fontWeight: 600,
                            color: getPalette(dayItems[0].color).text,
                            lineHeight: 1.3,
                            mb: 1,
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
                              fontSize: "0.68rem",
                              color: getPalette(dayItems[0].color).text,
                            }}
                          />
                          <Typography
                            sx={{
                              fontSize: "0.68rem",
                              fontWeight: 500,
                              color: getPalette(dayItems[0].color).text,
                            }}
                          >
                            {formatTime(dayItems[0].startTime)}
                          </Typography>
                        </Box>
                      </Box>
                    )}

                    {dayItems.length === 2 && (
                      <>
                        {dayItems.map((a) => (
                          <Box
                            key={a.id}
                            sx={{
                              px: 1,
                              py: 0.6,
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
                                fontSize: "0.72rem",
                                fontWeight: 600,
                                color: getPalette(a.color).text,
                                lineHeight: 1.3,
                                mb: 1,
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
                                  fontSize: "0.68rem",
                                  color: getPalette(a.color).text,
                                }}
                              />
                              <Typography
                                sx={{
                                  fontSize: "0.68rem",
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

                    {dayItems.length > 2 && (
                      <>
                        <Box
                          sx={{
                            backgroundColor: theme.palette.secondary.main,
                            display: "flex",
                            flexDirection: "column",
                            alignContent: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            width: 26,
                            height: 26,
                            borderRadius: "50%",
                            position: "absolute",
                            top: 6,
                            right: 6,
                          }}
                        >
                          <Typography
                            fontSize={12}
                            sx={{ fontWeight: 500, color: "common.white" }}
                          >
                            +{dayItems.length - 2}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1,
                            mt: 4,
                            flexWrap: "wrap",
                          }}
                        >
                          {dayItems.slice(0, 2).map((a) => (
                            <Box
                              key={a.id}
                              sx={{
                                px: 1,
                                py: 0.6,
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
                                  fontSize: "0.72rem",
                                  fontWeight: 600,
                                  color: getPalette(a.color).text,
                                  lineHeight: 1.3,
                                  mb: 1,
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
                                    fontSize: "0.68rem",
                                    color: getPalette(a.color).text,
                                  }}
                                />
                                <Typography
                                  sx={{
                                    fontSize: "0.68rem",
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
                      </>
                    )}
                  </>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Modal for day appointments */}
      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            m: { xs: 1, sm: 2 },
          },
        }}
      >
        <DialogTitle sx={{ pr: 5 }}>
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
              Aucun rendez-vous pour ce jour.
            </Typography>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
