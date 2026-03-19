import React, { useEffect, useState, useMemo } from "react";
import {
  Box,
  Drawer,
  IconButton,
  Typography,
  useTheme,
  Link,
  Chip,
  Grid,
  alpha,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import {
  X,
  Eye,
  FileText,
  Calculator,
  RefreshCw,
  Pencil,
  Check,
  Trash2,
  ChevronRight,
  Folder,
} from "lucide-react";
import PdfIcon from "./pdfIcon";
import ImageIcon from "./imageIcon";
import XlsIcon from "./xlsIcon";
import { useFileDrawerStore } from "src/stores/fileDrawerStore";
import type { FileItem, FileType } from "src/components/common/File";
import CustomButton from "./CustomButton";
import CustomInput from "./CustomInput";
import CustomSelect from "./CustomSelect";
import MenuItem from "@mui/material/MenuItem";
import { DOCUMENT_CATEGORIES } from "src/lib/constants/documentCategories";
import { DocumentsTabs } from "src/layouts/components/DocumentTabs";
import type { Message } from "src/layouts/components/ChatTab";
import { Chat } from "src/layouts/components/ChatTab";
import { useAppDispatch } from "src/hooks/use-redux";
import {
  documentsApi,
  useGetDocumentQuery,
  useGetBreadcrumbQuery,
  useGetDocumentsQuery,
} from "src/lib/services/documentsApi";
import { relationshipsApi } from "src/lib/services/relationshipsApi";
import {
  useGetInvoiceMetadataQuery,
  useExtractInvoiceMutation,
  useSaveInvoiceMetadataMutation,
  useSynchronizeDocumentMutation,
} from "src/lib/services/invoicesApi";
import type { ProcessingStatus } from "src/lib/services/invoicesApi";
import ExtractionAnim from "../../../public/assets/Animations/extraction.json";
import Lottie from "lottie-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const FILE_TYPE_ICONS: Record<FileType, React.ReactNode> = {
  pdf: <PdfIcon />,
  docx: <FileText size={24} color="#2B5797" />,
  xls: <XlsIcon />,
  jpg: <ImageIcon />,
  png: <ImageIcon />,
  other: <ImageIcon />,
};

function normalizeCategoryValue(v: string): string {
  const s = v.trim().toLowerCase();
  if (!s) return "";
  if (s === "facture" || s === "invoice") return "facture";
  if (s === "contrat") return "contrat";
  if (s === "rapport") return "rapport";
  return "autre";
}

// ─── Folder tree item (for destination picker) ───────────────────────────────

