import { useMemo, useState } from "react";
import {
  Avatar,
  Box,
  Card,
  MenuItem,
  Typography,
  useTheme,
} from "@mui/material";
import { Download, Search } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

import { PageHeader } from "src/layouts/components/page-header";
import { Scrollbar } from "src/components/scrollbar";
import { DataTable } from "src/layouts/components/custom-table";
import { CustomPagination } from "src/layouts/components/table-pagination";
import { FolderTabNavigation } from "src/components/common/CustomTabs";
import CustomInput from "src/components/common/CustomInput";
import CustomSelect from "src/components/common/CustomSelect";
import { Label } from "src/components/label";
import { useTable } from "src/hooks/use-table";
import { usePermissions } from "src/hooks/usePermissions";
import { useDashboardBase } from "src/hooks/useDashboardBase";
import {
  useGetUserByIdQuery,
  useGetUsersQuery,
  useManageUserStatusMutation,
  useExportUsersMutation,
} from "src/lib/services/usersApi";
import type { User } from "src/types/user";
import { useAlert } from "src/contexts/AlertContext";
import UserDetailsModal from "src/sections/user/components/UserDetailsModal";
import UserRowActions from "src/sections/user/components/UserRowActions";

type RoleTab = "all" | "client" | "accountant" | "collaborator";
type StatusTab = "all" | "active" | "pending" | "suspended";
const ROWS_PER_PAGE = 5;

const ROLE_TABS: Array<{ id: RoleTab; label: string; apiRoleCode?: string }> = [
  { id: "all", label: "Tous" },
  { id: "client", label: "Clients", apiRoleCode: "CLIENT" },
  { id: "accountant", label: "Comptables", apiRoleCode: "ACCOUNTANT" },
  { id: "collaborator", label: "Collaborateurs", apiRoleCode: "COLLABORATOR" },
];

const toSafeNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const resolveRoleTabCountsFromApi = (
  apiData: unknown,
): Partial<Record<RoleTab, number>> => {
  const root = (apiData ?? {}) as Record<string, unknown>;
  const pagination =
    root.pagination && typeof root.pagination === "object"
      ? (root.pagination as Record<string, unknown>)
      : {};
  const countsSource =
    (root.counts as Record<string, unknown> | undefined) ??
    (root.roleCounts as Record<string, unknown> | undefined) ??
    {};

  const read = (...keys: string[]): number | null => {
    for (const key of keys) {
      const val = toSafeNumber((countsSource as Record<string, unknown>)[key]);
      if (val != null) return val;
    }
    return null;
  };

  return {
    all:
      read("all", "total", "users", "allUsers") ??
      toSafeNumber(pagination.total) ??
      undefined,
    client: read("client", "clients", "CLIENT") ?? undefined,
    accountant:
      read("accountant", "accountants", "comptable", "ACCOUNTANT") ?? undefined,
    collaborator:
      read("collaborator", "collaborators", "COLLABORATOR") ?? undefined,
  };
};

type UserListApiRole = string | { code?: string };
type UserListApiItem = {
  id: string | number;
  firstName?: string | null;
  lastName?: string | null;
  username?: string | null;
  email?: string | null;
  role?: UserListApiRole;
  status?: string;
  isActive?: boolean;
  [key: string]: unknown;
};

const getRoleCode = (user: User): string =>
  (typeof user.role === "string"
    ? user.role
    : (user.role?.code ?? "")
  ).toUpperCase();

const getStatusColor = (
  status: string,
): "success" | "warning" | "error" | "default" => {
  const s = status.toLowerCase();
  if (s === "active") return "success";
  if (s === "pending") return "warning";
  if (s === "suspended") return "error";
  return "default";
};

