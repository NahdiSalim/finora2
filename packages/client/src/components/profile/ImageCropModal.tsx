import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
} from "@mui/material";
import CustomButton from "src/components/common/CustomButton";

export const AVATAR_CROP_SIZE = { width: 400, height: 400 };
export const COVER_CROP_SIZE = { width: 1200, height: 400 };

export type CropType = "avatar" | "cover";

export interface ImageCropModalProps {
  open: boolean;
  onClose: () => void;
  /** Initial image file (when opening for a new image). */
  file: File | null;
  type: CropType;
  onConfirm: (file: File) => void;
  /** When true, confirm button shows loading and is disabled. */
  loading?: boolean;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Produce a file with exact dimensions from the current crop. */
async function getCroppedFile(
  imageSrc: string,
  crop: { x: number; y: number; width: number; height: number },
  targetWidth: number,
  targetHeight: number,
  fileName: string,
): Promise<File> {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2d not available");

  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    targetWidth,
    targetHeight,
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to create blob"));
          return;
        }
        resolve(new File([blob], fileName, { type: blob.type }));
      },
      "image/jpeg",
      0.92,
    );
  });
}

export default function ImageCropModal({
  open,
  onClose,
  file,
  type,
  onConfirm,
  loading = false,
}: ImageCropModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const initialPositionSet = useRef(false);

  const isAvatar = type === "avatar";
  const targetSize = isAvatar ? AVATAR_CROP_SIZE : COVER_CROP_SIZE;
  const aspectRatio = targetSize.width / targetSize.height;

  // Load file as object URL when file or open changes
  useEffect(() => {
    if (!open || !file) {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      setImageSrc(null);
      setPosition({ x: 0, y: 0 });
      return () => {};
    }
    const url = URL.createObjectURL(file);
    setImageSrc(url);
    setPosition({ x: 0, y: 0 });
    initialPositionSet.current = false;
    return () => URL.revokeObjectURL(url);
  }, [open, file]);

  // Measure image natural size and container
  useEffect(() => {
    if (!imageSrc || !containerRef.current) return () => {};
    const img = new Image();
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = imageSrc;

    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setContainerSize({ width, height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [imageSrc]);

  // Scale so image covers the container; initial position centered (once per image)
  useEffect(() => {
    if (
      containerSize.width <= 0 ||
      containerSize.height <= 0 ||
      imageSize.width <= 0 ||
      imageSize.height <= 0
    )
      return;
    const scaleW = containerSize.width / imageSize.width;
    const scaleH = containerSize.height / imageSize.height;
    const s = Math.max(scaleW, scaleH);
    setScale(s);
    if (!initialPositionSet.current) {
      initialPositionSet.current = true;
      const displayW = imageSize.width * s;
      const displayH = imageSize.height * s;
      setPosition({
        x: (containerSize.width - displayW) / 2,
        y: (containerSize.height - displayH) / 2,
      });
    }
  }, [
    containerSize.width,
    containerSize.height,
    imageSize.width,
    imageSize.height,
  ]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        posX: position.x,
        posY: position.y,
      };
    },
    [position],
  );
  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const displayW = imageSize.width * scale;
      const displayH = imageSize.height * scale;
      let x = dragStart.current.posX + dx;
      let y = dragStart.current.posY + dy;
      x = Math.min(0, Math.max(containerSize.width - displayW, x));
      y = Math.min(0, Math.max(containerSize.height - displayH, y));
      setPosition({ x, y });
    },
    [dragging, imageSize, scale, containerSize],
  );
  const onMouseUp = useCallback(() => setDragging(false), []);
  useEffect(() => {
    if (!dragging) return () => {};
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [dragging, onMouseMove, onMouseUp]);

  const handleConfirm = useCallback(async () => {
    if (!imageSrc || !file) return;
    const displayW = imageSize.width * scale;
    const displayH = imageSize.height * scale;
    // Crop region in image coordinates (the part visible in the container)
    const cropX = -position.x / scale;
    const cropY = -position.y / scale;
    const cropW = containerSize.width / scale;
    const cropH = containerSize.height / scale;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    const cropped = await getCroppedFile(
      imageSrc,
      { x: cropX, y: cropY, width: cropW, height: cropH },
      targetSize.width,
      targetSize.height,
      `${baseName}-${type}.jpg`,
    );
    onConfirm(cropped);
    onClose();
  }, [
    imageSrc,
    file,
    imageSize,
    scale,
    position,
    containerSize,
    type,
    targetSize,
    onConfirm,
    onClose,
  ]);

  const title =
    type === "avatar"
      ? "Recadrer la photo de profil (400 × 400 px)"
      : "Recadrer la photo de couverture (1200 × 400 px)";

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Glissez l’image pour ajuster le cadrage. Les dimensions finales seront{" "}
          {targetSize.width} × {targetSize.height} px.
        </Typography>
        <Box
          ref={containerRef}
          onMouseDown={onMouseDown}
          sx={{
            aspectRatio,
            maxHeight: 400,
            overflow: "hidden",
            position: "relative",
            bgcolor: "grey.200",
            cursor: dragging ? "grabbing" : "grab",
            borderRadius: 1,
          }}
        >
          {imageSrc && imageSize.width > 0 && (
            <Box
              component="img"
              src={imageSrc}
              alt="Crop"
              sx={{
                position: "absolute",
                left: position.x,
                top: position.y,
                width: imageSize.width * scale,
                height: imageSize.height * scale,
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 2, pb: 2 }}>
        <CustomButton variant="outlined" onClick={onClose} disabled={loading}>
          Annuler
        </CustomButton>
        <CustomButton
          variant="contained"
          onClick={handleConfirm}
          loading={loading}
          disabled={loading}
        >
          Recadrer et enregistrer
        </CustomButton>
      </DialogActions>
    </Dialog>
  );
}
