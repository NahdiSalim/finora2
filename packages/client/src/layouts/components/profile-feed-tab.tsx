import React, { useState } from "react";
import { Box, Stack, Typography, Divider, Skeleton } from "@mui/material";
import CustomButton from "src/components/common/CustomButton";
import {
  type Post as ApiPost,
  useGetPostsQuery,
  useCreatePostMutation,
  useUpdatePostMutation,
  useDeletePostMutation,
} from "src/lib/services/postsApi";
import { useGetMyAccountantProfileQuery } from "src/lib/services/accountantProfileApi";

import { EditPostDialog } from "./profile-feed/EditPostDialog";
import { NewPostDialog } from "./profile-feed/NewPostDialog";
import { PostCard } from "./profile-feed/PostCard";
import type { PostAttachment } from "./profile-feed/types";
import { postImageUrls } from "./profile-feed/utils";

interface ProfileFeedTabProps {
  /** Mode lecture seule (profil visiteur) : pas d’ajout ni modification de posts */
  readOnly?: boolean;
  /** CompanyId pour charger les posts (mode visiteur, au lieu du profil “me”) */
  companyId?: number;
}

export default function ProfileFeedTab({
  readOnly = false,
  companyId: companyIdProp,
}: ProfileFeedTabProps = {}) {
  const { data: profile } = useGetMyAccountantProfileQuery(undefined, {
    skip: companyIdProp != null,
  });
  const companyId = companyIdProp ?? profile?.company?.id ?? undefined;
  const { data: postsResponse, isLoading } = useGetPostsQuery(
    { companyId, limit: 20 },
    { skip: companyId == null },
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

  const MAX_FILES = 5;
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
    } catch {
      /* ignored */
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
    } catch {
      /* ignored */
    }
  };

  const handleDeletePost = async () => {
    if (!selectedPost) return;
    try {
      await deletePost(selectedPost.id).unwrap();
      handleCloseEditPost();
    } catch {
      /* ignored */
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
      {!readOnly && (
        <Box width="100%" sx={{ display: "flex", justifyContent: "flex-end" }}>
          <CustomButton
            variant="contained"
            color="secondary"
            onClick={handleOpenNewPost}
          >
            Ajouter nouveau post
          </CustomButton>
        </Box>
      )}

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
              {readOnly
                ? "Aucun post pour le moment."
                : "Aucun post pour le moment. Créez-en un avec « Ajouter nouveau post »."}
            </Typography>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                readOnly={readOnly}
                onEdit={handleOpenEditPost}
              />
            ))
          )}
        </Stack>
      )}

      <NewPostDialog
        open={openNewPost}
        onClose={handleCloseNewPost}
        notifyNetwork={notifyNetwork}
        onNotifyNetworkChange={setNotifyNetwork}
        description={newDescription}
        onDescriptionChange={setNewDescription}
        newImages={newImages}
        onRemoveImage={removeNewImage}
        onAddFiles={addNewPostFiles}
        accept={ACCEPT_ATTACHMENTS}
        isCreating={isCreating}
        onCreate={handleCreatePost}
      />

      <EditPostDialog
        open={openEditPost}
        onClose={handleCloseEditPost}
        editDescription={editDescription}
        onEditDescriptionChange={setEditDescription}
        editAttachments={editAttachments}
        onRemoveAttachment={handleRemoveAttachment}
        newImages={newImages}
        onRemoveNewImage={removeEditNewImage}
        onAddFiles={addEditPostFiles}
        accept={ACCEPT_ATTACHMENTS}
        isDeleting={isDeleting}
        isUpdating={isUpdating}
        onDelete={handleDeletePost}
        onSave={handleSaveEditPost}
      />
    </Box>
  );
}
