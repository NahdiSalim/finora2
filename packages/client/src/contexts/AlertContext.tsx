import type { AlertProps } from "@mui/material/Alert";
import type { ReactNode } from "react";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";

import { CustomSnackbar } from "src/components/common/snackbar";
import { setApiToastHandler } from "src/lib/services/apiToastBridge";

type ActionButton = {
  label: string;
  onClick: () => void | Promise<void>;
};

type AlertContextType = {
  showAlert: (
    message: string,
    severity?: AlertProps["severity"],
    title?: string,
  ) => void;
  showConfirm: (
    message: string,
    onConfirm: () => void | Promise<void>,
    onCancel?: () => void,
  ) => void;
  hideAlert: () => void;
};

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export function AlertProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [severity, setSeverity] = useState<AlertProps["severity"] | "default">(
    "info",
  );
  const [actionButtons, setActionButtons] = useState<
    ActionButton[] | undefined
  >(undefined);
  const [autoHideDuration, setAutoHideDuration] = useState<number | null>(5000);

  const hideAlert = useCallback(() => {
    setOpen(false);
  }, []);

  const showAlert = useCallback(
    (msg: string, sev: AlertProps["severity"] = "info") => {
      setMessage(msg);
      setSeverity(sev);
      setActionButtons(undefined);
      setAutoHideDuration(5000);
      setOpen(true);
    },
    [],
  );

  const showConfirm = (
    msg: string,
    onConfirm: () => void | Promise<void>,
    onCancel?: () => void,
  ) => {
    setMessage(msg);
    setSeverity("default");
    setAutoHideDuration(null);
    setActionButtons([
      {
        label: "Oui",
        onClick: async () => {
          await onConfirm();
          setTimeout(() => {
            hideAlert();
          }, 3000);
        },
      },
      {
        label: "Non",
        onClick: () => {
          if (onCancel) onCancel();
          hideAlert();
        },
      },
    ]);
    setOpen(true);
  };

  useEffect(() => {
    setApiToastHandler((toastMessage, toastSeverity) => {
      showAlert(toastMessage, toastSeverity);
    });
    return () => setApiToastHandler(null);
  }, [showAlert]);

  useEffect(() => {
    if (open && autoHideDuration !== null) {
      const timer = setTimeout(() => {
        hideAlert();
      }, autoHideDuration);

      return () => clearTimeout(timer);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, autoHideDuration]);

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, hideAlert }}>
      {children}
      <CustomSnackbar
        open={open}
        message={message}
        severity={severity}
        autoHideDuration={autoHideDuration}
        onClose={hideAlert}
        actionButtons={actionButtons}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      />
    </AlertContext.Provider>
  );
}

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert must be used within AlertProvider");
  }
  return context;
}