export default function UsersView() {
  const theme = useTheme();
  const navigate = useNavigate();
  const dashboardBase = useDashboardBase();
  const { id } = useParams<{ id?: string }>();
  const { showAlert, showConfirm } = useAlert();
  const table = useTable();
  const { hasAction } = usePermissions();

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<RoleTab>("all");
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const canWrite =
    hasAction("/users", "WRITE") || hasAction("/users/:id", "WRITE");
  const canDelete =
    hasAction("/users", "WRITE") ||
    hasAction("/users/:id", "WRITE") ||
    hasAction("/users", "DELETE") ||
    hasAction("/users/:id", "DELETE");
  const canRead = hasAction("/users", "READ");

  const apiRoleCode = ROLE_TABS.find((t) => t.id === activeTab)?.apiRoleCode;
  const searchTerm = search.trim();

  const { data, isLoading, isError } = useGetUsersQuery({
    page: table.page + 1,
    limit: ROWS_PER_PAGE,
    search: searchTerm || undefined,
    role: apiRoleCode,
    status: statusTab === "all" ? undefined : statusTab,
  });

  const users = useMemo(() => {
    const rawUsers = Array.isArray(data?.data)
      ? (data.data as unknown as UserListApiItem[])
      : [];
    return rawUsers.map((u) => {
      const fullName = [u.firstName, u.lastName]
        .filter(Boolean)
        .join(" ")
        .trim();
      const roleCode =
        typeof u.role === "string" ? u.role : (u.role?.code ?? "");
      const status =
        typeof u.status === "string"
          ? u.status.toLowerCase()
          : u.isActive
            ? "active"
            : "suspended";

      return {
        ...u,
        full_name: fullName || u.username || u.email || "Utilisateur",
        email: u.email ?? "",
        role: roleCode,
        // Backend toggle updates "status" (not always "isActive"), so status is source of truth.
        is_active: status === "active",
        status,
      } as User;
    });
  }, [data]);

  const totalCount = data?.pagination?.total ?? 0;
  const [manageUserStatus] = useManageUserStatusMutation();
  const [exportUsers, { isLoading: isExporting }] = useExportUsersMutation();

  const { data: userById } = useGetUserByIdQuery(id ?? "", {
    skip: !id,
  });

  const modalUser = useMemo(() => {
    if (!id) return selectedUser;
    const fromList = users.find((u) => String(u.id) === String(id)) ?? null;
    if (!userById) return fromList;
    if (!fromList) return userById;
    const roleFromDetails =
      typeof userById.role === "string"
        ? userById.role
        : (userById.role?.code ?? "");
    const hasRoleInDetails = Boolean(String(roleFromDetails).trim());
    return {
      ...fromList,
      ...userById,
      role: hasRoleInDetails ? userById.role : fromList.role,
    };
  }, [id, selectedUser, users, userById]);

  const roleTabCounts = useMemo(() => {
    const counts: Record<RoleTab, number> = {
      all: totalCount,
      client: 0,
      accountant: 0,
      collaborator: 0,
    };
    users.forEach((u) => {
      const rc = getRoleCode(u);
      if (rc === "CLIENT") counts.client += 1;
      if (rc === "ACCOUNTANT" || rc === "COMPTABLE") counts.accountant += 1;
      if (rc === "COLLABORATOR" || rc === "COLLABORATEUR")
        counts.collaborator += 1;
    });
    const apiCounts = resolveRoleTabCountsFromApi(data);
    return {
      all: apiCounts.all ?? counts.all,
      client: apiCounts.client ?? counts.client,
      accountant: apiCounts.accountant ?? counts.accountant,
      collaborator: apiCounts.collaborator ?? counts.collaborator,
    };
  }, [users, totalCount, data]);

  const openDetail = (user: User) => {
    setSelectedUser(user);
    navigate(`${dashboardBase}/users/${user.id}`);
  };

  const closeDetail = () => {
    setSelectedUser(null);
    navigate(`${dashboardBase}/users`);
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const currentStatus = (user.status || "").toLowerCase();
      await manageUserStatus({
        userId: String(user.id),
        action: currentStatus === "active" ? "suspend" : "activate",
      }).unwrap();
      showAlert("Statut utilisateur mis à jour", "success");
    } catch {
      showAlert("Erreur lors de la mise à jour du statut", "error");
    }
  };

  const handleDeleteUser = (user: User) => {
    showConfirm(
      `Supprimer l'utilisateur ${user.full_name || user.email || user.id} ?`,
      async () => {
        try {
          await manageUserStatus({
            userId: String(user.id),
            status: "DELETED",
          }).unwrap();
          showAlert("Utilisateur supprimé", "success");
        } catch {
          showAlert("Erreur lors de la suppression", "error");
        }
      },
    );
  };

  const handleExport = async () => {
    try {
      const { blob, filename } = await exportUsers({ lang: "fr" }).unwrap();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showAlert("Export utilisateurs lancé", "success");
    } catch {
      showAlert("Erreur lors de l'export utilisateurs", "error");
    }
  };

  const columns = [
    {
      id: "name",
      label: "Utilisateur",
      render: (row: User) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar
            sx={{
              width: 36,
              height: 36,
              backgroundColor: theme.palette.primary.main,
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            {(row.full_name || "U").charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {row.full_name}
          </Typography>
        </Box>
      ),
    },
    {
      id: "email",
      label: "Email",
      render: (row: User) => row.email || "-",
    },
    {
      id: "role",
      label: "Rôle",
      render: (row: User) => getRoleCode(row) || "-",
    },
    {
      id: "status",
      label: "Statut",
      render: (row: User) => (
        <Label color={getStatusColor(row.status || "")}>
          {(row.status || "suspended").toLowerCase() === "active"
            ? "Actif"
            : (row.status || "").toLowerCase() === "pending"
              ? "En attente"
              : "Suspendu"}
        </Label>
      ),
    },
    {
      id: "actions",
      label: "Actions",
      align: "center" as const,
      render: (row: User) => (
        <UserRowActions
          isActive={!!row.is_active}
          status={row.status}
          canWrite
          canDelete={canDelete}
          disabled={!canWrite}
          onView={() => openDetail(row)}
          onToggleStatus={() => handleToggleStatus(row)}
          onDelete={() => handleDeleteUser(row)}
        />
      ),
    },
  ];

  if (!canRead) return null;

  return (
    <PageHeader
      title="Users"
      caption="Gérez les utilisateurs et filtrez par rôle."
      actions={[
        {
          label: isExporting ? "Export..." : "Exporter Excel",
          icon: <Download size={16} />,
          onClick: handleExport,
          variant: "outlined",
          color: "secondary",
        },
      ]}
    >
      <Card sx={{ bgcolor: "white", borderRadius: 3, p: 2 }}>
        <FolderTabNavigation
          tabs={ROLE_TABS.map((tab) => ({
            id: tab.id,
            label: tab.label,
            count: roleTabCounts[tab.id],
          }))}
          activeTab={activeTab}
          onTabChange={(tabId) => {
            setActiveTab(tabId as RoleTab);
            table.onResetPage();
          }}
        />

        <Box
          sx={{
            mt: 1.5,
            mb: 1.5,
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 260 }}>
            <CustomInput
              fullWidth
              placeholder="Rechercher un utilisateur..."
              startIcon={<Search size={20} />}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                table.onResetPage();
              }}
            />
          </Box>
          <CustomSelect
            value={statusTab}
            onChange={(e) => {
              setStatusTab((e.target.value as StatusTab) || "all");
              table.onResetPage();
            }}
            displayEmpty
            sx={{ width: { xs: "100%", sm: 190 } }}
            renderValue={(value) => {
              const status = String(value ?? "");
              if (!status || status === "all") return "Statut";
              if (status === "active") return "Actif";
              if (status === "pending") return "En attente";
              if (status === "suspended") return "Suspendu";
              return "Statut";
            }}
          >
            <MenuItem value="all">
              <em>Tous les statuts</em>
            </MenuItem>
            <MenuItem value="active">Actif</MenuItem>
            <MenuItem value="pending">En attente</MenuItem>
            <MenuItem value="suspended">Suspendu</MenuItem>
          </CustomSelect>
        </Box>

        <Scrollbar>
          <DataTable
            columns={columns}
            data={users}
            isLoading={isLoading}
            isError={isError}
            rowKey={(row) => row.id}
            emptyMessage="Aucun utilisateur trouvé"
          />
        </Scrollbar>

        <CustomPagination
          page={table.page}
          count={totalCount}
          rowsPerPage={ROWS_PER_PAGE}
          onPageChange={table.onChangePage}
        />
      </Card>

      <UserDetailsModal
        open={Boolean(modalUser)}
        user={modalUser}
        onClose={closeDetail}
      />
    </PageHeader>
  );
}
