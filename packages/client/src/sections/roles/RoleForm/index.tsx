import { useState, useEffect } from "react";
import type { SubmitHandler, Resolver } from "react-hook-form";
import { useForm, Controller } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";

import {
  Box,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from "@mui/material";

import CustomInput from "src/components/common/CustomInput";
import { FormButtons } from "src/components/common/FormButtons";
import { useAlert } from "src/contexts/AlertContext";
import { buildReturnUrl, getReturnPage } from "src/utils/navigationHelpers";
import {
  useCreateRoleMutation,
  useGetRoleByIdQuery,
  useGetRoleTypesInfiniteQuery,
  useUpdateRoleMutation,
} from "src/lib/services/roleApi";
import type { RoleFormData } from "src/types/roles";
import { roleValidationSchema } from "src/validations/roles/roles";
import PermissionsSelector from "../PermissionSelector";
import { ROLE_TYPE_CODES } from "src/constants/roles";

export default function RoleForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const { showAlert } = useAlert();

  const [createRole, { isLoading: creating }] = useCreateRoleMutation();
  const [updateRole, { isLoading: updating }] = useUpdateRoleMutation();
  const { data: roleData, isLoading: roleLoading } = useGetRoleByIdQuery(id!, {
    skip: !isEdit,
  });
  const { data: roleTypesData } = useGetRoleTypesInfiniteQuery({});

  const roleTypes = roleTypesData?.pages?.flatMap((page) => page.results) || [];

  const administratifRoleType = roleTypes.find(
    (type) => type.code === ROLE_TYPE_CODES.ADMIN_TYPE,
  );

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    control,
    setValue,
  } = useForm<RoleFormData>({
    resolver: yupResolver(roleValidationSchema) as Resolver<RoleFormData>,
    defaultValues: {
      name: "",
      description: "",
      roleTypeId: "",
      actionIds: [],
    },
  });

  useEffect(() => {
    if (administratifRoleType && !isEdit) {
      setValue("roleTypeId", administratifRoleType.id);
    }
  }, [administratifRoleType, isEdit, setValue]);

  useEffect(() => {
    if (isEdit && roleData) {
      reset({
        name: roleData.role?.name || "",
        description: roleData.role?.description || "",
        roleTypeId: roleData.role?.role_type?.id || "",
        actionIds: [],
      });

      const features: string[] = [];
      const pages: string[] = [];
      const actions: string[] = [];

      roleData.features?.forEach((feature) => {
        if (feature.selected) features.push(feature.id);
        feature.pages?.forEach((page) => {
          if (page.selected) pages.push(page.id);
          page.actions?.forEach((action) => {
            if (action.selected) actions.push(action.id);
          });
        });
      });

      setSelectedFeatures(features);
      setSelectedPages(pages);
      setSelectedActions(actions);
    }
  }, [isEdit, roleData, reset]);

  const onSubmit: SubmitHandler<RoleFormData> = async (data) => {
    try {
      const payload = {
        name: data.name,
        description: data.description,
        roleTypeId: data.roleTypeId,
        actionIds: selectedActions.length > 0 ? selectedActions : undefined,
      };

      if (isEdit && id) {
        await updateRole({ id, ...payload }).unwrap();
        showAlert("Role updated successfully!", "success");
      } else {
        await createRole(payload).unwrap();
        showAlert("Role created successfully!", "success");
      }

      const returnPage = getReturnPage(searchParams, isEdit);
      navigate(buildReturnUrl("/roles", isEdit, returnPage));
    } catch (err: unknown) {
      const errorMessage =
        (err as { data?: { message?: string }; message?: string })?.data
          ?.message ||
        (err as { message?: string })?.message ||
        `Error ${isEdit ? "updating" : "creating"} role`;

      showAlert(errorMessage, "error");
    }
  };

  const handleCancel = () => {
    navigate("/roles");
  };

  return (
    <>
      <Grid size={12}>
        <CustomInput
          {...register("name")}
          fullWidth
          label="Role Name *"
          error={!!errors.name}
          helperText={errors.name?.message}
          isEdit={isEdit}
        />
      </Grid>

      <Grid size={12}>
        <CustomInput
          {...register("description")}
          fullWidth
          label="Description *"
          multiline
          rows={3}
          error={!!errors.description}
          helperText={errors.description?.message}
          isEdit={isEdit}
        />
      </Grid>

      <Grid size={12}>
        <Controller
          name="roleTypeId"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth error={!!errors.roleTypeId}>
              <InputLabel>Role Type *</InputLabel>
              <Select {...field} label="Role Type *" disabled>
                {roleTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        />
      </Grid>

      <Grid size={12}>
        <Divider sx={{ my: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Permissions
          </Typography>
        </Divider>
      </Grid>

      <Grid size={12}>
        <PermissionsSelector
          selectedFeatures={selectedFeatures}
          selectedPages={selectedPages}
          selectedActions={selectedActions}
          onFeaturesChange={setSelectedFeatures}
          onPagesChange={setSelectedPages}
          onActionsChange={setSelectedActions}
        />
      </Grid>

      <Grid size={12}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <FormButtons
            onCancel={handleCancel}
            isLoading={creating || updating || roleLoading}
            isEdit={isEdit}
          />
        </Box>
      </Grid>
    </>
  );
}
