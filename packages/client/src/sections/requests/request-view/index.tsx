import { useState, useEffect } from "react";
import { useSearchParams, useParams } from "react-router-dom";
import {
  Box,
  Card,
  IconButton,
  Typography,
  useTheme,
  alpha,
  Avatar,
  Tooltip,
  useMediaQuery,
  Stack,
  Skeleton,
  CardActions,
  Grid,
  CardContent,
} from "@mui/material";
import { motion } from "framer-motion";
import {
  Plus,
  Eye,
  Trash2,
  Search,
  ChevronDown,
  CheckCircle,
} from "lucide-react";
import RequestStatusChip from "src/components/request/RequestStatusChip";
import RequestPriorityChip from "src/components/request/RequestPriorityChip";

import { useTable } from "src/hooks/use-table";
import { DataTable, type Column } from "src/layouts/components/custom-table";
import { CustomPagination } from "src/layouts/components/table-pagination";
import { FolderTabNavigation } from "src/components/common/CustomTabs";
import CustomInput from "src/components/common/CustomInput";
import {
  useGetMyAssignedRequestsQuery,
  useGetAllRequestsQuery,
  useGetMyRequestsQuery,
  useGetRequestByIdQuery,
  useDeleteRequestMutation,
  useUpdateRequestMutation,
  useCheckHasAccountantQuery,
} from "src/lib/services/requestApi";
import RequestModal from "../modal/RequestModal";
import ViewRequestDrawer from "../drawer/ViewRequestDrawer";
import DeleteConfirmModal from "src/components/common/DeleteConfirmModal";
import { PageHeader } from "src/layouts/components/page-header";
import type { Request, RequestStatus } from "src/types/request";
import { useAppSelector } from "src/hooks/use-redux";
import { ROLE_CODES } from "src/constants/roles";
import dayjs from "dayjs";
import { useAlert } from "src/contexts/AlertContext";
import { Scrollbar } from "src/components/scrollbar";

// Animation variants pour les cartes
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: "easeOut" as const },
  }),
};

