import { useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  IconButton,
  useTheme,
  CircularProgress,
} from "@mui/material";
import { Clock, Send, Smile } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useAddCommentMutation } from "src/lib/services/tasksApi";
import { useAppSelector } from "src/hooks/use-redux";
import type { Task } from "../types";

interface EchangesContentProps {
  task: Task;
  onCommentAdded?: () => void;
}

export function EchangesContent({
  task,
  onCommentAdded,
}: EchangesContentProps) {
  const theme = useTheme();
  const { user } = useAppSelector((state) => state.auth);
  const [commentText, setCommentText] = useState("");
  const [addComment, { isLoading: isSubmitting }] = useAddCommentMutation();

  const handleSubmitComment = async () => {
    if (!commentText.trim()) return;

    try {
      const formData = new FormData();
      formData.append("comment", commentText.trim());

      await addComment({ id: task.id, data: formData }).unwrap();
      setCommentText("");
      if (onCommentAdded) {
        onCommentAdded();
      }
    } catch (error) {
      console.error("Failed to add comment:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const getUserDisplayName = (comment: Task["comments"][0]) => {
    if (comment.userId === Number(user?.id)) {
      return `${comment.username} (moi)`;
    }
    return comment.username;
  };

  const getUserInitials = (username: string) => {
    return username.substring(0, 2).toUpperCase();
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        bgcolor: "white",
      }}
    >
      {/* Title */}
      <Box sx={{ mb: { xs: 2, sm: 3 } }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            fontSize: { xs: 16, sm: 18 },
            color: theme.palette.text.primary,
          }}
        >
          Echanges
        </Typography>
      </Box>

      {/* Messages Thread - Scrollable */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: { xs: 1.5, sm: 2 },
          pr: 1,
          mb: 2,
          maxHeight: { xs: "300px", sm: "400px", lg: "calc(100vh - 450px)" },
          minHeight: { xs: 150, sm: 200 },
        }}
      >
        {task.comments && task.comments.length > 0 ? (
          task.comments.map((comment, index) => (
            <Box
              key={comment.id || index}
              sx={{
                bgcolor: "#F9FAFB",
                borderRadius: 2,
                p: { xs: 1.5, sm: 2 },
              }}
            >
              {/* Header with Avatar and Name */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: { xs: 1, sm: 1.5 },
                  mb: { xs: 1, sm: 1.5 },
                }}
              >
                <Avatar
                  sx={{
                    width: { xs: 28, sm: 32 },
                    height: { xs: 28, sm: 32 },
                    bgcolor: theme.palette.primary.main,
                    fontSize: { xs: 11, sm: 12 },
                    fontWeight: 600,
                  }}
                >
                  {getUserInitials(comment.username)}
                </Avatar>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    fontSize: { xs: 13, sm: 14 },
                    color: theme.palette.text.primary,
                  }}
                >
                  {getUserDisplayName(comment)}
                </Typography>
              </Box>

              {/* Message Body */}
              <Typography
                variant="body2"
                sx={{
                  fontSize: { xs: 13, sm: 14 },
                  color: theme.palette.text.secondary,
                  lineHeight: 1.6,
                  mb: { xs: 1, sm: 1.5 },
                }}
              >
                {comment.comment}
              </Typography>

              {/* Timestamp */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                }}
              >
                <Clock size={12} color={theme.palette.text.disabled} />
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: { xs: 11, sm: 12 },
                    color: theme.palette.text.disabled,
                  }}
                >
                  {format(new Date(comment.createdAt), "d MMM yyyy 'à' HH:mm", {
                    locale: fr,
                  })}
                </Typography>
              </Box>
            </Box>
          ))
        ) : (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              minHeight: 150,
              color: theme.palette.text.disabled,
            }}
          >
            <Typography variant="body2" fontSize={14}>
              Aucun commentaire pour le moment
            </Typography>
          </Box>
        )}
      </Box>

      {/* Input Area - Fixed at Bottom */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: { xs: 1, sm: 1.5 },
          mt: "auto",
          pt: { xs: 1.5, sm: 2 },
          borderTop: `1px solid ${theme.palette.grey[200]}`,
        }}
      >
        {/* Text Input */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            bgcolor: theme.palette.grey[100],
            borderRadius: "24px",
            px: { xs: 1.5, sm: 2 },
            py: { xs: 0.75, sm: 1 },
            border: `1px solid ${theme.palette.grey[300]}`,
            "&:focus-within": {
              borderColor: theme.palette.primary.main,
              bgcolor: "white",
            },
          }}
        >
          <Smile size={18} color={theme.palette.text.disabled} />
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ecrivez votre commentaire..."
            disabled={isSubmitting}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              marginLeft: "8px",
              fontSize: "14px",
              color: theme.palette.text.primary,
              fontFamily: theme.typography.fontFamily,
            }}
          />
        </Box>

        {/* Send Button */}
        <IconButton
          onClick={handleSubmitComment}
          disabled={!commentText.trim() || isSubmitting}
          sx={{
            width: { xs: 40, sm: 44 },
            height: { xs: 40, sm: 44 },
            bgcolor: "#F97316",
            borderRadius: 2,
            "&:hover": {
              bgcolor: "#EA580C",
            },
            "&:disabled": {
              bgcolor: theme.palette.grey[300],
            },
          }}
        >
          {isSubmitting ? (
            <CircularProgress size={20} sx={{ color: "white" }} />
          ) : (
            <Send size={18} color="white" />
          )}
        </IconButton>
      </Box>
    </Box>
  );
}
