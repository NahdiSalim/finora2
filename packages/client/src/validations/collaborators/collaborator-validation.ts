import * as yup from "yup";

export const collaboratorValidationSchema = yup.object().shape({
  firstName: yup
    .string()
    .required("Le prénom est obligatoire")
    .max(100, "Le prénom ne peut pas dépasser 100 caractères"),

  lastName: yup
    .string()
    .required("Le nom est obligatoire")
    .max(100, "Le nom ne peut pas dépasser 100 caractères"),

  email: yup
    .string()
    .required("L'adresse email est obligatoire")
    .email("Email invalide")
    .max(100, "L'email ne peut pas dépasser 100 caractères"),

  phone: yup
    .string()
    .required("Le numéro de téléphone est obligatoire")
    .max(20, "Le numéro ne peut pas dépasser 20 caractères"),

  position: yup
    .string()
    .max(100, "Le poste ne peut pas dépasser 100 caractères")
    .required("Le poste est obligatoire"),

  department: yup
    .string()
    .max(100, "Le département ne peut pas dépasser 100 caractères")
    .required("Le département est obligatoire"),

  password: yup
    .string()
    .required("Le mot de passe est obligatoire")
    .min(8, "Le mot de passe doit contenir au moins 8 caractères")
    .max(100, "Le mot de passe ne peut pas dépasser 100 caractères"),
});

export type CollaboratorFormData = yup.InferType<
  typeof collaboratorValidationSchema
>;
