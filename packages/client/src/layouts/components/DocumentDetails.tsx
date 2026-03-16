import React, { useState } from "react";
import {
  Box,
  Typography,
  Chip,
  Stack,
  Divider,
  Grid,
  Paper,
  Rating,
  IconButton,
  Tooltip,
  useTheme,
  alpha,
} from "@mui/material";
import {
  Description as DescriptionIcon,
  CalendarToday as CalendarIcon,
  Person as PersonIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon,
  Share as ShareIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";

export interface DocumentDetailsProps {
  /** Titre du document */
  title: string;
  /** Description du document */
  description?: string;
  /** Catégorie du document */
  category: "contrat" | "facture" | "rapport" | "legal" | "autre";
  /** Niveau d'importance (1-5) */
  importanceLevel: 1 | 2 | 3 | 4 | 5;
  /** Date de création */
  createdAt?: string;
  /** Date de modification */
  modifiedAt?: string;
  /** Auteur du document */
  author?: string;
  /** Tags associés */
  tags?: string[];
  /** Taille du fichier */
  fileSize?: string;
  /** Format du fichier */
  fileFormat?: string;
  /** Nombre de pages */
  pageCount?: number;
  /** Documents associés */
  relatedDocuments?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
  /** Est favori */
  isFavorite?: boolean;
  /** Callback pour favori */
  onFavoriteToggle?: () => void;
  /** Callback pour téléchargement */
  onDownload?: () => void;
  /** Callback pour partage */
  onShare?: () => void;
}

// Mapping des catégories avec couleurs et icônes
const CATEGORY_CONFIG = {
  contrat: {
    label: "Contrat",
    color: "#4CAF50",
    icon: <DescriptionIcon />,
    bgColor: "#E8F5E9",
  },
  facture: {
    label: "Facture",
    color: "#2196F3",
    icon: <DescriptionIcon />,
    bgColor: "#E3F2FD",
  },
  rapport: {
    label: "Rapport",
    color: "#9C27B0",
    icon: <DescriptionIcon />,
    bgColor: "#F3E5F5",
  },
  legal: {
    label: "Document légal",
    color: "#FF9800",
    icon: <DescriptionIcon />,
    bgColor: "#FFF3E0",
  },
  autre: {
    label: "Autre",
    color: "#757575",
    icon: <DescriptionIcon />,
    bgColor: "#F5F5F5",
  },
};

// Configuration des niveaux d'importance
const IMPORTANCE_CONFIG = {
  1: {
    label: "Très basse",
    color: "#8BC34A",
    icon: <StarBorderIcon />,
  },
  2: {
    label: "Basse",
    color: "#CDDC39",
    icon: <StarBorderIcon />,
  },
  3: {
    label: "Moyenne",
    color: "#FFC107",
    icon: <StarIcon />,
  },
  4: {
    label: "Haute",
    color: "#FF9800",
    icon: <WarningIcon />,
  },
  5: {
    label: "Critique",
    color: "#F44336",
    icon: <ErrorIcon />,
  },
};

export function DocumentDetails({
  title,
  description,
  category,
  importanceLevel,
  createdAt,
  modifiedAt,
  author,
  tags = [],
  fileSize,
  fileFormat,
  pageCount,
  relatedDocuments = [],
  isFavorite = false,
  onFavoriteToggle,
  onDownload,
  onShare,
}: DocumentDetailsProps) {
  const theme = useTheme();
  const [expanded, setExpanded] = useState(false);

  const categoryConfig = CATEGORY_CONFIG[category];
  const importanceConfig = IMPORTANCE_CONFIG[importanceLevel];

  return (
    <Box sx={{ width: "100%" }}>
      {/* En-tête avec titre et actions */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 2,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {title}
          </Typography>
          {description && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: "-webkit-box",
                WebkitLineClamp: expanded ? "unset" : 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                cursor: description.length > 100 ? "pointer" : "default",
              }}
              onClick={() => description.length > 100 && setExpanded(!expanded)}
            >
              {description}
            </Typography>
          )}
        </Box>

        {/* Actions rapides */}
        <Stack direction="row" spacing={1}>
          {onFavoriteToggle && (
            <Tooltip
              title={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
            >
              <IconButton onClick={onFavoriteToggle} size="small">
                {isFavorite ? <StarIcon color="warning" /> : <StarBorderIcon />}
              </IconButton>
            </Tooltip>
          )}
          {onDownload && (
            <Tooltip title="Télécharger">
              <IconButton onClick={onDownload} size="small">
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          )}
          {onShare && (
            <Tooltip title="Partager">
              <IconButton onClick={onShare} size="small">
                <ShareIcon />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Grille d'informations */}
      <Grid container spacing={2}>
        {/* Catégorie */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: alpha(categoryConfig.bgColor, 0.3),
              borderColor: alpha(categoryConfig.color, 0.3),
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <Box sx={{ color: categoryConfig.color }}>
                {categoryConfig.icon}
              </Box>
              <Typography variant="body2" color="text.secondary">
                Catégorie
              </Typography>
            </Stack>
            <Chip
              label={categoryConfig.label}
              size="small"
              sx={{
                bgcolor: categoryConfig.color,
                color: "white",
                fontWeight: 600,
              }}
            />
          </Paper>
        </Grid>

        {/* Niveau d'importance */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: alpha(importanceConfig.color, 0.1),
              borderColor: alpha(importanceConfig.color, 0.3),
            }}
          >
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 1 }}
            >
              <Box sx={{ color: importanceConfig.color }}>
                {importanceConfig.icon}
              </Box>
              <Typography variant="body2" color="text.secondary">
                Importance
              </Typography>
            </Stack>

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Rating
                value={importanceLevel}
                max={5}
                readOnly
                icon={<StarIcon sx={{ color: importanceConfig.color }} />}
                emptyIcon={<StarBorderIcon />}
              />
              <Typography
                variant="caption"
                sx={{ color: importanceConfig.color, fontWeight: 600 }}
              >
                {importanceConfig.label}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Métadonnées */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Informations supplémentaires
            </Typography>

            <Grid container spacing={2}>
              {author && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PersonIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      <strong>Auteur:</strong> {author}
                    </Typography>
                  </Stack>
                </Grid>
              )}

              {createdAt && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      <strong>Créé le:</strong> {createdAt}
                    </Typography>
                  </Stack>
                </Grid>
              )}

              {modifiedAt && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      <strong>Modifié le:</strong> {modifiedAt}
                    </Typography>
                  </Stack>
                </Grid>
              )}

              {fileSize && fileFormat && (
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <AttachFileIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      <strong>Fichier:</strong> {fileFormat} • {fileSize}
                      {pageCount &&
                        ` • ${pageCount} page${pageCount > 1 ? "s" : ""}`}
                    </Typography>
                  </Stack>
                </Grid>
              )}
            </Grid>
          </Paper>
        </Grid>

        {/* Tags */}
        {tags.length > 0 && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Tags
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {tags.map((tag, index) => (
                  <Chip
                    key={index}
                    label={tag}
                    size="small"
                    variant="outlined"
                    sx={{ mb: 1 }}
                  />
                ))}
              </Stack>
            </Paper>
          </Grid>
        )}

        {/* Documents associés */}
        {relatedDocuments.length > 0 && (
          <Grid size={{ xs: 12, sm: 6 }}>
            {" "}
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Documents associés
              </Typography>
              <Stack spacing={1}>
                {relatedDocuments.map((doc) => (
                  <Box
                    key={doc.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      p: 1,
                      borderRadius: 1,
                      "&:hover": {
                        bgcolor: alpha(theme.palette.primary.main, 0.04),
                      },
                      cursor: "pointer",
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <DescriptionIcon fontSize="small" color="action" />
                      <Typography variant="body2">{doc.name}</Typography>
                      <Chip label={doc.type} size="small" variant="outlined" />
                    </Stack>
                    <IconButton size="small">
                      <DownloadIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
              </Stack>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
