import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  useTheme,
  IconButton,
  alpha,
  useMediaQuery,
  MenuItem,
  Checkbox,
} from "@mui/material";
import type { SubmitHandler } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { X, ChevronRight, Folder, FileText, Mic } from "lucide-react";
import { useState, useCallback, useEffect } from "react";

import CustomInput from "src/components/common/CustomInput";
import CustomButton from "src/components/common/CustomButton";
import CustomSelect from "src/components/common/CustomSelect";
import FileUpload from "src/components/common/FileUpload";
import AudioRecorder from "src/components/common/AudioRecorder";
import ModernTabs from "src/components/common/ModernTabs";
import { ModernModalTabs } from "src/components/common/CustomTabs";
import { useCreateRequestMutation } from "src/lib/services/requestApi";
import { useGetDocumentsQuery } from "src/lib/services/documentsApi";
import { useAlert } from "src/contexts/AlertContext";
import {
  requestValidationSchema,
  type RequestFormData,
} from "src/validations/request/request-validation";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface FolderTreeItemProps {
  folderId: number;
  folderName: string;
  depth: number;
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function FolderTreeItem({
  folderId,
  folderName,
  depth,
  expandedIds,
  onToggleExpand,
  selectedId,
  onSelect,
}: FolderTreeItemProps) {
  const isExpanded = expandedIds.has(folderId);
  const { data } = useGetDocumentsQuery(
    {
      parentId: folderId,
      limit: 500,
      status: "active",
      itemType: "folder",
    },
    { skip: !isExpanded },
  );
  const childFolders =
    data?.data?.map((d) => ({ id: d.id, name: d.name })) ?? [];

  return (
    <>
      <Box
        onClick={() => onSelect(folderId)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          pl: 2 + depth * 2,
          py: 1.25,
          cursor: "pointer",
          bgcolor: selectedId === folderId ? "action.selected" : "transparent",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Box
          component="span"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(folderId);
          }}
          sx={{
            display: "inline-flex",
            transform: isExpanded ? "rotate(90deg)" : "none",
            transition: "transform 0.2s",
          }}
        >
          <ChevronRight size={18} />
        </Box>
        <Folder size={18} />
        <Typography variant="body2">{folderName}</Typography>
      </Box>
      {isExpanded &&
        childFolders.map((child) => (
          <FolderTreeItem
            key={child.id}
            folderId={child.id}
            folderName={child.name}
            depth={depth + 1}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            selectedId={selectedId}
            onSelect={onSelect}
          />
        ))}
    </>
  );
}

