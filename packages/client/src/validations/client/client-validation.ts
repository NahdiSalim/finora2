import * as yup from "yup";

export const clientValidationSchema = yup.object().shape({
  firstName: yup
    .string()
    .required("Le prénom est obligatoire")
    .max(100, "Maximum 100 caractères"),

  lastName: yup
    .string()
    .required("Le nom est obligatoire")
    .max(100, "Maximum 100 caractères"),

  email: yup
    .string()
    .required("L'email est obligatoire")
    .email("Email invalide")
    .max(100, "Maximum 100 caractères"),

  phone: yup.string().required("Le téléphone est obligatoire"),

  companyName: yup.string().required("Le nom de l'entreprise est obligatoire"),

  siret: yup.string().required("Le SIRET est obligatoire"),
  vatNumber: yup.string().required("Le numéro de TVA est obligatoire"),
  legalForm: yup.string().required("La forme juridique est obligatoire"),
  address: yup.string().required("L'adresse est obligatoire"),
  city: yup.string().required("La ville est obligatoire"),
  postalCode: yup.string().required("Le code postal est obligatoire"),

  password: yup
    .string()
    .required("Le mot de passe est obligatoire")
    .min(8, "Minimum 8 caractères"),
});

export type ClientFormData = yup.InferType<typeof clientValidationSchema>;
