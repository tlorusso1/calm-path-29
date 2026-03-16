import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import niceLogoUrl from '@/assets/nice-foods-logo.png';
import { CoberturaChart } from '@/components/CoberturaChart';

interface ItemEstoque {
  nome: string;
  tipo: string;
  quantidade: number;
  unidade: string;
  demandaSemanal?: number;
  coberturaDias?: number;
  status?: string;
  dataValidade?: string;
}

interface EstoqueData {
  itens: ItemEstoque[];
  updatedAt: string;
  ultimaImportacaoMov: string | null;
}

const TIPO_LABELS: Record<string, string> = {
  produto_acabado: 'Produto Acabado',
  acessorio: 'Acessório',
  brinde: 'Brinde',
  material_pdv: 'Material PDV',
  embalagem: 'Embalagem',
  insumo: 'Insumo',
  materia_prima: 'Matéria-Prima',
};

// Tipos visíveis no dashboard público (externo)
const TIPOS_PUBLICOS = ['produto_acabado', 'acessorio', 'brinde', 'material_pdv'];

// Ordem de exibição por tipo
const TIPO_ORDER: Record<string, number> = {
  produto_acabado: 0,
  acessorio: 1,
  brinde: 2,
  material_pdv: 3,
};

const STATUS_ORDER: Record<string, number> = {
  vermelho: 0,
  amarelo: 1,
  verde: 2,
};

function getStatusBadge(status?: string) {
  if (!status) return <Badge variant="outline" className="text-muted-foreground">—</Badge>;
  if (status === 'verde') return <Badge className="bg-emerald-500/90 hover:bg-emerald-500 text-white border-0">OK</Badge>;
  if (status === 'amarelo') return <Badge className="bg-amber-500/90 hover:bg-amber-500 text-white border-0">Atenção</Badge>;
  return <Badge className="bg-red-500/90 hover:bg-red-500 text-white border-0">Crítico</Badge>;
}

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return dateStr;
  }
}

function formatValidade(val?: string) {
  if (!val) return '—';
  // Try parsing DD/MM/YYYY or YYYY-MM-DD
  const parts = val.includes('/') ? val.split('/') : null;
  if (parts && parts.length === 3) return val;
  try {
    const d = new Date(val);
    return d.toLocaleDateString('pt-BR');
  } catch {
    return val;
  }
}

