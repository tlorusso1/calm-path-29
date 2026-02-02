import * as React from "react";
import { cn } from "@/lib/utils";

interface DatePasteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Converte data no formato brasileiro (DD/MM/YYYY) para ISO (YYYY-MM-DD)
 */
function parseBrazilianDate(text: string): string | null {
  const cleaned = text.trim();
  
  // Tenta formato DD/MM/YYYY ou DD-MM-YYYY ou DD.MM.YYYY
  const match = cleaned.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const month = match[2].padStart(2, '0');
    const year = match[3];
    
    // Validar data
    const date = new Date(`${year}-${month}-${day}`);
    if (!isNaN(date.getTime()) && date.getDate() === parseInt(day)) {
      return `${year}-${month}-${day}`;
    }
  }
  
  return null;
}

/**
 * Formata data ISO (YYYY-MM-DD) para exibição brasileira (DD/MM/YYYY)
 */
function formatToBrazilian(isoDate: string | undefined): string {
  if (!isoDate) return '';
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return isoDate;
}

const DatePasteInput = React.forwardRef<HTMLInputElement, DatePasteInputProps>(
  ({ className, onChange, value, placeholder, ...props }, ref) => {
    const [textValue, setTextValue] = React.useState(() => formatToBrazilian(value));
    const [isFocused, setIsFocused] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Sync textValue when value prop changes externally
    React.useEffect(() => {
      if (!isFocused) {
        setTextValue(formatToBrazilian(value));
      }
    }, [value, isFocused]);

    const emitChange = (isoDate: string) => {
      if (onChange) {
        const syntheticEvent = {
          target: { value: isoDate },
          currentTarget: { value: isoDate },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    };

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newText = e.target.value;
      setTextValue(newText);
      
      // Tentar parsear enquanto digita
      const isoDate = parseBrazilianDate(newText);
      if (isoDate) {
        emitChange(isoDate);
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      
      // Ao sair do campo, tentar converter
      const isoDate = parseBrazilianDate(textValue);
      if (isoDate) {
        emitChange(isoDate);
        setTextValue(formatToBrazilian(isoDate));
      } else if (textValue === '') {
        emitChange('');
      } else {
        // Se não conseguiu parsear, restaurar o valor original
        setTextValue(formatToBrazilian(value));
      }
    };

    const handleFocus = () => {
      setIsFocused(true);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pastedText = e.clipboardData.getData('text');
      const isoDate = parseBrazilianDate(pastedText);
      
      if (isoDate) {
        e.preventDefault();
        setTextValue(formatToBrazilian(isoDate));
        emitChange(isoDate);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Enter confirma a data
      if (e.key === 'Enter') {
        const isoDate = parseBrazilianDate(textValue);
        if (isoDate) {
          emitChange(isoDate);
          setTextValue(formatToBrazilian(isoDate));
        }
      }
    };

    return (
      <input
        ref={ref || inputRef}
        type="text"
        inputMode="numeric"
        placeholder={placeholder || "DD/MM/AAAA"}
        className={cn(
          "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "md:text-sm",
          className
        )}
        value={textValue}
        onChange={handleTextChange}
        onBlur={handleBlur}
        onFocus={handleFocus}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);

DatePasteInput.displayName = "DatePasteInput";

export { DatePasteInput };
