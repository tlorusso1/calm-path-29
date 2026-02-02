import * as React from "react";
import { cn } from "@/lib/utils";
import { parse, format, isValid } from "date-fns";

interface DatePasteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Converte data de múltiplos formatos para ISO (YYYY-MM-DD)
 * Suporta: DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, MM/DD/YYYY, YYYY-MM-DD, DD/MM/YY
 * Também suporta datas do Excel (números seriais)
 */
function parseDate(value: string | number): string | null {
  if (!value) return null;

  // Handle Excel serial dates (numbers between 1 and 100000 are likely dates)
  if (typeof value === "number" && value > 1 && value < 100000) {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return format(date, "yyyy-MM-dd");
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    
    // Se já está no formato ISO, retornar
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const parsed = parse(trimmed, "yyyy-MM-dd", new Date());
      if (isValid(parsed)) return trimmed;
    }

    // Tentar múltiplos formatos em ordem de prioridade (brasileiro primeiro)
    const formats = [
      "dd/MM/yyyy",  // Brasileiro (prioridade)
      "dd-MM-yyyy",
      "dd.MM.yyyy",
      "dd/MM/yy",    // Ano curto brasileiro
      "MM/dd/yyyy",  // Americano
      "yyyy-MM-dd",  // ISO
    ];

    for (const fmt of formats) {
      const parsed = parse(trimmed, fmt, new Date());
      if (isValid(parsed)) {
        // Validação extra: verificar se o dia é válido para o mês
        const formatted = format(parsed, "yyyy-MM-dd");
        const [year, month, day] = formatted.split('-').map(Number);
        const checkDate = new Date(year, month - 1, day);
        if (checkDate.getDate() === day) {
          return formatted;
        }
      }
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
    const lastEmittedValue = React.useRef<string | undefined>(value);
    const inputRef = React.useRef<HTMLInputElement>(null);
    const isPasting = React.useRef(false);

    // Sync textValue when value prop changes externally (not from our own emit)
    React.useEffect(() => {
      // Only update if value changed from external source
      if (value !== lastEmittedValue.current) {
        setTextValue(formatToBrazilian(value));
        lastEmittedValue.current = value;
      }
    }, [value]);

    const emitChange = React.useCallback((isoDate: string) => {
      lastEmittedValue.current = isoDate || undefined;
      if (onChange) {
        const syntheticEvent = {
          target: { value: isoDate },
          currentTarget: { value: isoDate },
        } as React.ChangeEvent<HTMLInputElement>;
        onChange(syntheticEvent);
      }
    }, [onChange]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Se estamos no meio de um paste, ignorar o onChange
      if (isPasting.current) {
        return;
      }
      
      const newText = e.target.value;
      setTextValue(newText);
      
      // Tentar parsear enquanto digita
      const isoDate = parseDate(newText);
      if (isoDate) {
        emitChange(isoDate);
      }
    };

    const handleBlur = () => {
      // Ao sair do campo, tentar converter
      const isoDate = parseDate(textValue);
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

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pastedText = e.clipboardData.getData('text');
      const isoDate = parseDate(pastedText);
      
      if (isoDate) {
        e.preventDefault();
        isPasting.current = true;
        
        const formatted = formatToBrazilian(isoDate);
        setTextValue(formatted);
        emitChange(isoDate);
        
        // Reset flag após o React processar
        requestAnimationFrame(() => {
          isPasting.current = false;
        });
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Enter confirma a data
      if (e.key === 'Enter') {
        const isoDate = parseDate(textValue);
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
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        {...props}
      />
    );
  }
);

DatePasteInput.displayName = "DatePasteInput";

export { DatePasteInput };