function calcDiasAteVencimento(val?: string): number | null {
  if (!val) return null;
  try {
    let d: Date;
    if (val.includes('/')) {
      const [dd, mm, yyyy] = val.split('/');
      d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    } else {
      d = new Date(val);
    }
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    return Math.ceil((d.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

export default function EstoqueDashboard() {
  const { userId } = useParams<{ userId: string }>();
  const [data, setData] = useState<EstoqueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!userId) return;
    try {
      setLoading(true);
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/public-estoque?user_id=${userId}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Erro ao carregar dados');
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5 * 60 * 1000); // auto-refresh 5min
    return () => clearInterval(interval);
  }, [userId]);

  const allPublicItens = data?.itens
    ? [...data.itens]
        .filter(i => TIPOS_PUBLICOS.includes(i.tipo))
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    : [];

  // Group by tipo for sectioned display
  const itensByTipo = TIPOS_PUBLICOS.reduce<Record<string, ItemEstoque[]>>((acc, tipo) => {
    const items = allPublicItens.filter(i => i.tipo === tipo);
    if (items.length > 0) acc[tipo] = items;
    return acc;
  }, {});

  // Flat sorted for summary counts (backward compat)
  const sortedItens = allPublicItens;

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando estoques...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-destructive font-medium">{error}</p>
            <p className="text-sm text-muted-foreground mt-2">Verifique se o link está correto.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={niceLogoUrl} alt="Nice Foods" className="h-8 w-auto" />
            <div>
              <h1 className="text-lg font-semibold">Status de Estoques</h1>
              {data?.updatedAt && (
                <p className="text-xs text-muted-foreground">
                  Última atualização: {formatDate(data.updatedAt)}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {data?.ultimaImportacaoMov && (
              <Badge variant="outline" className="text-xs">
                Mov. importadas: {formatDate(data.ultimaImportacaoMov)}
              </Badge>
            )}
            <button
              onClick={fetchData}
              className="p-2 rounded-md hover:bg-muted transition-colors"
              title="Atualizar"
            >
              <RefreshCw className={cn("h-4 w-4 text-muted-foreground", loading && "animate-spin")} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
      {/* Summary badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          <Badge variant="outline">{sortedItens.length} itens</Badge>
          <Badge className="bg-red-500/90 text-white border-0">
            {sortedItens.filter(i => i.status === 'vermelho').length} críticos
          </Badge>
          <Badge className="bg-amber-500/90 text-white border-0">
            {sortedItens.filter(i => i.status === 'amarelo').length} atenção
          </Badge>
          <Badge className="bg-emerald-500/90 text-white border-0">
            {sortedItens.filter(i => i.status === 'verde').length} OK
          </Badge>
        </div>

        {/* Alerts - grouped by tipo, produtos acabados first */}
        {(() => {
          const rupturas = sortedItens.filter(i => i.status === 'vermelho');
          const cobertBaixa = sortedItens.filter(i => i.coberturaDias !== undefined && i.coberturaDias !== null && i.coberturaDias <= 7 && i.status !== 'vermelho');
          const vencendo = sortedItens.filter(i => {
            const dias = calcDiasAteVencimento(i.dataValidade);
            return dias !== null && dias <= 30;
          });
          if (rupturas.length === 0 && cobertBaixa.length === 0 && vencendo.length === 0) return null;

          const groupByTipo = (items: ItemEstoque[]) => {
            const grouped: Record<string, ItemEstoque[]> = {};
            for (const item of items) {
              (grouped[item.tipo] ??= []).push(item);
            }
            return TIPOS_PUBLICOS.filter(t => grouped[t]).map(t => ({ tipo: t, items: grouped[t] }));
          };

          return (
            <div className="flex flex-col gap-2 mb-4">
              {rupturas.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-3">
                  <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">🚨 Ruptura / Crítico</p>
                  {groupByTipo(rupturas).map(({ tipo, items }) => (
                    <div key={tipo}>
                      {groupByTipo(rupturas).length > 1 && (
                        <p className="text-[10px] uppercase tracking-wider text-red-500/70 dark:text-red-400/60 font-semibold mt-1">{TIPO_LABELS[tipo]}</p>
                      )}
                      <p className="text-sm text-red-700 dark:text-red-400">{items.map(i => i.nome).join(', ')}</p>
                    </div>
                  ))}
                </div>
              )}
              {cobertBaixa.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 p-3">
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-1">⚠️ Cobertura baixa (≤ 7 dias)</p>
                  {groupByTipo(cobertBaixa).map(({ tipo, items }) => (
                    <div key={tipo}>
                      {groupByTipo(cobertBaixa).length > 1 && (
                        <p className="text-[10px] uppercase tracking-wider text-amber-500/70 dark:text-amber-400/60 font-semibold mt-1">{TIPO_LABELS[tipo]}</p>
                      )}
                      <p className="text-sm text-amber-700 dark:text-amber-400">{items.map(i => `${i.nome} (${i.coberturaDias}d)`).join(', ')}</p>
                    </div>
                  ))}
                </div>
              )}
              {vencendo.length > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900 p-3">
                  <p className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-1">📅 Vencendo em breve (≤ 30 dias)</p>
                  {groupByTipo(vencendo).map(({ tipo, items }) => (
                    <div key={tipo}>
                      {groupByTipo(vencendo).length > 1 && (
                        <p className="text-[10px] uppercase tracking-wider text-orange-500/70 dark:text-orange-400/60 font-semibold mt-1">{TIPO_LABELS[tipo]}</p>
                      )}
                      <p className="text-sm text-orange-700 dark:text-orange-400">{items.map(i => {
                        const d = calcDiasAteVencimento(i.dataValidade);
                        return `${i.nome} (${d}d)`;
                      }).join(', ')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* 📊 Gráfico de Cobertura por Tipo */}
        {TIPOS_PUBLICOS.filter(tipo => itensByTipo[tipo]).map(tipo => {
          const items = itensByTipo[tipo]
            .filter(i => i.coberturaDias !== undefined && i.coberturaDias !== null)
            .map(i => ({ nome: i.nome, coberturaDias: i.coberturaDias! }));
          if (items.length === 0) return null;
          return (
            <Card key={`chart-${tipo}`} className="mb-4">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">
                  📊 Cobertura — {TIPO_LABELS[tipo]}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <CoberturaChart itens={items} />
              </CardContent>
            </Card>
          );
        })}

        {/* ⏳ Validades Mais Próximas */}
        {(() => {
          const itensComValidade = sortedItens
            .map(i => ({ nome: i.nome, dias: calcDiasAteVencimento(i.dataValidade) }))
            .filter(i => i.dias !== null)
            .sort((a, b) => a.dias! - b.dias!) as { nome: string; dias: number }[];
          if (itensComValidade.length === 0) return null;
          const top10 = itensComValidade.slice(0, 10);
          return (
            <Card className="mb-4">
              <CardHeader className="pb-2 pt-4 px-4">
                <CardTitle className="text-sm font-semibold">⏳ Validades Mais Próximas</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2">
                {top10.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-foreground">{item.nome}</span>
                    <span className={cn(
                      "text-xs font-medium",
                      item.dias <= 30 ? "text-red-600 dark:text-red-400" :
                      item.dias <= 60 ? "text-amber-600 dark:text-amber-400" :
                      "text-muted-foreground"
                    )}>
                      vence em {item.dias}d
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })()}

        {/* Tables by category */}
        {TIPOS_PUBLICOS.filter(tipo => itensByTipo[tipo]).map(tipo => {
          const items = itensByTipo[tipo];
          return (
            <div key={tipo} className="mb-6">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {TIPO_LABELS[tipo]} ({items.length})
              </h2>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Qtde</TableHead>
                        <TableHead className="text-right hidden sm:table-cell">Saída/sem</TableHead>
                        <TableHead className="text-right">Cobertura</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="hidden md:table-cell">Validade</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map((item, idx) => {
                        const diasVenc = calcDiasAteVencimento(item.dataValidade);
                        const vencimentoProximo = diasVenc !== null && diasVenc <= 30;
                        return (
                          <TableRow key={idx} className={cn(
                            item.status === 'vermelho' && 'bg-red-50/50 dark:bg-red-950/10',
                            item.status === 'amarelo' && 'bg-amber-50/30 dark:bg-amber-950/10',
                          )}>
                            <TableCell className="font-medium text-sm">
                              {item.nome}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {item.quantidade} {item.unidade}
                            </TableCell>
                            <TableCell className="text-right text-sm hidden sm:table-cell">
                              {item.demandaSemanal ? item.demandaSemanal.toFixed(1) : '—'}
                            </TableCell>
                            <TableCell className="text-right text-sm">
                              {item.coberturaDias !== undefined && item.coberturaDias !== null
                                ? `~${item.coberturaDias}d`
                                : '—'}
                            </TableCell>
                            <TableCell className="text-center">
                              {getStatusBadge(item.status)}
                            </TableCell>
                            <TableCell className={cn(
                              "hidden md:table-cell text-sm",
                              vencimentoProximo && "text-red-600 dark:text-red-400 font-medium"
                            )}>
                              {formatValidade(item.dataValidade)}
                              {diasVenc !== null && diasVenc <= 30 && (
                                <span className="text-xs ml-1">({diasVenc}d)</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          );
        })}

        {sortedItens.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Nenhum item de estoque cadastrado.
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground text-center mt-6">
          Atualiza automaticamente a cada 5 minutos
        </p>
      </main>
    </div>
  );
}
