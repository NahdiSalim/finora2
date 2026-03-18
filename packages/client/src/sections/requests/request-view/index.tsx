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
import { Plus, Search, Eye, Trash2 } from "lucide-react";

import { useTable } from "src/hooks/use-table";
import { DataTable, type Column } from "src/layouts/components/custom-table";
import { CustomPagination } from "src/layouts/components/table-pagination";
import { FolderTabNavigation } from "src/layouts/components/folder-tab-navigation";
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
import CustomInput from "src/components/common/CustomInput";
import type { Request, RequestStatus } from "src/types/request";
import { useAppSelector } from "src/hooks/use-redux";
import { ROLE_CODES } from "src/constants/roles";
import dayjs from "dayjs";
import { useAlert } from "src/contexts/AlertContext";

// Status badge component
const StatusBadge = ({ status }: { status: RequestStatus }) => {
  const statusConfig = {
    resolved: {
      label: "Terminé",
      text: "#10B981",
    },
    in_progress: {
      label: "En cours",
      text: "#8B5CF6",
    },
    pending: {
      label: "En attente",
      text: "#F59E0B",
    },
    rejected: {
      label: "Rejeté",
      text: "#EF4444",
    },
    cancelled: {
      label: "Annulé",
      text: "#6B7280",
    },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <Typography
      variant="body2"
      sx={{
        color: config.text,
        fontWeight: 600,
        fontSize: 14,
      }}
    >
      {config.label}
    </Typography>
  );
};

// Priority badge component
const PriorityBadge = ({ urgency }: { urgency: string }) => {
  const priorityConfig = {
    urgent: {
      label: "Urgent",
      text: "#EF4444",
    },
    high: {
      label: "High",
      text: "#F97316",
    },
    normal: {
      label: "Normal",
      text: "#F59E0B",
    },
    low: {
      label: "Low",
      text: "#6366F1",
    },
  };

  const config =
    priorityConfig[urgency as keyof typeof priorityConfig] ||
    priorityConfig.normal;

  return (
    <Typography
      variant="body2"
      sx={{
        color: config.text,
        fontWeight: 600,
        fontSize: 14,
      }}
    >
      {config.label}
    </Typography>
  );
};

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
  ); // For accountants
  const [searchValue, setSearchValue] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<number | null>(null);

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
      sortBy: "createdAt",
    },
    { skip: !isAccountant || viewTab !== "my_requests" },
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
      sortBy: "createdAt",
    },
    { skip: !isAccountant || viewTab !== "client_requests" },
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
    },
    { skip: !isClient },
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

  // Filter requests based on search value
  const allRequests = data?.data || [];
  const filteredRequests = allRequests.filter((request: Request) => {
    if (!searchValue.trim()) return true;

    const searchLower = searchValue.toLowerCase();

    // Search in subject
    if (request.subject?.toLowerCase().includes(searchLower)) return true;

    // Search in description
    if (request.description?.toLowerCase().includes(searchLower)) return true;

    // Search in topic
    if (request.topic?.toLowerCase().includes(searchLower)) return true;

    // Search in client name
    if (request.client?.firstName?.toLowerCase().includes(searchLower))
      return true;
    if (request.client?.lastName?.toLowerCase().includes(searchLower))
      return true;

    // Search in client email
    if (request.client?.email?.toLowerCase().includes(searchLower)) return true;

    // Search in assigned user name
    if (request.assignedTo?.firstName?.toLowerCase().includes(searchLower))
      return true;
    if (request.assignedTo?.lastName?.toLowerCase().includes(searchLower))
      return true;

    return false;
  });

  const requests = filteredRequests;
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
      console.error("Error deleting request:", error);
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

  // Define table columns
  const columns: Column<Request>[] = [
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
    {
      id: "createdAt",
      label: "Date",
      render: (request: Request) => (
        <Typography variant="body2" color="text.secondary">
          {formatDate(request.createdAt)}
        </Typography>
      ),
    },
    {
      id: "status",
      label: "Statut",
      render: (request: Request) => <StatusBadge status={request.status} />,
    },
    {
      id: "urgency",
      label: "Priorité",
      render: (request: Request) => <PriorityBadge urgency={request.urgency} />,
    },
    {
      id: "desiredResponseDate",
      label: "Date limite",
      render: (request: Request) => (
        <Typography variant="body2" color="text.secondary">
          {request.desiredResponseDate
            ? formatDate(request.desiredResponseDate)
            : "-"}
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
              p: 3,
              pb: 2,
              borderBottom: `1px solid ${theme.palette.grey[200]}`,
              display: "flex",
              justifyContent: "flex-start",
            }}
          >
            <Box
              sx={{
                width: { xs: "100%", sm: "40%", md: "30%", lg: "20%" },
                minWidth: "200px",
              }}
            >
              <CustomInput
                fullWidth
                placeholder="Rechercher ..."
                value={searchValue}
                onChange={(e) => {
                  setSearchValue(e.target.value);
                  table.onResetPage();
                }}
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
