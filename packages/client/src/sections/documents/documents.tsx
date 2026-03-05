import { alpha, Box, Grid, Typography, useTheme } from "@mui/material";
import { CalendarDays } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ClientCard from "src/components/common/ClientCard";
import CustomButton from "src/components/common/CustomButton";
import { PageHeader } from "src/layouts/components/page-header";

export default function DocumentsView() {
  const [search, setSearch] = useState("");
  const theme = useTheme();
  const navigate = useNavigate();

  const handleChat = (clientName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    console.log(`Chat with ${clientName}`);
    // Add your chat logic here
  };

  const handleDeactivate = (clientName: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    console.log(`Deactivate ${clientName}`);
    // Add your deactivate logic here
  };

  const handleClientClick = (clientId: string | number) => {
    // Navigate to client details page
    navigate(`/clients/${clientId}`);
    // Or if you need to pass state:
    // navigate(`/clients/${clientId}`, { state: { fromDocuments: true } });
  };

  // Mock data for demonstration with IDs
  const mockClients = [
    {
      id: 1,
      cover: "https://images.unsplash.com/photo-1557682250-33bd709cbe85",
      avatar: "https://i.pravatar.cc/150?img=1",
      name: "Sophie Martin",
      email: "sophie.martin@email.com",
      processedDocs: 24,
      pendingDocs: 6,
    },
    {
      id: 2,
      cover: "https://images.unsplash.com/photo-1557683316-973673baf926",
      avatar: "https://i.pravatar.cc/150?img=2",
      name: "Thomas Bernard",
      email: "thomas.bernard@email.com",
      processedDocs: 18,
      pendingDocs: 3,
    },
    {
      id: 3,
      cover: "https://images.unsplash.com/photo-1557682224-5b8590cd9ec5",
      avatar: "https://i.pravatar.cc/150?img=3",
      name: "Julie Dubois",
      email: "julie.dubois@email.com",
      processedDocs: 32,
      pendingDocs: 8,
    },
    {
      id: 4,
      cover: "https://images.unsplash.com/photo-1557682260-96773eb01377",
      avatar: "https://i.pravatar.cc/150?img=4",
      name: "Lucas Petit",
      email: "lucas.petit@email.com",
      processedDocs: 15,
      pendingDocs: 2,
    },
    {
      id: 5,
      cover: "https://images.unsplash.com/photo-1557683311-eac922347aa1",
      avatar: "https://i.pravatar.cc/150?img=5",
      name: "Emma Leroy",
      email: "emma.leroy@email.com",
      processedDocs: 41,
      pendingDocs: 12,
    },
    {
      id: 6,
      cover: "https://images.unsplash.com/photo-1557682257-f4b0e0c7f5b0",
      avatar: "https://i.pravatar.cc/150?img=6",
      name: "Hugo Moreau",
      email: "hugo.moreau@email.com",
      processedDocs: 9,
      pendingDocs: 4,
    },
    {
      id: 7,
      cover: "https://images.unsplash.com/photo-1557683313-9736db7e4c9c",
      avatar: "https://i.pravatar.cc/150?img=7",
      name: "Chloé Roux",
      email: "chloe.roux@email.com",
      processedDocs: 27,
      pendingDocs: 5,
    },
    {
      id: 8,
      cover: "https://images.unsplash.com/photo-1557682260-96773eb01377",
      avatar: "https://i.pravatar.cc/150?img=8",
      name: "Nathan Fournier",
      email: "nathan.fournier@email.com",
      processedDocs: 13,
      pendingDocs: 7,
    },
  ];

  return (
    <PageHeader
      title="Documents partagés"
      caption="Consultez les fichiers partagés avec vous."
      searchbar={{
        value: search,
        onChange: setSearch,
        placeholder: "Rechercher...",
      }}
    >
      <Box
        sx={{
          bgcolor: "white",
          borderRadius: 3,
          overflow: "hidden",
          p: 2,
          mb: 1.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 1.5,
          }}
        >
          <Typography>{mockClients.length} clients</Typography>
          <CustomButton
            variant="outlined"
            sx={{
              position: "relative",
              minWidth: 44,
              height: 44,
              p: 0,
              borderRadius: 1.5,
              borderColor: theme.palette.divider,
              backgroundColor: theme.palette.background.paper,
              color: theme.palette.grey[600],
              transition: theme.transitions.create([
                "border-color",
                "background-color",
                "color",
              ]),
              "&:hover": {
                borderColor: theme.palette.primary.main,
                backgroundColor: alpha(theme.palette.primary.main, 0.08),
                color: theme.palette.primary.main,
              },
            }}
          >
            <CalendarDays />
          </CustomButton>
        </Box>

        {/* Grid Layout - 4 cards per row */}
        <Grid container spacing={3}>
          {mockClients.map((client) => (
            <Grid key={client.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <ClientCard
                id={client.id}
                cover={client.cover}
                avatar={client.avatar}
                name={client.name}
                email={client.email}
                processedDocs={client.processedDocs}
                pendingDocs={client.pendingDocs}
                onChat={(e) => handleChat(client.name, e)}
                onDeactivate={(e) => handleDeactivate(client.name, e)}
                onCardClick={() => handleClientClick(client.id)}
              />
            </Grid>
          ))}
        </Grid>

        {/* Optional: Empty State */}
        {mockClients.length === 0 && (
          <Box
            sx={{
              textAlign: "center",
              py: 8,
            }}
          >
            <Typography variant="h6" color="text.secondary">
              No clients found
            </Typography>
          </Box>
        )}
      </Box>
    </PageHeader>
  );
}
