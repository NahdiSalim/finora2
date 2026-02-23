import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useRegisterMutation } from 'src/lib/services/authApi';
import { useRouter } from 'src/routes/hooks';
import { useAlert } from 'src/contexts/AlertContext';

import { Box, Typography, Button, Checkbox, Radio, Link } from '@mui/material';

import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DotSpinner from 'src/components/common/DotSpinner';

import {
  registerValidationSchema,
  type RegisterFormData,
} from 'src/validations/Auth/auth-validation';

export function RegisterView() {
  const router = useRouter();
  const { showAlert } = useAlert();
  const [registerUser, { isLoading }] = useRegisterMutation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(registerValidationSchema),
    defaultValues: {
      email: '',
      phoneNumber: '',
      password: '',
      role: 'CLIENT',
      agreeToTerms: false,
    },
  });

  const role = watch('role');
  const agree = watch('agreeToTerms');
  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    try {
      await registerUser(data).unwrap();
      router.push(`/check-email?email=${data.email}`);
    } catch {
      showAlert("Erreur lors de l'inscription", 'error');
    }
  };

  // 🔥 STYLE COMMUN POUR TOUS LES INPUTS
  const inputStyles = {
    width: '100%',
    height: 48,
    borderRadius: '12px',
    border: '1px solid #E5E7EB',
    px: 2,
    fontSize: 14,
    transition: 'all 0.2s ease',
    '&:focus': {
      outline: 'none',
      borderColor: '#2563EB',
      boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.15)',
    },
  };
  // CONDITIONS
  const hasLowercase = /[a-z]/.test(password || '');
  const hasUppercase = /[A-Z]/.test(password || '');
  const hasNumber = /\d/.test(password || '');
  const hasSpecial = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password || '');

  const conditions = [hasLowercase, hasUppercase, hasNumber, hasSpecial];
  const strength = (conditions.filter(Boolean).length / 4) * 100;

  // COLOR LOGIC
  const strengthColor =
    strength === 100
      ? '#16A34A' // green
      : strength >= 75
        ? '#EAB308' // yellow
        : strength >= 25
          ? '#F97316' // orange
          : '#DC2626'; // red

  return (
    <Box
      component="form"
      onSubmit={handleSubmit(onSubmit)}
      sx={{
        maxWidth: 470,
        mx: 'auto',
      }}
    >
      {/* TITLE */}
      <Typography sx={{ fontSize: 28, fontWeight: 700 }}>S’inscrire</Typography>

      <Typography sx={{ fontSize: 14, color: '#6B7280', mt: 1 }}>
        Inscrivez-vous pour profiter des fonctionnalités de FINORA
      </Typography>

      {/* ROLE */}
      <Typography sx={{ mt: 3, mb: 1, fontSize: 14 }}>S’inscrire en tant que</Typography>

      <Box sx={{ display: 'flex', gap: 2 }}>
        {['CLIENT', 'COMPTABLE'].map((value) => (
          <Box
            key={value}
            onClick={() => setValue('role', value as any)}
            sx={{
              flex: 1,
              height: 44,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 2,
              border: '1px solid',
              borderColor: role === value ? '#2563EB' : '#E5E7EB',
              backgroundColor: role === value ? '#EFF6FF' : '#FFFFFF',
              px: 2,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <Radio
              checked={role === value}
              size="small"
              sx={{
                color: '#D1D5DB',
                '&.Mui-checked': {
                  color: '#2563EB',
                },
              }}
            />
            <Typography sx={{ fontSize: 13 }}>
              {value === 'CLIENT' ? 'Une entreprise' : 'Cabinet de comptabilité'}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* EMAIL */}
      <Typography sx={{ mt: 3, mb: 1, fontSize: 14 }}>Adresse email professionnelle</Typography>

      <Box
        component="input"
        {...register('email')}
        placeholder="ex john@domain.com"
        sx={inputStyles}
      />

      {errors.email && (
        <Typography color="error" fontSize={12}>
          {errors.email.message}
        </Typography>
      )}

      {/* PHONE */}
      <Typography sx={{ mt: 3, mb: 1, fontSize: 14 }}>Numéro de téléphone</Typography>

      <Box sx={{ display: 'flex' }}>
        <Box
          sx={{
            px: 2,
            display: 'flex',
            alignItems: 'center',
            border: '1px solid #E5E7EB',
            borderRight: 'none',
            borderRadius: '12px 0 0 12px',
            fontSize: 14,
          }}
        >
          +216
        </Box>

        <Box
          component="input"
          {...register('phoneNumber')}
          placeholder="Entrer votre numéro"
          sx={{
            ...inputStyles,
            borderRadius: '0 12px 12px 0',
          }}
        />
      </Box>

      {/* PASSWORD */}
      <Typography sx={{ mt: 3, mb: 1, fontSize: 14 }}>Mot de passe *</Typography>

      <Box sx={{ position: 'relative' }}>
        <Box
          component="input"
          type={showPassword ? 'text' : 'password'}
          {...register('password')}
          placeholder="Entrer votre mot de passe"
          sx={inputStyles}
        />

        {showPassword ? (
          <VisibilityIcon
            onClick={() => setShowPassword(false)}
            sx={{
              position: 'absolute',
              right: 12,
              top: 14,
              fontSize: 18,
              color: '#9CA3AF',
              cursor: 'pointer',
            }}
          />
        ) : (
          <VisibilityOffIcon
            onClick={() => setShowPassword(true)}
            sx={{
              position: 'absolute',
              right: 12,
              top: 14,
              fontSize: 18,
              color: '#9CA3AF',
              cursor: 'pointer',
            }}
          />
        )}
      </Box>

      {/* PASSWORD STRENGTH */}
      {password && (
        <Box sx={{ mt: 2 }}>
          {/* Progress Bar Background */}
          <Box
            sx={{
              width: '100%',
              height: 8,
              backgroundColor: '#E5E7EB',
              borderRadius: 20,
            }}
          >
            {/* Progress Bar Fill */}
            <Box
              sx={{
                height: 8,
                width: `${strength}%`,
                backgroundColor: strengthColor,
                borderRadius: 20,
                transition: 'all 0.3s ease',
              }}
            />
          </Box>

          {/* CONDITIONS LIST */}
          <Box
            sx={{
              mt: 2,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 1.5,
              fontSize: 12,
            }}
          >
            {[
              { label: 'Une lettre minuscule', valid: hasLowercase },
              { label: 'Une lettre majuscule', valid: hasUppercase },
              { label: 'Un chiffre', valid: hasNumber },
              { label: 'Un caractère spécial', valid: hasSpecial },
            ].map((item) => (
              <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: item.valid ? '#16A34A' : '#D1D5DB',
                    color: '#fff',
                    fontSize: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {item.valid ? '✓' : ''}
                </Box>

                <Typography
                  sx={{
                    fontSize: 12,
                    color: item.valid ? '#16A34A' : '#6B7280',
                  }}
                >
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* TERMS */}
      <Box sx={{ display: 'flex', alignItems: 'center', mt: 3 }}>
        <Checkbox
          checked={agree}
          onChange={() => setValue('agreeToTerms', !agree)}
          sx={{
            color: '#D1D5DB',
            '&.Mui-checked': {
              color: '#2563EB',
            },
          }}
        />

        <Typography sx={{ fontSize: 13 }}>
          J’accepte <span style={{ color: '#2563EB' }}>les termes et conditions</span>
        </Typography>
      </Box>

      {/* BUTTON */}
      <Button
        fullWidth
        type="submit"
        disabled={isLoading}
        variant="contained"
        sx={{
          mt: 3,
          height: 48,
          borderRadius: '12px',
          backgroundColor: '#1E63D5',
          textTransform: 'none',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          '&:hover': {
            backgroundColor: '#1D4ED8',
          },
        }}
        endIcon={isLoading ? <DotSpinner size={20} /> : <ArrowForwardIcon />}
      >
        {isLoading ? 'Inscription...' : 'S’inscrire'}
      </Button>

      {/* LOGIN LINK */}
      <Typography
        sx={{
          textAlign: 'center',
          mt: 3,
          fontSize: 13,
        }}
      >
        Vous avez déjà un compte ?{' '}
        <Link
          onClick={() => router.push('/sign-in')}
          sx={{
            color: '#2563EB',
            cursor: 'pointer',
          }}
        >
          Se connecter
        </Link>
      </Typography>
    </Box>
  );
}
