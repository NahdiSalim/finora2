import { useEffect } from 'react';
import type { Resolver } from 'react-hook-form';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { Box, Grid } from '@mui/material';

import CustomInput from 'src/components/common/CustomInput';
import { FormButtons } from 'src/components/common/FormButtons';
import { type BackofficeFormData } from 'src/types/user';
import {
  backofficeValidationSchema,
  backofficeUpdateValidationSchema,
} from 'src/validations/users/user-validation';
import {
  useCreateUserMutation,
  useUpdateUserMutation,
  useGetUserByIdQuery,
} from 'src/lib/services/usersApi';
import { useAlert } from 'src/contexts/AlertContext';
import { buildReturnUrl, getReturnPage } from 'src/utils/navigationHelpers';

interface BackofficeFormProps {
  roleCode: string;
}

export default function BackofficeForm({ roleCode }: BackofficeFormProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const { showAlert } = useAlert();

  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const { data: userData, isLoading: userLoading } = useGetUserByIdQuery(id!, { skip: !isEdit });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<BackofficeFormData>({
    resolver: yupResolver(
      isEdit ? backofficeUpdateValidationSchema : backofficeValidationSchema
    ) as Resolver<BackofficeFormData>,
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      roleCode,
      password: '',
    },
  });

  useEffect(() => {
    if (isEdit && userData) {
      setValue('full_name', userData.full_name || '');
      setValue('email', userData.email || '');
      setValue('phone', userData.phone || '');
    }
  }, [isEdit, userData, setValue]);

  const onSubmit = async (data: BackofficeFormData) => {
    try {
      const formData = new FormData();
      formData.append('full_name', data.full_name);
      formData.append('phone', data.phone);
      formData.append('roleCode', roleCode);

      if (data.email) formData.append('email', data.email);
      if (data.password) formData.append('password', data.password);

      if (isEdit && id) {
        await updateUser({ id, formData }).unwrap();
        showAlert('Backoffice user updated successfully!', 'success');
      } else {
        await createUser(formData).unwrap();
        showAlert('Backoffice user created successfully!', 'success');
      }

      const returnPage = getReturnPage(searchParams, isEdit);
      navigate(buildReturnUrl('/users', isEdit, returnPage));
    } catch (err: unknown) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} user:`, err);

      const errorMessage =
        (err instanceof Error ? err.message : undefined) ||
        (typeof err === 'object' &&
          err !== null &&
          'data' in err &&
          (err as { data?: { message?: string } })?.data?.message) ||
        `Error ${isEdit ? 'updating' : 'creating'} the user`;

      showAlert(errorMessage, 'error');
    }
  };

  const handleCancel = () => {
    navigate('/users');
  };

  return (
    <>
      {isEdit && roleCode && (
        <Grid size={12}>
          <CustomInput fullWidth label="Role" value={roleCode} disabled isEdit={isEdit} />
        </Grid>
      )}

      <Grid size={12}>
        <CustomInput
          {...register('full_name')}
          fullWidth
          label="Full Name *"
          error={!!errors.full_name}
          helperText={errors.full_name?.message}
          isEdit={isEdit}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <CustomInput
          {...register('email')}
          fullWidth
          label="Email *"
          type="email"
          error={!!errors.email}
          helperText={errors.email?.message}
          isEdit={isEdit}
        />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <CustomInput
          {...register('phone')}
          fullWidth
          label="Phone *"
          placeholder="+21612345678"
          error={!!errors.phone}
          helperText={errors.phone?.message}
          isEdit={isEdit}
        />
      </Grid>

      <Grid size={12}>
        <CustomInput
          {...register('password')}
          fullWidth
          label={isEdit ? 'New Password' : 'Password *'}
          isPassword
          error={!!errors.password}
          helperText={
            isEdit
              ? errors.password?.message || 'Leave blank to keep current password'
              : errors.password?.message
          }
          isEdit={isEdit}
        />
      </Grid>

      <Grid size={12}>
        <CustomInput
          {...register('confirmPassword')}
          fullWidth
          label={isEdit ? 'Confirm New Password' : 'Confirm Password *'}
          isPassword
          error={!!errors.confirmPassword}
          helperText={errors.confirmPassword?.message}
          isEdit={isEdit}
        />
      </Grid>

      <Grid size={12}>
        <Box component="form" onSubmit={handleSubmit(onSubmit)}>
          <FormButtons
            onCancel={handleCancel}
            isLoading={creating || updating || userLoading}
            isEdit={isEdit}
          />
        </Box>
      </Grid>
    </>
  );
}
