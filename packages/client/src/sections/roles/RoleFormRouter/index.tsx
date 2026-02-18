import { useNavigate, useParams } from 'react-router-dom';
import { Box, Card, Grid, IconButton, Typography } from '@mui/material';

import { DashboardContent } from 'src/layouts/dashboard';

import RoleForm from '../RoleForm';

export default function RoleFormRouter() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const handleCancel = () => {
    navigate('/roles');
  };

  const getTitle = () => {
    const action = isEdit ? 'Edit' : 'Add';
    return `${action} Role`;
  };

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
          <Typography variant="h5">{getTitle()}</Typography>
        </Box>
      </Box>

      <Card sx={{ p: 4 }}>
        <Grid container spacing={3}>
          <RoleForm />
        </Grid>
      </Card>
    </DashboardContent>
  );
}
