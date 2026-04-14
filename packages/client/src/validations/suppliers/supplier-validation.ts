import * as yup from "yup";

export const supplierValidationSchema = yup.object().shape({
  name: yup
    .string()
    .required("Le nom est obligatoire")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),

  company: yup
    .string()
    .required("La société est obligatoire")
    .max(100, "La société ne peut pas dépasser 100 caractères"),

  email: yup
    .string()
    .required("L'adresse email est obligatoire")
    .email("Email invalide")
    .max(100, "L'email ne peut pas dépasser 100 caractères"),

  phone: yup
    .string()
    .required("Le numéro de téléphone est obligatoire")
    .max(20, "Le numéro ne peut pas dépasser 20 caractères"),

  address: yup
    .string()
    .max(200, "L'adresse ne peut pas dépasser 200 caractères")
    .optional(),

  taxId: yup
    .string()
    .max(50, "Le matricule fiscal ne peut pas dépasser 50 caractères")
    .optional(),
});

export type SupplierFormData = yup.InferType<typeof supplierValidationSchema>;
