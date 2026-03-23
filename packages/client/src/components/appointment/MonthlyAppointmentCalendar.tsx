import { Box, Typography } from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";
import type { AppointmentItem } from "src/lib/services/appointmentsApi";

const WEEK_DAYS = ["LUN", "MAR", "MER", "JEU", "VEN", "SAM", "DIM"];

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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
  const jsFirstWeekDay = start.getDay(); // 0 sunday
  const firstCol = jsFirstWeekDay === 0 ? 6 : jsFirstWeekDay - 1;
  const cells = Array.from(
    { length: firstCol + daysInMonth },
    (_, i) => i - firstCol + 1,
  );

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
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
        {cells.map((dayNum, idx) => {
          if (dayNum < 1) {
            return (
              <Box
                key={`empty-${idx}`}
                sx={{
                  minHeight: 84,
                  borderTop: "1px solid",
                  borderRight: "1px solid",
                  borderColor: "divider",
                }}
              />
            );
          }
          const d = new Date(
            monthDate.getFullYear(),
            monthDate.getMonth(),
            dayNum,
          );
          const dayItems = appointmentsByDay[toKey(d)] || [];
          return (
            <Box
              key={dayNum}
              sx={{
                minHeight: 84,
                p: 0.75,
                borderTop: "1px solid",
                borderRight: dayNum % 7 === 0 ? 0 : "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {dayNum}
              </Typography>
              <Box
                sx={{
                  mt: 0.5,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.5,
                }}
              >
                {dayItems.slice(0, 2).map((a) => (
                  <Box
                    key={a.id}
                    onClick={() => onSelectAppointment(a.id)}
                    sx={{
                      px: 0.5,
                      py: 0.25,
                      borderRadius: 0.75,
                      bgcolor: alpha(theme.palette.primary.main, 0.12),
                      cursor: "pointer",
                      overflow: "hidden",
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ display: "block" }}
                      noWrap
                    >
                      {a.title}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
