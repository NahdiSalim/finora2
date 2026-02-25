import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Box,
  Card,
  FormControlLabel,
  Grid,
  IconButton,
  Switch,
  Typography,
} from "@mui/material";

import { DashboardContent } from "src/layouts/dashboard";
import {
  useGetUserByIdQuery,
  useManageUserStatusMutation,
} from "src/lib/services/usersApi";
import { useGetRolesForSelectInfiniteQuery } from "src/lib/services/roleApi";
import { useAlert } from "src/contexts/AlertContext";

import BackofficeForm from "./BackofficeForm";
import ClientForm from "./ClientForm";
import AutocompleteInfiniteScroll from "src/components/common/AutocompleteInfiniteScroll";
import type { UserRole } from "src/types/user";
import { ROLE_CODES } from "src/constants/roles";

export default function UserFormRouter() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { showAlert } = useAlert();

  const { data: userData, isLoading: userLoading } = useGetUserByIdQuery(id!, {
    skip: !isEdit,
  });
  const [manageUserStatus] = useManageUserStatusMutation();

  const [selectedRoleCode, setSelectedRoleCode] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (isEdit && userData?.role) {
      const roleCode = (userData.role as UserRole).code;
      const roleId = (userData.role as UserRole).id;

      setSelectedRoleCode(roleCode);
      setSelectedRoleId(roleId);

      setIsActive(userData.is_active);
    }
  }, [isEdit, userData]);

  const handleRoleChange = (
    value: string | string[],
    selectedItem?: Record<string, unknown>,
  ) => {
    const roleId = value as string;
    setSelectedRoleId(roleId);

    if (selectedItem && typeof selectedItem.code === "string") {
      setSelectedRoleCode(selectedItem.code);
    }
  };

  const handleCancel = () => {
    navigate("/users");
  };

  const handleStatusChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const newStatus = event.target.checked;
    setIsActive(newStatus);

    if (isEdit && id) {
      try {
        await manageUserStatus({
          userId: id,
          is_active: newStatus,
        }).unwrap();
        showAlert(
          `User ${newStatus ? "activated" : "blocked"} successfully!`,
          "success",
        );
      } catch (error) {
        console.error("Error changing user status:", error);
        showAlert("Error changing status", "error");
        setIsActive(!newStatus);
      }
    }
  };

  const getTitle = () => {
    const action = isEdit ? "Edit" : "Add";
    return `${action} User`;
  };

  const renderForm = () => {
    if (selectedRoleCode === ROLE_CODES.CLIENT) {
      return <ClientForm key={selectedRoleId} roleCode={selectedRoleCode} />;
    }
    return <BackofficeForm key={selectedRoleId} roleCode={selectedRoleCode} />;
  };

  return (
    <DashboardContent>
      <Box
        sx={{
          mb: 5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton onClick={handleCancel} sx={{ p: 0 }}>
            <Box
              component="img"
              src="/assets/iconBack.svg"
              alt="Back"
              sx={{ width: 20, height: 16 }}
            />
          </IconButton>
          <Typography variant="h5">{getTitle()}</Typography>
        </Box>

        {isEdit && userData && (
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={isActive}
                  onChange={handleStatusChange}
                  color="success"
                />
              }
              label={isActive ? "Active" : "Blocked"}
            />
          </Box>
        )}
      </Box>

      <Card sx={{ p: 4 }}>
        <Grid container spacing={3}>
          {!isEdit && (
            <Grid size={12}>
              <AutocompleteInfiniteScroll
                label="User Type *"
                value={selectedRoleId}
                onChange={handleRoleChange}
                useInfiniteQuery={useGetRolesForSelectInfiniteQuery}
                disabled={userLoading}
                itemValueKey="id"
                itemLabelKey="name"
              />
            </Grid>
          )}

          {renderForm()}
        </Grid>
      </Card>
    </DashboardContent>
  );
}
