import { TextField, IconButton, InputAdornment } from '@mui/material';
import type { TextFieldProps } from '@mui/material';
import type { InputLabelProps } from '@mui/material/InputLabel';
import { forwardRef, useState } from 'react';
import type { ReactNode } from 'react';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

interface CustomInputProps extends Omit<TextFieldProps, 'slotProps'> {
  isEdit?: boolean;
  isPassword?: boolean;
  showPasswordToggle?: boolean;
  slotProps?: Omit<TextFieldProps['slotProps'], 'inputLabel'> & {
    inputLabel?: InputLabelProps;
    input?: Record<string, unknown> & {
      endAdornment?: ReactNode;
    };
  };
  InputProps?: Record<string, unknown>;
}

const CustomInput = forwardRef<HTMLDivElement, CustomInputProps>(
  (
    {
      isEdit = false,
      isPassword = false,
      showPasswordToggle = true,
      slotProps,
      InputProps,
      type,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);

    const shouldShowToggle = isPassword && showPasswordToggle;
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    const endAdornment: ReactNode = shouldShowToggle ? (
      <InputAdornment position="end">
        <IconButton
          onClick={() => setShowPassword(!showPassword)}
          edge="end"
          aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {showPassword ? <VisibilityOff /> : <Visibility />}
        </IconButton>
      </InputAdornment>
    ) : (
      slotProps?.input?.endAdornment
    );

    return (
      <TextField
        ref={ref}
        variant="outlined"
        {...props}
        type={inputType}
        InputProps={InputProps}
        slotProps={{
          ...slotProps,
          inputLabel: {
            ...slotProps?.inputLabel,
            shrink: isEdit || slotProps?.inputLabel?.shrink,
          },
          input: {
            ...slotProps?.input,
            endAdornment,
          },
        }}
      />
    );
  }
);

CustomInput.displayName = 'CustomInput';

export default CustomInput;
