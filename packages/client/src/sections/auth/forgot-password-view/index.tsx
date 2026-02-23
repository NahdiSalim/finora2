import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Box, Typography, Button } from '@mui/material';
import ArrowBackIosIcon from '@mui/icons-material/ArrowBackIos';
import { useRouter } from 'src/routes/hooks';
import CustomInput from 'src/components/common/CustomInput';

import {
  forgotPasswordValidationSchema,
  type ForgotPasswordFormData,
} from 'src/validations/Auth/auth-validation';

import { useForgotPasswordMutation } from 'src/lib/services/authApi';
import { useAlert } from 'src/contexts/AlertContext';
import DotSpinner from 'src/components/common/DotSpinner';

export function ForgotPasswordView() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(forgotPasswordValidationSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      await forgotPassword(data).unwrap();
      router.push('/check-email');
    } catch (error: any) {
      showAlert("Erreur lors de l'envoi de l'email", error);
    }
  };

  return (
    <Box
      sx={{
        width: '100%',
        minHeight: 600,
        display: 'flex',
        alignItems: 'center', // centre verticalement
        justifyContent: 'center', // centre horizontalement
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 420,
        }}
      >
        {/* Title Block */}
        <Box sx={{ mb: 4 }}>
          <Typography
            sx={{
              fontSize: 24,
              fontWeight: 700,
              color: '#111827',
            }}
          >
            Mot de passe oublié ?
          </Typography>

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

        {/* Form */}
        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
          }}
        >
          <Typography
            sx={{
              fontSize: 14,
              fontWeight: 500,
              color: '#374151',
            }}
          >
            Adresse email <span style={{ color: '#EF4444' }}>*</span>
          </Typography>

          <CustomInput
            {...register('email')}
            placeholder="Enter your email"
            type="email"
            error={!!errors.email}
            helperText={errors.email?.message}
            fullWidth
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
            {isLoading ? <DotSpinner size={20} /> : 'Envoyer le lien'}
          </Button>
        </Box>

        {/* Back Button */}
        <Box sx={{ mt: 4 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<ArrowBackIosIcon />}
            onClick={() => router.push('/sign-in')}
            sx={{
              height: 48,
              borderRadius: '12px',
              textTransform: 'none',
            }}
          >
            Retour à la connexion
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
