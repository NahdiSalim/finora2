import * as yup from 'yup';

const baseValidation = {
  full_name: yup
    .string()
    .required('Full name is required')
    .min(2, 'Must be at least 2 characters')
    .max(100, 'Cannot exceed 100 characters'),

  email: yup
    .string()
    .required('Email is required')
    .email('Invalid email')
    .max(100, 'Email cannot exceed 100 characters'),

  phone: yup
    .string()
    .required('Phone is required')
    .matches(/^\+971(50|51|52|54|55|56|58)[0-9]{7}$/, 'Phone must be in UAE format +971501234567'),

  roleCode: yup.string().required('Role is required'),
};

const dateOfBirthValidation = yup.string().required('Birth date is required');

const businessFields = {
  sex: yup
    .mixed<'male' | 'female'>()
    .required('Gender is required')
    .oneOf(['male', 'female'], 'Invalid gender'),

  dateOfBirth: dateOfBirthValidation,

  shopName: yup
    .string()
    .required('Shop name is required')
    .min(2, 'Must be at least 2 characters')
    .max(100, 'Cannot exceed 100 characters'),

  legalIdentifier: yup
    .string()
    .required('Legal identifier is required')
    .min(2, 'Must be at least 2 characters')
    .max(50, 'Cannot exceed 50 characters'),

  address: yup
    .string()
    .required('Address is required')
    .min(5, 'Must be at least 5 characters')
    .max(255, 'Cannot exceed 255 characters'),

  activitySector: yup
    .array()
    .of(yup.string().defined())
    .min(1, 'At least one activity sector is required')
    .required('Activity sector is required'),
};

const passwordValidation = yup
  .string()
  .min(8, 'Password must be at least 8 characters')
  .matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain at least one uppercase, one lowercase and one number'
  );

export const userValidationSchema = yup.object().shape({
  ...baseValidation,
  ...businessFields,
  patenteFile: yup.mixed().required('Patent file is required').nullable(),
  password: yup.string().when('roleCode', {
    is: 'FOURNISSEUR',
    then: () => passwordValidation.required('Password is required'),
    otherwise: (schema) => schema.optional(),
  }),
  confirmPassword: yup.string().when('roleCode', {
    is: 'FOURNISSEUR',
    then: (schema) =>
      schema
        .required('Please confirm password')
        .oneOf([yup.ref('password')], 'Passwords do not match'),
    otherwise: (schema) => schema.optional(),
  }),
});

export const userUpdateValidationSchema = yup.object().shape({
  ...baseValidation,
  ...businessFields,
  patenteFile: yup.mixed().optional().nullable(),
  password: yup.string().when('roleCode', {
    is: 'FOURNISSEUR',
    then: (schema) =>
      schema.optional().test('password-strength', '', function (value) {
        if (!value) return true;

        if (value.length < 8) {
          return this.createError({
            message: 'Password must be at least 8 characters',
          });
        }
        if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
          return this.createError({
            message: 'Password must contain at least one uppercase, one lowercase and one number',
          });
        }
        return true;
      }),
    otherwise: (schema) => schema.optional(),
  }),
  confirmPassword: yup.string().when('roleCode', {
    is: 'FOURNISSEUR',
    then: (schema) =>
      schema.optional().test('passwords-match', 'Passwords do not match', function (value) {
        const { password } = this.parent;
        if (!password) return true;
        return !value || value === password;
      }),
    otherwise: (schema) => schema.optional(),
  }),
});

export const clientValidationSchema = yup.object({
  full_name: yup
    .string()
    .required('Full name is required')
    .min(2, 'Must be at least 2 characters')
    .max(100, 'Cannot exceed 100 characters'),

  email: yup
    .string()
    .required('Email is required')
    .email('Invalid email')
    .max(100, 'Email cannot exceed 100 characters'),

  phone: yup
    .string()
    .required('Phone is required')
    .matches(/^\+971(50|51|52|54|55|56|58)[0-9]{7}$/, 'Phone must be in UAE format +971501234567'),

  roleCode: yup.string().required('Role is required'),

  gender: yup
    .mixed<'male' | 'female'>()
    .oneOf(['male', 'female'], 'Gender is required')
    .required('Gender is required'),

  birth_date: yup.string().required('Birth date is required'),

  address: yup
    .string()
    .required('Address is required')
    .min(5, 'Must be at least 5 characters')
    .max(255, 'Cannot exceed 255 characters'),

  origin_country: yup.string().required('Origin country is required'),

  region: yup.string().required('Region is required'),

  residence_type: yup.string().required('Residence type is required'),

  document_type: yup
    .string()
    .required('Document type is required')
    .max(100, 'Cannot exceed 100 characters'),

  photo: yup.mixed<File>().required('Photo is required').nullable(),

  document_main: yup.mixed<File>().when('document_type', {
    is: (val: string) => val === 'visa' || val === 'titre_sejour',
    then: (schema) => schema.required('Document main is required').nullable(),
    otherwise: (schema) => schema.optional().nullable(),
  }),

  document_back: yup.mixed<File>().when('document_type', {
    is: 'titre_sejour',
    then: (schema) => schema.required('Document back is required').nullable(),
    otherwise: (schema) => schema.optional().nullable(),
  }),
});

export const clientUpdateValidationSchema = yup.object({
  full_name: yup
    .string()
    .required('Full name is required')
    .min(2, 'Must be at least 2 characters')
    .max(100, 'Cannot exceed 100 characters'),

  email: yup
    .string()
    .required('Email is required')
    .email('Invalid email')
    .max(100, 'Email cannot exceed 100 characters'),

  phone: yup
    .string()
    .required('Phone is required')
    .matches(/^\+971(50|51|52|54|55|56|58)[0-9]{7}$/, 'Phone must be in UAE format +971501234567'),

  roleCode: yup.string().required('Role is required'),

  gender: yup
    .mixed<'male' | 'female'>()
    .oneOf(['male', 'female'], 'Gender is required')
    .required('Gender is required'),

  birth_date: yup.string().required('Birth date is required'),

  address: yup
    .string()
    .required('Address is required')
    .min(5, 'Must be at least 5 characters')
    .max(255, 'Cannot exceed 255 characters'),

  origin_country: yup.string().required('Origin country is required'),

  region: yup.string().required('Region is required'),

  residence_type: yup.string().required('Residence type is required'),

  document_type: yup
    .string()
    .required('Document type is required')
    .max(100, 'Cannot exceed 100 characters'),

  photo: yup.mixed<File>().optional().nullable(),

  document_main: yup.mixed<File>().optional().nullable(),

  document_back: yup.mixed<File>().optional().nullable(),
});

export const backofficeValidationSchema = yup.object().shape({
  ...baseValidation,
  password: yup
    .string()
    .required('Password is required')
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase, one lowercase and one number'
    ),
  confirmPassword: yup
    .string()
    .required('Please confirm password')
    .oneOf([yup.ref('password')], 'Passwords do not match'),
});

export const backofficeUpdateValidationSchema = yup.object().shape({
  ...baseValidation,
  password: yup
    .string()
    .optional()
    .test('password-strength', '', function (value) {
      if (!value) return true;

      if (value.length < 8) {
        return this.createError({
          message: 'Password must be at least 8 characters',
        });
      }
      if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
        return this.createError({
          message: 'Password must contain at least one uppercase, one lowercase and one number',
        });
      }
      return true;
    }),
  confirmPassword: yup
    .string()
    .optional()
    .test('passwords-match', 'Passwords do not match', function (value) {
      const { password } = this.parent;
      if (!password) return true;
      return !value || value === password;
    }),
});
