import React, { useState } from "react";
import { Box, Tabs, Tab, Paper } from "@mui/material";

import ProfileInfosTab, {
  type ProfileInfosTabData,
  type ProfileInfosFormState,
} from "./profile-infos-tab";
import ProfileFeedTab from "./profile-feed-tab";
import ProfileReviewsTab from "./profile-reviews-tab";

type ProfileTabsProps = {
  profileInfosData?: ProfileInfosTabData;
  isEditing?: boolean;
  onProfileInfosChange?: (updates: Partial<ProfileInfosFormState>) => void;
  /** Current profile user id (accountant) for the Avis tab */
  accountantId?: number;
  /** Mode visiteur : seulement Fil d'actualité + Avis */
  mode?: "own" | "visitor";
  /** Pour le fil en mode visiteur : companyId du cabinet (lecture seule) */
  companyId?: number;
  /** Afficher le formulaire "Partager un avis" (réservé au client connecté, pas au visiteur) */
  allowSubmitReview?: boolean;
};

const TABS_OWN = ["Mes informations", "Fil d'actualité", "Avis"] as const;
const TABS_VISITOR = ["Fil d'actualité", "Avis"] as const;

export default function ProfileTabs({
  profileInfosData,
  isEditing = false,
  onProfileInfosChange,
  accountantId,
  mode = "own",
  companyId,
  allowSubmitReview = false,
}: ProfileTabsProps) {
  const [tab, setTab] = useState(0);
  const tabs = mode === "visitor" ? TABS_VISITOR : TABS_OWN;

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
          {tabs.map((label) => (
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
        {mode === "own" && tab === 0 && (
          <ProfileInfosTab
            isEditing={isEditing}
            onEdit={() => {}}
            onCancel={() => {}}
            onSave={() => {}}
            data={profileInfosData}
            onFormChange={onProfileInfosChange}
          />
        )}

        {(mode === "visitor" ? tab === 0 : tab === 1) && (
          <ProfileFeedTab
            readOnly={mode === "visitor"}
            companyId={mode === "visitor" ? companyId : undefined}
          />
        )}

        {(mode === "visitor" ? tab === 1 : tab === 2) && (
          <ProfileReviewsTab
            accountantId={accountantId}
            isAccountantView={mode === "own"}
            allowSubmitReview={allowSubmitReview}
          />
        )}
      </Box>
    </Box>
  );
}
