import * as Yup from "yup";

export const factureValidationSchema = Yup.object({
  invoiceNumber: Yup.string()
    .required("Le numéro de facture est requis")
    .max(50, "Le numéro de facture est trop long"),
  status: Yup.string()
    .oneOf(["draft", "sent", "overdue"], "Statut invalide")
    .required("Le statut est requis"),
  vatRate: Yup.number()
    .typeError("La TVA doit être un nombre")
    .min(0)
    .max(100)
    .required("La TVA est requise"),
  dueDate: Yup.string().required("La date d'échéance est requise"),
  discountType: Yup.string().oneOf(["percentage", "fixed"]).optional(),
  discountValue: Yup.number()
    .typeError("La valeur de remise doit être un nombre")
    .min(0)
    .optional(),
  lines: Yup.array()
    .of(
      Yup.object({
        id: Yup.number().optional(),
        description: Yup.string()
          .required("La description est requise")
          .max(300),
        quantity: Yup.number()
          .typeError("La quantité doit être un nombre")
          .min(1)
          .required("La quantité est requise"),
        unitPrice: Yup.number()
          .typeError("Le prix unitaire doit être un nombre")
          .min(0)
          .required("Le prix unitaire est requis"),
      }),
    )
    .min(1, "Ajoutez au moins une ligne de produit")
    .required(),
  notes: Yup.string().max(2000).optional(),
  supplierId: Yup.number()
    .typeError("Le fournisseur est requis")
    .required("Le fournisseur est requis"),
  paymentStatus: Yup.string()
    .oneOf(["unpaid", "paid", "partial"])
    .required("Le statut de paiement est requis"),
  amountPaid: Yup.number()
    .typeError("Le montant payé doit être un nombre")
    .min(0)
    .when("paymentStatus", {
      is: "partial",
      then: (s) =>
        s
          .required("Le montant payé est requis")
          .min(0.01, "Le montant doit être supérieur à 0"),
      otherwise: (s) => s.optional(),
    }),
});
