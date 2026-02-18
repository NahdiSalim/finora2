import { useEffect, useState } from 'react';
import type { Resolver } from 'react-hook-form';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

import { Box, Grid, MenuItem, Button, Typography } from '@mui/material';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';

import CustomInput from 'src/components/common/CustomInput';
import { FormButtons } from 'src/components/common/FormButtons';
import { FileUpload } from 'src/components/common/FileUpload';
import AutocompleteInfiniteScroll from 'src/components/common/AutocompleteInfiniteScroll';
import { type ClientFormData } from 'src/types/user';
import {
  clientValidationSchema,
  clientUpdateValidationSchema,
} from 'src/validations/users/user-validation';
import {
  useCreateUserMutation,
  useUpdateUserMutation,
  useGetUserByIdQuery,
  useGetResidenceTypesForSelectInfiniteQuery,
  useGetCountriesForSelectInfiniteQuery,
  useGetRegionsForSelectInfiniteQuery,
} from 'src/lib/services/usersApi';
import { useAlert } from 'src/contexts/AlertContext';
import { buildReturnUrl, getReturnPage } from 'src/utils/navigationHelpers';

interface ClientFormProps {
  roleCode: string;
}

export default function ClientForm({ roleCode }: ClientFormProps) {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEdit = !!id;
  const { showAlert } = useAlert();

  const [createUser, { isLoading: creating }] = useCreateUserMutation();
  const [updateUser, { isLoading: updating }] = useUpdateUserMutation();
  const { data: userData, isLoading: userLoading } = useGetUserByIdQuery(id!, { skip: !isEdit });

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>('');
  const [documentMainFile, setDocumentMainFile] = useState<File | null>(null);
  const [documentBackFile, setDocumentBackFile] = useState<File | null>(null);
  const [existingDocumentMainUrl, setExistingDocumentMainUrl] = useState<string>('');
  const [existingDocumentBackUrl, setExistingDocumentBackUrl] = useState<string>('');
  const [documentType, setDocumentType] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    control,
    watch,
  } = useForm<ClientFormData>({
    resolver: yupResolver(
      isEdit ? clientUpdateValidationSchema : clientValidationSchema
    ) as Resolver<ClientFormData>,
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      roleCode,
      gender: undefined,
      birth_date: '',
      address: '',
      origin_country: '',
      region: '',
      residence_type: '',
      document_type: '',
      photo: null,
      document_main: null,
      document_back: null,
    },
  });

  useEffect(() => {
    const subscription = watch((value, { name }) => {
      if (name === 'document_type') {
        setDocumentType(value.document_type || '');
      }
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  useEffect(() => {
    if (isEdit && userData?.client) {
      const client = userData.client;
      const uploadsUrl = import.meta.env.VITE_UPLOADS_URL || import.meta.env.VITE_API_URL;

      setValue('full_name', userData.full_name || '');
      setValue('email', userData.email || '');
      setValue('phone', userData.phone || '');
      setValue('gender', client.gender || '');
      setValue('birth_date', client.birth_date || '');
      setValue('address', client.address || '');
      setValue('origin_country', client.origin_country?.value || '');
      setValue('region', client.region?.value || '');
      setValue('residence_type', client.residence_type?.value || '');

      if (client.photo) {
        setPhotoPreview(`${uploadsUrl}/${client.photo}`);
      }

      if (client.residencyDocuments && client.residencyDocuments.length > 0) {
        const firstDoc = client.residencyDocuments[0];
        const docType =
          firstDoc.document_type === 'visa' || firstDoc.type === 'visa' ? 'visa' : 'titre_sejour';

        setValue('document_type', docType);
        setDocumentType(docType);
        setExistingDocumentMainUrl(`${uploadsUrl}/${firstDoc.file_url}`);

        if (docType === 'titre_sejour' && client.residencyDocuments.length > 1) {
          const backDoc = client.residencyDocuments[1];
          if (backDoc?.file_url) {
            setExistingDocumentBackUrl(`${uploadsUrl}/${backDoc.file_url}`);
          }
        }
      }
    }
  }, [isEdit, userData, setValue]);

  const onSubmit = async (data: ClientFormData) => {
    try {
      const formData = new FormData();

      formData.append('full_name', data.full_name);
      formData.append('phone', data.phone);
      formData.append('email', data.email);
      formData.append('roleCode', roleCode);

      if (data.gender) formData.append('gender', data.gender);
      if (data.birth_date) formData.append('birth_date', data.birth_date);
      if (data.address) formData.append('address', data.address);
      if (data.origin_country) formData.append('origin_country', data.origin_country);
      if (data.region) formData.append('region', data.region);
      if (data.residence_type) formData.append('residence_type', data.residence_type);
      if (data.document_type) formData.append('document_type', data.document_type);

      if (photoFile) formData.append('photo', photoFile);

      if (documentMainFile) {
        formData.append('document_main', documentMainFile);
      }

      if (documentBackFile && data.document_type === 'titre_sejour') {
        formData.append('document_back', documentBackFile);
      }

      if (isEdit && id) {
        await updateUser({ id, formData }).unwrap();
        showAlert('Client updated successfully!', 'success');
      } else {
        await createUser(formData).unwrap();
        showAlert('Client created successfully!', 'success');
      }

      const returnPage = getReturnPage(searchParams, isEdit);
      navigate(buildReturnUrl('/users', isEdit, returnPage));
    } catch (err: unknown) {
      const errorMessage =
        (err as { data?: { message?: string }; message?: string })?.data?.message ||
        (err as { message?: string })?.message ||
        `Error ${isEdit ? 'updating' : 'creating'} client`;
      showAlert(errorMessage, 'error');
    }
  };

  const handleCancel = () => navigate('/users');
  const handlePhotoChange = (file: File | null) => {
    setPhotoFile(file);
    setValue('photo', file);
  };

  return (
    <>
      {isEdit && roleCode && (
        <Grid size={12}>
          <CustomInput fullWidth label="Role" value={roleCode} disabled isEdit={isEdit} />
        </Grid>
      )}

      <Grid size={12} sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <FileUpload label="Upload Photo" onFileChange={handlePhotoChange} preview={photoPreview} />
      </Grid>

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
          placeholder="+971501234567"
          error={!!errors.phone}
          helperText={errors.phone?.message}
          isEdit={isEdit}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Controller
          name="gender"
          control={control}
          render={({ field }) => (
            <CustomInput
              {...field}
              fullWidth
              select
              label="Gender"
              error={!!errors.gender}
              helperText={errors.gender?.message}
              isEdit={isEdit}
              value={field.value || ''}
            >
              <MenuItem value="male">Male</MenuItem>
              <MenuItem value="female">Female</MenuItem>
            </CustomInput>
          )}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Controller
            name="birth_date"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="Birth Date"
                format="DD/MM/YYYY"
                value={field.value ? dayjs(field.value) : null}
                onChange={(v) => field.onChange(v ? v.format('YYYY-MM-DD') : '')}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.birth_date,
                    helperText: errors.birth_date?.message,
                  },
                }}
              />
            )}
          />
        </LocalizationProvider>
      </Grid>

      <Grid size={12}>
        <CustomInput
          {...register('address')}
          fullWidth
          label="Address"
          error={!!errors.address}
          helperText={errors.address?.message}
          isEdit={isEdit}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Controller
          name="origin_country"
          control={control}
          render={({ field }) => (
            <AutocompleteInfiniteScroll
              label="Origin Country *"
              value={field.value || ''}
              onChange={(value) => field.onChange(value)}
              useInfiniteQuery={useGetCountriesForSelectInfiniteQuery}
              itemLabelKey="name_en"
              itemValueKey="value"
              disabled={false}
              error={!!errors.origin_country}
              helperText={errors.origin_country?.message}
              emptyMessage="No countries found"
              initialSelectedItems={
                isEdit && userData?.client?.origin_country
                  ? [userData.client.origin_country as unknown as Record<string, unknown>]
                  : []
              }
            />
          )}
        />
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Controller
          name="region"
          control={control}
          render={({ field }) => (
            <AutocompleteInfiniteScroll
              label="Region *"
              value={field.value || ''}
              onChange={(value) => field.onChange(value)}
              useInfiniteQuery={useGetRegionsForSelectInfiniteQuery}
              itemLabelKey="name_en"
              itemValueKey="value"
              disabled={false}
              error={!!errors.region}
              helperText={errors.region?.message}
              emptyMessage="No regions found"
              initialSelectedItems={
                isEdit && userData?.client?.region
                  ? [userData.client.region as unknown as Record<string, unknown>]
                  : []
              }
            />
          )}
        />
      </Grid>

      <Grid size={12}>
        <Controller
          name="residence_type"
          control={control}
          render={({ field }) => (
            <AutocompleteInfiniteScroll
              label="Residence Type *"
              value={field.value || ''}
              onChange={(value) => field.onChange(value)}
              useInfiniteQuery={useGetResidenceTypesForSelectInfiniteQuery}
              itemLabelKey="name_en"
              itemValueKey="value"
              disabled={false}
              error={!!errors.residence_type}
              helperText={errors.residence_type?.message}
              emptyMessage="No residence types found"
              initialSelectedItems={
                isEdit && userData?.client?.residence_type
                  ? [userData.client.residence_type as unknown as Record<string, unknown>]
                  : []
              }
            />
          )}
        />
      </Grid>

      <Grid size={12}>
        <Controller
          name="document_type"
          control={control}
          render={({ field }) => (
            <CustomInput
              {...field}
              fullWidth
              select
              label="Document Type"
              error={!!errors.document_type}
              helperText={errors.document_type?.message}
              isEdit={isEdit}
              value={field.value || ''}
            >
              <MenuItem value="visa">Visa</MenuItem>
              <MenuItem value="titre_sejour">Residence Permit</MenuItem>
            </CustomInput>
          )}
        />
      </Grid>

      {documentType && (
        <>
          <Grid size={12}>
            <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
              Main Document – {documentType === 'visa' ? 'Visa' : 'Residence Permit'}
            </Typography>

            {isEdit && existingDocumentMainUrl && (
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<DescriptionOutlinedIcon />}
                  onClick={() => window.open(existingDocumentMainUrl, '_blank')}
                >
                  View Current Document
                </Button>
              </Box>
            )}

            <Box>
              <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                {isEdit ? 'Replace Main Document' : 'Main Document (PDF/Image)'}
              </Typography>
              <Button
                component="label"
                variant="outlined"
                fullWidth
                sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
              >
                {documentMainFile ? documentMainFile.name : 'Choose File'}
                <input
                  type="file"
                  hidden
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    const file = e.target.files?.[0] || null;
                    setDocumentMainFile(file);
                    setValue('document_main', file);
                  }}
                />
              </Button>
              <Typography
                variant="caption"
                sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}
              >
                {isEdit ? 'Leave empty to keep current document' : 'Required'}
              </Typography>
            </Box>
          </Grid>

          {documentType === 'titre_sejour' && (
            <Grid size={12}>
              <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>
                Back of Residence Permit
              </Typography>

              {isEdit && existingDocumentBackUrl && (
                <Box sx={{ mb: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DescriptionOutlinedIcon />}
                    onClick={() => window.open(existingDocumentBackUrl, '_blank')}
                  >
                    View Current Back
                  </Button>
                </Box>
              )}

              <Box>
                <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary' }}>
                  {isEdit ? 'Replace Back Document' : 'Back of Residence Permit'}
                </Typography>
                <Button
                  component="label"
                  variant="outlined"
                  fullWidth
                  sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                >
                  {documentBackFile ? documentBackFile.name : 'Choose File'}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0] || null;
                      setDocumentBackFile(file);
                      setValue('document_back', file);
                    }}
                  />
                </Button>
                <Typography
                  variant="caption"
                  sx={{ display: 'block', mt: 0.5, color: 'text.secondary' }}
                >
                  {isEdit ? 'Leave empty to keep current back document' : 'Required'}
                </Typography>
              </Box>
            </Grid>
          )}
        </>
      )}

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
