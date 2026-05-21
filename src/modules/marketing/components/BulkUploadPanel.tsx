import { useReducer, useRef, useState } from "react";
import {
  Upload, X, CheckCircle2, XCircle, Loader2, ImageIcon, ExternalLink, Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { queueReducer, processBulkUploadQueue } from "../api/bulkUpload";
import type { UploadQueue } from "../api/bulkUpload";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { MetaAdSet } from "../hooks/useMarketingData";

interface Props {
  adSets: MetaAdSet[];
}

const ACCEPT = "image/jpeg,image/png,image/gif,video/mp4,video/quicktime";

export function BulkUploadPanel({ adSets }: Props) {
  const [queue, dispatch] = useReducer(queueReducer, [] as UploadQueue);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const { toast } = useToast();

  function addFiles(files: FileList | null) {
    if (!files) return;
    const valid = Array.from(files).filter(
      (f) => f.type.startsWith("image/") || f.type.startsWith("video/")
    );
    if (valid.length < files.length) {
      toast({ title: "Arquivos ignorados", description: "Apenas imagens e vídeos são aceitos." });
    }
    if (valid.length > 0) dispatch({ type: "ADD_FILES", files: valid });
  }

  async function handleUploadAll() {
    const pending = queue.filter((i) => i.status === "pending");
    if (pending.length === 0) return;
    setUploading(true);
    await processBulkUploadQueue(queue, (id, update) => {
      dispatch({ type: "UPDATE_ITEM", id, update });
    }, 3);
    setUploading(false);
    qc.invalidateQueries({ queryKey: ["marketing", "meta", "ads"] });
    const success = queue.filter((i) => i.status === "success").length;
    if (success > 0) {
      toast({ title: `✅ ${success} criativo(s) enviado(s)!`, description: "Disponíveis no Meta Ads." });
    }
  }

  const pendingCount  = queue.filter((i) => i.status === "pending").length;
  const successCount  = queue.filter((i) => i.status === "success").length;
  const errorCount    = queue.filter((i) => i.status === "error").length;
  const uploadingItem = queue.some((i) => i.status === "uploading");

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Arraste múltiplos arquivos ou clique para selecionar. Upload paralelo (3 por vez).
        Formatos: JPG, PNG, GIF, MP4, MOV.
      </p>

      {/* Drop zone */}
      <div
        onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed rounded-xl cursor-pointer hover:border-primary/40 transition-colors flex flex-col items-center gap-3 py-8 px-4 text-center"
      >
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Upload size={22} className="text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">Solte os arquivos aqui</p>
          <p className="text-xs text-muted-foreground mt-0.5">ou clique para selecionar vários</p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(e) => addFiles(e.target.files)}
      />

      {/* Queue */}
      {queue.length > 0 && (
        <>
          {/* Stats + actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground flex-1">
              {queue.length} arquivo(s) · {pendingCount} pendentes · {successCount} enviados
              {errorCount > 0 && ` · ${errorCount} erros`}
            </span>
            {successCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7"
                onClick={() => dispatch({ type: "CLEAR_COMPLETED" })}
              >
                <Trash2 size={11} className="mr-1" />
                Limpar enviados
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleUploadAll}
              disabled={uploading || pendingCount === 0}
              className="gap-1.5 h-8"
            >
              {uploading ? (
                <><Loader2 size={13} className="animate-spin" /> Enviando...</>
              ) : (
                <><Upload size={13} /> Enviar {pendingCount > 0 ? pendingCount : ""} arquivo(s)</>
              )}
            </Button>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {queue.map((item) => {
              const isImage = item.file.type.startsWith("image/");
              return (
                <div
                  key={item.id}
                  className={cn(
                    "border rounded-xl overflow-hidden bg-card",
                    item.status === "success" && "border-emerald-200 dark:border-emerald-900",
                    item.status === "error"   && "border-red-200 dark:border-red-900",
                  )}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-muted flex items-center justify-center overflow-hidden">
                    {isImage ? (
                      <img
                        src={item.previewUrl}
                        alt={item.file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-1 text-muted-foreground">
                        <ImageIcon size={24} />
                        <span className="text-[9px]">Vídeo</span>
                      </div>
                    )}

                    {/* Status overlay */}
                    {item.status === "success" && (
                      <div className="absolute inset-0 bg-emerald-900/50 flex items-center justify-center">
                        <CheckCircle2 size={28} className="text-white" />
                      </div>
                    )}
                    {item.status === "error" && (
                      <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center">
                        <XCircle size={28} className="text-white" />
                      </div>
                    )}
                    {item.status === "uploading" && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 size={28} className="text-white animate-spin" />
                      </div>
                    )}

                    {/* Remove button (apenas pending) */}
                    {item.status === "pending" && !uploading && (
                      <button
                        onClick={() => dispatch({ type: "REMOVE_ITEM", id: item.id })}
                        className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-black/80"
                      >
                        <X size={11} />
                      </button>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5 space-y-2">
                    <p className="text-[10px] font-medium truncate">{item.file.name}</p>

                    {/* Progress bar */}
                    {(item.status === "uploading" || (item.status === "success" && item.progress === 100)) && (
                      <Progress value={item.progress} className="h-1" />
                    )}

                    {/* Error message */}
                    {item.status === "error" && (
                      <p className="text-[10px] text-red-500">{item.error}</p>
                    )}

                    {/* Success: result hash + link */}
                    {item.status === "success" && item.result && (
                      <div className="space-y-1">
                        <p className="text-[9px] text-muted-foreground font-mono truncate">
                          {item.result.hash}
                        </p>
                        {item.result.url && (
                          <a
                            href={item.result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-0.5 text-[10px] text-primary hover:underline"
                          >
                            <ExternalLink size={9} />
                            Ver ativo
                          </a>
                        )}
                      </div>
                    )}

                    {/* Ad set selector (pending items only) */}
                    {item.status === "pending" && adSets.length > 0 && (
                      <Select
                        value={item.adSetId ?? ""}
                        onValueChange={(v) =>
                          dispatch({ type: "SET_ADSET", id: item.id, adSetId: v })
                        }
                      >
                        <SelectTrigger className="h-6 text-[10px]">
                          <SelectValue placeholder="Público (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {adSets.map((as) => (
                            <SelectItem key={as.id} value={as.id} className="text-xs">
                              {as.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {queue.length === 0 && (
        <p className="text-center text-xs text-muted-foreground py-2 opacity-60">
          Nenhum arquivo na fila ainda.
        </p>
      )}
    </div>
  );
}
