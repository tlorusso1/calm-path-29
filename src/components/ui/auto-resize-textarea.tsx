import * as React from "react";
import { cn } from "@/lib/utils";

interface AutoResizeTextareaProps 
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const AutoResizeTextarea = React.forwardRef<
  HTMLTextAreaElement, 
  AutoResizeTextareaProps
>(({ className, onChange, ...props }, ref) => {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  
  React.useImperativeHandle(ref, () => textareaRef.current!);
  
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  React.useEffect(() => {
    adjustHeight();
  }, [props.value]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    adjustHeight();
    onChange?.(e);
  };

  return (
    <textarea
      ref={textareaRef}
      className={cn(
        "flex w-full rounded-md bg-transparent px-1 py-0 text-sm",
        "resize-none overflow-hidden",
        "ring-offset-background placeholder:text-muted-foreground",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "min-h-[1.75rem]",
        className
      )}
      onChange={handleChange}
      rows={1}
      {...props}
    />
  );
});

AutoResizeTextarea.displayName = "AutoResizeTextarea";

export { AutoResizeTextarea };
