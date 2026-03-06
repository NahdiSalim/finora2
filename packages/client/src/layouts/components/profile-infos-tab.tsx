import React, { useState, useEffect } from "react";
import { Box, ListSubheader, MenuItem, Stack } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CustomInput from "src/components/common/CustomInput";
import CustomSelect from "src/components/common/CustomSelect";
import FileUpload from "src/components/common/FileUpload";

export type ProfileInfosTabData = {
  cabinetName?: string;
  sector?: string;
  collaboratorsCount?: string;
  experience?: string;
  description?: string;
  specialties?: string[];
  patentFileUrl?: string | null;
  rneFileUrl?: string | null;
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

/** Mock: secteurs -> spécialités proposées pour le multiselect */
export const SECTOR_TO_SPECIALTIES: Record<string, string[]> = {
  "Expert Comptable": [
    "Comptabilité générale",
    "Comptabilité analytique",
    "Audit légal",
    "Conseil en gestion",
    "Fiscalité des entreprises",
    "Consolidation",
  ],
  Comptable: [
    "Comptabilité générale",
    "Paie",
    "TVA",
    "Déclarations fiscales",
    "Tenue de livres",
  ],
  Fiscaliste: [
    "Impôt sur les sociétés",
    "TVA",
    "Optimisation fiscale",
    "Fiscalité internationale",
    "Contrôles fiscaux",
  ],
  Finance: [
    "Analyse financière",
    "Trésorerie",
    "Financement",
    "Due diligence",
    "Evaluation",
  ],
  Audit: [
    "Audit légal",
    "Audit interne",
    "Commissariat aux comptes",
    "Audit de processus",
  ],
  Conseil: [
    "Conseil en gestion",
    "Stratégie",
    "Restructuration",
    "Acquisition",
  ],
};

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
  const [experience, setExperience] = useState(data?.experience ?? "");
  const [description, setDescription] = useState(data?.description ?? "");
  const [specialties, setSpecialties] = useState<string[]>(
    data?.specialties ?? [],
  );
  const [patenteFile, setPatenteFile] = useState<File | null>(null);
  const [rneFile, setRneFile] = useState<File | null>(null);

  const specialtyOptionsForSector = sector
    ? (SECTOR_TO_SPECIALTIES[sector] ?? [])
    : [];

  const notifyChange = (updates: Partial<ProfileInfosFormState>) => {
    onFormChange?.(updates);
  };

  // Sync local state from data when entering edit mode or when data changes
  useEffect(() => {
    if (data) {
      const name = data.cabinetName ?? "";
      const sec = data.sector ?? "";
      const count = data.collaboratorsCount ?? "";
      const exp = data.experience ?? "";
      const desc = data.description ?? "";
      const specs = data.specialties ?? [];
      setCabinetName(name);
      setSector(sec);
      setCollaboratorsCount(count);
      setExperience(exp);
      setDescription(desc);
      setSpecialties(specs);
      if (isEditing) {
        onFormChange?.({
          cabinetName: name,
          sector: sec,
          collaboratorsCount: count,
          experience: exp,
          description: desc,
          specialties: specs,
        });
      }
    }
  }, [
    data?.cabinetName,
    data?.sector,
    data?.collaboratorsCount,
    data?.experience,
    data?.description,
    data?.specialties,
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
                const nextSpecs = (SECTOR_TO_SPECIALTIES[v] ?? []).filter((s) =>
                  specialties.includes(s),
                );
                setSpecialties(nextSpecs);
                notifyChange({ sector: v, specialties: nextSpecs });
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
              label="Spécialités"
              multiple
              value={specialties}
              onChange={(e) => {
                const v = (e.target.value as string[]).filter(Boolean);
                setSpecialties(v);
                notifyChange({ specialties: v });
              }}
              disabled={!isEditing}
              IconComponent={KeyboardArrowDownIcon}
              displayEmpty
              renderValue={(selected) =>
                Array.isArray(selected) && selected.length > 0
                  ? selected.join(", ")
                  : "Sélectionner des spécialités"
              }
            >
              {!sector ? (
                <ListSubheader>Choisir un secteur d&apos;abord</ListSubheader>
              ) : null}
              {specialtyOptionsForSector.map((opt) => (
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

        <CustomInput
          label="Expérience"
          value={experience}
          onChange={(e) => {
            const v = e.target.value;
            setExperience(v);
            notifyChange({ experience: v });
          }}
          placeholder="Ex: 15 ans, 10 ans en cabinet..."
          disabled={!isEditing}
          fullWidth
        />

        <CustomInput
          label="Description"
          value={description}
          onChange={(e) => {
            const v = e.target.value;
            setDescription(v);
            notifyChange({ description: v });
          }}
          placeholder="Décrivez votre cabinet et vos domaines d'expertise"
          disabled={!isEditing}
          fullWidth
          multiline
          rows={3}
        />

        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <FileUpload
              label="Patente"
              value={patenteFile}
              existingFileUrl={
                patenteFile ? null : (data?.patentFileUrl ?? null)
              }
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
              existingFileUrl={rneFile ? null : (data?.rneFileUrl ?? null)}
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
