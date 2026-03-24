import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import type { AppointmentItem } from "src/lib/services/appointmentsApi";

const WEEK_DAYS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

function getPalette(color?: string) {
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

  const appointmentsByDay = appointments.reduce<
    Record<string, AppointmentItem[]>
  >((acc, a) => {
    const d = new Date(a.startTime);
    const k = toKey(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
    acc[k] = [...(acc[k] || []), a];
    return acc;
  }, {});

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "common.white",
      }}
    >
      {/* ── Week-day header ── */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          bgcolor: "grey.50",
        }}
      >
        {WEEK_DAYS.map((d) => (
          <Box
            key={d}
            sx={{
              p: 1,
              borderRight: "1px solid",
              borderColor: "divider",
              "&:last-child": { borderRight: 0 },
            }}
          >
            <Typography variant="caption" color="text.secondary">
              {d}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* ── Day cells ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
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
              sx={{
                minHeight: 100,
                p: 0.75,
                borderTop: "1px solid",
                borderRight: col === 6 ? 0 : "1px solid",
                borderColor: "divider",
                bgcolor: isToday
                  ? alpha(theme.palette.primary.main, 0.06)
                  : "transparent",
              }}
            >
              {/* Day number */}
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  fontWeight: 600,
                  fontSize: "0.9rem",
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

              {/* Appointment cards */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                {dayItems.slice(0, 3).map((a) => {
                  const palette = getPalette(a.color ?? undefined);
                  return (
                    <Box
                      key={a.id}
                      onClick={() => onSelectAppointment(a.id)}
                      sx={{
                        px: 1,
                        py: 0.6,
                        borderRadius: 1,
                        bgcolor: palette.bg,
                        border: `2px solid ${palette.border}`,
                        cursor: "pointer",
                        transition: "filter 0.15s ease",
                        "&:hover": { filter: "brightness(0.95)" },
                        overflow: "hidden",
                      }}
                    >
                      {/* Title */}
                      <Typography
                        noWrap
                        sx={{
                          display: "block",
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: palette.text,
                          lineHeight: 1.3,
                          mb: 0.35,
                        }}
                      >
                        {a.title}
                      </Typography>

                      {/* Time row */}
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 0.4 }}
                      >
                        <AccessTimeIcon
                          sx={{ fontSize: "0.7rem", color: palette.text }}
                        />
                        <Typography
                          sx={{
                            fontSize: "0.68rem",
                            fontWeight: 500,
                            color: palette.text,
                            lineHeight: 1,
                          }}
                        >
                          {formatTime(a.startTime)}
                        </Typography>
                      </Box>
                    </Box>
                  );
                })}

                {/* Overflow indicator */}
                {dayItems.length > 3 && (
                  <Typography
                    variant="caption"
                    sx={{ color: "text.secondary", pl: 0.5 }}
                  >
                    +{dayItems.length - 3} more
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
