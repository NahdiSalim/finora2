import * as Yup from "yup";

export const factureValidationSchema = Yup.object({
  status: Yup.string()
    .oneOf(
      ["draft", "sent", "paid", "partial", "overdue", "cancelled"],
      "Statut invalide",
    )
    .optional(),
  vatRate: Yup.number()
    .typeError("La TVA doit être un nombre")
    .min(0, "La TVA ne peut pas être négative")
    .max(100, "La TVA ne peut pas dépasser 100%")
    .required("La TVA est requise"),
  dueDate: Yup.string().required("La date d'échéance est requise"),
  discountType: Yup.string()
    .oneOf(["percentage", "fixed"], "Type de remise invalide")
    .optional(),
  discountValue: Yup.number()
    .typeError("La valeur de remise doit être un nombre")
    .min(0, "La remise ne peut pas être négative")
    .optional(),
  lines: Yup.array()
    .of(
      Yup.object({
        id: Yup.number().optional(),
        description: Yup.string()
          .required("La description est requise")
          .max(300, "La description est trop longue"),
        quantity: Yup.number()
          .typeError("La quantité doit être un nombre")
          .min(1, "La quantité doit être au moins 1")
          .required("La quantité est requise"),
        unitPrice: Yup.number()
          .typeError("Le prix unitaire doit être un nombre")
          .min(0, "Le prix unitaire ne peut pas être négatif")
          .required("Le prix unitaire est requis"),
      }),
    )
    .min(1, "Ajoutez au moins une ligne de produit")
    .required(),
  notes: Yup.string()
    .max(2000, "La note ne peut pas dépasser 2000 caractères")
    .optional(),
  clientName: Yup.string()
    .max(200, "Le nom du client est trop long")
    .optional(),
  clientAddress: Yup.string().max(500, "L'adresse est trop longue").optional(),
});
