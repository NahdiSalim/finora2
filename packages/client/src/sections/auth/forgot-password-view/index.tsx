import { useForm } from 'react-hook-form';
import { useState, useCallback } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';

import CheckCircle from '@mui/icons-material/CheckCircle';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import { Box, Grid, Link, Button, Typography } from '@mui/material';
import DotSpinner from 'src/components/common/DotSpinner';

import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';
import CustomInput from 'src/components/common/CustomInput';

import {
  forgotPasswordValidationSchema,
  type ForgotPasswordFormData,
} from 'src/validations/Auth/auth-validation';

import { useAlert } from 'src/contexts/AlertContext';
import { useForgotPasswordMutation } from 'src/lib/services/authApi';

export function ForgotPasswordView() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [emailSent, setEmailSent] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(forgotPasswordValidationSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await forgotPassword(data).unwrap();
      setSubmittedEmail(data.email);
      setEmailSent(true);
    } catch (error: unknown) {
      const message =
        (typeof error === 'object' &&
          error !== null &&
          'data' in error &&
          (error as { data?: { message?: string } })?.data?.message) ||
        "Échec de l'envoi de l'email. Veuillez réessayer.";

      showAlert(message, 'error');
    }
  };

  const handleBackToSignIn = useCallback(() => {
    router.push('/sign-in');
  }, [router]);

  if (emailSent) {
    return (
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
            <Box
              sx={{
                width: 64,
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                bgcolor: 'success.lighter',
                color: 'success.main',
              }}
            >
              <CheckCircle sx={{ fontSize: 40 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Email envoyé!
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                textAlign: 'center',
              }}
            >
              Nous avons envoyé un email de réinitialisation à <strong>{submittedEmail}</strong>.
              <br />
              Veuillez vérifier votre boîte de réception.
            </Typography>
          </Box>
        </Grid>

          <Typography
            sx={{
              color: '#6B7280',
              fontSize: 14,
              mt: 1,
            }}
          >
            Ne vous inquiétez pas, nous pouvons vous aider!
          </Typography>
        </Box>

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
              Mot de passe oublié?
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: 'text.secondary',
                textAlign: 'center',
              }}
            >
              Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot
              de passe
            </Typography>
          </Box>
        </Grid>

        <Grid size={{ xs: 12 }}>
          <CustomInput
            {...register('email')}
            fullWidth
            label="Adresse email"
            type="email"
            error={!!errors.email}
            helperText={errors.email?.message}
          />

          <Button
            fullWidth
            type="submit"
            variant="contained"
            disabled={isLoading}
            sx={{
              height: 48,
              borderRadius: '12px',
              textTransform: 'none',
              fontWeight: 600,
              backgroundColor: '#2563EB',
              '&:hover': {
                backgroundColor: '#1D4ED8',
              },
            }}
          >
            {isLoading ? 'Envoi en cours…' : 'Envoyer le lien de réinitialisation'}
          </Button>
        </Box>

        <Grid size={{ xs: 12 }}>
          <Box sx={{ display: 'flex', justifyContent: 'center' }}>
            <Link
              component={RouterLink}
              href="/sign-in"
              variant="body2"
              color="inherit"
              sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
            >
              <ArrowBackIosIcon sx={{ fontSize: 16 }} />
              Retour à la connexion
            </Link>
          </Box>
        </Grid>
      </Grid>
    </form>
  );
}
