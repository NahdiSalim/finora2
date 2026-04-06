import {
  Typography,
} from "@mui/material";

import { PageHeader } from "src/layouts/components/page-header";

export default function NotificationsView() {
  return (
    <PageHeader
      title="Mes Notifications"
      caption="Welcome back to Rhombus CRM dashboard."
    >
      <Typography variant="h4" gutterBottom>
        Notifications
      </Typography>
    </PageHeader>
  );
}
