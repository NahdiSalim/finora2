import React, { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  CardMedia,
  Stack,
  useTheme,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  Switch,
  TextField,
  alpha,
} from "@mui/material";
import { PencilLine, X, ImagePlus, Paperclip, Trash2 } from "lucide-react";
import CustomButton from "src/components/common/CustomButton";

interface PostAttachment {
  id: string;
  name: string;
  url: string;
  type: "image" | "file";
}

interface Post {
  id: number;
  name: string;
  profilePic: string;
  description: string;
  date: string;
  image?: string;
  attachments?: PostAttachment[];
}

const mockPosts: Post[] = [
  {
    id: 1,
    name: "Cabinet chevaille",
    profilePic: "public/assets/profilePic.png",
    description:
      "Mollit in laborum tempor Lorem incididunt irure. Aute eu ex ad sunt. Pariatur sint culpa do incididunt eiusmod eiusmod culpa... ! 🚀",
    date: "02/03/2026",
    image:
      "https://images.unsplash.com/photo-1657727534676-cac1bb160d64?q=80&w=704&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    attachments: [
      {
        id: "a1",
        name: "Facture Fatales.png",
        url: "https://picsum.photos/200/150",
        type: "image",
      },
      {
        id: "a2",
        name: "Facture Fatales.png",
        url: "https://picsum.photos/200/151",
        type: "image",
      },
      { id: "a3", name: "Facture Fatales.xlc", url: "#", type: "file" },
    ],
  },
  {
    id: 2,
    name: "Cabinet chevaille",
    profilePic: "public/assets/profilePic.png",
    description:
      "Mollit in laborum tempor Lorem incididunt irure. Aute eu ex ad sunt. Pariatur sint culpa do incididunt eiusmod eiusmod culpa... ! 🚀",
    date: "02/03/2026",
    image:
      "https://images.unsplash.com/photo-1657727534676-cac1bb160d64?q=80&w=704&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  },
];