function FolderTreeItem({
  folderId,
  folderName,
  depth,
  expandedIds,
  onToggleExpand,
  selectedId,
  onSelect,
  clientId,
}: {
  folderId: number;
  folderName: string;
  depth: number;
  expandedIds: Set<number>;
  onToggleExpand: (id: number) => void;
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  clientId?: number;
}) {
  const isExpanded = expandedIds.has(folderId);
  const { data } = useGetDocumentsQuery(
    { clientId, parentId: folderId, limit: 500, status: "active" },
    { skip: !isExpanded },
  );
  const childFolders =
    data?.data
      ?.filter((d) => d.isFolder)
      .map((d) => ({ id: d.id, name: d.name })) ?? [];

  return (
    <>
      <Box
        onClick={() => onSelect(folderId)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          pl: 2 + depth * 2,
          py: 1.25,
          cursor: "pointer",
          bgcolor: selectedId === folderId ? "action.selected" : "transparent",
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        <Box
          component="span"
          onClick={(e) => {
            e.stopPropagation();
            onToggleExpand(folderId);
          }}
          sx={{
            display: "inline-flex",
            transform: isExpanded ? "rotate(90deg)" : "none",
            transition: "transform 0.2s",
          }}
        >
          <ChevronRight size={18} />
        </Box>
        <Folder size={18} />
        <Typography variant="body2">{folderName}</Typography>
      </Box>
      {isExpanded &&
        childFolders.map((child) => (
          <FolderTreeItem
            key={child.id}
            folderId={child.id}
            folderName={child.name}
            depth={depth + 1}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            selectedId={selectedId}
            onSelect={onSelect}
            clientId={clientId}
          />
        ))}
    </>
  );
}

function formatDateAdded(dateStr: string | undefined): string {
  if (!dateStr) return "";
  // Supports ISO dates (2024-12-21) and short FR dates like "19-déc-24"
  const parseFrSlash = (s: string): Date | null => {
    const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (!m) return null;
    const day = Number(m[1]);
    const month = Number(m[2]) - 1;
    const year = 2000 + Number(m[3]);
    const d = new Date(year, month, day);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const parseFrShort = (s: string): Date | null => {
    const m = s.match(/^(\d{1,2})-([a-zA-Zéû]+)-(\d{2})$/);
    if (!m) return null;
    const day = Number(m[1]);
    const mon = m[2].toLowerCase();
    const year = 2000 + Number(m[3]);
    const months: Record<string, number> = {
      jan: 0,
      janv: 0,
      fev: 1,
      fév: 1,
      févr: 1,
      mar: 2,
      avr: 3,
      mai: 4,
      jun: 5,
      juin: 5,
      jul: 6,
      juil: 6,
      aou: 7,
      aoû: 7,
      août: 7,
      sep: 8,
      sept: 8,
      oct: 9,
      nov: 10,
      dec: 11,
      déc: 11,
    };
    const key = Object.keys(months).find((k) => mon.startsWith(k));
    if (!key) return null;
    const d = new Date(year, months[key], day);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const d = parseFrSlash(dateStr) ?? parseFrShort(dateStr) ?? new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

// ─── Niveau de traitement (chips) ─────────────────────────────────────────────

function ProcessingLevelChips({
  status,
}: {
  status: ProcessingStatus | undefined;
}) {
  const theme = useTheme();
  const s = status || "pending";
  const extracted = ["traite", "enregistre", "synchronise"].includes(s);
  const registered = ["enregistre", "synchronise"].includes(s);
  const synced = s === "synchronise";

  const chip = (label: string, done: boolean) => (
    <Chip
      key={label}
      size="small"
      label={done ? label : `✕ ${label}`}
      sx={{
        mr: 0.5,
        mb: 0.5,
        bgcolor: done
          ? alpha(theme.palette.success.main, 0.12)
          : alpha(theme.palette.error.main, 0.08),
        color: done ? theme.palette.success.dark : theme.palette.error.dark,
        border: `1px solid ${done ? theme.palette.success.main : theme.palette.error.main}`,
      }}
      icon={done ? <Check size={14} /> : undefined}
    />
  );

  return (
    <Box
      sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.5 }}
    >
      {chip("Extrait", extracted)}
      {chip("Enregistré", registered)}
      {chip("Synchronisé", synced)}
    </Box>
  );
}

// ─── Détails document (contenu onglet Détails) ────────────────────────────────

interface DocumentDetailsPanelProps {
  file: FileItem;
  documentId: number | null;
  onOpenEditModal: () => void;
}

function DocumentDetailsPanel({
  file,
  documentId,
  onOpenEditModal,
}: DocumentDetailsPanelProps) {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const hasDocumentId = documentId != null && !Number.isNaN(documentId);

  const { data: docResponse, refetch: refetchDocument } = useGetDocumentQuery(
    documentId!,
    {
      skip: !hasDocumentId,
    },
  );
  const { data: breadcrumbResponse, refetch: refetchBreadcrumb } =
    useGetBreadcrumbQuery(documentId!, {
      skip: !hasDocumentId,
    });
  const { data: metadataResponse, isSuccess: hasMetadata } =
    useGetInvoiceMetadataQuery(documentId!, { skip: !hasDocumentId });

  const [extractInvoice, { isLoading: isExtracting }] =
    useExtractInvoiceMutation();
  const [saveMetadata, { isLoading: isSaving }] =
    useSaveInvoiceMetadataMutation();
  const [synchronizeDoc, { isLoading: isSyncing }] =
    useSynchronizeDocumentMutation();

  const document = docResponse?.data;
  const processingStatus =
    (document?.processingStatus as ProcessingStatus | undefined) || "pending";
  const breadcrumb = breadcrumbResponse?.data ?? [];
  const invoiceMetadata = useMemo(() => {
    if (!hasMetadata || !metadataResponse?.data) return null;
    const d: any = metadataResponse.data as any;
    return d && typeof d === "object" && d.metadata ? (d.metadata as any) : d;
  }, [hasMetadata, metadataResponse]);

  const clientCompanyIdForDocs: number | undefined =
    typeof (document as any)?.companyId === "number"
      ? (document as any).companyId
      : undefined;

  const [lastExtractedData, setLastExtractedData] = useState<unknown>(null);

  const extractedObject = useMemo(() => {
    // Inputs must reflect GET /invoices/metadata/:id (persisted rawData) when available.
    const fromMetadata =
      invoiceMetadata?.rawData && typeof invoiceMetadata.rawData === "object"
        ? (invoiceMetadata.rawData as Record<string, any>)
        : null;
    const fromLast =
      lastExtractedData && typeof lastExtractedData === "object"
        ? (lastExtractedData as Record<string, any>)
        : null;
    return fromMetadata ?? fromLast ?? null;
  }, [lastExtractedData, invoiceMetadata?.rawData]);

  const derivedVendor = useMemo(() => {
    const headerSender = extractedObject?.invoice_header?.msg_sender_id;
    const partner0 = extractedObject?.partner_section?.[0]?.nad;
    return partner0?.nom ?? headerSender ?? "";
  }, [extractedObject]);

  const derivedClient = useMemo(() => {
    const headerReceiver = extractedObject?.invoice_header?.msg_receiver_id;
    const partner1 = extractedObject?.partner_section?.[1]?.nad;
    return partner1?.nom ?? headerReceiver ?? "";
  }, [extractedObject]);

  const derivedInvoiceNumber = useMemo(() => {
    return (
      extractedObject?.bgm?.numero ??
      extractedObject?.bgm?.invoiceNumber ??
      extractedObject?.invoice_number ??
      invoiceMetadata?.invoiceNumber ??
      ""
    );
  }, [extractedObject, invoiceMetadata?.invoiceNumber]);

  const derivedInvoiceDate = useMemo(() => {
    const raw =
      extractedObject?.dtm?.[0]?.date_periode ??
      extractedObject?.invoice_date ??
      invoiceMetadata?.invoiceDate ??
      null;
    if (!raw) return "";
    if (typeof raw === "string") return formatDateAdded(raw);
    return "";
  }, [extractedObject, invoiceMetadata?.invoiceDate]);

  const derivedTotals = useMemo(() => {
    const moa = extractedObject?.invoice_moa;
    const taxes = extractedObject?.invoice_tax;
    const toNumber = (v: any) => {
      const cleaned =
        typeof v === "string"
          ? v
              .replace(/\s/g, "")
              .replace(/[€$£]/g, "")
              .replace(",", ".")
              .replace(/[^\d.-]/g, "")
          : v;
      const n =
        typeof cleaned === "string" ? parseFloat(cleaned) : Number(cleaned);
      return Number.isFinite(n) ? n : null;
    };

    const totalHT = Array.isArray(moa) ? toNumber(moa?.[0]?.moa) : null;
    const totalTVA = Array.isArray(moa) ? toNumber(moa?.[1]?.moa) : null;
    const totalTTC = Array.isArray(moa) ? toNumber(moa?.[2]?.moa) : null;
    const tvaLabel = Array.isArray(taxes)
      ? (taxes.find(
          (t: any) =>
            typeof t?.tax === "string" && t.tax.toLowerCase().includes("tva"),
        )?.tax ?? null)
      : null;
    const tvaPercent =
      typeof tvaLabel === "string"
        ? (tvaLabel.match(/(\d+[.,]?\d*)\s*%/)?.[1] ?? null)
        : null;

    const format = (n: number | null) => (n == null ? "" : n.toFixed(2));
    return {
      totalHT: format(totalHT),
      totalTVA: format(totalTVA),
      totalTTC: format(totalTTC),
      tvaPercent: tvaPercent ? String(tvaPercent).replace(",", ".") : "",
    };
  }, [extractedObject]);

  const derivedLineItems = useMemo(() => {
    const lines = extractedObject?.lin_section;
    if (!Array.isArray(lines)) return [];
    return lines.map((l: any, idx: number) => {
      const qty = l?.lin_qty ?? "";
      const date =
        typeof l?.lin_dtm === "string" ? formatDateAdded(l.lin_dtm) : "";
      const description = l?.lin_imd ?? "";
      const unitPrice = l?.lin_moa?.rff ?? "";
      const total = l?.lin_moa?.lin_total ?? "";
      return {
        id: String(idx),
        date,
        description,
        qty: String(qty),
        unit: "-",
        unitPrice: String(unitPrice),
        discount: "-",
        total: String(total),
      };
    });
  }, [extractedObject]);

  const [lineItems, setLineItems] = useState<
    Array<{
      id: string;
      date: string;
      description: string;
      qty: string;
      unit: string;
      unitPrice: string;
      discount: string;
      total: string;
    }>
  >([]);
  const [forceViewMode, setForceViewMode] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [categoryValue, setCategoryValue] = useState("");
  const [destinationPath, setDestinationPath] = useState("");
  const [destinationDialogOpen, setDestinationDialogOpen] = useState(false);
  const [parentId, setParentId] = useState<number | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  // Initialize editable table rows right after extraction
  useEffect(() => {
    setLineItems(derivedLineItems);
    setForceViewMode(false);
    setIsEditing(false);
  }, [derivedLineItems]);

  useEffect(() => {
    // Default destination from breadcrumb
    const path =
      breadcrumb.length > 0 ? breadcrumb.map((b) => b.name).join(" > ") : "";
    // Prefer persisted override (view mode) when available
    const overridePath =
      extractedObject?.ui_overrides?.destinationPath &&
      typeof extractedObject.ui_overrides.destinationPath === "string"
        ? extractedObject.ui_overrides.destinationPath
        : "";
    setDestinationPath(overridePath || path);
  }, [breadcrumb, extractedObject]);

  useEffect(() => {
    if (isEditing) return;
    const overrideCategory =
      extractedObject?.ui_overrides?.category &&
      typeof extractedObject.ui_overrides.category === "string"
        ? extractedObject.ui_overrides.category
        : "";
    const fallbackType =
      typeof extractedObject?.bgm?.type === "string"
        ? extractedObject.bgm.type
        : "";
    const normalized = normalizeCategoryValue(overrideCategory || fallbackType);
    setCategoryValue(normalized);
  }, [extractedObject, isEditing]);

  const { data: rootFoldersResponse } = useGetDocumentsQuery(
    {
      clientId: clientCompanyIdForDocs,
      parentId: undefined,
      limit: 500,
      status: "active",
    },
    { skip: !destinationDialogOpen },
  );
  const rootFolders =
    rootFoldersResponse?.data
      ?.filter((d) => d.isFolder)
      .map((d) => ({ id: d.id, name: d.name })) ?? [];

  const handleToggleExpand = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const { data: selectedDestinationBreadcrumb } = useGetBreadcrumbQuery(
    parentId!,
    {
      skip: !destinationDialogOpen || parentId == null,
    },
  );

  const selectedDestinationPath = useMemo(() => {
    if (!selectedDestinationBreadcrumb?.data) return "";
    return selectedDestinationBreadcrumb.data.map((b) => b.name).join(" > ");
  }, [selectedDestinationBreadcrumb]);

  const updateLineItem = (
    id: string,
    key: keyof (typeof lineItems)[number],
    value: string,
  ) => {
    setLineItems((prev) =>
      prev.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );
  };

  const addLineItem = () => {
    setLineItems((prev) => [
      ...prev,
      {
        id: `${Date.now()}`,
        date: "",
        description: "",
        qty: "1",
        unit: "",
        unitPrice: "0.00",
        discount: "0",
        total: "0.00",
      },
    ]);
  };

  const removeLineItem = (id: string) => {
    setLineItems((prev) => prev.filter((row) => row.id !== id));
  };

  const extractedDataForSave = useMemo(() => {
    if (lastExtractedData && typeof lastExtractedData === "object")
      return lastExtractedData as Record<string, unknown>;
    if (
      !invoiceMetadata?.rawData ||
      typeof invoiceMetadata.rawData !== "object"
    )
      return (invoiceMetadata?.rawData ?? {}) as Record<string, unknown>;
    return invoiceMetadata.rawData as Record<string, unknown>;
  }, [invoiceMetadata, lastExtractedData]);

  const handleExtract = async () => {
    if (!documentId) return;
    try {
      const res = await extractInvoice(documentId).unwrap();
      if (res.data?.extractedData) setLastExtractedData(res.data.extractedData);
      // Invalidate + refetch document to reflect processingStatus='traite'
      dispatch(
        documentsApi.util.invalidateTags([
          { type: "Documents", id: documentId },
        ]),
      );
      dispatch(
        documentsApi.util.invalidateTags([
          { type: "Documents", id: `breadcrumb-${documentId}` },
        ]),
      );
      await refetchDocument();
      await refetchBreadcrumb();
    } catch {
      // Error handled by mutation / snackbar
    }
  };

  const handleSave = async () => {
    if (!documentId) return;
    try {
      // Persist edits into rawData (backend stores JSON as-is)
      const base: any =
        extractedDataForSave && typeof extractedDataForSave === "object"
          ? JSON.parse(JSON.stringify(extractedDataForSave))
          : {};

      // Inject editable table back into lin_section
      base.lin_section = lineItems.map((r: any) => ({
        lin_imd: r.description,
        lin_qty: r.qty,
        lin_dtm: r.date,
        lin_moa: { rff: r.unitPrice, lin_total: r.total, dtm: null },
        lin_alc: null,
        lin_tax: null,
        lin_ftx: null,
        sub_lin: null,
      }));

      base.ui_overrides = {
        category: categoryValue || null,
        destinationPath: destinationPath || null,
      };

      await saveMetadata({ documentId, extractedData: base }).unwrap();
      // Switch to view mode immediately after save
      setForceViewMode(true);
      setIsEditing(false);

      // Invalidate stats + document caches so next-step buttons appear
      dispatch(
        relationshipsApi.util.invalidateTags([
          { type: "ClientsInvoiceStats", id: "LIST" },
        ]),
      );
      dispatch(
        documentsApi.util.invalidateTags([
          { type: "Documents", id: documentId },
        ]),
      );
      dispatch(
        documentsApi.util.invalidateTags([
          { type: "Documents", id: `breadcrumb-${documentId}` },
        ]),
      );
      await refetchDocument();
      await refetchBreadcrumb();
    } catch {
      // Error handled by mutation
    }
  };

  const handleSynchronize = async () => {
    if (!documentId) return;
    try {
      await synchronizeDoc(documentId).unwrap();
      setForceViewMode(true);
      setIsEditing(false);
      dispatch(
        relationshipsApi.util.invalidateTags([
          { type: "ClientsInvoiceStats", id: "LIST" },
        ]),
      );
      dispatch(
        documentsApi.util.invalidateTags([
          { type: "Documents", id: documentId },
        ]),
      );
      dispatch(
        documentsApi.util.invalidateTags([
          { type: "Documents", id: `breadcrumb-${documentId}` },
        ]),
      );
      await refetchDocument();
      await refetchBreadcrumb();
    } catch {
      // Error handled by mutation
    }
  };

  const loading = isExtracting || isSaving || isSyncing;
  const isViewMode =
    !isEditing &&
    (forceViewMode ||
      processingStatus === "enregistre" ||
      processingStatus === "synchronise");

  // Poll document status when extraction is running server-side (upload-time)
  useEffect(() => {
    if (!hasDocumentId) return undefined;
    if (processingStatus !== "pending") return undefined;
    const id = window.setInterval(() => {
      void refetchDocument();
    }, 2000);
    return () => window.clearInterval(id);
  }, [hasDocumentId, processingStatus, refetchDocument]);

  // État "Extraction en cours"
  if (processingStatus === "pending" || isExtracting) {
    return (
      <Box sx={{ py: 4, px: 2, textAlign: "center" }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mx: "auto",
            mb: 2,
          }}
        >
          <Lottie
            animationData={ExtractionAnim}
            loop
            style={{ width: 200, height: 200 }}
          />
        </Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Extraction en cours
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Restez sur cette page, l&apos;opération peut prendre un moment.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Partie haute (masquée en mode édition) */}
      {!isEditing && (
        <>
          {/* Emplacement */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              gutterBottom
            >
              Emplacement
            </Typography>
            <Typography variant="body2">
              {breadcrumb.length > 0
                ? breadcrumb.map((item, i) => (
                    <React.Fragment key={item.id}>
                      {i > 0 && " > "}
                      <Link
                        component="button"
                        variant="body2"
                        sx={{ cursor: "pointer" }}
                      >
                        {item.name}
                      </Link>
                    </React.Fragment>
                  ))
                : "—"}
            </Typography>
          </Box>

          {/* Catégorie */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              gutterBottom
            >
              Catégorie
            </Typography>
            <Typography variant="body2">Facturation</Typography>
          </Box>

          {/* Niveau de traitement */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              gutterBottom
            >
              Niveau de traitement :
            </Typography>
            <ProcessingLevelChips status={processingStatus} />
          </Box>
        </>
      )}

      {/* Formulaire (affiché uniquement après extraction réussie) */}
      {["traite", "enregistre", "synchronise"].includes(processingStatus) && (
        <>
          {/* Informations de base */}
          <Box sx={{ mt: 1 }}>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}
            >
              <FileText size={16} color={theme.palette.primary.main} />
              <Typography variant="subtitle2">Informations de base</Typography>
            </Box>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomInput
                  fullWidth
                  size="small"
                  label="Numéro de facture"
                  value={derivedInvoiceNumber}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomInput
                  fullWidth
                  size="small"
                  label="Date de facture"
                  placeholder="jj/mm/aaaa"
                  value={derivedInvoiceDate}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                {isEditing && (
                  <CustomSelect
                    label="Catégorie"
                    value={categoryValue}
                    onChange={(e) =>
                      setCategoryValue(String(e.target.value ?? ""))
                    }
                    displayEmpty
                    disabled={isViewMode}
                    MenuProps={{
                      // Render inside the drawer to avoid nested Modals aria-hidden conflicts
                      disablePortal: true,
                      disableScrollLock: true,
                    }}
                    renderValue={(v) =>
                      typeof v === "string" && v
                        ? (DOCUMENT_CATEGORIES.find((c) => c.value === v)
                            ?.label ?? "")
                        : "Sélectionnez une catégorie"
                    }
                  >
                    <MenuItem value="">
                      <em>Sélectionnez une catégorie</em>
                    </MenuItem>
                    {DOCUMENT_CATEGORIES.map((c) => (
                      <MenuItem key={c.value} value={c.value}>
                        {c.label}
                      </MenuItem>
                    ))}
                  </CustomSelect>
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                {isEditing && (
                  <CustomInput
                    fullWidth
                    size="small"
                    label="Chemin de destination"
                    placeholder="Choisir la destination"
                    value={destinationPath}
                    onClick={() =>
                      !isViewMode && setDestinationDialogOpen(true)
                    }
                    InputProps={{ readOnly: true }}
                    disabled={isViewMode}
                  />
                )}
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomInput
                  fullWidth
                  size="small"
                  label="Date de livraison"
                  placeholder="jj/mm/aaaa"
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomInput
                  fullWidth
                  size="small"
                  label="Total de la facture"
                  value={derivedTotals.totalTTC || "0.00"}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Détails financiers */}
          <Box>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}
            >
              <Calculator size={16} color={theme.palette.primary.main} />
              <Typography variant="subtitle2">Détails financiers</Typography>
            </Box>
            <Grid container spacing={1.5}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomInput
                  fullWidth
                  size="small"
                  label="Total HT"
                  value={derivedTotals.totalHT || "0.00"}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomInput
                  fullWidth
                  size="small"
                  label="Total TVA"
                  value={derivedTotals.totalTVA || "0.00"}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomInput
                  fullWidth
                  size="small"
                  label="Total TTC"
                  value={derivedTotals.totalTTC || "0.00"}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomInput
                  fullWidth
                  size="small"
                  label="TVA (%)"
                  value={derivedTotals.tvaPercent || "0.00"}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomInput
                  fullWidth
                  size="small"
                  label="Devise"
                  value="EUR"
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomInput
                  fullWidth
                  size="small"
                  label="Fournisseur"
                  placeholder="Nom du fournisseur"
                  value={derivedVendor}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <CustomInput
                  fullWidth
                  size="small"
                  label="Client"
                  placeholder="Nom du client"
                  value={derivedClient}
                  InputProps={{ readOnly: true }}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Liste des articles */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Liste des articles
            </Typography>
            <CustomButton
              variant="outlined"
              size="small"
              sx={{ mb: 1 }}
              onClick={addLineItem}
              disabled={isViewMode}
            >
              + Ajouter un article
            </CustomButton>
            <Box
              sx={{
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: 1,
                overflowX: "auto",
              }}
            >
              {lineItems.length === 0 ? (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ p: 2, textAlign: "center" }}
                >
                  Aucun article pour le moment
                </Typography>
              ) : (
                <Table size="small" sx={{ minWidth: 980 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Quantité</TableCell>
                      <TableCell>Unité</TableCell>
                      <TableCell>Prix unitaire</TableCell>
                      <TableCell>Remise (%)</TableCell>
                      <TableCell>Total</TableCell>
                      <TableCell align="right">Action</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {lineItems.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell sx={{ width: 140 }}>
                          <CustomInput
                            fullWidth
                            size="small"
                            value={row.date}
                            placeholder="jj/mm/aaaa"
                            onChange={(e) =>
                              updateLineItem(row.id, "date", e.target.value)
                            }
                            disabled={isViewMode}
                          />
                        </TableCell>
                        <TableCell sx={{ minWidth: 260 }}>
                          <CustomInput
                            fullWidth
                            size="small"
                            value={row.description}
                            placeholder="Description"
                            onChange={(e) =>
                              updateLineItem(
                                row.id,
                                "description",
                                e.target.value,
                              )
                            }
                            disabled={isViewMode}
                          />
                        </TableCell>
                        <TableCell sx={{ width: 120 }}>
                          <CustomInput
                            fullWidth
                            size="small"
                            value={row.qty}
                            onChange={(e) =>
                              updateLineItem(row.id, "qty", e.target.value)
                            }
                            disabled={isViewMode}
                          />
                        </TableCell>
                        <TableCell sx={{ width: 120 }}>
                          <CustomInput
                            fullWidth
                            size="small"
                            value={row.unit}
                            onChange={(e) =>
                              updateLineItem(row.id, "unit", e.target.value)
                            }
                            disabled={isViewMode}
                          />
                        </TableCell>
                        <TableCell sx={{ width: 140 }}>
                          <CustomInput
                            fullWidth
                            size="small"
                            value={row.unitPrice}
                            onChange={(e) =>
                              updateLineItem(
                                row.id,
                                "unitPrice",
                                e.target.value,
                              )
                            }
                            disabled={isViewMode}
                          />
                        </TableCell>
                        <TableCell sx={{ width: 140 }}>
                          <CustomInput
                            fullWidth
                            size="small"
                            value={row.discount}
                            onChange={(e) =>
                              updateLineItem(row.id, "discount", e.target.value)
                            }
                            disabled={isViewMode}
                          />
                        </TableCell>
                        <TableCell sx={{ width: 140 }}>
                          <CustomInput
                            fullWidth
                            size="small"
                            value={row.total}
                            onChange={(e) =>
                              updateLineItem(row.id, "total", e.target.value)
                            }
                            disabled={isViewMode}
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => removeLineItem(row.id)}
                            disabled={isViewMode}
                          >
                            <Trash2 size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Box>
          </Box>

          {/* Catégorie + chemin déplacés dans Informations de base */}

          {/* Boutons Enregistrer / Modifier / Synchroniser */}
          <Box
            sx={{
              display: "flex",
              gap: 1,
              flexWrap: "wrap",
              mt: 1,
              justifyContent: "flex-end",
            }}
          >
            {processingStatus === "traite" && hasDocumentId && (
              <CustomButton
                variant="contained"
                color="primary"
                startIcon={<Check size={18} />}
                onClick={handleSave}
                disabled={loading}
              >
                Enregistrer
              </CustomButton>
            )}
            {(processingStatus === "enregistre" ||
              processingStatus === "synchronise") && (
              <>
                {!isEditing ? (
                  <CustomButton
                    variant="outlined"
                    startIcon={<Pencil size={18} />}
                    onClick={() => setIsEditing(true)}
                    disabled={loading}
                  >
                    Modifier
                  </CustomButton>
                ) : (
                  <>
                    <CustomButton
                      variant="outlined"
                      onClick={() => {
                        setIsEditing(false);
                        setLineItems(derivedLineItems);
                        setCategoryValue("");
                        const path =
                          breadcrumb.length > 0
                            ? breadcrumb.map((b) => b.name).join(" > ")
                            : "";
                        setDestinationPath(path);
                      }}
                      disabled={loading}
                    >
                      Annuler
                    </CustomButton>
                    <CustomButton
                      variant="contained"
                      color="primary"
                      startIcon={<Check size={18} />}
                      onClick={handleSave}
                      disabled={loading}
                    >
                      Enregistrer
                    </CustomButton>
                  </>
                )}
                {!isEditing &&
                  processingStatus === "enregistre" &&
                  hasDocumentId && (
                    <CustomButton
                      variant="contained"
                      color="primary"
                      startIcon={<RefreshCw size={18} />}
                      onClick={handleSynchronize}
                      disabled={loading}
                    >
                      Synchroniser
                    </CustomButton>
                  )}
              </>
            )}
          </Box>

          {/* Destination dialog (simple) */}
          <Dialog
            open={destinationDialogOpen}
            onClose={() => setDestinationDialogOpen(false)}
            maxWidth="sm"
            fullWidth
            sx={{ zIndex: (t) => t.zIndex.modal + 50 }}
            slotProps={{
              backdrop: { sx: { zIndex: (t) => t.zIndex.modal + 49 } },
              paper: { sx: { zIndex: (t) => t.zIndex.modal + 50 } },
            }}
          >
            <DialogTitle>Choisir la destination du document</DialogTitle>
            <DialogContent dividers>
              <CustomInput
                fullWidth
                size="small"
                label="Chemin"
                placeholder="Ex: Banque > QNB > Factures"
                value={destinationPath}
                onChange={(e) => setDestinationPath(e.target.value)}
                sx={{ mb: 2 }}
              />
              <Box
                sx={{
                  border: 1,
                  borderColor: "divider",
                  borderRadius: 2,
                  maxHeight: 240,
                  overflow: "auto",
                }}
              >
                <Box
                  onClick={() => setParentId(null)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    px: 2,
                    py: 1.25,
                    cursor: "pointer",
                    bgcolor:
                      parentId === null ? "action.selected" : "transparent",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <ChevronRight size={18} color="transparent" />
                  <Folder size={18} />
                  <Typography variant="body2">Racine</Typography>
                </Box>
                {rootFolders.map((folder) => (
                  <FolderTreeItem
                    key={folder.id}
                    folderId={folder.id}
                    folderName={folder.name}
                    depth={0}
                    expandedIds={expandedIds}
                    onToggleExpand={handleToggleExpand}
                    selectedId={parentId}
                    onSelect={setParentId}
                    clientId={clientCompanyIdForDocs}
                  />
                ))}
              </Box>
            </DialogContent>
            <DialogActions>
              <CustomButton
                variant="outlined"
                onClick={() => setDestinationDialogOpen(false)}
              >
                Annuler
              </CustomButton>
              <CustomButton
                variant="contained"
                onClick={() => {
                  // Prefer folder selection path when available
                  if (selectedDestinationPath)
                    setDestinationPath(selectedDestinationPath);
                  setDestinationDialogOpen(false);
                }}
              >
                Valider
              </CustomButton>
            </DialogActions>
          </Dialog>
        </>
      )}

      {/* Extraction se fait lors de l'upload : pas de bouton "Extraire" */}
    </Box>
  );
}

// ─── Modal Modifier votre fichier ─────────────────────────────────────────────

interface EditFileModalProps {
  open: boolean;
  onClose: () => void;
  file: FileItem;
  breadcrumb: Array<{ id: number; name: string }>;
  onSave: (values: Record<string, string>) => void;
}

function EditFileModal({
  open,
  onClose,
  file,
  breadcrumb,
  onSave,
}: EditFileModalProps) {
  const [fileName, setFileName] = useState(file.name);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [vendorAddress, setVendorAddress] = useState("");
  const [vendorName, setVendorName] = useState("");
  const [category, setCategory] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [currency, setCurrency] = useState("");

  const handleSubmit = () => {
    onSave({
      fileName,
      invoiceNumber,
      vendorAddress,
      vendorName,
      category,
      paymentTerms,
      currency,
    });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6">Modifier votre fichier</Typography>
        <Typography variant="caption" color="text.secondary">
          Ajoutée le {formatDateAdded(file.created)}
        </Typography>
      </DialogTitle>
      <DialogContent dividers>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <Box>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}
            >
              <FileText size={16} />
              <Typography variant="subtitle2">Informations de base</Typography>
            </Box>
            <Grid container spacing={1.5}>
              <Grid size={12}>
                <CustomInput
                  fullWidth
                  size="small"
                  label="Nom du fichier"
                  placeholder="Saisir le nom du fichier"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                />
              </Grid>
              <Grid size={12}>
                <CustomInput
                  fullWidth
                  size="small"
                  label="Numéro de facture"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                />
              </Grid>
              <Grid size={12}>
                <CustomInput
                  fullWidth
                  size="small"
                  label="Adresse du fournisseur"
                  placeholder="Saisir l'adresse du fournisseur"
                  value={vendorAddress}
                  onChange={(e) => setVendorAddress(e.target.value)}
                />
              </Grid>
              <Grid size={12}>
                <CustomInput
                  fullWidth
                  size="small"
                  label="Nom du fournisseur"
                  placeholder="Sélectionner une catégorie"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                />
              </Grid>
              <Grid size={12}>
                <CustomInput
                  fullWidth
                  size="small"
                  label="Catégorie"
                  placeholder="Sélectionner une catégorie"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>

          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Choisir la destination du fichier
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {breadcrumb.length > 0
                ? breadcrumb.map((b) => b.name).join(" > ")
                : "—"}
            </Typography>
          </Box>

          <Box>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1 }}
            >
              <Calculator size={16} />
              <Typography variant="subtitle2">Détails financiers</Typography>
            </Box>
            <Grid container spacing={1.5}>
              <Grid size={12}>
                <CustomInput
                  fullWidth
                  size="small"
                  label="Conditions de paiement"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                />
              </Grid>
              <Grid size={12}>
                <CustomInput
                  fullWidth
                  size="small"
                  label="Devise"
                  placeholder="Sélectionner une catégorie"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                />
              </Grid>
            </Grid>
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <CustomButton variant="outlined" onClick={onClose}>
          Annuler
        </CustomButton>
        <CustomButton
          variant="contained"
          startIcon={<Check size={18} />}
          onClick={handleSubmit}
        >
          Enregistrer
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
}

// ─── Drawer Content ───────────────────────────────────────────────────────────

interface FileDrawerContentProps {
  file: FileItem;
  previewContentUrl: string | null;
  onClose: () => void;
  onMenuAction?: (action: string, file: FileItem) => void;
  messages: Message[];
  unreadMessages: number;
  onSendMessage: (content: string, attachments?: File[]) => void;
  onTabChange: (tabIndex: number) => void;
}

function FileDrawerContent({
  file,
  previewContentUrl,
  onClose,
  onMenuAction,
  messages,
  unreadMessages,
  onSendMessage,
  onTabChange,
}: FileDrawerContentProps) {
  const theme = useTheme();
  const documentId = useMemo(() => {
    const id = file.id;
    if (typeof id === "number" && !Number.isNaN(id)) return id;
    const n = parseInt(String(id), 10);
    return Number.isNaN(n) ? null : n;
  }, [file.id]);

  const { data: breadcrumbResponse } = useGetBreadcrumbQuery(documentId!, {
    skip: documentId == null || Number.isNaN(documentId),
  });
  const breadcrumb = breadcrumbResponse?.data ?? [];

  const [editModalOpen, setEditModalOpen] = useState(false);

  const handlePreview = () => {
    if (previewContentUrl) window.open(previewContentUrl, "_blank");
  };

  const dateAdded = formatDateAdded(file.created);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2.5,
          py: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          flexShrink: 0,
          gap: 2,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            minWidth: 0,
            flex: 1,
          }}
        >
          <Box sx={{ flexShrink: 0 }}>{FILE_TYPE_ICONS[file.type]}</Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={600} noWrap>
              {file.name}
            </Typography>
            {dateAdded && (
              <Typography
                variant="caption"
                color="text.secondary"
                noWrap
                display="block"
              >
                Ajoutée le {dateAdded}
              </Typography>
            )}
          </Box>
        </Box>
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}
        >
          <CustomButton
            variant="outlined"
            color="info"
            startIcon={<Eye size={18} />}
            onClick={handlePreview}
            disabled={!previewContentUrl}
          >
            Voir le doc
          </CustomButton>
          <IconButton size="small" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </Box>
      </Box>

      {/* Tabs */}
      <Box sx={{ flex: 1, overflow: "auto", p: 2 }}>
        <DocumentsTabs
          onTabChange={onTabChange}
          secondTabLabel="Échanges"
          detailsContent={
            <DocumentDetailsPanel
              file={file}
              documentId={documentId}
              onOpenEditModal={() => setEditModalOpen(true)}
            />
          }
          chatContent={
            <Chat
              messages={messages}
              currentUserId="currentUser"
              currentUserName="Moi"
              recipientName="Destinataire"
              recipientStatus="online"
              onSendMessage={onSendMessage}
              height={400}
            />
          }
          unreadMessages={unreadMessages}
        />
      </Box>

      <EditFileModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        file={file}
        breadcrumb={breadcrumb}
        onSave={() => {}}
      />
    </Box>
  );
}

