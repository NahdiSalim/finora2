import React, { useState } from "react"; // Ajout de useState
import {
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material";
import {
  Download,
  FileText,
  Share2,
  Trash2,
  X,
  Eye,
} from "lucide-react";
import PdfIcon from "./pdfIcon";
import ImageIcon from "./imageIcon";
import XlsIcon from "./xlsIcon";
import { useFileDrawerStore } from "src/stores/fileDrawerStore";
import type { FileItem, FileType } from "src/components/common/File";
import CustomButton from "./CustomButton";
import { DocumentsTabs } from "src/layouts/components/DocumentTabs";
import { DocumentDetails } from "src/layouts/components/DocumentDetails";
import type { Message } from "src/layouts/components/ChatTab";
import { Chat } from "src/layouts/components/ChatTab"; // Import du type Message

// ─── Constants ────────────────────────────────────────────────────────────────

const FILE_TYPE_ICONS: Record<FileType, React.ReactNode> = {
  pdf: <PdfIcon />,
  docx: <FileText size={24} color="#2B5797" />,
  xls: <XlsIcon />,
  jpg: <ImageIcon />,
  png: <ImageIcon />,
  other: <ImageIcon />,
};

const FILE_TYPE_COLORS: Record<FileType, string> = {
  pdf: "#FEE9E7",
  docx: "#E9ECF0",
  xls: "#E3F2E9",
  jpg: "#E6F3FF",
  png: "#E6F3FF",
  other: "#F3F4F6",
};

const QUICK_ACTIONS = [
  { label: "Télécharger", icon: <Download size={16} />, action: "download" },
  { label: "Partager", icon: <Share2 size={16} />, action: "share" },
  { label: "Supprimer", icon: <Trash2 size={16} />, action: "delete" },
] as const;

// ─── Metadata Row ─────────────────────────────────────────────────────────────

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value}
      </Typography>
    </Box>
  );
}

// ─── Drawer Content ───────────────────────────────────────────────────────────

interface FileDrawerContentProps {
  file: FileItem;
  previewContentUrl: string | null;
  onClose: () => void;
  onMenuAction?: (action: string, file: FileItem) => void;
  messages: Message[];
  unreadMessages: number;
  onSendMessage: (content: string, attachments?: File[]) => void;
  onTabChange: (tabIndex: number) => void;
}

function FileDrawerContent({
  file,
  previewContentUrl,
  onClose,
  onMenuAction,
  messages,
  unreadMessages,
  onSendMessage,
  onTabChange,
}: FileDrawerContentProps) {
  const theme = useTheme();

  const handlePreview = () => {
    if (previewContentUrl) {
      window.open(previewContentUrl, "_blank");
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ── Header ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2.5,
          py: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          flexShrink: 0,
          gap: 2,
        }}
      >
        {/* Left — icon + name + created */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            minWidth: 0,
            flex: 1,
          }}
        >
          <Box sx={{ flexShrink: 0 }}>{FILE_TYPE_ICONS[file.type]}</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={600} noWrap>
              {file.name}
            </Typography>
            {file.created && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {file.created}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Right — actions */}
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}
        >
          <CustomButton
            variant="outlined"
            color="info"
            startIcon={<Eye size={18} />}
            onClick={handlePreview}
            disabled={!previewContentUrl}
          >
            Voir le doc
          </CustomButton>
          <IconButton size="small" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </Box>
      </Box>

      {/* ── Tabs Section ── */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        <DocumentsTabs
          onTabChange={onTabChange}
          detailsContent={
            <DocumentDetails
              title={file.name || "Document"}
              description="Description du document"
              category="autre"
              importanceLevel={3}
              createdAt={file.created}
              modifiedAt={file.modified}
              author="Auteur inconnu"
              tags={[]}
              fileSize={file.size}
              fileFormat={file.type.toUpperCase()}
              onFavoriteToggle={() => console.log("Toggle favorite")}
              onDownload={() => console.log("Download")}
              onShare={() => console.log("Share")}
            />
          }
          chatContent={
            <Chat
              messages={messages}
              currentUserId="currentUser"
              currentUserName="Moi"
              recipientName="Destinataire"
              recipientStatus="online"
              onSendMessage={onSendMessage}
              height={400}
            />
          }
          unreadMessages={unreadMessages}
        />
      </Box>

      <Divider />

      {/* ── Quick actions ── */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: "flex",
          gap: 1,
          flexWrap: "wrap",
          flexShrink: 0,
        }}
      >
        {QUICK_ACTIONS.map(({ label, icon, action }) => (
          <Chip
            key={action}
            icon={icon as React.ReactElement}
            label={label}
            variant="outlined"
            clickable
            color={action === "delete" ? "error" : "default"}
            size="small"
            onClick={() => {
              onMenuAction?.(action, file);
              onClose();
            }}
          />
        ))}
      </Box>
    </Box>
  );
}

