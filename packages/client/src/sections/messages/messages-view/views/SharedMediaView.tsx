import { useEffect, useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import MenuItem from "@mui/material/MenuItem";
import SearchIcon from "@mui/icons-material/Search";
import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";

import CustomInput from "../../../../components/common/CustomInput";
import CustomSelect from "../../../../components/common/CustomSelect";

import { sharedMediaFiles } from "../data/mock";
import type { Message, SharedMediaFile } from "../data/types";
import SharedMediaCard from "../components/SharedMediaCard";
import SharedMediaPagination from "../components/SharedMediaPagination";
import SharedMediaPreviewModal from "../components/SharedMediaPreviewModal";

type SharedMediaViewProps = {
  conversationId: number;
  allMessagesByConversation: Record<number, Message[]>;
  onBack?: () => void;
};

type FilterType = "all" | "pdf" | "image" | "doc" | "xls";

const ITEMS_PER_PAGE = 8;

function getFileCategory(fileName: string): SharedMediaFile["type"] {
  const lowerName = fileName.toLowerCase();

  if (
    lowerName.endsWith(".png") ||
    lowerName.endsWith(".jpg") ||
    lowerName.endsWith(".jpeg") ||
    lowerName.endsWith(".webp") ||
    lowerName.endsWith(".gif") ||
    lowerName.endsWith(".bmp") ||
    lowerName.endsWith(".svg")
  ) {
    return "image";
  }

  if (lowerName.endsWith(".doc") || lowerName.endsWith(".docx")) {
    return "doc";
  }

  if (
    lowerName.endsWith(".xls") ||
    lowerName.endsWith(".xlsx") ||
    lowerName.endsWith(".csv")
  ) {
    return "xls";
  }

  return "pdf";
}

function convertTo24Hour(time?: string) {
  if (!time) return "";

  const match = time.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/i);
  if (!match) return time;

  let hours = Number(match[1]);
  const minutes = match[2];
  const period = match[3].toUpperCase();

  if (period === "AM" && hours === 12) hours = 0;
  else if (period === "PM" && hours !== 12) hours += 12;

  return `${String(hours).padStart(2, "0")}:${minutes}`;
}

function formatUploadedAt(date: string, time?: string) {
  const formattedDate = new Date(date).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });

  const formattedTime = convertTo24Hour(time);

  return formattedTime
    ? `${formattedDate}, at ${formattedTime}`
    : formattedDate;
}