export default function ProfileFeedTab() {
  const theme = useTheme();
  const [openNewPost, setOpenNewPost] = useState(false);
  const [openEditPost, setOpenEditPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [newDescription, setNewDescription] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [notifyNetwork, setNotifyNetwork] = useState(true);
  const [editAttachments, setEditAttachments] = useState<PostAttachment[]>([]);

  const handleOpenNewPost = () => {
    setNewDescription("");
    setNotifyNetwork(true);
    setOpenNewPost(true);
  };

  const handleCloseNewPost = () => setOpenNewPost(false);

  const handleCreatePost = () => {
    // TODO: submit new post
    handleCloseNewPost();
  };

  const handleOpenEditPost = (post: Post) => {
    setSelectedPost(post);
    setEditDescription(post.description);
    setEditAttachments(post.attachments ?? []);
    setOpenEditPost(true);
  };

  const handleCloseEditPost = () => {
    setOpenEditPost(false);
    setSelectedPost(null);
  };

  const handleSaveEditPost = () => {
    // TODO: save post
    handleCloseEditPost();
  };

  const handleDeletePost = () => {
    // TODO: delete post
    handleCloseEditPost();
  };

  const handleRemoveAttachment = (id: string) => {
    setEditAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box width="100%" sx={{ display: "flex", justifyContent: "flex-end" }}>
        <CustomButton
          variant="contained"
          color="secondary"
          onClick={handleOpenNewPost}
        >
          Ajouter nouveau post
        </CustomButton>
      </Box>

      <Stack>
        {mockPosts.map((post) => (
          <Box key={post.id}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box
                  component="img"
                  src={post.profilePic}
                  alt={post.name}
                  sx={{
                    width: 50,
                    height: 50,
                    borderRadius: 1,
                    objectFit: "cover",
                  }}
                />
                <Box>
                  <Typography variant="body1">{post.name}</Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: theme.palette.grey[400] }}
                  >
                    {post.date}
                  </Typography>
                </Box>
              </Box>

              <IconButton
                size="small"
                onClick={() => handleOpenEditPost(post)}
                aria-label="Modifier le post"
              >
                <PencilLine size={18} color={theme.palette.primary.main} />
              </IconButton>
            </Box>

            <Typography variant="body2" sx={{ my: 1.5 }}>
              {post.description}
            </Typography>

            {post.image && (
              <CardMedia
                component="img"
                image={post.image}
                sx={{
                  maxHeight: 200,
                  maxWidth: 300,
                  objectFit: "cover",
                  borderRadius: 3,
                }}
              />
            )}
            <Divider sx={{ my: 2 }} />
          </Box>
        ))}
      </Stack>

      {/* Modal: New post */}
      <Dialog
        open={openNewPost}
        onClose={handleCloseNewPost}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 0,
          },
        }}
      >
        <DialogTitle sx={{ pb: 0, pt: 2.5, px: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight={700}>
                New post
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Créez un nouveau dossier pour organiser vos documents
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={handleCloseNewPost}
              aria-label="Fermer"
            >
              <X size={20} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 3, pt: 2 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: alpha(theme.palette.primary.main, 0.06),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
              mb: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box>
                <Typography variant="subtitle2" fontWeight={700}>
                  Notify network
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Turn on to notify your followers.
                </Typography>
              </Box>
              <Switch
                checked={notifyNetwork}
                onChange={(e) => setNotifyNetwork(e.target.checked)}
                color="primary"
              />
            </Box>
          </Box>

          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={{ mb: 1, display: "block" }}
          >
            Ajouter une description
          </Typography>
          <TextField
            multiline
            rows={4}
            fullWidth
            placeholder="Share what you are thinking here..."
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                backgroundColor: theme.palette.grey[50],
              },
            }}
          />

          <Box
            sx={{
              mt: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Stack direction="row" spacing={1}>
              <IconButton
                size="small"
                sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}
              >
                <ImagePlus size={20} />
              </IconButton>
              <IconButton
                size="small"
                sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}
              >
                <Paperclip size={20} />
              </IconButton>
            </Stack>
            <CustomButton
              variant="contained"
              color="primary"
              onClick={handleCreatePost}
            >
              Créer
            </CustomButton>
          </Box>
        </DialogContent>
      </Dialog>

      {/* Modal: Modifier le post */}
      <Dialog
        open={openEditPost}
        onClose={handleCloseEditPost}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 0,
          },
        }}
      >
        <DialogTitle sx={{ pb: 0, pt: 2.5, px: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
            }}
          >
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Modifier le post
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Modifiez votre publication pour mettre à jour son contenu.
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={handleCloseEditPost}
              aria-label="Fermer"
            >
              <X size={20} />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ px: 3, pb: 3, pt: 2 }}>
          <Typography
            variant="subtitle2"
            fontWeight={600}
            sx={{ mb: 1, display: "block" }}
          >
            Modifier la description
          </Typography>
          <Box sx={{ position: "relative" }}>
            <TextField
              multiline
              rows={4}
              fullWidth
              placeholder="Modifier la description..."
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              variant="outlined"
              sx={{
                "& .MuiOutlinedInput-root": {
                  borderRadius: 2,
                  backgroundColor: theme.palette.grey[50],
                },
              }}
            />
            <Box
              sx={{
                position: "absolute",
                bottom: 12,
                right: 12,
                width: 28,
                height: 28,
                borderRadius: "50%",
                bgcolor: "success.main",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              AI
            </Box>
          </Box>

          {editAttachments.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1 }}
              >
                Fichiers joints
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {editAttachments.map((att) => (
                  <Box
                    key={att.id}
                    sx={{
                      position: "relative",
                      width: 100,
                      borderRadius: 2,
                      overflow: "hidden",
                      border: 1,
                      borderColor: "divider",
                    }}
                  >
                    {att.type === "image" ? (
                      <Box
                        component="img"
                        src={att.url}
                        alt={att.name}
                        sx={{ width: "100%", height: 80, objectFit: "cover" }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: "100%",
                          height: 80,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: theme.palette.grey[100],
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          .xlc
                        </Typography>
                      </Box>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => handleRemoveAttachment(att.id)}
                      sx={{
                        position: "absolute",
                        top: 4,
                        right: 4,
                        bgcolor: "rgba(255,255,255,0.9)",
                        color: "error.main",
                        width: 24,
                        height: 24,
                        "&:hover": { bgcolor: "error.lighter" },
                      }}
                    >
                      <X size={14} />
                    </IconButton>
                    <Typography
                      variant="caption"
                      sx={{
                        display: "block",
                        px: 1,
                        py: 0.5,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {att.name}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          <Box
            sx={{
              mt: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 1,
            }}
          >
            <Stack direction="row" spacing={1}>
              <IconButton
                size="small"
                sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}
              >
                <ImagePlus size={20} />
              </IconButton>
              <IconButton
                size="small"
                sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}
              >
                <Paperclip size={20} />
              </IconButton>
            </Stack>
            <Stack direction="row" spacing={1}>
              <CustomButton
                variant="contained"
                color="error"
                startIcon={<Trash2 size={18} />}
                onClick={handleDeletePost}
              >
                Supprimer
              </CustomButton>
              <CustomButton
                variant="contained"
                color="primary"
                onClick={handleSaveEditPost}
              >
                Enregistrer
              </CustomButton>
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
