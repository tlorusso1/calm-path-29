import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Check, X, Pencil, Calendar, CalendarCheck, CheckCircle, Package, Copy, FileText, Paperclip, ExternalLink, Loader2 } from 'lucide-react';
import { ContaFluxo, ContaFluxoTipo, ContaFluxoNatureza, ContaAnexo, Fornecedor } from '@/types/focus-mode';
import { format, parseISO, isBefore, isToday, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { isCapitalGiro } from '@/utils/fluxoCaixaCalculator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ContaItemProps {
  conta: ContaFluxo;
  variant: ContaFluxoTipo;
  fornecedores?: Fornecedor[];
  onUpdate: (id: string, updates: Partial<ContaFluxo>) => void;
  onRemove: (id: string) => void;
  onTogglePago?: (id: string) => void;
  onToggleAgendado?: (id: string) => void;
  formatCurrency: (val: string) => string;
}

type StatusConta = 'atrasada' | 'hoje' | 'agendada' | 'normal';

function getStatusConta(conta: ContaFluxo): StatusConta {
  if (conta.pago) return 'normal';
  if (conta.agendado) return 'agendada';
  
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dataVenc = parseISO(conta.dataVencimento);
  
  if (isToday(dataVenc)) return 'hoje';
  if (isBefore(dataVenc, hoje)) return 'atrasada';
  return 'normal';
}

function getEffectiveVariant(tipo: ContaFluxoTipo): 'pagar' | 'receber' | 'neutro' {
  switch (tipo) {
    case 'receber':
    case 'resgate':
      return 'receber';
    case 'pagar':
      return 'pagar';
    case 'intercompany':
    case 'aplicacao':
    default:
      return 'neutro';
  }
}

function getStatusStyles(status: StatusConta, variant: ContaFluxoTipo) {
  const effectiveVariant = getEffectiveVariant(variant);
  
  switch (status) {
    case 'atrasada':
      return {
        bg: 'bg-destructive/10 border-destructive/30',
        text: 'text-destructive',
      };
    case 'hoje':
      return {
        bg: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300',
        text: 'text-yellow-700 dark:text-yellow-400',
      };
    case 'agendada':
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20 border-blue-300',
        text: effectiveVariant === 'pagar' ? 'text-destructive' : effectiveVariant === 'receber' ? 'text-green-600' : 'text-blue-600',
      };
    default:
      return {
        bg: effectiveVariant === 'pagar' ? 'bg-destructive/5' : effectiveVariant === 'receber' ? 'bg-green-500/5' : 'bg-blue-500/5',
        text: effectiveVariant === 'pagar' ? 'text-destructive' : effectiveVariant === 'receber' ? 'text-green-600' : 'text-blue-600',
      };
  }
}

