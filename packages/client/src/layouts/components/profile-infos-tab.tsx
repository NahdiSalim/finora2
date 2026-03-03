import React from "react";
import { Box, Button, Stack } from "@mui/material";
import CustomInput from "src/components/common/CustomInput";

interface Props {
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
}

export default function ProfileInfosTab({
  isEditing,
  onEdit,
  onCancel,
  onSave,
}: Props) {
  return (
    <Box
      component="form"
      sx={{
        p: 3,
        borderRadius: 3,
        border: 1,
        borderColor: "divider",
      }}
    >
      <Stack spacing={2}>
        <CustomInput
          label="Nom du cabinet"
          defaultValue="Cabinet nom"
          disabled={!isEditing}
          fullWidth
        />

        <Box sx={{ display: "flex", gap: 1 }}>
          <CustomInput
            label="Secteur d'activité"
            defaultValue="Secteur d'activité"
            disabled={!isEditing}
            fullWidth
          />

          <CustomInput
            label="Nombre de collaborateurs"
            defaultValue="10"
            disabled={!isEditing}
            fullWidth
          />
        </Box>

        <Box sx={{ display: "flex", gap: 1 }}>
          <CustomInput
            label="Patente"
            defaultValue="Patente"
            disabled={!isEditing}
            fullWidth
          />

          <CustomInput
            label="RNE"
            defaultValue="RNE"
            disabled={!isEditing}
            fullWidth
          />
        </Box>

        {isEditing && (
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button variant="contained" onClick={onSave}>
              Enregistrer
            </Button>
            <Button variant="outlined" onClick={onCancel}>
              Annuler
            </Button>
          </Box>
        )}
      </Stack>
    </Box>
  );
}
