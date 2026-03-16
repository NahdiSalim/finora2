import IconButton from "@mui/material/IconButton";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";

type MessageAttachmentButtonProps = {
  disabled?: boolean;
  onFileSelect: (file: File) => void;
};

export default function MessageAttachmentButton({
  disabled,
  onFileSelect,
}: MessageAttachmentButtonProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) {
      event.target.value = "";
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    onFileSelect(file);
    event.target.value = "";
  };

  return (
    <IconButton
      component="label"
      disabled={disabled}
      sx={{
        color: disabled ? "#D0D5DD" : "#98A2B3",
        width: 42,
        height: 42,
        flexShrink: 0,
        border: "1px solid",
        borderColor: disabled ? "#EAECF0" : "#E4E7EC",
        borderRadius: "12px",
        backgroundColor: disabled ? "#F9FAFB" : "#FFFFFF",
        "&:hover": {
          backgroundColor: disabled ? "#F9FAFB" : "#F9FAFB",
        },
        "&.Mui-disabled": {
          color: "#D0D5DD",
          borderColor: "#EAECF0",
          backgroundColor: "#F9FAFB",
        },
      }}
    >
      <AttachFileOutlinedIcon sx={{ fontSize: 18 }} />

      <input
        type="file"
        hidden
        onChange={handleFileChange}
        disabled={disabled}
      />
    </IconButton>
  );
}