export default function SharedMediaView({
  conversationId,
  allMessagesByConversation,
  onBack,
}: SharedMediaViewProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<FilterType>("all");
  const [page, setPage] = useState(1);
  const [previewedFile, setPreviewedFile] = useState<SharedMediaFile | null>(
    null,
  );
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const conversationFiles = useMemo<SharedMediaFile[]>(() => {
    const messages = allMessagesByConversation[conversationId] || [];

    return messages
      .filter((message) => message.type === "file" && message.file)
      .map((message) => {
        const fileName = message.file?.name || "Fichier";

        return {
          id: Number(
            `${conversationId}${message.id}${message.date.replace(/-/g, "")}`,
          ),
          name: fileName,
          type: getFileCategory(fileName),
          size: message.file?.size || "-",
          uploadedAt: formatUploadedAt(message.date, message.time),
          previewUrl: message.file?.url,
        };
      });
  }, [allMessagesByConversation, conversationId]);

  const visibleFiles = useMemo<SharedMediaFile[]>(() => {
    const mappedFallbackFiles = sharedMediaFiles.map((file, index) => ({
      ...file,
      id: Number(`9${conversationId}${index + 1}`),
      type: getFileCategory(file.name),
    }));

    const existingNames = new Set(
      conversationFiles.map((file) => file.name.toLowerCase()),
    );

    const fallbackWithoutDuplicates = mappedFallbackFiles.filter(
      (file) => !existingNames.has(file.name.toLowerCase()),
    );

    return [...conversationFiles, ...fallbackWithoutDuplicates];
  }, [conversationFiles, conversationId]);

  const filteredFiles = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return visibleFiles.filter((file) => {
      const matchesType =
        selectedType === "all" ? true : file.type === selectedType;

      const matchesSearch =
        normalizedSearch === ""
          ? true
          : file.name.toLowerCase().includes(normalizedSearch);

      return matchesType && matchesSearch;
    });
  }, [visibleFiles, searchTerm, selectedType]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, selectedType, conversationId]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredFiles.length / ITEMS_PER_PAGE),
  );

  const paginatedFiles = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filteredFiles.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredFiles, page]);

  const handleOpenPreview = (file: SharedMediaFile) => {
    setPreviewedFile(file);
    setIsPreviewOpen(true);
  };

  const handleClosePreview = () => {
    setIsPreviewOpen(false);
    setPreviewedFile(null);
  };

  return (
    <>
      <Paper
        elevation={0}
        sx={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          flexDirection: "column",
          borderRadius: "18px",
          border: "1px solid #ECECEC",
          backgroundColor: "#FFFFFF",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1,
            borderBottom: "1px solid #F1F1F1",
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box
              onClick={onBack}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.6,
                minWidth: 0,
                cursor: "pointer",
                userSelect: "none",
                flexShrink: 0,
              }}
            >
              <ArrowBackIosNewIcon
                sx={{
                  fontSize: 13,
                  color: "#6B7280",
                  flexShrink: 0,
                }}
              />

              <Typography
                sx={{
                  fontSize: 13.5,
                  fontWeight: 500,
                  lineHeight: 1,
                  color: "#343330",
                  whiteSpace: "nowrap",
                }}
              >
                Medias partagés
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "flex-end",
                gap: 0.75,
                flexShrink: 0,
              }}
            >
              <Box sx={{ width: 180 }}>
                <CustomInput
                  placeholder="Rechercher ..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  backgroundColor="#FFFFFF"
                  border
                  startIcon={
                    <SearchIcon sx={{ fontSize: 14, color: "#A3A3A3" }} />
                  }
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      height: 30,
                      borderRadius: "6px",
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#E6E8EC",
                      borderWidth: "1px",
                    },
                    "& .MuiInputBase-input": {
                      fontSize: 10.5,
                      color: "#667085",
                      py: 0,
                    },
                  }}
                />
              </Box>

              <Box
                sx={{
                  position: "relative",
                  width: 132,
                  flexShrink: 0,
                }}
              >
                <CustomSelect
                  label=""
                  value={selectedType}
                  onChange={(event) =>
                    setSelectedType(event.target.value as FilterType)
                  }
                  sx={{
                    "& .MuiInputLabel-root": {
                      display: "none",
                    },
                    "& .MuiOutlinedInput-root": {
                      height: 30,
                      borderRadius: "6px",
                      backgroundColor: "#FFFFFF",
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#E6E8EC",
                      borderWidth: "1px",
                    },
                    "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                      {
                        borderColor: "#E6E8EC",
                        borderWidth: "1px",
                      },
                    "& .MuiSelect-select": {
                      display: "flex",
                      alignItems: "center",
                      fontSize: 10.5,
                      fontWeight: 500,
                      color: "#667085",
                      py: "0 !important",
                      pl: "26px !important",
                      pr: "28px !important",
                    },
                    "& .MuiSvgIcon-root": {
                      fontSize: 18,
                      color: "#98A2B3",
                    },
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        mt: 0.5,
                        borderRadius: "12px",
                        boxShadow: "0px 10px 30px rgba(15, 23, 42, 0.08)",
                        border: "1px solid #EEF1F4",
                        "& .MuiMenuItem-root": {
                          fontSize: 13,
                          color: "#111827",
                          minHeight: 40,
                        },
                      },
                    },
                  }}
                >
                  <MenuItem value="all">All Files</MenuItem>
                  <MenuItem value="pdf">PDF</MenuItem>
                  <MenuItem value="image">Images</MenuItem>
                  <MenuItem value="doc">Documents</MenuItem>
                  <MenuItem value="xls">Spreadsheets</MenuItem>
                </CustomSelect>

                <Box
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: 8,
                    transform: "translateY(-50%)",
                    pointerEvents: "none",
                    display: "flex",
                    alignItems: "center",
                    zIndex: 1,
                  }}
                >
                  <FilterListIcon sx={{ fontSize: 12, color: "#98A2B3" }} />
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {filteredFiles.length === 0 ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: 3,
            }}
          >
            <Typography sx={{ fontSize: 13, color: "#98A2B3" }}>
              Aucun fichier trouvé.
            </Typography>
          </Box>
        ) : (
          <>
            <Box
              sx={{
                flex: 1,
                minHeight: 0,
                px: 2.25,
                pt: 1.5,
                pb: 1.1,
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  height: "100%",
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gridAutoRows: "1fr",
                  gap: 1.5,
                  alignItems: "stretch",
                }}
              >
                {paginatedFiles.map((file) => (
                  <SharedMediaCard
                    key={file.id}
                    file={file}
                    onView={handleOpenPreview}
                  />
                ))}
              </Box>
            </Box>

            <Box
              sx={{
                flexShrink: 0,
                px: 2.25,
                py: 0.9,
                borderTop: "1px solid #F1F1F1",
                backgroundColor: "#FFFFFF",
              }}
            >
              <SharedMediaPagination
                page={page}
                totalPages={totalPages}
                onChange={setPage}
              />
            </Box>
          </>
        )}
      </Paper>

      <SharedMediaPreviewModal
        open={isPreviewOpen}
        file={previewedFile}
        onClose={handleClosePreview}
      />
    </>
  );
}