// ─── Global File Drawer ───────────────────────────────────────────────────────

interface GlobalFileDrawerProps {
  /** Optional: forward menu actions to the parent (e.g. download handler) */
  onMenuAction?: (action: string, file: FileItem) => void;
}

export function GlobalFileDrawer({ onMenuAction }: GlobalFileDrawerProps) {
  const { open, file, previewContentUrl, closeDrawer } = useFileDrawerStore();

  // État pour les messages
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      senderId: "user2",
      senderName: "Jean Dupont",
      senderAvatar: "/avatars/jean.jpg",
      content: "Bonjour, j'ai une question sur ce document",
      timestamp: "10:30",
      status: "read",
      isCurrentUser: false,
    },
    {
      id: "2",
      senderId: "user2",
      senderName: "Jean Dupont",
      senderAvatar: "/avatars/jean.jpg",
      content: "Est-ce que vous pourriez me donner plus de détails ?",
      timestamp: "10:31",
      status: "read",
      isCurrentUser: false,
    },
    {
      id: "3",
      senderId: "currentUser",
      senderName: "Moi",
      content: "Bien sûr, je vous envoie ça tout de suite",
      timestamp: "10:32",
      status: "read",
      isCurrentUser: true,
    },
  ]);

  // État pour les messages non lus (pour le badge)
  const [unreadMessages, setUnreadMessages] = useState(2);

  // Fonction pour envoyer un message
  const handleSendMessage = (content: string, attachments?: File[]) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: "currentUser",
      senderName: "Moi",
      content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "sent",
      isCurrentUser: true,
      attachments: attachments?.map((file2) => ({
        type: file2.type.startsWith("image/") ? "image" : "file",
        url: URL.createObjectURL(file2),
        name: file2.name,
      })),
    };

    setMessages([...messages, newMessage]);

    // Simuler une réponse après 2 secondes
    setTimeout(() => {
      const replyMessage: Message = {
        id: (Date.now() + 1).toString(),
        senderId: "user2",
        senderName: "Jean Dupont",
        content: "Merci pour votre retour !",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: "delivered",
        isCurrentUser: false,
      };
      setMessages((prev) => [...prev, replyMessage]);
      setUnreadMessages((prev) => prev + 1);
    }, 2000);
  };

  // Fonction pour gérer le changement d'onglet
  const handleTabChange = (tabIndex: number) => {
    console.log("Onglet changé:", tabIndex);
    // Si on ouvre l'onglet Chat, réinitialiser les messages non lus
    if (tabIndex === 1) {
      setUnreadMessages(0);
    }
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={closeDrawer}
      sx={{ zIndex: (theme) => theme.zIndex.modal + 10 }}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "95%", sm: 520 }, // Légèrement plus large pour mieux afficher les tabs
            height: "calc(100% - 32px)",
            top: "16px",
            right: { xs: "13px", sm: "16px" },
            borderRadius: 3,
            overflow: "hidden",
          },
        },
      }}
    >
      {/* Guard: only render content when a file is set */}
      {file && (
        <FileDrawerContent
          file={file}
          previewContentUrl={previewContentUrl}
          onClose={closeDrawer}
          onMenuAction={onMenuAction}
          messages={messages}
          unreadMessages={unreadMessages}
          onSendMessage={handleSendMessage}
          onTabChange={handleTabChange}
        />
      )}
    </Drawer>
  );
}
