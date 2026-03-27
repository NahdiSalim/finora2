import * as Yup from "yup";

export const requestValidationSchema = Yup.object({
  subject: Yup.string()
    .required("Le titre de la demande est requis")
    .min(5, "Le titre doit contenir au moins 5 caractères")
    .max(200, "Le titre ne doit pas dépasser 200 caractères"),

  topic: Yup.string()
    .max(200, "Le sujet ne doit pas dépasser 200 caractères")
    .default("")
    .transform((value) => value || ""),

  type: Yup.string()
    .oneOf(
      ["accounting", "tax", "consultation", "document", "other"],
      "Type de demande invalide",
    )
    .required("Le type de demande est requis"),

  description: Yup.string()
    .max(5000, "La description ne doit pas dépasser 5000 caractères")
    .default("")
    .transform((value) => value || ""),

  urgency: Yup.string()
    .oneOf(["low", "normal", "high", "urgent"], "Priorité invalide")
    .required("La priorité est requise"),

  desiredResponseDate: Yup.string()
    .default("")
    .transform((value) => value || ""),

  desiredResponseTime: Yup.string()
    .default("")
    .transform((value) => value || ""),

  attachments: Yup.array()
    .of(
      Yup.mixed<File>()
        .test("fileSize", "Fichier trop volumineux (max 5MB)", (value) => {
          if (!value) return true;
          return (value as File).size <= 5 * 1024 * 1024;
        })
        .test("fileType", "Format de fichier non supporté", (value) => {
          if (!value) return true;
          const file = value as File;
          const acceptedTypes = [
            "application/pdf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "image/jpeg",
            "image/png",
          ];
          return acceptedTypes.includes(file.type);
        })
        .nonNullable(),
    )
    .max(10, "Vous ne pouvez télécharger que 10 fichiers maximum")
    .default([])
    .transform((value) => value || []),
});

// Use Yup.InferType for type safety
export type RequestFormData = Yup.InferType<typeof requestValidationSchema>;