// ─── Global File Drawer ───────────────────────────────────────────────────────

interface GlobalFileDrawerProps {
  onMenuAction?: (action: string, file: FileItem) => void;
}

export function GlobalFileDrawer({ onMenuAction }: GlobalFileDrawerProps) {
  const { open, file, previewContentUrl, closeDrawer } = useFileDrawerStore();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      senderId: "user2",
      senderName: "Jean Dupont",
      senderAvatar: "/avatars/jean.jpg",
      content: "Bonjour, j'ai une question sur ce document",
      timestamp: "10:30",
      status: "read",
      isCurrentUser: false,
    },
    {
      id: "2",
      senderId: "user2",
      senderName: "Jean Dupont",
      senderAvatar: "/avatars/jean.jpg",
      content: "Est-ce que vous pourriez me donner plus de détails ?",
      timestamp: "10:31",
      status: "read",
      isCurrentUser: false,
    },
    {
      id: "3",
      senderId: "currentUser",
      senderName: "Moi",
      content: "Bien sûr, je vous envoie ça tout de suite",
      timestamp: "10:32",
      status: "read",
      isCurrentUser: true,
    },
  ]);
  const [unreadMessages, setUnreadMessages] = useState(2);

  const handleSendMessage = (content: string, attachments?: File[]) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      senderId: "currentUser",
      senderName: "Moi",
      content,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "sent",
      isCurrentUser: true,
      attachments: attachments?.map((f) => ({
        type: f.type.startsWith("image/") ? "image" : "file",
        url: URL.createObjectURL(f),
        name: f.name,
      })),
    };
    setMessages((prev) => [...prev, newMessage]);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          senderId: "user2",
          senderName: "Jean Dupont",
          content: "Merci pour votre retour !",
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          status: "delivered",
          isCurrentUser: false,
        },
      ]);
      setUnreadMessages((prev) => prev + 1);
    }, 2000);
  };

  const handleTabChange = (tabIndex: number) => {
    if (tabIndex === 1) setUnreadMessages(0);
  };

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={closeDrawer}
      sx={{ zIndex: (theme) => theme.zIndex.modal + 10 }}
      slotProps={{
        paper: {
          sx: {
            width: { xs: "95%", sm: 520 },
            height: "calc(100% - 32px)",
            top: "16px",
            right: { xs: "13px", sm: "16px" },
            borderRadius: 3,
            overflow: "hidden",
          },
        },
      }}
    >
      {file && (
        <FileDrawerContent
          file={file}
          previewContentUrl={previewContentUrl}
          onClose={closeDrawer}
          onMenuAction={onMenuAction}
          messages={messages}
          unreadMessages={unreadMessages}
          onSendMessage={handleSendMessage}
          onTabChange={handleTabChange}
        />
      )}
    </Drawer>
  );
}
