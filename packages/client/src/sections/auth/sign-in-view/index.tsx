import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Navigate } from 'react-router-dom';

import { Box, Grid, Link, Button, Typography } from '@mui/material';
import DotSpinner from 'src/components/common/DotSpinner';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { signInValidationSchema, type SignInFormData } from 'src/validations/Auth/auth-validation';

import { useAlert } from 'src/contexts/AlertContext';
import { useAppSelector } from 'src/hooks/use-redux';
import { useLoginInternalMutation, useVerifyUserQuery } from 'src/lib/services/authApi';
import CustomInput from 'src/components/common/CustomInput';

export function SignInView() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [login, { isLoading }] = useLoginInternalMutation();

  const { isLoading: loadingVerif } = useVerifyUserQuery();
  const { isAuth } = useAppSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: yupResolver(signInValidationSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: SignInFormData) => {
    try {
      const result = await login(data).unwrap();

      localStorage.setItem('token', result.token.access_token);
      localStorage.setItem('refresh_token', result.token.refresh_token);

      const firstRoute = result.user.features?.[0]?.pages?.[0]?.route || '/';
      router.push(firstRoute);
    } catch (error: unknown) {
      const message =
        (typeof error === 'object' &&
          error !== null &&
          'data' in error &&
          (error as { data?: { message?: string } })?.data?.message) ||
        'Échec de la connexion. Vérifiez vos identifiants.';

      showAlert(message, 'error');
    }
  };

  if (loadingVerif) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        <DotSpinner size={60} />
      </Box>
    );
  }

  if (isAuth) {
    return <Navigate to="/" replace />;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Grid container spacing={3} sx={{ maxWidth: '434px', width: '100%' }}>
        <Grid size={{ xs: 12 }}>
          <Box
            sx={{
              gap: 1.5,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Connexion à LastDream
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
              }}
            >
              Entrez vos identifiants ci-dessous
            </Typography>
          </Box>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <CustomInput
            {...register('email')}
            fullWidth
            label="Email"
            error={!!errors.email}
            helperText={errors.email?.message}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <CustomInput
            {...register('password')}
            fullWidth
            label="Mot de passe"
            isPassword
            error={!!errors.password}
            helperText={errors.password?.message}
          />
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Link component={RouterLink} href="/forgot-password" variant="body2" color="inherit">
              Mot de passe oublié?
            </Link>
          </Box>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <Button
            fullWidth
            type="submit"
            color="primary"
            variant="contained"
            disabled={isLoading}
            startIcon={isLoading && <DotSpinner size={20} />}
          >
            {isLoading ? 'Connexion en cours…' : 'Se connecter'}
          </Button>
        </Grid>
      </Grid>
    </form>
  );
}
