import * as yup from 'yup';

export const signInValidationSchema = yup.object().shape({
  email: yup
    .string()
    .required('Email is required')
    .email('Email must be valid')
    .max(100, 'Email cannot exceed 100 characters'),

  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters')
    .max(100, 'Password cannot exceed 100 characters'),
});

export type SignInFormData = yup.InferType<typeof signInValidationSchema>;

export const forgotPasswordValidationSchema = yup.object().shape({
  email: yup
    .string()
    .required('Email is required')
    .email('Email must be valid')
    .max(100, 'Email cannot exceed 100 characters'),
});

export type ForgotPasswordFormData = yup.InferType<typeof forgotPasswordValidationSchema>;

export const newPasswordValidationSchema = yup.object().shape({
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password cannot exceed 100 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase, one lowercase and one number'
    ),

  confirmPassword: yup
    .string()
    .required('Password confirmation is required')
    .oneOf([yup.ref('password')], 'Passwords do not match'),
});

export type NewPasswordFormData = yup.InferType<typeof newPasswordValidationSchema>;
