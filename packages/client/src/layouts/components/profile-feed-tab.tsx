import React, { useState, useRef } from "react";
import {
  Avatar,
  Box,
  Typography,
  IconButton,
  Stack,
  useTheme,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  Switch,
  TextField,
  alpha,
  Skeleton,
} from "@mui/material";
import { PencilLine, X, ImagePlus, Paperclip, Trash2 } from "lucide-react";
import CustomButton from "src/components/common/CustomButton";
import {
  type Post as ApiPost,
  useGetPostsQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
} from "src/lib/services/postsApi";
import { useGetMyAccountantProfileQuery } from "src/lib/services/accountantProfileApi";

function formatPostDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function postDisplayName(post: ApiPost): string {
  const name = post.company?.name;
  if (name) return name;
  const first = post.author?.firstName ?? "";
  const last = post.author?.lastName ?? "";
  if (first || last) return [first, last].filter(Boolean).join(" ");
  return "Anonyme";
}

function postDisplayAvatar(post: ApiPost): string | null {
  console.log(post);
  const url = post.author?.photoUrl ?? null;
  console.log(url);

  return url && String(url).trim() !== "" ? url : null;
}

function postAuthorInitials(post: ApiPost): string {
  const name = postDisplayName(post);
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  }
  if (parts.length === 1 && parts[0].length >= 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return "?";
}

/** URLs des images/pièces jointes du post (API renvoie imageUrls) */
function postImageUrls(post: ApiPost): string[] {
  return post.imageUrls ?? post.images ?? [];
}

interface PostAttachment {
  id: string;
  name: string;
  url: string;
  type: "image" | "file";
}