export function ContaItem({ 
  conta, 
  variant, 
  fornecedores = [],
  onUpdate, 
  onRemove, 
  onTogglePago,
  onToggleAgendado,
  formatCurrency 
}: ContaItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editDescricao, setEditDescricao] = useState(conta.descricao);
  const [editValor, setEditValor] = useState(conta.valor);
  const [editData, setEditData] = useState(conta.dataVencimento);
  const [editTipo, setEditTipo] = useState(conta.tipo);
  const [editNatureza, setEditNatureza] = useState<ContaFluxoNatureza | undefined>(conta.natureza);
  const [editCodigoBarrasPix, setEditCodigoBarrasPix] = useState(conta.codigoBarrasPix || '');
  const [editNumeroNF, setEditNumeroNF] = useState(conta.numeroNF || '');
  const [editChaveDanfe, setEditChaveDanfe] = useState(conta.chaveDanfe || '');
  const [showDocFields, setShowDocFields] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loadingUrls, setLoadingUrls] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const status = getStatusConta(conta);
  const styles = getStatusStyles(status, variant);
  const ehCapitalGiro = isCapitalGiro(conta, fornecedores);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Gera URLs assinadas para os anexos quando o popover é aberto
  const loadSignedUrls = async () => {
    const anexos = conta.anexos || [];
    if (anexos.length === 0) return;
    setLoadingUrls(true);
    const urls: Record<string, string> = {};
    await Promise.all(
      anexos.map(async (anexo) => {
        const { data } = await supabase.storage
          .from('conta-anexos')
          .createSignedUrl(anexo.path, 3600);
        if (data?.signedUrl) urls[anexo.id] = data.signedUrl;
      })
    );
    setSignedUrls(urls);
    setLoadingUrls(false);
  };

  const handleUploadAnexos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingFiles(true);
    const novosAnexos: ContaAnexo[] = [];
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: arquivo muito grande (máx. 10 MB)`);
        continue;
      }
      const ext = file.name.split('.').pop();
      const path = `${conta.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage
        .from('conta-anexos')
        .upload(path, file, { contentType: file.type });
      if (error) {
        toast.error(`Erro ao enviar ${file.name}`);
        continue;
      }
      novosAnexos.push({
        id: crypto.randomUUID(),
        nome: file.name,
        url: '',
        path,
        tipo: file.type,
        tamanho: file.size,
        criadoEm: new Date().toISOString(),
      });
    }
    if (novosAnexos.length > 0) {
      onUpdate(conta.id, { anexos: [...(conta.anexos || []), ...novosAnexos] });
      toast.success(`${novosAnexos.length} arquivo(s) anexado(s)!`);
    }
    setUploadingFiles(false);
  };

  const handleRemoverAnexo = async (anexo: ContaAnexo) => {
    await supabase.storage.from('conta-anexos').remove([anexo.path]);
    onUpdate(conta.id, { anexos: (conta.anexos || []).filter(a => a.id !== anexo.id) });
    toast.success('Anexo removido');
  };

  const handleSave = () => {
    onUpdate(conta.id, {
      descricao: editDescricao.trim() || conta.descricao,
      valor: editValor || conta.valor,
      dataVencimento: editData || conta.dataVencimento,
      tipo: editTipo,
      natureza: editNatureza,
      codigoBarrasPix: editCodigoBarrasPix.trim() || undefined,
      numeroNF: editNumeroNF.trim() || undefined,
      chaveDanfe: editChaveDanfe.trim() || undefined,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditDescricao(conta.descricao);
    setEditValor(conta.valor);
    setEditData(conta.dataVencimento);
    setEditTipo(conta.tipo);
    setEditNatureza(conta.natureza);
    setEditCodigoBarrasPix(conta.codigoBarrasPix || '');
    setEditNumeroNF(conta.numeroNF || '');
    setEditChaveDanfe(conta.chaveDanfe || '');
    setShowDocFields(false);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  const handleCopiarCodigo = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (conta.codigoBarrasPix) {
      navigator.clipboard.writeText(conta.codigoBarrasPix);
      toast.success('Copiado!');
    }
  };

  const getDiasAtraso = () => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataVenc = parseISO(conta.dataVencimento);
    return differenceInDays(hoje, dataVenc);
  };

  const temDadosDoc = conta.codigoBarrasPix || conta.numeroNF || conta.chaveDanfe;
  const qtdAnexos = (conta.anexos || []).length;
  const formatBytes = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  if (isEditing) {
    return (
      <div className={`flex flex-wrap items-center gap-2 sm:gap-3 p-3 rounded border ${styles.bg}`}>
        {/* Linha 1: Tipo + Natureza */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={editTipo} onValueChange={(val) => setEditTipo(val as ContaFluxoTipo)}>
            <SelectTrigger className="h-8 w-full sm:w-28 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pagar">💸 Pagar</SelectItem>
              <SelectItem value="receber">💰 Receber</SelectItem>
              <SelectItem value="intercompany">🔁 Intercompany</SelectItem>
              <SelectItem value="aplicacao">📈 Aplicação</SelectItem>
              <SelectItem value="resgate">📉 Resgate</SelectItem>
            </SelectContent>
          </Select>
          
          {['pagar', 'cartao'].includes(editTipo) && (
            <Select 
              value={editNatureza || 'operacional'} 
              onValueChange={(val) => setEditNatureza(val as ContaFluxoNatureza)}
            >
              <SelectTrigger className="h-8 w-full sm:w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="operacional">⚙️ Operacional</SelectItem>
                <SelectItem value="capitalGiro">📦 Estoque</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        
        {/* Linha 2: Data + Descrição */}
        <div className="flex items-center gap-2 w-full sm:w-auto sm:flex-1">
          <Input
            value={editData}
            onChange={(e) => setEditData(e.target.value)}
            type="date"
            className="h-8 w-full sm:w-32 text-xs"
            onKeyDown={handleKeyDown}
          />
          <Input
            ref={inputRef}
            value={editDescricao}
            onChange={(e) => setEditDescricao(e.target.value)}
            placeholder="Descrição"
            className="h-8 flex-1 min-w-0 text-xs"
            onKeyDown={handleKeyDown}
          />
        </div>
        
        {/* Linha 3: Valor + Ações */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-28 sm:flex-none">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
            <Input
              value={editValor}
              onChange={(e) => setEditValor(e.target.value)}
              placeholder="0,00"
              className="h-8 text-xs pl-7 text-right"
              onKeyDown={handleKeyDown}
            />
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
            onClick={handleSave}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Linha 4: Dados do Documento (expansível) */}
        <div className="w-full">
          <button
            type="button"
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            onClick={() => setShowDocFields(!showDocFields)}
          >
            <FileText className="h-3 w-3" />
            {showDocFields ? 'Ocultar dados do documento' : 'Dados do documento (NF, PIX, DANFE)'}
          </button>
          {showDocFields && (
            <div className="mt-2 flex flex-wrap gap-2">
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] text-muted-foreground block mb-1">Código de barras / PIX copia-e-cola</label>
                <Input
                  value={editCodigoBarrasPix}
                  onChange={(e) => setEditCodigoBarrasPix(e.target.value)}
                  placeholder="Cole aqui o código de barras ou chave PIX..."
                  className="h-8 text-xs font-mono"
                />
              </div>
              <div className="w-32">
                <label className="text-[10px] text-muted-foreground block mb-1">N° NF</label>
                <Input
                  value={editNumeroNF}
                  onChange={(e) => setEditNumeroNF(e.target.value)}
                  placeholder="Ex: 001234"
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="text-[10px] text-muted-foreground block mb-1">Chave DANFE (44 dígitos)</label>
                <Input
                  value={editChaveDanfe}
                  onChange={(e) => setEditChaveDanfe(e.target.value)}
                  placeholder="00000000000000000000000000000000000000000000"
                  className="h-8 text-xs font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Linha 5: Anexos */}
        <div className="w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingFiles}
            >
              {uploadingFiles ? <Loader2 className="h-3 w-3 animate-spin" /> : <Paperclip className="h-3 w-3" />}
              {uploadingFiles ? 'Enviando...' : `Anexar PDF / imagem${qtdAnexos > 0 ? ` (${qtdAnexos} anexo${qtdAnexos > 1 ? 's' : ''})` : ''}`}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="application/pdf,image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={(e) => handleUploadAnexos(e.target.files)}
            />
          </div>
          {qtdAnexos > 0 && (
            <div className="mt-1.5 space-y-1">
              {(conta.anexos || []).map(anexo => (
                <div key={anexo.id} className="flex items-center gap-1.5 text-[11px] bg-muted/50 rounded px-2 py-1">
                  <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="truncate flex-1 text-foreground">{anexo.nome}</span>
                  <span className="text-muted-foreground shrink-0">{formatBytes(anexo.tamanho)}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-5 w-5 p-0 text-destructive hover:text-destructive shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleRemoverAnexo(anexo); }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  const canalLabels: Record<string, string> = {
    b2b: 'B2B',
    ecomNuvem: 'NUVEM',
    ecomShopee: 'SHOPEE',
    ecomAssinaturas: 'ASSIN',
  };

  return (
    <TooltipProvider>
      <div
        className={cn(
          "flex flex-wrap items-center gap-2 p-2 rounded border text-sm group transition-colors",
          styles.bg,
          conta.projecao ? "border-dashed opacity-70" : "",
          conta.projecao ? "cursor-default" : "cursor-pointer hover:bg-muted/50"
        )}
        onClick={() => !conta.projecao && setIsEditing(true)}
      >
        {/* Linha 1: Data + Descrição */}
        <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto sm:flex-1">
          <span className="text-xs text-muted-foreground w-12 shrink-0">
            {format(parseISO(conta.dataVencimento), 'dd/MM', { locale: ptBR })}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="truncate sm:whitespace-normal sm:overflow-visible flex-1 cursor-default">{conta.descricao}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[400px] text-xs">
              {conta.descricao}
            </TooltipContent>
          </Tooltip>
        </div>
        
        {/* Linha 2: Badges + Valor + Ações */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto sm:flex-shrink-0">
          {/* Badge de tipo clicável com cycling */}
          {(() => {
            const tipoConfig = {
              pagar: { emoji: '🔴', label: 'SAÍDA', next: 'receber' as ContaFluxoTipo },
              receber: { emoji: '🟢', label: 'ENTRADA', next: 'intercompany' as ContaFluxoTipo },
              intercompany: { emoji: '🔁', label: 'INTER', next: 'aplicacao' as ContaFluxoTipo },
              aplicacao: { emoji: '📈', label: 'APLIC', next: 'resgate' as ContaFluxoTipo },
              resgate: { emoji: '📉', label: 'RESG', next: 'cartao' as ContaFluxoTipo },
              cartao: { emoji: '💳', label: 'CARTÃO', next: 'pagar' as ContaFluxoTipo },
            };
            const config = tipoConfig[conta.tipo];
            const bgColor = 
              conta.tipo === 'pagar' ? 'bg-red-100 text-red-700' :
              conta.tipo === 'receber' ? 'bg-green-100 text-green-700' :
              conta.tipo === 'intercompany' ? 'bg-blue-100 text-blue-700' :
              conta.tipo === 'aplicacao' ? 'bg-purple-100 text-purple-700' :
              conta.tipo === 'resgate' ? 'bg-orange-100 text-orange-700' :
              'bg-slate-100 text-slate-700';
            
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdate(conta.id, { tipo: config.next });
                    }}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium hover:opacity-80 transition-opacity shrink-0 ${bgColor}`}
                    title="Clique para alternar tipo"
                  >
                    {config.emoji} {config.label}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Próximo: {tipoConfig[config.next as ContaFluxoTipo].label}
                </TooltipContent>
              </Tooltip>
            );
          })()}
          
          {conta.projecao && (
            <Badge 
              variant="outline" 
              className="text-[10px] border-dashed border-blue-400 text-blue-600 dark:text-blue-400 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              📊 Projeção {conta.canalOrigem ? canalLabels[conta.canalOrigem] || conta.canalOrigem : ''}
            </Badge>
          )}
          {conta.agendado && !conta.pago && (
            <Badge 
              variant="secondary" 
              className="text-[10px] bg-blue-100 text-blue-700 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              agendado
            </Badge>
          )}
          {status === 'atrasada' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge 
                  variant="destructive" 
                  className="text-[10px] shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {getDiasAtraso()}d atraso
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                Vencido há {getDiasAtraso()} dia(s)
              </TooltipContent>
            </Tooltip>
          )}
          {status === 'hoje' && (
            <Badge 
              variant="secondary" 
              className="text-[10px] bg-yellow-100 text-yellow-700 shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              vence hoje
            </Badge>
          )}
          {/* Toggle de Natureza */}
          {['pagar', 'cartao'].includes(conta.tipo) && !conta.pago && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const novaNatureza = conta.natureza === 'capitalGiro' ? 'operacional' : 'capitalGiro';
                    onUpdate(conta.id, { natureza: novaNatureza });
                  }}
                  className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-medium hover:opacity-80 transition-opacity shrink-0 flex items-center gap-1",
                    conta.natureza === 'capitalGiro' 
                      ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" 
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  )}
                >
                  {conta.natureza === 'capitalGiro' ? '📦 EST' : '⚙️ OP'}
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {conta.natureza === 'capitalGiro' 
                  ? "Estoque (não impacta meta) — Clique para Operacional" 
                  : "Operacional (impacta meta) — Clique para Estoque"}
              </TooltipContent>
            </Tooltip>
          )}
          {/* Badge "Conciliado auto" */}
          {conta.pago && conta.conciliado && conta.lancamentoConciliadoId && (
            <Badge variant="outline" className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-700 shrink-0 gap-1">
              <CheckCircle className="h-2.5 w-2.5" />
              Conciliado auto
            </Badge>
          )}
          {/* Badge estático para contas pagas com natureza estoque */}
          {['pagar', 'cartao'].includes(conta.tipo) && conta.pago && conta.natureza === 'capitalGiro' && (
            <Badge variant="outline" className="text-[10px] bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-700 shrink-0 gap-1">
              <Package className="h-2.5 w-2.5" />
              Estoque
            </Badge>
          )}
          
          {/* Valor + Ações */}
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            <span className={`font-medium ${styles.text}`}>
              {formatCurrency(conta.valor)}
            </span>

            {/* Botão copiar PIX/Código de barras — sempre visível quando preenchido */}
            {conta.codigoBarrasPix && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                    onClick={handleCopiarCodigo}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copiar PIX / código de barras</TooltipContent>
              </Tooltip>
            )}

            {/* Botão ver detalhes do documento — popover discreto */}
            {temDadosDoc && (
              <Popover>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <PopoverTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                    </PopoverTrigger>
                  </TooltipTrigger>
                  <TooltipContent>Ver dados do documento</TooltipContent>
                </Tooltip>
                <PopoverContent
                  className="w-80 p-3 text-xs"
                  side="left"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="font-medium text-sm mb-2 text-foreground">Dados do documento</p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-muted-foreground shrink-0">N° NF</span>
                      <span className={cn("font-mono", !conta.numeroNF && "text-muted-foreground")}>
                        {conta.numeroNF || '—'}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-muted-foreground shrink-0">Chave DANFE</span>
                      <span className={cn("font-mono text-right break-all", !conta.chaveDanfe && "text-muted-foreground")}>
                        {conta.chaveDanfe || '—'}
                      </span>
                    </div>
                    {conta.codigoBarrasPix && (
                      <div className="pt-1 border-t">
                        <p className="text-muted-foreground mb-1">Código / PIX</p>
                        <div className="flex items-center gap-1.5 bg-muted rounded p-1.5">
                          <span className="font-mono text-[10px] truncate flex-1">{conta.codigoBarrasPix}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0 shrink-0 text-blue-500 hover:text-blue-700"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(conta.codigoBarrasPix!);
                              toast.success('Copiado!');
                            }}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            )}

            {/* Botão de Anexos — só aparece quando há anexos */}
            {qtdAnexos > 0 && (
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(
                        "h-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted relative w-auto px-1.5 gap-1"
                      )}
                      onClick={(e) => { e.stopPropagation(); loadSignedUrls(); }}
                    >
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                      <span className="text-[10px] font-medium">{qtdAnexos}</span>
                    </Button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent>{`${qtdAnexos} anexo(s)`}</TooltipContent>
              </Tooltip>
              <PopoverContent
                className="w-72 p-3 text-xs"
                side="left"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="font-medium text-sm mb-2 text-foreground flex items-center gap-1.5">
                  <Paperclip className="h-3.5 w-3.5" />
                  Anexos ({qtdAnexos})
                </p>
                {loadingUrls && <p className="text-muted-foreground flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Carregando...</p>}
                {!loadingUrls && (conta.anexos || []).map(anexo => (
                  <div key={anexo.id} className="flex items-center gap-1.5 mb-1.5 bg-muted/50 rounded px-2 py-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="truncate flex-1 text-foreground">{anexo.nome}</span>
                    <span className="text-muted-foreground shrink-0">{formatBytes(anexo.tamanho)}</span>
                    {signedUrls[anexo.id] && (
                      <a href={signedUrls[anexo.id]} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-primary shrink-0">
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </a>
                    )}
                  </div>
                ))}
              </PopoverContent>
            </Popover>
            )}
            
            {/* Botões de ação */}
            {!conta.pago && onTogglePago && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-green-600 hover:text-green-700 hover:bg-green-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onTogglePago(conta.id);
                    }}
                  >
                    <CheckCircle className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Dar baixa (pago)</TooltipContent>
              </Tooltip>
            )}
            
            {!conta.pago && onToggleAgendado && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className={cn(
                      "h-6 w-6 p-0",
                      conta.agendado 
                        ? "text-blue-600 hover:text-blue-700 hover:bg-blue-100" 
                        : "text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleAgendado(conta.id);
                    }}
                  >
                    {conta.agendado ? (
                      <CalendarCheck className="h-3.5 w-3.5" />
                    ) : (
                      <Calendar className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {conta.agendado ? 'Desmarcar agendamento' : 'Agendar (baixa automática no vencimento)'}
                </TooltipContent>
              </Tooltip>
            )}
            
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
            
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(conta.id);
              }}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
