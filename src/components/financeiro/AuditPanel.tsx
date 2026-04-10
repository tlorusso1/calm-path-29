import { useState, useMemo } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, XCircle, Search, Shield } from 'lucide-react';
import { ContaFluxo, Fornecedor } from '@/types/focus-mode';
import { parseValorFlexivel } from '@/utils/fluxoCaixaCalculator';
import { cn } from '@/lib/utils';

interface DREModalidade {
  modalidade: string;
  tipo: 'RECEITAS' | 'DESPESAS';
  grupos: { grupo: string; categorias: { categoria: string; valor: number; lancamentoIds: string[] }[]; total: number }[];
  total: number;
}

interface Totais {
  receitas: number;
  receitasBanco: number;
  deducoes: number;
  receitaLiquida: number;
  cpv: number;
  lucroBruto: number;
  despesas: number;
  resultadoOperacional: number;
  receitasFinanceiras: number;
  resultadoFinal: number;
  taxasTransacao: number;
}

interface AuditPanelProps {
  lancamentosPeriodo: ContaFluxo[];
  lancamentosTodos: ContaFluxo[];
  fornecedores: Fornecedor[];
  totais: Totais;
  dre: DREModalidade[];
}

const TIPOS_EXCLUIDOS = ['intercompany', 'aplicacao', 'resgate', 'cartao'];

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function AuditPanel({ lancamentosPeriodo, lancamentosTodos, fornecedores, totais, dre }: AuditPanelProps) {
  const [open, setOpen] = useState(false);
  const [detailSection, setDetailSection] = useState<string | null>(null);

  const audit = useMemo(() => {
    const total = lancamentosPeriodo.length;
    const semCategoria = lancamentosPeriodo.filter(l => !l.categoria && !l.fornecedorId);
    const semFornecedor = lancamentosPeriodo.filter(l => !l.fornecedorId);
    const comCategoria = lancamentosPeriodo.filter(l => l.categoria || l.fornecedorId);

    // Anomalias de sinal: receber com valor negativo ou pagar com valor positivo (sem categoria manual)
    const sinalInvertido = lancamentosPeriodo.filter(l => {
      const v = parseValorFlexivel(l.valor);
      return (l.tipo === 'receber' && v < 0) || (l.tipo === 'pagar' && v > 0);
    });

    // Valores grandes (top 10 por valor absoluto)
    const porValor = [...lancamentosPeriodo].sort((a, b) => Math.abs(parseValorFlexivel(b.valor)) - Math.abs(parseValorFlexivel(a.valor)));
    const top10 = porValor.slice(0, 10);

    // Exclusões por tipo
    const excluidos = lancamentosTodos.filter(l => l.pago && TIPOS_EXCLUIDOS.includes(l.tipo));
    const exclPorTipo: Record<string, { count: number; total: number }> = {};
    for (const l of excluidos) {
      if (!exclPorTipo[l.tipo]) exclPorTipo[l.tipo] = { count: 0, total: 0 };
      exclPorTipo[l.tipo].count++;
      exclPorTipo[l.tipo].total += parseValorFlexivel(l.valor);
    }

    // Possíveis duplicatas (mesmo valor ±0.01, data ±3 dias)
    const duplicataSuspeitas: { a: ContaFluxo; b: ContaFluxo }[] = [];
    for (let i = 0; i < lancamentosPeriodo.length && duplicataSuspeitas.length < 20; i++) {
      const a = lancamentosPeriodo[i];
      const va = parseValorFlexivel(a.valor);
      const da = new Date(a.dataPagamento || a.dataVencimento || '');
      if (isNaN(da.getTime())) continue;
      for (let j = i + 1; j < lancamentosPeriodo.length && duplicataSuspeitas.length < 20; j++) {
        const b = lancamentosPeriodo[j];
        if (a.tipo !== b.tipo) continue;
        const vb = parseValorFlexivel(b.valor);
        if (Math.abs(va - vb) > 0.02) continue;
        const db = new Date(b.dataPagamento || b.dataVencimento || '');
        if (isNaN(db.getTime())) continue;
        const diffDias = Math.abs(da.getTime() - db.getTime()) / (1000 * 60 * 60 * 24);
        if (diffDias <= 3) {
          duplicataSuspeitas.push({ a, b });
        }
      }
    }

    // Saúde geral
    const pctClassificado = total > 0 ? (comCategoria.length / total) * 100 : 100;

    return {
      total,
      semCategoria,
      semFornecedor,
      comCategoria,
      sinalInvertido,
      top10,
      excluidos,
      exclPorTipo,
      duplicataSuspeitas,
      pctClassificado,
    };
  }, [lancamentosPeriodo, lancamentosTodos]);

  const saude = audit.pctClassificado >= 95 ? 'good' : audit.pctClassificado >= 80 ? 'warning' : 'critical';

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="w-full">
        <div className={cn(
          "flex items-center justify-between p-3 rounded-lg border-2 mt-2 cursor-pointer hover:bg-muted/50 transition-colors",
          saude === 'good' ? "border-green-300 bg-green-50/50 dark:bg-green-900/10" :
          saude === 'warning' ? "border-amber-300 bg-amber-50/50 dark:bg-amber-900/10" :
          "border-red-300 bg-red-50/50 dark:bg-red-900/10"
        )}>
          <span className="flex items-center gap-2 text-sm font-medium">
            <Shield className="h-4 w-4" />
            🔍 Auditoria de Dados
            <Badge variant={saude === 'good' ? 'default' : saude === 'warning' ? 'secondary' : 'destructive'} className="text-[9px]">
              {audit.pctClassificado.toFixed(0)}% classificado
            </Badge>
            {audit.sinalInvertido.length > 0 && (
              <Badge variant="destructive" className="text-[9px]">
                {audit.sinalInvertido.length} sinal invertido
              </Badge>
            )}
            {audit.duplicataSuspeitas.length > 0 && (
              <Badge variant="secondary" className="text-[9px]">
                {audit.duplicataSuspeitas.length} possíveis duplicatas
              </Badge>
            )}
          </span>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-3 p-3 border rounded-lg mt-1 bg-muted/20">
          
          {/* Resumo de Saúde */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Total no período" value={audit.total.toString()} />
            <StatCard label="Classificados" value={`${audit.comCategoria.length} (${audit.pctClassificado.toFixed(0)}%)`} ok={audit.pctClassificado >= 95} />
            <StatCard label="Sem categoria" value={audit.semCategoria.length.toString()} ok={audit.semCategoria.length === 0} />
            <StatCard label="Sem fornecedor" value={audit.semFornecedor.length.toString()} ok={audit.semFornecedor.length <= 5} />
            <StatCard label="Sinal invertido" value={audit.sinalInvertido.length.toString()} ok={audit.sinalInvertido.length === 0} />
            <StatCard label="Possíveis duplicatas" value={audit.duplicataSuspeitas.length.toString()} ok={audit.duplicataSuspeitas.length === 0} />
          </div>

          {/* Seções detalhadas */}
          {audit.semCategoria.length > 0 && (
            <DetailSection
              title={`⚠️ Sem Categoria (${audit.semCategoria.length})`}
              open={detailSection === 'semCat'}
              onToggle={() => setDetailSection(detailSection === 'semCat' ? null : 'semCat')}
            >
              {audit.semCategoria.slice(0, 20).map(l => (
                <AuditRow key={l.id} l={l} />
              ))}
              {audit.semCategoria.length > 20 && <p className="text-[10px] text-muted-foreground">... e mais {audit.semCategoria.length - 20}</p>}
            </DetailSection>
          )}

          {audit.sinalInvertido.length > 0 && (
            <DetailSection
              title={`🔴 Sinal Invertido (${audit.sinalInvertido.length})`}
              open={detailSection === 'sinal'}
              onToggle={() => setDetailSection(detailSection === 'sinal' ? null : 'sinal')}
            >
              {audit.sinalInvertido.map(l => (
                <AuditRow key={l.id} l={l} highlight />
              ))}
            </DetailSection>
          )}

          {audit.duplicataSuspeitas.length > 0 && (
            <DetailSection
              title={`🔄 Possíveis Duplicatas (${audit.duplicataSuspeitas.length})`}
              open={detailSection === 'dup'}
              onToggle={() => setDetailSection(detailSection === 'dup' ? null : 'dup')}
            >
              {audit.duplicataSuspeitas.map((d, i) => (
                <div key={i} className="border-b last:border-0 py-1 space-y-0.5">
                  <AuditRow l={d.a} />
                  <AuditRow l={d.b} highlight />
                </div>
              ))}
            </DetailSection>
          )}

          {/* Exclusões */}
          <DetailSection
            title={`🚫 Movimentações Excluídas (${audit.excluidos.length})`}
            open={detailSection === 'excl'}
            onToggle={() => setDetailSection(detailSection === 'excl' ? null : 'excl')}
          >
            <div className="space-y-1">
              {Object.entries(audit.exclPorTipo).map(([tipo, data]) => (
                <div key={tipo} className="flex justify-between text-[11px]">
                  <span className="font-medium capitalize">{tipo}</span>
                  <span className="text-muted-foreground">{data.count} itens • {fmt(data.total)}</span>
                </div>
              ))}
            </div>
          </DetailSection>

          {/* Top 10 maiores valores */}
          <DetailSection
            title="💰 Top 10 Maiores Valores"
            open={detailSection === 'top10'}
            onToggle={() => setDetailSection(detailSection === 'top10' ? null : 'top10')}
          >
            {audit.top10.map(l => (
              <AuditRow key={l.id} l={l} showCategoria />
            ))}
          </DetailSection>

          {/* Distribuição por modalidade */}
          <DetailSection
            title="📊 Distribuição por Modalidade"
            open={detailSection === 'dist'}
            onToggle={() => setDetailSection(detailSection === 'dist' ? null : 'dist')}
          >
            <div className="space-y-1">
              {dre.map(mod => {
                const lancCount = mod.grupos.reduce((sum, g) => sum + g.categorias.reduce((s2, c) => s2 + c.lancamentoIds.length, 0), 0);
                return (
                  <div key={mod.modalidade} className="flex justify-between text-[11px]">
                    <span className={cn("font-medium", mod.tipo === 'RECEITAS' ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400")}>
                      {mod.modalidade}
                    </span>
                    <span className="text-muted-foreground">{lancCount} itens • {fmt(mod.total)}</span>
                  </div>
                );
              })}
              <div className="border-t pt-1 flex justify-between text-[11px] font-bold">
                <span>Resultado Operacional</span>
                <span className={totais.resultadoOperacional >= 0 ? "text-green-700" : "text-red-700"}>
                  {fmt(totais.resultadoOperacional)}
                </span>
              </div>
            </div>
          </DetailSection>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function StatCard({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div className={cn(
      "flex items-center justify-between p-2 rounded border text-xs",
      ok === true ? "bg-green-50/50 dark:bg-green-900/10 border-green-200" :
      ok === false ? "bg-red-50/50 dark:bg-red-900/10 border-red-200" :
      "bg-muted/30 border-border"
    )}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium flex items-center gap-1">
        {ok === true && <CheckCircle2 className="h-3 w-3 text-green-600" />}
        {ok === false && <AlertTriangle className="h-3 w-3 text-red-600" />}
        {value}
      </span>
    </div>
  );
}

function DetailSection({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <Collapsible open={open} onOpenChange={() => onToggle()}>
      <CollapsibleTrigger className="w-full">
        <div className="flex items-center justify-between text-xs font-medium p-2 rounded hover:bg-muted/50 cursor-pointer">
          <span>{title}</span>
          {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-2 pr-1 pb-2 max-h-[250px] overflow-y-auto space-y-0.5">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function AuditRow({ l, highlight, showCategoria }: { l: ContaFluxo; highlight?: boolean; showCategoria?: boolean }) {
  const valor = parseValorFlexivel(l.valor);
  return (
    <div className={cn("flex items-start justify-between text-[10px] py-0.5 gap-2", highlight && "bg-amber-50 dark:bg-amber-900/10 rounded px-1")}>
      <div className="flex-1 min-w-0">
        <p className="truncate font-medium">{l.descricao || 'Sem descrição'}</p>
        <p className="text-muted-foreground">
          {(l.dataPagamento || l.dataVencimento || '').slice(0, 10)}
          {l.contaOrigem && <span> • {l.contaOrigem}</span>}
          <span className={cn("ml-1", l.tipo === 'receber' ? "text-green-600" : "text-red-600")}>
            [{l.tipo}]
          </span>
          {showCategoria && l.categoria && <span className="ml-1 text-blue-600">• {l.categoria}</span>}
        </p>
      </div>
      <span className={cn("font-mono font-medium whitespace-nowrap", valor >= 0 ? "text-green-700" : "text-red-700")}>
        {fmt(valor)}
      </span>
    </div>
  );
}
