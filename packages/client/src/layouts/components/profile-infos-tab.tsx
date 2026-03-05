import React, { useState, useEffect } from "react";
import { Box, MenuItem, Stack } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CustomInput from "src/components/common/CustomInput";
import CustomSelect from "src/components/common/CustomSelect";
import FileUpload from "src/components/common/FileUpload";

export type ProfileInfosTabData = {
  cabinetName?: string;
  sector?: string;
  collaboratorsCount?: string;
};

export type ProfileInfosFormState = ProfileInfosTabData & {
  patenteFile?: File | null;
  rneFile?: File | null;
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
  /** Called when any field changes so parent can build FormData on Save */
  onFormChange?: (updates: Partial<ProfileInfosFormState>) => void;
}

export default function ProfileInfosTab({
  isEditing,
  onEdit,
  onCancel,
  onSave,
  data,
  onFormChange,
}: Props) {
  const [cabinetName, setCabinetName] = useState(data?.cabinetName ?? "");
  const [sector, setSector] = useState(data?.sector ?? "");
  const [collaboratorsCount, setCollaboratorsCount] = useState(
    data?.collaboratorsCount ?? "",
  );
  const [patenteFile, setPatenteFile] = useState<File | null>(null);
  const [rneFile, setRneFile] = useState<File | null>(null);

  const notifyChange = (updates: Partial<ProfileInfosFormState>) => {
    onFormChange?.(updates);
  };

  // Sync local state from data when entering edit mode or when data changes
  useEffect(() => {
    if (data) {
      const name = data.cabinetName ?? "";
      const sec = data.sector ?? "";
      const count = data.collaboratorsCount ?? "";
      setCabinetName(name);
      setSector(sec);
      setCollaboratorsCount(count);
      if (isEditing) {
        onFormChange?.({
          cabinetName: name,
          sector: sec,
          collaboratorsCount: count,
        });
      }
    }
  }, [
    data?.cabinetName,
    data?.sector,
    data?.collaboratorsCount,
    isEditing,
    onFormChange,
  ]);

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
          value={cabinetName}
          onChange={(e) => {
            const v = e.target.value;
            setCabinetName(v);
            notifyChange({ cabinetName: v });
          }}
          placeholder="Nom du cabinet"
          disabled={!isEditing}
          fullWidth
        />

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <CustomSelect
              label="Secteur d'activité"
              value={sector}
              onChange={(e) => {
                const v = e.target.value as string;
                setSector(v);
                notifyChange({ sector: v });
              }}
              disabled={!isEditing}
              IconComponent={KeyboardArrowDownIcon}
              displayEmpty
            >
              <MenuItem value="">Secteur d&apos;activité</MenuItem>
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
              value={collaboratorsCount}
              onChange={(e) => {
                const v = e.target.value as string;
                setCollaboratorsCount(v);
                notifyChange({ collaboratorsCount: v });
              }}
              disabled={!isEditing}
              IconComponent={KeyboardArrowDownIcon}
              displayEmpty
            >
              <MenuItem value="">Nombre de collaborateurs</MenuItem>
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
              onChange={(file) => {
                setPatenteFile(file);
                notifyChange({ patenteFile: file ?? undefined });
              }}
              disabled={!isEditing}
              acceptedFiles={[".pdf", ".jpg", ".jpeg", ".png"]}
              maxSize={10}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: 200 }}>
            <FileUpload
              label="RNE"
              value={rneFile}
              onChange={(file) => {
                setRneFile(file);
                notifyChange({ rneFile: file ?? undefined });
              }}
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
