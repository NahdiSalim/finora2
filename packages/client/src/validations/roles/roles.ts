import * as yup from 'yup';

export const roleValidationSchema = yup.object({
  name: yup
    .string()
    .required('Role name is required')
    .min(2, 'Must be at least 2 characters')
    .max(100, 'Cannot exceed 100 characters'),

  description: yup
    .string()
    .required('Description is required')
    .min(5, 'Must be at least 5 characters')
    .max(500, 'Cannot exceed 500 characters'),

  roleTypeId: yup.string().optional(),

  actionIds: yup
    .array()
    .of(yup.string().uuid().defined())
    .min(0, 'Please select at least one action')
    .optional(),
});
