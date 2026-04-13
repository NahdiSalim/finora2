import * as Yup from "yup";

export const devisValidationSchema = Yup.object({
  status: Yup.string()
    .oneOf(["en_attente", "accepte", "refuse"], "Statut invalide")
    .required("Le statut est requis"),
  tvaRate: Yup.number()
    .typeError("La TVA doit être un nombre")
    .min(0, "La TVA ne peut pas être négative")
    .max(100, "La TVA ne peut pas dépasser 100%")
    .required("La TVA est requise"),
  validUntil: Yup.string().required("La date de validité est requise"),
  discountType: Yup.string()
    .oneOf(["percentage", "fixed"], "Type de remise invalide")
    .required("Le type de remise est requis"),
  discountValue: Yup.number()
    .typeError("La valeur de remise doit être un nombre")
    .min(0, "La remise ne peut pas être négative")
    .required("La valeur de remise est requise"),
  lines: Yup.array()
    .of(
      Yup.object({
        id: Yup.string().required(),
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
  notes: Yup.string().max(2000, "La note ne peut pas dépasser 2000 caractères"),
});