export default function ProfileFeedTab() {
  const theme = useTheme();
  const { data: profile } = useGetMyAccountantProfileQuery();
  const companyId = profile?.company?.id ?? undefined;
  const { data: postsResponse, isLoading } = useGetPostsQuery(
    { companyId, limit: 20 },
    { skip: profile === undefined },
  );
  const [createPost, { isLoading: isCreating }] = useCreatePostMutation();
  const [updatePost, { isLoading: isUpdating }] = useUpdatePostMutation();
  const [deletePost, { isLoading: isDeleting }] = useDeletePostMutation();

  const posts = postsResponse?.data ?? [];

  const [openNewPost, setOpenNewPost] = useState(false);
  const [openEditPost, setOpenEditPost] = useState(false);
  const [selectedPost, setSelectedPost] = useState<ApiPost | null>(null);
  const [newDescription, setNewDescription] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [notifyNetwork, setNotifyNetwork] = useState(true);
  const [editAttachments, setEditAttachments] = useState<PostAttachment[]>([]);
  const [newImages, setNewImages] = useState<File[]>([]);

  const newPostFileInputRef = useRef<HTMLInputElement>(null);
  const editPostFileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILES = 5;
  const ACCEPT_IMAGES = "image/*";
  const ACCEPT_ATTACHMENTS = ".pdf,.doc,.docx,image/*";

  const addNewPostFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setNewImages((prev) => {
      const next = [...prev, ...Array.from(files)];
      return next.slice(0, MAX_FILES);
    });
  };

  const addEditPostFiles = (files: FileList | null) => {
    if (!files?.length) return;
    setNewImages((prev) => {
      const next = [...prev, ...Array.from(files)];
      return next.slice(0, MAX_FILES);
    });
  };

  const removeNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleOpenNewPost = () => {
    setNewDescription("");
    setNotifyNetwork(true);
    setNewImages([]);
    setOpenNewPost(true);
  };

  const handleCloseNewPost = () => setOpenNewPost(false);

  const handleCreatePost = async () => {
    if (!newDescription.trim()) return;
    try {
      await createPost({
        title: "Publication",
        content: newDescription.trim(),
        visibility: notifyNetwork ? "public" : "private",
        images: newImages.length ? newImages : undefined,
      }).unwrap();
      handleCloseNewPost();
    } catch (err) {
      console.error("Create post failed", err);
    }
  };

  const handleOpenEditPost = (post: ApiPost) => {
    setSelectedPost(post);
    setEditDescription(post.content);
    const urls = postImageUrls(post);
    const attachments: PostAttachment[] = urls.map((url, i) => {
      const nameFromUrl =
        url.split("/").pop()?.split("?")[0] ?? `image-${i + 1}`;
      return {
        id: `img-${post.id}-${i}`,
        name: nameFromUrl,
        url,
        type: "image" as const,
      };
    });
    setEditAttachments(attachments);
    setNewImages([]);
    setOpenEditPost(true);
  };

  const handleCloseEditPost = () => {
    setOpenEditPost(false);
    setSelectedPost(null);
  };

  const handleSaveEditPost = async () => {
    if (!selectedPost) return;
    try {
      await updatePost({
        id: selectedPost.id,
        title: selectedPost.title,
        content: editDescription.trim(),
        images: newImages.length ? newImages : undefined,
        keepImageUrls: editAttachments.map((a) => a.url),
      }).unwrap();
      handleCloseEditPost();
    } catch (err) {
      console.error("Update post failed", err);
    }
  };

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    try {
      await deletePost(selectedPost.id).unwrap();
      handleCloseEditPost();
    } catch (err) {
      console.error("Delete post failed", err);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setEditAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const removeEditNewImage = (index: number) => {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
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

      {isLoading ? (
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Box key={i}>
              <Skeleton variant="circular" width={50} height={50} />
              <Skeleton variant="text" width="60%" sx={{ mt: 1 }} />
              <Skeleton
                variant="rectangular"
                height={120}
                sx={{ mt: 1, borderRadius: 2 }}
              />
              <Divider sx={{ my: 2 }} />
            </Box>
          ))}
        </Stack>
      ) : (
        <Stack>
          {posts.length === 0 ? (
            <Typography
              color="text.secondary"
              sx={{ py: 4, textAlign: "center" }}
            >
              Aucun post pour le moment. Créez-en un avec &laquo; Ajouter
              nouveau post &raquo;.
            </Typography>
          ) : (
            posts.map((post) => (
              <Box key={post.id}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    {postDisplayAvatar(post) ? (
                      <Box
                        component="img"
                        src={postDisplayAvatar(post)!}
                        alt={postDisplayName(post)}
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
                        {postAuthorInitials(post)}
                      </Avatar>
                    )}
                    <Box>
                      <Typography variant="body1">
                        {postDisplayName(post)}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{ color: theme.palette.grey[400] }}
                      >
                        {formatPostDate(post.publishedAt)}
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
                  {post.content}
                </Typography>

                {postImageUrls(post).length > 0 && (
                  <Stack
                    direction="row"
                    spacing={1}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ mt: 1 }}
                  >
                    {postImageUrls(post).map((url, idx) => (
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
            ))
          )}
        </Stack>
      )}

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
                Nouveau post
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Publiez une actualité ou partagez des documents avec votre
                réseau.
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
                  Notifier le réseau
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Activez pour notifier vos abonnés.
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
            placeholder="Partagez ce que vous avez en tête..."
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

          {newImages.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 1 }}
              >
                Fichiers joints
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {newImages.map((file, index) => (
                  <Box
                    key={`${file.name}-${index}`}
                    sx={{
                      position: "relative",
                      width: 100,
                      borderRadius: 2,
                      overflow: "hidden",
                      border: 1,
                      borderColor: "divider",
                    }}
                  >
                    {file.type.startsWith("image/") ? (
                      <Box
                        component="img"
                        src={URL.createObjectURL(file)}
                        alt={file.name}
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
                          {file.name.split(".").pop()?.toUpperCase() ??
                            "Fichier"}
                        </Typography>
                      </Box>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => removeNewImage(index)}
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
                      {file.name}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          <input
            ref={newPostFileInputRef}
            type="file"
            hidden
            multiple
            accept={ACCEPT_ATTACHMENTS}
            onChange={(e) => {
              addNewPostFiles(e.target.files);
              e.target.value = "";
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
                onClick={() => newPostFileInputRef.current?.click()}
                aria-label="Ajouter une image"
              >
                <ImagePlus size={20} />
              </IconButton>
              <IconButton
                size="small"
                sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}
                onClick={() => newPostFileInputRef.current?.click()}
                aria-label="Ajouter une pièce jointe"
              >
                <Paperclip size={20} />
              </IconButton>
            </Stack>
            <CustomButton
              variant="contained"
              color="primary"
              onClick={handleCreatePost}
              disabled={!newDescription.trim() || isCreating}
            >
              {isCreating ? "Création..." : "Créer"}
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

          {(editAttachments.length > 0 || newImages.length > 0) && (
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
                {newImages.map((file, index) => (
                  <Box
                    key={`new-${file.name}-${index}`}
                    sx={{
                      position: "relative",
                      width: 100,
                      borderRadius: 2,
                      overflow: "hidden",
                      border: 1,
                      borderColor: "primary.main",
                    }}
                  >
                    {file.type.startsWith("image/") ? (
                      <Box
                        component="img"
                        src={URL.createObjectURL(file)}
                        alt={file.name}
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
                          {file.name.split(".").pop()?.toUpperCase() ??
                            "Fichier"}
                        </Typography>
                      </Box>
                    )}
                    <IconButton
                      size="small"
                      onClick={() => removeEditNewImage(index)}
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
                      {file.name}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          )}

          <input
            ref={editPostFileInputRef}
            type="file"
            hidden
            multiple
            accept={ACCEPT_ATTACHMENTS}
            onChange={(e) => {
              addEditPostFiles(e.target.files);
              e.target.value = "";
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
                onClick={() => editPostFileInputRef.current?.click()}
                aria-label="Ajouter une image"
              >
                <ImagePlus size={20} />
              </IconButton>
              <IconButton
                size="small"
                sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}
                onClick={() => editPostFileInputRef.current?.click()}
                aria-label="Ajouter une pièce jointe"
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
                disabled={isDeleting}
              >
                {isDeleting ? "Suppression..." : "Supprimer"}
              </CustomButton>
              <CustomButton
                variant="contained"
                color="primary"
                onClick={handleSaveEditPost}
                disabled={isUpdating}
              >
                {isUpdating ? "Enregistrement..." : "Enregistrer"}
              </CustomButton>
            </Stack>
          </Box>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
