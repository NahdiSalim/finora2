import React from "react";
import {
  Box,
  Typography,
  IconButton,
  CardMedia,
  Stack,
  useTheme,
  Divider,
} from "@mui/material";
import { PencilLine } from "lucide-react";
import CustomButton from "src/components/common/CustomButton";

interface Post {
  id: number;
  name: string;
  profilePic: string;
  description: string;
  date: string;
  image?: string;
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
  },

  {
    id: 1,
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
  return (
    <Box sx={{ p: 2 }}>
      <Box width="100%" sx={{ display: "flex", justifyContent: "flex-end" }}>
        <CustomButton variant="contained" color="secondary">
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

              <IconButton size="small">
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
    </Box>
  );
}
