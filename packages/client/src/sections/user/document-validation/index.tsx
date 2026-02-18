import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Divider,
  Button,
  Card,
  IconButton,
} from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DotSpinner from 'src/components/common/DotSpinner';

import { DashboardContent } from 'src/layouts/dashboard';
import { useGetUserByIdQuery, useUpdateDocumentStatusMutation } from 'src/lib/services/usersApi';
import { useAlert } from 'src/contexts/AlertContext';
import { Label } from 'src/components/label';
import { FormButtons } from 'src/components/common/FormButtons';
import CustomInput from 'src/components/common/CustomInput';
import { VerificationStatus } from 'src/constants/regions';
import { buildReturnUrl, getReturnPage } from 'src/utils/navigationHelpers';

const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'default' => {
  const statusColors: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
    VERIFIED: 'success',
    REJECTED: 'error',
    PENDING: 'warning',
  };
  return statusColors[status] || 'default';
};

const getStatusLabel = (status: string): string => {
  const statusLabels: Record<string, string> = {
    VERIFIED: 'Verified',
    REJECTED: 'Rejected',
    PENDING: 'Pending',
  };
  return statusLabels[status] || status;
};

export default function DocumentValidationView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isEdit = true;
  const { showAlert } = useAlert();

  const { data: userData, isLoading: loadingUser } = useGetUserByIdQuery(id!, { skip: !id });
  const [updateDocumentStatus, { isLoading: submitting }] = useUpdateDocumentStatusMutation();

  const [decision, setDecision] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  const uploadsUrl = import.meta.env.VITE_UPLOADS_URL || import.meta.env.VITE_API_URL;

  const documents = userData?.client?.residencyDocuments || [];
  const firstDocument = documents.length > 0 ? documents[0] : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!decision) {
      showAlert('Please select a verification status', 'warning');
      return;
    }

    if (decision === VerificationStatus.REJECTED && !rejectionReason.trim()) {
      showAlert('Rejection reason is required', 'error');
      return;
    }

    if (!firstDocument) {
      showAlert('No document found', 'error');
      return;
    }

    try {
      await updateDocumentStatus({
        clientId: userData!.client!.id,
        documentType: firstDocument.type,
        status: decision,
        rejectionReason: decision === VerificationStatus.REJECTED ? rejectionReason : undefined,
      }).unwrap();

      showAlert('Document status updated successfully', 'success');
      const returnPage = getReturnPage(searchParams, isEdit);
      navigate(buildReturnUrl('/users', isEdit, returnPage));
    } catch (error) {
      console.error('Error updating document status:', error);

      const errorMessage =
        (error as { data?: { message?: string }; message?: string })?.data?.message ||
        (error as { message?: string })?.message ||
        'Error updating document status';

      showAlert(errorMessage, 'error');
    }
  };

  const handleCancel = () => {
    navigate('/users');
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loadingUser) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <DotSpinner />
        </Box>
      </DashboardContent>
    );
  }

  if (!userData?.client) {
    return (
      <DashboardContent>
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <Typography color="error">User not found or not a client</Typography>
        </Box>
      </DashboardContent>
    );
  }

  return (
    <DashboardContent>
      <Box sx={{ mb: 5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={handleCancel} sx={{ p: 0 }}>
            <Box
              component="img"
              src="/assets/iconBack.svg"
              alt="Back"
              sx={{ width: 20, height: 16 }}
            />
          </IconButton>
          <Typography variant="h5">Document Verification</Typography>
        </Box>
      </Box>

      <Card sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={12}>
            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Client Information
              </Typography>
            </Divider>
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <CustomInput fullWidth label="Full Name" value={userData.full_name} disabled isEdit />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <CustomInput fullWidth label="Email" value={userData.email || '-'} disabled isEdit />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <CustomInput fullWidth label="Phone" value={userData.phone} disabled isEdit />
          </Grid>

          <Grid size={{ xs: 12, md: 6 }}>
            <CustomInput
              fullWidth
              label="Region"
              value={userData.client.region || '-'}
              disabled
              isEdit
            />
          </Grid>

          <Grid size={12}>
            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Document Information
              </Typography>
            </Divider>
          </Grid>

          {documents.length === 0 ? (
            <Grid size={12}>
              <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                No documents uploaded yet
              </Typography>
            </Grid>
          ) : (
            <>
              {documents.map((doc, index) => (
                <Grid size={12} key={doc.id}>
                  <Box
                    sx={{
                      border: '2px solid',
                      borderColor: 'secondary.main',
                      borderRadius: 2,
                      overflow: 'hidden',
                      bgcolor: 'background.paper',
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: 'secondary.main',
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Typography variant="body2" sx={{ color: 'white', fontWeight: 600 }}>
                        {doc.type === 'visa'
                          ? 'Visa'
                          : `Residence Permit ${documents.length > 1 ? (index === 0 ? '- Main' : '- Back') : ''}`}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<OpenInNewIcon />}
                        onClick={() => window.open(`${uploadsUrl}/${doc.file_url}`, '_blank')}
                        sx={{ color: 'white', borderColor: 'white' }}
                      >
                        View Document
                      </Button>
                    </Box>

                    <Box sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Box sx={{ flex: 1, minWidth: 200 }}>
                          <Typography
                            variant="caption"
                            sx={{
                              display: 'block',
                              fontWeight: 600,
                              color: 'text.secondary',
                              mb: 0.5,
                            }}
                          >
                            Submitted At:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {formatDateTime(doc.submitted_at)}
                          </Typography>
                        </Box>

                        {doc.verified_at && (
                          <Box sx={{ flex: 1, minWidth: 200 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                display: 'block',
                                fontWeight: 600,
                                color: 'text.secondary',
                                mb: 0.5,
                              }}
                            >
                              Verified At:
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatDateTime(doc.verified_at)}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Grid>
              ))}

              <Grid size={12}>
                <Divider sx={{ my: 2 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Validation of Document
                  </Typography>
                </Divider>
              </Grid>

              <Grid size={12}>
                <Box
                  sx={{
                    mb: 2,
                    p: 2,
                    bgcolor: 'background.neutral',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Current status of document:
                  </Typography>
                  <Label color={getStatusColor(firstDocument?.verification_status || 'PENDING')}>
                    {getStatusLabel(firstDocument?.verification_status || 'PENDING')}
                  </Label>
                </Box>
              </Grid>

              {firstDocument?.rejection_reason && (
                <Grid size={12}>
                  <Box
                    sx={{
                      mb: 2,
                      p: 2,
                      bgcolor: 'background.neutral',
                      borderRadius: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        display: 'block',
                        fontWeight: 600,
                        color: 'error.dark',
                        mb: 0.5,
                      }}
                    >
                      Rejection Reason:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: 'error.main' }}>
                      {firstDocument.rejection_reason}
                    </Typography>
                  </Box>
                </Grid>
              )}

              <Grid size={12}>
                <FormControl fullWidth>
                  <InputLabel>Verification Status *</InputLabel>
                  <Select
                    value={decision}
                    label="Verification Status *"
                    onChange={(e) => setDecision(e.target.value)}
                  >
                    <MenuItem value="">
                      <em>Select a status</em>
                    </MenuItem>
                    <MenuItem value={VerificationStatus.PENDING}>Pending</MenuItem>
                    <MenuItem value={VerificationStatus.VERIFIED}>Verified</MenuItem>
                    <MenuItem value={VerificationStatus.REJECTED}>Rejected</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {decision === VerificationStatus.REJECTED && (
                <Grid size={12}>
                  <CustomInput
                    fullWidth
                    multiline
                    rows={3}
                    label="Rejection Reason *"
                    value={rejectionReason}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setRejectionReason(e.target.value)
                    }
                    placeholder="Please provide a reason for rejection"
                    isEdit={false}
                  />
                </Grid>
              )}

              <Grid size={12}>
                <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                  <FormButtons
                    onCancel={handleCancel}
                    isLoading={submitting}
                    isEdit
                    submitLabel="Validate Decision"
                  />
                </Box>
              </Grid>
            </>
          )}
        </Grid>
      </Card>
    </DashboardContent>
  );
}
