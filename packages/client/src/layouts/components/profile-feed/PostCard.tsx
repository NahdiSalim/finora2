import React from "react";
import {
  Avatar,
  Box,
  Divider,
  IconButton,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import { PencilLine } from "lucide-react";
import type { Post as ApiPost } from "src/lib/services/postsApi";
import {
  formatPostDate,
  postDisplayName,
  postDisplayAvatar,
  postAuthorInitials,
  postImageUrls,
} from "./utils";

export function PostCard({
  post,
  readOnly,
  onEdit,
}: {
  post: ApiPost;
  readOnly: boolean;
  onEdit: (post: ApiPost) => void;
}) {
  const theme = useTheme();
  const avatarUrl = postDisplayAvatar(post);
  const name = postDisplayName(post);
  const initials = postAuthorInitials(post);
  const urls = postImageUrls(post);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {avatarUrl ? (
            <Box
              component="img"
              src={avatarUrl}
              alt={name}
              sx={{
                width: 50,
                height: 50,
                borderRadius: 1,
                objectFit: "cover",
              }}
            />
          ) : (
            <Avatar
              sx={{
                width: 50,
                height: 50,
                borderRadius: 1,
                bgcolor: theme.palette.primary.main,
                color: "white",
                fontWeight: 700,
                fontSize: "1rem",
              }}
            >
              {initials}
            </Avatar>
          )}
          <Box>
            <Typography variant="body1">{name}</Typography>
            <Typography
              variant="caption"
              sx={{ color: theme.palette.grey[400] }}
            >
              {formatPostDate(post.publishedAt)}
            </Typography>
          </Box>
        </Box>

        {!readOnly && (
          <IconButton
            size="small"
            onClick={() => onEdit(post)}
            aria-label="Modifier le post"
          >
            <PencilLine size={18} color={theme.palette.primary.main} />
          </IconButton>
        )}
      </Box>

      <Typography variant="body2" sx={{ my: 1.5 }}>
        {post.content}
      </Typography>

      {urls.length > 0 && (
        <Stack
          direction="row"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
          sx={{ mt: 1 }}
        >
          {urls.map((url, idx) => (
            <Box
              key={`${post.id}-img-${idx}`}
              component="img"
              src={url}
              alt=""
              sx={{
                maxHeight: 200,
                maxWidth: 300,
                width: "auto",
                objectFit: "cover",
                borderRadius: 2,
                border: 1,
                borderColor: "divider",
              }}
            />
          ))}
        </Stack>
      )}
      <Divider sx={{ my: 2 }} />
    </Box>
  );
}
