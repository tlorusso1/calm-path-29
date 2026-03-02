import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import niceLogoUrl from '@/assets/nice-foods-logo.png';

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
  produto_acabado: 'Produto',
  materia_prima: 'Matéria-Prima',
  embalagem: 'Embalagem',
  insumo: 'Insumo',
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

  const sortedItens = data?.itens
    ? [...data.itens].sort((a, b) => {
        const sa = STATUS_ORDER[a.status || 'verde'] ?? 3;
        const sb = STATUS_ORDER[b.status || 'verde'] ?? 3;
        return sa - sb;
      })
    : [];

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

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                  <TableHead className="text-right">Qtde</TableHead>
                  <TableHead className="text-right hidden sm:table-cell">Saída/sem</TableHead>
                  <TableHead className="text-right">Cobertura</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Validade</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedItens.map((item, idx) => {
                  const diasVenc = calcDiasAteVencimento(item.dataValidade);
                  const vencimentoProximo = diasVenc !== null && diasVenc <= 30;
                  return (
                    <TableRow key={idx} className={cn(
                      item.status === 'vermelho' && 'bg-red-50/50 dark:bg-red-950/10',
                      item.status === 'amarelo' && 'bg-amber-50/30 dark:bg-amber-950/10',
                    )}>
                      <TableCell className="font-medium text-sm max-w-[200px] truncate">
                        {item.nome}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {TIPO_LABELS[item.tipo] || item.tipo}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {item.quantidade} {item.unidade}
                      </TableCell>
                      <TableCell className="text-right text-sm hidden sm:table-cell">
                        {item.demandaSemanal ? `${item.demandaSemanal.toFixed(0)}` : '—'}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {item.coberturaDias !== undefined && item.coberturaDias !== null
                          ? `${item.coberturaDias}d`
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
                {sortedItens.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum item de estoque cadastrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center mt-6">
          Atualiza automaticamente a cada 5 minutos
        </p>
      </main>
    </div>
  );
}
