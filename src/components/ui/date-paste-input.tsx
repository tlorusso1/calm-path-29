import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface DatePasteInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onDateChange?: (isoDate: string | undefined) => void;
}

/**
 * Converte data no formato brasileiro (DD/MM/YYYY) para ISO (YYYY-MM-DD)
 */
function parseBrazilianDate(text: string): string | null {
  // Remove espaços extras
  const cleaned = text.trim();
  
  // Tenta formato DD/MM/YYYY ou DD-MM-YYYY
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

const DatePasteInput = React.forwardRef<HTMLInputElement, DatePasteInputProps>(
  ({ className, onChange, onDateChange, value, ...props }, ref) => {
    
    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pastedText = e.clipboardData.getData('text');
      const isoDate = parseBrazilianDate(pastedText);
      
      if (isoDate) {
        e.preventDefault();
        
        // Criar um evento sintético para o onChange nativo
        const nativeEvent = new Event('input', { bubbles: true });
        const target = e.currentTarget;
        
        // Setar o valor no input
        Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')
          ?.set?.call(target, isoDate);
        
        target.dispatchEvent(nativeEvent);
        
        // Também chamar o callback se fornecido
        if (onDateChange) {
          onDateChange(isoDate);
        }
        
        // Chamar onChange com evento sintético
        if (onChange) {
          const syntheticEvent = {
            ...e,
            target: { ...e.currentTarget, value: isoDate },
            currentTarget: { ...e.currentTarget, value: isoDate },
          } as React.ChangeEvent<HTMLInputElement>;
          onChange(syntheticEvent);
        }
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(e);
      }
      if (onDateChange) {
        onDateChange(e.target.value || undefined);
      }
    };

    return (
      <Input
        ref={ref}
        type="date"
        className={cn(className)}
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        {...props}
      />
    );
  }
);

DatePasteInput.displayName = "DatePasteInput";

export { DatePasteInput };