export default function RequestView() {
  const theme = useTheme();
  const table = useTable();
  const { user } = useAppSelector((state) => state.auth);
  const { showAlert } = useAlert();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { id: routeId } = useParams<{ id: string }>();
  const routeRequestId = routeId ? parseInt(routeId, 10) : undefined;
  const [searchParams, setSearchParams] = useSearchParams();
  const [openModal, setOpenModal] = useState(false);
  const [openViewDrawer, setOpenViewDrawer] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("all");
  const [viewTab, setViewTab] = useState<"my_requests" | "client_requests">(
    "my_requests",
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<number | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [sortBy, setSortBy] = useState<
    "urgency" | "status" | "createdAt" | undefined
  >(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const [deleteRequest, { isLoading: isDeleting }] = useDeleteRequestMutation();
  const [updateRequest] = useUpdateRequestMutation();

  // When navigated to /requests/:id (e.g. from chat), fetch the request and open its drawer
  const { data: requestByIdData } = useGetRequestByIdQuery(routeRequestId!, {
    skip: !routeRequestId,
  });
  useEffect(() => {
    if (requestByIdData?.data) {
      setSelectedRequest(requestByIdData.data);
      setOpenViewDrawer(true);
    }
  }, [requestByIdData]);

  // Read tab from URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "my_requests" || tabParam === "client_requests") {
      setViewTab(tabParam);
    }
  }, [searchParams]);

  // Determine user role
  const userRole =
    typeof user?.role === "object" ? user?.role?.code : user?.role;
  const userRoleUpper = userRole?.toUpperCase();
  const isClient =
    userRoleUpper === ROLE_CODES.CLIENT || userRoleUpper === "CLIENT";

  // Check if client has accountant relationship (only for clients)
  const { data: hasAccountantData } = useCheckHasAccountantQuery(undefined, {
    skip: !isClient,
  });
  // Handle both ACCOUNTANT and comptable (backend fallback)
  const isAccountant =
    userRoleUpper === ROLE_CODES.ACCOUNTANT ||
    userRoleUpper === "COMPTABLE" ||
    userRoleUpper === ROLE_CODES.ADMINISTRATOR ||
    userRoleUpper === "ADMINISTRATEUR" ||
    userRoleUpper === ROLE_CODES.COLLABORATOR ||
    userRoleUpper === "COLLABORATEUR";

  // Map tab to status filter
  const getStatusFilter = () => {
    if (selectedTab === "all") return undefined;
    return selectedTab as RequestStatus;
  };

  // Queries
  const {
    data: myAssignedRequestsData,
    isLoading: myAssignedLoading,
    isError: myAssignedError,
  } = useGetMyAssignedRequestsQuery(
    {
      page: table.page + 1,
      limit: table.rowsPerPage,
      status: getStatusFilter(),
      sortBy,
      sortOrder,
      search: searchValue.trim() || undefined,
    },
    {
      skip: !isAccountant || viewTab !== "my_requests",
      refetchOnMountOrArgChange: true,
    },
  );

  const {
    data: unassignedRequestsData,
    isLoading: unassignedLoading,
    isError: unassignedError,
  } = useGetAllRequestsQuery(
    {
      page: table.page + 1,
      limit: table.rowsPerPage,
      status: getStatusFilter(),
      sortBy,
      sortOrder,
      search: searchValue.trim() || undefined,
    },
    {
      skip: !isAccountant || viewTab !== "client_requests",
      refetchOnMountOrArgChange: true,
    },
  );

  const {
    data: clientData,
    isLoading: clientLoading,
    isError: clientError,
  } = useGetMyRequestsQuery(
    {
      page: table.page + 1,
      limit: table.rowsPerPage,
      status: getStatusFilter(),
      sortBy,
      sortOrder,
      search: searchValue.trim() || undefined,
    },
    {
      skip: !isClient,
      refetchOnMountOrArgChange: true,
    },
  );

  // Select data based on role and view tab
  let data, isLoading, isError;
  if (isClient) {
    data = clientData;
    isLoading = clientLoading;
    isError = clientError;
  } else if (isAccountant) {
    if (viewTab === "my_requests") {
      data = myAssignedRequestsData;
      isLoading = myAssignedLoading;
      isError = myAssignedError;
    } else {
      data = unassignedRequestsData;
      isLoading = unassignedLoading;
      isError = unassignedError;
    }
  }

  const requests = data?.data || [];
  const totalCount = data?.pagination?.total || 0;
  const counts = data?.counts || {
    pending: 0,
    in_progress: 0,
    resolved: 0,
    rejected: 0,
    cancelled: 0,
  };

  const totalRequests =
    counts.pending +
    counts.in_progress +
    counts.resolved +
    counts.rejected +
    counts.cancelled;

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setSelectedTab(newValue);
    table.onResetPage();
  };

  const handleViewTabChange = (newTab: "my_requests" | "client_requests") => {
    setViewTab(newTab);
    setSelectedTab("all");
    table.onResetPage();
    setSearchParams({ tab: newTab });
  };

  const handleOpenModal = () => {
    // Check if client has an accountant relationship before opening modal
    if (isClient && hasAccountantData && !hasAccountantData.hasAccountant) {
      showAlert(
        "Vous devez être en relation avec un cabinet comptable pour créer une demande. Veuillez contacter votre administrateur.",
        "warning",
      );
      return;
    }
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
  };

  const handleOpenViewDrawer = (request: Request) => {
    setSelectedRequest(request);
    setOpenViewDrawer(true);
  };
  const handleCloseViewDrawer = () => {
    setOpenViewDrawer(false);
    setSelectedRequest(null);
  };

  const handleDeleteRequest = async () => {
    if (!requestToDelete) return;
    try {
      await deleteRequest(requestToDelete).unwrap();
      showAlert("Demande supprimée avec succès", "success");
      setShowDeleteModal(false);
      setRequestToDelete(null);
    } catch (error) {
      showAlert("Erreur lors de la suppression de la demande", "error");
    }
  };

  const openDeleteModal = (requestId: number) => {
    setRequestToDelete(requestId);
    setShowDeleteModal(true);
  };

  const handleMarkAsComplete = async (requestId: number) => {
    try {
      const formData = new FormData();
      formData.append("status", "resolved");

      await updateRequest({
        id: requestId,
        data: formData,
      }).unwrap();

      showAlert("Demande marquée comme terminée", "success");
    } catch (error) {
      showAlert("Erreur lors de la mise à jour du statut", "error");
    }
  };

  const formatDate = (dateString: string) =>
    dayjs(dateString).format("DD/MM/YY");

  const handleSort = (field: "urgency" | "status" | "createdAt") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    table.onResetPage();
  };

  // Colonnes (inchangées, mais réutilisées pour les cartes)
  const columns: Column<Request>[] = [
    {
      id: "subject",
      label: "Titre de la demande",
      width: 280,
      render: (request: Request) => (
        <Tooltip title={request.subject} arrow placement="top-start">
          <Typography
            variant="body2"
            sx={{
              fontWeight: 500,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {request.subject}
          </Typography>
        </Tooltip>
      ),
    },
    ...(isAccountant
      ? [
          {
            id: "client",
            label: "Client",
            width: 220,
            render: (request: Request) => {
              const fullName = request.client
                ? `${request.client.firstName} ${request.client.lastName}`
                : "";
              return (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {request.client?.firstName?.charAt(0) || ""}
                    {request.client?.lastName?.charAt(0) || ""}
                  </Avatar>
                  <Tooltip title={fullName} arrow>
                    <Typography variant="body2" noWrap>
                      {fullName}
                    </Typography>
                  </Tooltip>
                </Box>
              );
            },
          },
        ]
      : []),
    // Conditional "Assigné à" column - only show on "Mes demandes" tab
    ...(isAccountant && viewTab === "my_requests"
      ? [
          {
            id: "assignedTo",
            label: "Assigné à",
            render: (request: Request) => (
              <Box>
                {request.convertedToTask?.assignee ? (
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: theme.palette.text.primary,
                    }}
                  >
                    {request.convertedToTask.assignee.firstName}{" "}
                    {request.convertedToTask.assignee.lastName}
                  </Typography>
                ) : request.assignedTo ? (
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      color: theme.palette.text.primary,
                    }}
                  >
                    {request.assignedTo.firstName} {request.assignedTo.lastName}
                  </Typography>
                ) : (
                  <Typography
                    variant="body2"
                    sx={{
                      color: theme.palette.text.disabled,
                      fontStyle: "italic",
                    }}
                  >
                    Non assigné
                  </Typography>
                )}
              </Box>
            ),
          },
        ]
      : []),
    {
      id: "status",
      label: (
        <Box
          component="span"
          onClick={() => handleSort("status")}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            cursor: "pointer",
            userSelect: "none",
            "&:hover": { opacity: 0.7 },
          }}
        >
          Statut
          <ChevronDown
            size={14}
            style={{
              transform:
                sortBy === "status" && sortOrder === "asc"
                  ? "rotate(180deg)"
                  : "none",
              transition: "transform 0.2s",
              opacity: sortBy === "status" ? 1 : 0.3,
            }}
          />
        </Box>
      ),
      width: 120,
      render: (request: Request) => (
        <RequestStatusChip status={request.status} size="small" />
      ),
    },
    {
      id: "urgency",
      label: (
        <Box
          component="span"
          onClick={() => handleSort("urgency")}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            cursor: "pointer",
            userSelect: "none",
            "&:hover": { opacity: 0.7 },
          }}
        >
          Priorité
          <ChevronDown
            size={14}
            style={{
              transform:
                sortBy === "urgency" && sortOrder === "asc"
                  ? "rotate(180deg)"
                  : "none",
              transition: "transform 0.2s",
              opacity: sortBy === "urgency" ? 1 : 0.3,
            }}
          />
        </Box>
      ),
      width: 100,
      render: (request: Request) => (
        <RequestPriorityChip urgency={request.urgency} size="small" />
      ),
    },
    {
      id: "createdAt",
      label: "Date de création",
      width: 120,
      render: (request: Request) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(request.createdAt)}
        </Typography>
      ),
    },
    {
      id: "desiredResponseDate",
      label: "Date souhaitée",
      width: 120,
      render: (request: Request) => (
        <Typography variant="body2" color="text.secondary">
          {request.desiredResponseDate
            ? formatDate(request.desiredResponseDate)
            : "-"}
        </Typography>
      ),
    },
    {
      id: "desiredResponseTime",
      label: "Heure souhaitée",
      width: 120,
      render: (request: Request) => (
        <Typography variant="body2" color="text.secondary">
          {request.desiredResponseTime || "-"}
        </Typography>
      ),
    },
    {
      id: "actions",
      label: "Action",
      align: "center",
      width: 120,
      render: (request: Request) => (
        <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
          <Tooltip title="Voir les détails" arrow>
            <IconButton
              size="small"
              onClick={() => handleOpenViewDrawer(request)}
              sx={{
                width: 32,
                height: 32,
                border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                borderRadius: 2,
                color: theme.palette.text.secondary,
                transition: "all 0.2s",
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  color: theme.palette.primary.main,
                  transform: "translateY(-2px)",
                },
              }}
            >
              <Eye size={16} />
            </IconButton>
          </Tooltip>
          {isAccountant && request.status !== "resolved" && (
            <Tooltip title="Marquer comme terminé" arrow>
              <IconButton
                size="small"
                onClick={() => handleMarkAsComplete(request.id)}
                sx={{
                  width: 32,
                  height: 32,
                  border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                  borderRadius: 2,
                  color: theme.palette.text.secondary,
                  transition: "all 0.2s",
                  "&:hover": {
                    borderColor: "#8B5CF6",
                    backgroundColor: alpha("#8B5CF6", 0.08),
                    color: "#8B5CF6",
                    transform: "translateY(-2px)",
                  },
                }}
              >
                <CheckCircle size={16} />
              </IconButton>
            </Tooltip>
          )}
          {isClient && (
            <Tooltip
              title={
                request.status === "resolved"
                  ? "Impossible de supprimer une demande résolue"
                  : "Supprimer la demande"
              }
              arrow
            >
              <span>
                <IconButton
                  size="small"
                  onClick={() =>
                    request.status !== "resolved" && openDeleteModal(request.id)
                  }
                  disabled={request.status === "resolved"}
                  sx={{
                    width: 32,
                    height: 32,
                    border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                    borderRadius: 2,
                    color:
                      request.status === "resolved"
                        ? theme.palette.grey[400]
                        : theme.palette.text.secondary,
                    transition: "all 0.2s",
                    "&:hover":
                      request.status !== "resolved"
                        ? {
                            borderColor: theme.palette.error.main,
                            backgroundColor: alpha(
                              theme.palette.error.main,
                              0.08,
                            ),
                            color: theme.palette.error.main,
                            transform: "translateY(-2px)",
                          }
                        : {},
                  }}
                >
                  <Trash2 size={16} />
                </IconButton>
              </span>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  // Rendu des cartes pour mobile
  const renderMobileCards = () => (
    <Grid container spacing={2.5}>
      {requests.map((request: Request, idx: number) => (
        <Grid size={{ xs: 12 }} key={request.id}>
          <motion.div
            custom={idx}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <Card
              sx={{
                borderRadius: 4,
                backdropFilter: "blur(10px)",
                backgroundColor: alpha(theme.palette.background.paper, 0.9),
                boxShadow: `0 8px 24px ${alpha(theme.palette.common.black, 0.08)}`,
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                "&:hover": {
                  transform: "translateY(-4px)",
                  boxShadow: `0 16px 32px ${alpha(theme.palette.common.black, 0.12)}`,
                },
              }}
            >
              <CardContent sx={{ p: 2.5 }}>
                <Stack spacing={2}>
                  {/* En-tête : sujet et statut/priorité */}
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: 1,
                    }}
                  >
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      sx={{ flex: 1 }}
                    >
                      {request.subject}
                    </Typography>
                    <Stack direction="row" spacing={1}>
                      <RequestPriorityChip
                        urgency={request.urgency}
                        size="small"
                      />
                      <RequestStatusChip status={request.status} size="small" />
                    </Stack>
                  </Box>

                  {/* Détails sous forme de grille */}
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 2fr",
                      gap: 1.5,
                    }}
                  >
                    {isAccountant && (
                      <>
                        <Typography variant="caption" color="text.secondary">
                          Client
                        </Typography>
                        <Typography variant="body2">
                          {request.client
                            ? `${request.client.firstName} ${request.client.lastName}`
                            : "-"}
                        </Typography>
                      </>
                    )}
                    <Typography variant="caption" color="text.secondary">
                      Assigné à
                    </Typography>
                    <Typography variant="body2">
                      {request.assignedTo
                        ? `${request.assignedTo.firstName} ${request.assignedTo.lastName}`
                        : "Non assigné"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Créé le
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(request.createdAt)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Date souhaitée
                    </Typography>
                    <Typography variant="body2">
                      {request.desiredResponseDate
                        ? formatDate(request.desiredResponseDate)
                        : "-"}
                    </Typography>
                    {request.desiredResponseTime && (
                      <>
                        <Typography variant="caption" color="text.secondary">
                          Heure souhaitée
                        </Typography>
                        <Typography variant="body2">
                          {request.desiredResponseTime}
                        </Typography>
                      </>
                    )}
                  </Box>
                </Stack>
              </CardContent>
              <CardActions sx={{ justifyContent: "flex-end", p: 2, pt: 0 }}>
                <Tooltip title="Voir les détails" arrow>
                  <IconButton
                    onClick={() => handleOpenViewDrawer(request)}
                    sx={{ ...actionButtonStyle(theme) }}
                  >
                    <Eye size={16} />
                  </IconButton>
                </Tooltip>
                {isAccountant && request.status !== "resolved" && (
                  <Tooltip title="Marquer comme terminé" arrow>
                    <IconButton
                      onClick={() => handleMarkAsComplete(request.id)}
                      sx={{
                        ...actionButtonStyle(theme),
                        "&:hover": {
                          borderColor: "#8B5CF6",
                          color: "#8B5CF6",
                          bgcolor: alpha("#8B5CF6", 0.08),
                        },
                      }}
                    >
                      <CheckCircle size={16} />
                    </IconButton>
                  </Tooltip>
                )}
                {isClient && request.status !== "resolved" && (
                  <Tooltip title="Supprimer" arrow>
                    <IconButton
                      onClick={() => openDeleteModal(request.id)}
                      sx={{
                        ...actionButtonStyle(theme),
                        "&:hover": {
                          borderColor: theme.palette.error.main,
                          color: theme.palette.error.main,
                          bgcolor: alpha(theme.palette.error.main, 0.08),
                        },
                      }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </Tooltip>
                )}
              </CardActions>
            </Card>
          </motion.div>
        </Grid>
      ))}
    </Grid>
  );

  const actionButtonStyle = (theme2: any) => ({
    width: 34,
    height: 34,
    border: `1px solid ${alpha(theme2.palette.divider, 0.8)}`,
    borderRadius: 2,
    color: theme2.palette.text.secondary,
    transition: "all 0.2s",
    "&:hover": {
      borderColor: theme2.palette.primary.main,
      backgroundColor: alpha(theme2.palette.primary.main, 0.08),
      color: theme2.palette.primary.main,
      transform: "translateY(-2px)",
    },
  });

  const getPageTitle = () => {
    if (isClient) return "Mes demandes";
    return viewTab === "my_requests" ? "Mes demandes" : "Demandes des clients";
  };

  const getPageCaption = () => {
    if (isClient) return "Suivez l'avancement de vos demandes en temps réel";
    return viewTab === "my_requests"
      ? "Gérez les demandes qui vous sont assignées"
      : "Gérez et répondez aux demandes de vos clients";
  };

  // Loading state
  if (isLoading) {
    return (
      <PageHeader title={getPageTitle()} caption={getPageCaption()}>
        <Card sx={{ p: 3, borderRadius: 4 }}>
          <Stack spacing={2}>
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} variant="rounded" height={80} />
            ))}
          </Stack>
        </Card>
      </PageHeader>
    );
  }

  return (
    <PageHeader
      title={getPageTitle()}
      caption={getPageCaption()}
      actions={
        isClient
          ? [
              {
                label: "Nouvelle demande",
                icon: <Plus size={18} />,
                onClick: handleOpenModal,
                variant: "contained",
                color: "primary",
                sx: {
                  borderRadius: 3,
                  textTransform: "none",
                  fontWeight: 600,
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: `0 8px 20px ${alpha(theme.palette.primary.main, 0.5)}`,
                  },
                },
              },
            ]
          : []
      }
    >
      <Box>
        {/* Tabs de statut avec style modernisé */}
        <FolderTabNavigation
          tabs={[
            { id: "all", label: "Toutes", count: totalRequests },
            { id: "pending", label: "En attente", count: counts.pending },
            { id: "in_progress", label: "En cours", count: counts.in_progress },
            { id: "resolved", label: "Terminés", count: counts.resolved },
          ]}
          activeTab={selectedTab}
          onTabChange={(tabId) => {
            setSelectedTab(tabId);
            table.onResetPage();
          }}
        />

        <Card
          sx={{
            bgcolor: alpha(theme.palette.background.paper, 0.9),
            backdropFilter: "blur(12px)",
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomLeftRadius: 4,
            borderBottomRightRadius: 4,
            boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.06)}`,
            border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
            borderTop: "none",
            p: { xs: 1.5, sm: 2.5 },
          }}
        >
          <CustomInput
            fullWidth
            placeholder="Rechercher une demande..."
            value={searchValue}
            onChange={(e) => {
              setSearchValue(e.target.value);
              table.onResetPage();
            }}
            startIcon={<Search size={20} />}
            sx={{
              mb: 2.5,
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                backgroundColor: alpha(theme.palette.common.white, 0.8),
                transition: "all 0.2s",
                "&:hover, &.Mui-focused": {
                  backgroundColor: theme.palette.common.white,
                  boxShadow: `0 0 0 3px ${alpha(theme.palette.primary.main, 0.1)}`,
                },
              },
            }}
          />

          {isMobile ? (
            <>
              <Scrollbar sx={{ maxHeight: "calc(100vh - 280px)", px: 0.5 }}>
                {requests.length === 0 ? (
                  <Box sx={{ textAlign: "center", py: 8 }}>
                    <Typography color="text.secondary">
                      Aucune demande trouvée
                    </Typography>
                  </Box>
                ) : (
                  renderMobileCards()
                )}
              </Scrollbar>
              <CustomPagination
                page={table.page}
                count={totalCount}
                rowsPerPage={table.rowsPerPage}
                onPageChange={table.onChangePage}
              />
            </>
          ) : (
            <>
              <Box sx={{ width: "100%", overflow: "auto" }}>
                <DataTable
                  columns={columns}
                  data={requests}
                  isLoading={isLoading}
                  isError={isError}
                  emptyMessage="Aucune demande trouvée"
                  minWidth={800}
                  rowKey={(request) => request.id.toString()}
                />
              </Box>
              {!isLoading && !isError && requests.length > 0 && (
                <Box
                  sx={{
                    borderTop: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
                    mt: 2,
                  }}
                >
                  <CustomPagination
                    page={table.page}
                    count={totalCount}
                    rowsPerPage={table.rowsPerPage}
                    onPageChange={table.onChangePage}
                  />
                </Box>
              )}
            </>
          )}
        </Card>
      </Box>

      <RequestModal open={openModal} onClose={handleCloseModal} />
      <ViewRequestDrawer
        open={openViewDrawer}
        onClose={handleCloseViewDrawer}
        request={selectedRequest}
        pageContext={viewTab}
      />
      <DeleteConfirmModal
        open={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setRequestToDelete(null);
        }}
        onConfirm={handleDeleteRequest}
        isLoading={isDeleting}
      />
    </PageHeader>
  );
}
