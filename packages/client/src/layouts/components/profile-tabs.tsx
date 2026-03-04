import React, { useState } from "react";
import { Box, Tabs, Tab, Paper } from "@mui/material";

import ProfileInfosTab, { type ProfileInfosTabData } from "./profile-infos-tab";
import ProfileFeedTab from "./profile-feed-tab";
import ProfileReviewsTab from "./profile-reviews-tab";

type ProfileTabsProps = {
  profileInfosData?: ProfileInfosTabData;
  isEditing?: boolean;
};

export default function ProfileTabs({
  profileInfosData,
  isEditing = false,
}: ProfileTabsProps) {
  const [tab, setTab] = useState(0);

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, value) => setTab(value)}
          variant="fullWidth"
          sx={(theme) => ({
            minHeight: 60,
            "& .MuiTabs-indicator": {},
          })}
        >
          {["Mes informations", "Fil d’actualité", "Avis"].map((label) => (
            <Tab
              key={label}
              label={label}
              sx={(theme) => ({
                fontWeight: 500,
                fontSize: theme.typography.body2,
                "&.Mui-selected": {
                  color: theme.palette.common.black,
                  fontWeight: 600,
                },
              })}
            />
          ))}
        </Tabs>
      </Paper>

      <Box sx={{ mt: 3 }}>
        {tab === 0 && (
          <ProfileInfosTab
            isEditing={isEditing}
            onEdit={() => {}}
            onCancel={() => {}}
            onSave={() => {}}
            data={profileInfosData}
          />
        )}

        {tab === 1 && <ProfileFeedTab />}

        {tab === 2 && <ProfileReviewsTab />}
      </Box>
    </Box>
  );
}
