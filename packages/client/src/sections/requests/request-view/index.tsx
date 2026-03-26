import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Box,
  Card,
  IconButton,
  Typography,
  useTheme,
  alpha,
} from "@mui/material";
import { Plus, Eye, Trash2, Search, ChevronDown } from "lucide-react";
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
  useDeleteRequestMutation,
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

export default function RequestView() {
  const theme = useTheme();
  const table = useTable();
  const { user } = useAppSelector((state) => state.auth);
  const { showAlert } = useAlert();
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

  // Read tab from URL query parameter
  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam === "my_requests" || tabParam === "client_requests") {
      setViewTab(tabParam);
    }
  }, [searchParams]);

  // Determine user role (convert to uppercase for comparison)
  const userRole =
    typeof user?.role === "object" ? user?.role?.code : user?.role;
  const userRoleUpper = userRole?.toUpperCase();
  const isClient =
    userRoleUpper === ROLE_CODES.CLIENT || userRoleUpper === "CLIENT";
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

  // For accountants: get my assigned requests (Mes demandes)
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

  // For accountants: get all unassigned client requests (Demandes des clients)
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

  // Get requests from backend (already paginated and filtered by search)
  const requests = data?.data || [];
  const totalCount = data?.pagination?.total || 0;
  const counts = data?.counts || {
    pending: 0,
    in_progress: 0,
    resolved: 0,
    rejected: 0,
    cancelled: 0,
  };

  // Calculate total count for "Toutes"
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
    setSelectedTab("all"); // Reset status tab when changing view
    table.onResetPage();
    // Update URL query parameter
    setSearchParams({ tab: newTab });
  };

  const handleOpenModal = () => {
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

  // Format date to DD/MM/YY
  const formatDate = (dateString: string) => {
    return dayjs(dateString).format("DD/MM/YY");
  };

  const handleSort = (field: "urgency" | "status" | "createdAt") => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    table.onResetPage();
  };

  // Define table columns
  const columns: Column<Request>[] = [
    {
      id: "subject",
      label: "Titre de la demande",
      render: (request: Request) => (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 500,
            color: theme.palette.text.primary,
          }}
        >
          {request.subject}
        </Typography>
      ),
    },
    // Conditional client column for accountants
    ...(isAccountant
      ? [
          {
            id: "client",
            label: "Client",
            render: (request: Request) => (
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 500,
                  color: theme.palette.text.primary,
                }}
              >
                {request.client?.firstName} {request.client?.lastName}
              </Typography>
            ),
          },
        ]
      : []),
    {
      id: "assignedTo",
      label: "Assigné à",
      render: (request: Request) => (
        <Box>
          {request.assignedTo ? (
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
          {request.convertedToTask?.assignee && (
            <Typography
              variant="caption"
              sx={{
                color: theme.palette.info.main,
                fontSize: 11,
                fontWeight: 500,
              }}
            >
              → {request.convertedToTask.assignee.firstName}{" "}
              {request.convertedToTask.assignee.lastName}
            </Typography>
          )}
        </Box>
      ),
    },
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
      render: (request: Request) => (
        <RequestPriorityChip urgency={request.urgency} size="small" />
      ),
    },
    {
      id: "createdAt",
      label: "Date de création",
      render: (request: Request) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(request.createdAt)}
        </Typography>
      ),
    },
    {
      id: "desiredResponseDate",
      label: "Date souhaitée",
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
      render: (request: Request) => (
        <Box sx={{ display: "flex", gap: 1, justifyContent: "center" }}>
          {/* View Details Button */}
          <IconButton
            size="small"
            onClick={() => handleOpenViewDrawer(request)}
            sx={{
              width: 32,
              height: 32,
              border: `1px solid ${theme.palette.grey[300]}`,
              borderRadius: 1.5,
              color: theme.palette.text.secondary,
              "&:hover": {
                borderColor: theme.palette.primary.main,
                color: theme.palette.primary.main,
                bgcolor: alpha(theme.palette.primary.main, 0.08),
              },
            }}
          >
            <Eye size={16} />
          </IconButton>

          {/* Delete Button - Only for clients, disabled for resolved requests */}
          {isClient && (
            <IconButton
              size="small"
              onClick={() => {
                if (request.status !== "resolved") {
                  openDeleteModal(request.id);
                }
              }}
              disabled={request.status === "resolved"}
              sx={{
                width: 32,
                height: 32,
                border: `1px solid ${theme.palette.grey[300]}`,
                borderRadius: 1.5,
                color:
                  request.status === "resolved"
                    ? theme.palette.grey[400]
                    : theme.palette.text.secondary,
                "&:hover":
                  request.status !== "resolved"
                    ? {
                        borderColor: theme.palette.error.main,
                        color: theme.palette.error.main,
                        bgcolor: alpha(theme.palette.error.main, 0.08),
                      }
                    : {},
                cursor:
                  request.status === "resolved" ? "not-allowed" : "pointer",
              }}
            >
              <Trash2 size={16} />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  // Dynamic title and caption based on view
  const getPageTitle = () => {
    if (isClient) return "Mes demandes";
    if (isAccountant) {
      return viewTab === "my_requests"
        ? "Mes demandes"
        : "Demandes des clients";
    }
    // Default to "Mes demandes" for my_requests tab
    return viewTab === "my_requests" ? "Mes demandes" : "Demandes des clients";
  };

  const getPageCaption = () => {
    if (isClient) return "Suivez l'avancement de vos demandes en temps réel";
    if (isAccountant) {
      return viewTab === "my_requests"
        ? "Gérez les demandes qui vous sont assignées"
        : "Gérez et répondez aux demandes de vos clients";
    }
    // Default caption based on view tab
    return viewTab === "my_requests"
      ? "Gérez les demandes qui vous sont assignées"
      : "Gérez et répondez aux demandes de vos clients";
  };

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
              },
            ]
          : []
      }
    >
      {/* Tabs and Table Card Container */}
      <Box>
        {/* Status Tabs */}
        <FolderTabNavigation
          tabs={[
            {
              id: "all",
              label: "Toutes",
              count: totalRequests,
            },
            {
              id: "pending",
              label: "En attente",
              count: counts.pending,
            },
            {
              id: "in_progress",
              label: "En cours",
              count: counts.in_progress,
            },
            {
              id: "resolved",
              label: "Terminés",
              count: counts.resolved,
            },
          ]}
          activeTab={selectedTab}
          onTabChange={(tabId) => {
            setSelectedTab(tabId);
            table.onResetPage();
          }}
        />

        {/* Table Card - Merged with tabs */}
        <Card
          sx={{
            bgcolor: "white",
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            borderBottomLeftRadius: 12,
            borderBottomRightRadius: 12,
            boxShadow: "none",
            border: `1px solid ${theme.palette.grey[200]}`,
            borderTop: "none",
            mt: 0,
          }}
        >
          {/* Search Bar */}
          <Box
            sx={{
              p: { xs: 2, sm: 2.5 },
              borderBottom: `1px solid ${theme.palette.grey[200]}`,
            }}
          >
            <Box
              sx={{
                width: { xs: "100%", sm: "60%", md: "35%", lg: "25%" },
                minWidth: { sm: 200 },
              }}
            >
              <CustomInput
                fullWidth
                placeholder="Rechercher"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                startIcon={<Search size={20} />}
              />
            </Box>
          </Box>

          {/* Table Container */}
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

          {/* Pagination */}
          {!isLoading && !isError && requests.length > 0 && (
            <Box
              sx={{
                borderTop: `1px solid ${theme.palette.grey[200]}`,
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
