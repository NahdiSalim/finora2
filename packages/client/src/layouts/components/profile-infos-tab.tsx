import React, { useState } from "react";
import { Box, MenuItem, Stack, Typography } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CustomInput from "src/components/common/CustomInput";
import CustomSelect from "src/components/common/CustomSelect";
import FileUpload from "src/components/common/FileUpload";

export type ProfileInfosTabData = {
  cabinetName?: string;
  sector?: string;
  collaboratorsCount?: string;
};

const SECTOR_OPTIONS = [
  "Expert Comptable",
  "Comptable",
  "Fiscaliste",
  "Finance",
  "Audit",
  "Conseil",
];

const COLLABORATORS_OPTIONS = [
  "1-5 collaborateurs",
  "6-10 collaborateurs",
  "+ 10 collaborateurs",
];

interface Props {
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  data?: ProfileInfosTabData;
}

export default function ProfileInfosTab({
  isEditing,
  onEdit,
  onCancel,
  onSave,
  data,
}: Props) {
  const [patenteFile, setPatenteFile] = useState<File | null>(null);
  const [rneFile, setRneFile] = useState<File | null>(null);

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
          value={data?.cabinetName ?? ""}
          placeholder="Nom du cabinet"
          disabled={!isEditing}
          fullWidth
        />

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <CustomSelect
              label="Secteur d'activité"
              value={data?.sector ?? ""}
              onChange={() => {}}
              disabled={!isEditing}
              size="small"
              IconComponent={KeyboardArrowDownIcon}
              displayEmpty
            >
              <MenuItem value="">
                <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                  Secteur d&apos;activité
                </Typography>
              </MenuItem>
              {SECTOR_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </CustomSelect>
          </Box>

          <Box sx={{ flex: 1, minWidth: 200 }}>
            <CustomSelect
              label="Nombre de collaborateurs"
              value={data?.collaboratorsCount ?? ""}
              onChange={() => {}}
              disabled={!isEditing}
              size="small"
              IconComponent={KeyboardArrowDownIcon}
              displayEmpty
            >
              <MenuItem value="">
                <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                  Nombre de collaborateurs
                </Typography>
              </MenuItem>
              {COLLABORATORS_OPTIONS.map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </CustomSelect>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <FileUpload
              label="Patente"
              value={patenteFile}
              onChange={setPatenteFile}
              disabled={!isEditing}
              acceptedFiles={[".pdf", ".jpg", ".jpeg", ".png"]}
              maxSize={10}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: 200 }}>
            <FileUpload
              label="RNE"
              value={rneFile}
              onChange={setRneFile}
              disabled={!isEditing}
              acceptedFiles={[".pdf", ".jpg", ".jpeg", ".png"]}
              maxSize={10}
            />
          </Box>
        </Box>
      </Stack>
    </Box>
  );
}