export default function RequestModal({ open, onClose }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isMedium = useMediaQuery(theme.breakpoints.down("md"));
  const { showAlert } = useAlert();
  const [createRequest, { isLoading }] = useCreateRequestMutation();

  // Main tab: "form" or "voice"
  const [mainTab, setMainTab] = useState<"form" | "voice">("form");

  // Attachment sub-tabs (for form mode)
  const [activeTab, setActiveTab] = useState<"upload" | "select">("upload");
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<number[]>([]);

  // Voice recording state
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [voiceType, setVoiceType] = useState<string>("other");
  const [voiceUrgency, setVoiceUrgency] = useState<string>("normal");
  const [uploadedAudioFile, setUploadedAudioFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isDirty, isValid },
  } = useForm<RequestFormData>({
    resolver: yupResolver(requestValidationSchema) as any,
    mode: "onChange",
    defaultValues: {
      subject: "",
      topic: "",
      type: "other" as const,
      description: "",
      urgency: "normal" as const,
      desiredResponseDate: undefined,
      desiredResponseTime: undefined,
      attachments: [],
    },
  });

  const descriptionValue = watch("description") || "";
  const characterCount = descriptionValue.length;

  const { data: rootData } = useGetDocumentsQuery(
    {
      parentId: undefined,
      limit: 500,
      status: "active",
      itemType: "folder",
    },
    { skip: !open || activeTab !== "select" },
  );
  const rootFolders =
    rootData?.data?.map((d) => ({ id: d.id, name: d.name })) ?? [];

  const { data: currentFolderData } = useGetDocumentsQuery(
    {
      parentId: selectedFolderId ?? undefined,
      limit: 500,
      status: "active",
      itemType: "file",
    },
    { skip: !open || activeTab !== "select" },
  );
  const currentFiles = currentFolderData?.data ?? [];

  useEffect(() => {
    if (!open) {
      setMainTab("form");
      setActiveTab("upload");
      setSelectedFolderId(null);
      setExpandedIds(new Set());
      setSelectedDocumentIds([]);
      setAudioBlob(null);
      setAudioDuration(0);
      setVoiceType("other");
      setVoiceUrgency("normal");
      setUploadedAudioFile(null);
      return;
    }
  }, [open]);

  const handleToggleExpand = useCallback((id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleToggleDocument = useCallback((docId: number) => {
    setSelectedDocumentIds((prev) =>
      prev.includes(docId)
        ? prev.filter((id) => id !== docId)
        : [...prev, docId],
    );
  }, []);

  const handleVoiceSubmit = async () => {
    try {
      const formData = new FormData();

      // Auto-generate subject with date
      const today = new Date().toLocaleDateString("fr-FR");
      formData.append("subject", `Message vocal - ${today}`);
      formData.append("type", voiceType);
      formData.append("urgency", voiceUrgency);

      // Append audio file (either recorded or uploaded)
      if (audioBlob) {
        const audioFile = new File([audioBlob], `voice-${Date.now()}.webm`, {
          type: audioBlob.type,
        });
        formData.append("attachments", audioFile);
      } else if (uploadedAudioFile) {
        formData.append("attachments", uploadedAudioFile);
      } else {
        showAlert(
          "Veuillez enregistrer ou télécharger un fichier audio",
          "error",
        );
        return;
      }

      await createRequest(formData).unwrap();
      showAlert("Demande vocale créée avec succès", "success");
      setAudioBlob(null);
      setAudioDuration(0);
      setUploadedAudioFile(null);
      setMainTab("form");
      onClose();
    } catch (error) {
      showAlert("Erreur lors de la création de la demande vocale", "error");
    }
  };

  const onSubmit: SubmitHandler<RequestFormData> = async (data) => {
    try {
      const formData = new FormData();

      // Append form fields
      formData.append("subject", data.subject);
      if (data.topic) formData.append("topic", data.topic);
      formData.append("type", data.type || "other");
      if (data.description) formData.append("description", data.description);
      formData.append("urgency", data.urgency || "normal");
      if (data.desiredResponseDate)
        formData.append("desiredResponseDate", data.desiredResponseDate);
      if (data.desiredResponseTime)
        formData.append("desiredResponseTime", data.desiredResponseTime);

      // Append new files (from "Nouveau document" tab)
      if (
        activeTab === "upload" &&
        data.attachments &&
        data.attachments.length > 0
      ) {
        data.attachments
          .filter((file): file is File => file !== undefined)
          .forEach((file) => {
            formData.append("attachments", file);
          });
      }

      // Append existing document IDs (from "Mon espace" tab)
      if (activeTab === "select" && selectedDocumentIds.length > 0) {
        selectedDocumentIds.forEach((id) => {
          formData.append("existingDocumentIds", id.toString());
        });
      }

      await createRequest(formData).unwrap();
      showAlert("Demande créée avec succès", "success");
      reset();
      setSelectedDocumentIds([]);
      setActiveTab("upload");
      onClose();
    } catch (error) {
      showAlert("Erreur lors de la création de la demande", "error");
    }
  };

  const handleClose = () => {
    if (isLoading) return;
    reset();
    setSelectedDocumentIds([]);
    setActiveTab("upload");
    setSelectedFolderId(null);
    setExpandedIds(new Set());
    setMainTab("form");
    setAudioBlob(null);
    setAudioDuration(0);
    setUploadedAudioFile(null);
    onClose();
  };

  const handleAudioReady = (blob: Blob, duration: number) => {
    setAudioBlob(blob);
    setAudioDuration(duration);
    setUploadedAudioFile(null); // Clear uploaded file if recording
  };

  const handleAudioDelete = () => {
    setAudioBlob(null);
    setAudioDuration(0);
  };

  const handleAudioFileUpload = (file: File | null) => {
    setUploadedAudioFile(file);
    setAudioBlob(null); // Clear recorded audio if uploading
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      fullScreen={isMobile}
      keepMounted={false}
      disablePortal={false}
      disableEnforceFocus={false}
      disableAutoFocus={false}
      disableRestoreFocus={false}
      BackdropProps={{
        sx: {
          backgroundColor: alpha(theme.palette.grey[900], 0.5),
          backdropFilter: "blur(4px)",
        },
      }}
      sx={{
        zIndex: theme.zIndex.modal,
        "& .MuiDialog-paper": {
          margin: { xs: 0, sm: 2, md: 4 },
          maxHeight: {
            xs: "100%",
            sm: "calc(100% - 32px)",
            md: "calc(100% - 64px)",
          },
        },
      }}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          bgcolor: theme.palette.grey[100],
          overflow: "hidden",
          boxShadow: "0 24px 48px rgba(0, 0, 0, 0.2)",
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: { xs: 2.5, sm: 4 },
          py: { xs: 2, sm: 2.5 },
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          bgcolor: "background.paper",
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
        }}
      >
        <Box>
          <Typography
            variant="h6"
            fontWeight={600}
            sx={{
              fontSize: { xs: "1.125rem", sm: "1.25rem" },
              lineHeight: 1.4,
            }}
          >
            Créer une nouvelle demande
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: { xs: "none", sm: "block" } }}
          >
            Soumettez une nouvelle demande d&apos;assistance ou de services
          </Typography>
        </Box>

        <IconButton
          onClick={handleClose}
          disabled={isLoading}
          size="small"
          sx={{
            color: "text.secondary",
            bgcolor: alpha(theme.palette.grey[500], 0.08),
            "&:hover": {
              bgcolor: alpha(theme.palette.grey[500], 0.16),
              color: "text.primary",
            },
            transition: "all 0.2s",
          }}
        >
          <X size={20} />
        </IconButton>
      </Box>

      {/* Main Tab Navigation */}
      <Box
        sx={{
          px: { xs: 2, sm: 3, md: 4 },
          pt: { xs: 2, sm: 2.5 },
          pb: 1,
          bgcolor: "background.paper",
        }}
      >
        <ModernTabs
          tabs={[
            { id: "form", label: "Formulaire", icon: <FileText size={18} /> },
            { id: "voice", label: "Message vocal", icon: <Mic size={18} /> },
          ]}
          activeTab={mainTab}
          onTabChange={(tab) => setMainTab(tab as "form" | "voice")}
        />
      </Box>

      {/* Content */}
      <DialogContent sx={{ p: { xs: 1.5, sm: 2.5, md: 3 } }}>
        {/* FORM TAB */}
        {mainTab === "form" && (
          <Box
            component="form"
            onSubmit={handleSubmit(onSubmit)}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: { xs: 2, sm: 2.5 },
            }}
          >
            {/* Title and Priority Row */}
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: 2,
              }}
            >
              {/* Titre de la demande */}
              <Box sx={{ flex: { xs: 1, md: 2 } }}>
                <CustomInput
                  {...register("subject")}
                  label="Titre de la demande"
                  placeholder="Saisir le Titre de la demande"
                  fullWidth
                  required
                  error={!!errors.subject}
                  helperText={errors.subject?.message}
                />
              </Box>

              {/* Priorité */}
              <Box sx={{ flex: { xs: 1, md: 1 } }}>
                <Controller
                  name="urgency"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      {...field}
                      label="Priorité"
                      required
                      error={!!errors.urgency}
                      helperText={errors.urgency?.message}
                    >
                      <MenuItem value="low">Faible</MenuItem>
                      <MenuItem value="normal">Normal</MenuItem>
                      <MenuItem value="high">Élevé</MenuItem>
                      <MenuItem value="urgent">Urgent</MenuItem>
                    </CustomSelect>
                  )}
                />
              </Box>
            </Box>

            {/* Type de demande (Full width) */}
            <Controller
              name="type"
              control={control}
              render={({ field }) => (
                <CustomSelect
                  {...field}
                  label="Type de demande"
                  required
                  error={!!errors.type}
                  helperText={errors.type?.message}
                  fullWidth
                >
                  <MenuItem value="accounting">Comptabilité</MenuItem>
                  <MenuItem value="tax">Fiscalité</MenuItem>
                  <MenuItem value="consultation">Consultation</MenuItem>
                  <MenuItem value="document">Document</MenuItem>
                  <MenuItem value="other">Autre</MenuItem>
                </CustomSelect>
              )}
            />

            {/* Sujet (Full width) */}
            <CustomInput
              {...register("topic")}
              label="Sujet"
              placeholder="Choisir votre sujet"
              fullWidth
              error={!!errors.topic}
              helperText={errors.topic?.message}
            />

            {/* Description */}
            <Box>
              <CustomInput
                {...register("description")}
                label="Description"
                placeholder="Veuillez détailler votre demande"
                fullWidth
                multiline
                rows={4}
                error={!!errors.description}
                helperText={errors.description?.message}
              />
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  textAlign: "right",
                  mt: 0.5,
                  color: theme.palette.text.secondary,
                }}
              >
                Caractères: {characterCount}/5000
              </Typography>
            </Box>

            {/* Date & Time Row */}
            <Box
              sx={{
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                gap: 2,
              }}
            >
              {/* Date de réponse souhaitée */}
              <Box sx={{ flex: 1 }}>
                <Controller
                  name="desiredResponseDate"
                  control={control}
                  render={({ field }) => (
                    <CustomInput
                      {...field}
                      label="Date de réponse souhaitée"
                      type="date"
                      fullWidth
                      error={!!errors.desiredResponseDate}
                      helperText={errors.desiredResponseDate?.message}
                      slotProps={{
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                      inputProps={{
                        min: new Date().toISOString().split("T")[0],
                      }}
                    />
                  )}
                />
              </Box>

              {/* Heure de réponse souhaitée */}
              <Box sx={{ flex: 1 }}>
                <Controller
                  name="desiredResponseTime"
                  control={control}
                  render={({ field }) => (
                    <CustomInput
                      {...field}
                      label="Heure de réponse souhaitée"
                      type="time"
                      fullWidth
                      error={!!errors.desiredResponseTime}
                      helperText={errors.desiredResponseTime?.message}
                      slotProps={{
                        inputLabel: {
                          shrink: true,
                        },
                      }}
                    />
                  )}
                />
              </Box>
            </Box>

            {/* Pièce jointe - With tabs */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ mb: 1.5, fontWeight: 600, fontSize: 14 }}
              >
                Pièce jointe
              </Typography>

              <ModernModalTabs
                tabs={[
                  { id: "upload", label: "Nouveau document" },
                  { id: "select", label: "Mon espace" },
                ]}
                activeTab={activeTab}
                onTabChange={(tab) => setActiveTab(tab as "upload" | "select")}
              />

              <Box sx={{ mt: 2 }}>
                {/* Tab 1: Upload new file */}
                {activeTab === "upload" && (
                  <Controller
                    name="attachments"
                    control={control}
                    render={({ field }) => (
                      <FileUpload
                        label="Fichier"
                        value={(field.value && field.value[0]) || null}
                        onChange={(file) => field.onChange(file ? [file] : [])}
                        error={!!errors.attachments}
                        helperText={errors.attachments?.message}
                        maxSize={5}
                        acceptedFiles={[
                          ".pdf",
                          ".doc",
                          ".docx",
                          ".xls",
                          ".xlsx",
                          ".jpg",
                          ".jpeg",
                          ".png",
                        ]}
                      />
                    )}
                  />
                )}

                {/* Tab 2: Select from Mon espace */}
                {activeTab === "select" && (
                  <Box>
                    {/* Folder Tree */}
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mb: 1, display: "block" }}
                    >
                      Parcourez vos dossiers et sélectionnez des documents
                    </Typography>
                    <Box
                      sx={{
                        border: 1,
                        borderColor: "divider",
                        borderRadius: 2,
                        maxHeight: 200,
                        overflow: "auto",
                        mb: 2,
                      }}
                    >
                      <Box
                        onClick={() => setSelectedFolderId(null)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          px: 2,
                          py: 1.25,
                          cursor: "pointer",
                          bgcolor:
                            selectedFolderId === null
                              ? "action.selected"
                              : "transparent",
                          "&:hover": { bgcolor: "action.hover" },
                        }}
                      >
                        <ChevronRight size={18} color="transparent" />
                        <Folder size={18} />
                        <Typography variant="body2">Racine</Typography>
                      </Box>
                      {rootFolders.map((folder) => (
                        <FolderTreeItem
                          key={folder.id}
                          folderId={folder.id}
                          folderName={folder.name}
                          depth={0}
                          expandedIds={expandedIds}
                          onToggleExpand={handleToggleExpand}
                          selectedId={selectedFolderId}
                          onSelect={setSelectedFolderId}
                        />
                      ))}
                    </Box>

                    {/* File List */}
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        fontWeight={600}
                        sx={{ mb: 1, display: "block", fontSize: 10 }}
                      >
                        DOCUMENTS DISPONIBLES ({currentFiles.length})
                      </Typography>
                      {currentFiles.length === 0 ? (
                        <Box
                          sx={{
                            p: 3,
                            textAlign: "center",
                            color: "text.secondary",
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 2,
                          }}
                        >
                          <Typography variant="body2">
                            Aucun document dans ce dossier
                          </Typography>
                        </Box>
                      ) : (
                        <Box
                          sx={{
                            border: 1,
                            borderColor: "divider",
                            borderRadius: 2,
                            maxHeight: 250,
                            overflow: "auto",
                          }}
                        >
                          {currentFiles.map((doc) => {
                            const isSelected = selectedDocumentIds.includes(
                              doc.id,
                            );
                            const fileExtension = doc.name
                              .split(".")
                              .pop()
                              ?.toLowerCase();

                            return (
                              <Box
                                key={doc.id}
                                onClick={() => handleToggleDocument(doc.id)}
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1.5,
                                  px: 2,
                                  py: 1.5,
                                  cursor: "pointer",
                                  bgcolor: isSelected
                                    ? alpha(theme.palette.primary.main, 0.08)
                                    : "transparent",
                                  borderBottom: `1px solid ${theme.palette.divider}`,
                                  "&:last-child": { borderBottom: "none" },
                                  "&:hover": {
                                    bgcolor: alpha(
                                      theme.palette.primary.main,
                                      0.04,
                                    ),
                                  },
                                }}
                              >
                                <Checkbox
                                  checked={isSelected}
                                  size="small"
                                  sx={{ p: 0 }}
                                />
                                <Box
                                  sx={{
                                    width: 32,
                                    height: 32,
                                    bgcolor: "#3B82F6",
                                    borderRadius: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                  }}
                                >
                                  <Typography
                                    variant="caption"
                                    fontWeight={700}
                                    color="white"
                                    sx={{ fontSize: 8 }}
                                  >
                                    {fileExtension?.toUpperCase() || "FILE"}
                                  </Typography>
                                </Box>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                  <Typography
                                    variant="body2"
                                    fontSize={13}
                                    fontWeight={500}
                                    sx={{
                                      overflow: "hidden",
                                      textOverflow: "ellipsis",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {doc.name}
                                  </Typography>
                                  {doc.type && (
                                    <Typography
                                      variant="caption"
                                      color="text.secondary"
                                      sx={{ fontSize: 11 }}
                                    >
                                      {doc.type}
                                    </Typography>
                                  )}
                                </Box>
                              </Box>
                            );
                          })}
                        </Box>
                      )}
                      {selectedDocumentIds.length > 0 && (
                        <Typography
                          variant="caption"
                          color="primary"
                          sx={{ mt: 1, display: "block" }}
                        >
                          {selectedDocumentIds.length} document(s)
                          sélectionné(s)
                        </Typography>
                      )}
                    </Box>
                  </Box>
                )}
              </Box>
            </Box>

            {/* Footer actions */}
            <Box
              sx={{
                mt: 2,
                pt: 2.5,
                display: "flex",
                flexDirection: { xs: "column-reverse", sm: "row" },
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 2,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              }}
            >
              <CustomButton
                variant="text"
                onClick={handleClose}
                disabled={isLoading}
                fullWidth={isMobile}
                sx={{
                  color: "text.secondary",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.error.main, 0.04),
                    color: theme.palette.error.main,
                  },
                }}
              >
                Annuler
              </CustomButton>

              <CustomButton
                type="submit"
                variant="contained"
                disabled={
                  isLoading ||
                  !isValid ||
                  (activeTab === "select" &&
                    selectedDocumentIds.length === 0) ||
                  (activeTab === "upload" &&
                    (!watch("attachments") ||
                      watch("attachments")?.length === 0))
                }
                fullWidth={isMobile}
                sx={{
                  minWidth: { sm: 140 },
                  bgcolor: "#3B82F6",
                  "&:hover": {
                    bgcolor: "#2563EB",
                  },
                }}
              >
                {isLoading ? "Création..." : "Soumettre"}
              </CustomButton>
            </Box>
          </Box>
        )}

        {/* VOICE TAB */}
        {mainTab === "voice" && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            {/* Instructions */}
            <Box
              sx={{
                p: 2,
                bgcolor: alpha(theme.palette.info.main, 0.08),
                borderRadius: 2,
                border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Enregistrez un message vocal ou téléchargez un fichier audio
                pour soumettre votre demande.
              </Typography>
            </Box>

            {/* Audio Recorder */}
            {!uploadedAudioFile && (
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 2, fontWeight: 600, fontSize: 14 }}
                >
                  Enregistrer un message
                </Typography>
                <AudioRecorder
                  onAudioReady={handleAudioReady}
                  onDelete={handleAudioDelete}
                  maxDuration={300}
                />
              </Box>
            )}

            {/* OR Divider */}
            {!audioBlob && !uploadedAudioFile && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 2,
                  my: 1,
                }}
              >
                <Box sx={{ flex: 1, height: 1, bgcolor: "divider" }} />
                <Typography variant="body2" color="text.secondary">
                  OU
                </Typography>
                <Box sx={{ flex: 1, height: 1, bgcolor: "divider" }} />
              </Box>
            )}

            {/* File Upload */}
            {!audioBlob && (
              <Box>
                <Typography
                  variant="subtitle2"
                  sx={{ mb: 2, fontWeight: 600, fontSize: 14 }}
                >
                  Télécharger un fichier audio
                </Typography>
                <FileUpload
                  label="Fichier audio"
                  value={uploadedAudioFile}
                  onChange={handleAudioFileUpload}
                  acceptedFiles={[".mp3", ".wav", ".m4a", ".ogg", ".webm"]}
                  maxSize={10}
                />
              </Box>
            )}

            {/* Required Fields */}
            <Box>
              <Typography
                variant="subtitle2"
                sx={{ mb: 2, fontWeight: 600, fontSize: 14 }}
              >
                Informations complémentaires
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", sm: "row" },
                  gap: 2,
                }}
              >
                {/* Type de demande */}
                <Box sx={{ flex: 1 }}>
                  <CustomSelect
                    label="Type de demande"
                    value={voiceType}
                    onChange={(e) => setVoiceType(e.target.value as string)}
                    required
                    fullWidth
                  >
                    <MenuItem value="accounting">Comptabilité</MenuItem>
                    <MenuItem value="tax">Fiscalité</MenuItem>
                    <MenuItem value="consultation">Consultation</MenuItem>
                    <MenuItem value="document">Document</MenuItem>
                    <MenuItem value="other">Autre</MenuItem>
                  </CustomSelect>
                </Box>

                {/* Priorité */}
                <Box sx={{ flex: 1 }}>
                  <CustomSelect
                    label="Priorité"
                    value={voiceUrgency}
                    onChange={(e) => setVoiceUrgency(e.target.value as string)}
                    required
                    fullWidth
                  >
                    <MenuItem value="low">Faible</MenuItem>
                    <MenuItem value="normal">Normal</MenuItem>
                    <MenuItem value="high">Élevé</MenuItem>
                    <MenuItem value="urgent">Urgent</MenuItem>
                  </CustomSelect>
                </Box>
              </Box>
            </Box>

            {/* Footer actions for voice tab */}
            <Box
              sx={{
                mt: 2,
                pt: 2.5,
                display: "flex",
                flexDirection: { xs: "column-reverse", sm: "row" },
                justifyContent: "flex-end",
                alignItems: "center",
                gap: 2,
                borderTop: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
              }}
            >
              <CustomButton
                variant="text"
                onClick={handleClose}
                disabled={isLoading}
                fullWidth={isMobile}
                sx={{
                  color: "text.secondary",
                  "&:hover": {
                    bgcolor: alpha(theme.palette.error.main, 0.04),
                    color: theme.palette.error.main,
                  },
                }}
              >
                Annuler
              </CustomButton>

              <CustomButton
                onClick={handleVoiceSubmit}
                variant="contained"
                disabled={isLoading || (!audioBlob && !uploadedAudioFile)}
                fullWidth={isMobile}
                sx={{
                  minWidth: { sm: 140 },
                  bgcolor: "#3B82F6",
                  "&:hover": {
                    bgcolor: "#2563EB",
                  },
                }}
              >
                {isLoading ? "Envoi..." : "Envoyer"}
              </CustomButton>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}
