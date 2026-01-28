import { FocusMode, SupplyChainStage, SupplyChainRitmo } from '@/types/focus-mode';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface SupplyChainModeProps {
  mode: FocusMode;
  onUpdateSupplyChainData: (data: Partial<SupplyChainStage>) => void;
}

export function SupplyChainMode({
  mode,
  onUpdateSupplyChainData,
}: SupplyChainModeProps) {
  const data = mode.supplyChainData!;

  const handleRitmoChange = (ritmo: SupplyChainRitmo) => {
    onUpdateSupplyChainData({ ritmoAtual: ritmo });
  };

  const handleSemanalChange = (key: keyof SupplyChainStage['semanal'], checked: boolean) => {
    onUpdateSupplyChainData({
      semanal: {
        ...data.semanal,
        [key]: checked,
      },
    });
  };

  const handleQuinzenalChange = (key: keyof SupplyChainStage['quinzenal'], checked: boolean) => {
    onUpdateSupplyChainData({
      quinzenal: {
        ...data.quinzenal,
        [key]: checked,
      },
    });
  };

  const handleMensalChange = (key: keyof SupplyChainStage['mensal'], checked: boolean) => {
    onUpdateSupplyChainData({
      mensal: {
        ...data.mensal,
        [key]: checked,
      },
    });
  };

  const ritmoConfig = {
    semanal: {
      emoji: '🟢',
      title: 'Semanal — Radar da Operação',
      ancora: 'Semanal é radar, não decisão grande.',
    },
    quinzenal: {
      emoji: '🟡',
      title: 'Quinzenal — Ajuste de Produção',
      ancora: 'Produção responde à demanda, não ao medo.',
    },
    mensal: {
      emoji: '🔵',
      title: 'Mensal — Base de Dados',
      ancora: 'Decisão boa vem de dado consistente.',
    },
  };

  const currentConfig = ritmoConfig[data.ritmoAtual];

  return (
    <div className="space-y-6">
      {/* Seletor de Ritmo */}
      <div className="flex gap-2">
        {(['semanal', 'quinzenal', 'mensal'] as SupplyChainRitmo[]).map((ritmo) => (
          <button
            key={ritmo}
            onClick={() => handleRitmoChange(ritmo)}
            className={`flex-1 px-3 py-2 text-sm rounded-md border transition-colors capitalize ${
              data.ritmoAtual === ritmo
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background border-border hover:bg-muted'
            }`}
          >
            {ritmoConfig[ritmo].emoji} {ritmo}
          </button>
        ))}
      </div>

      {/* Checklist do Ritmo Selecionado */}
      <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-4">
        <h3 className="text-sm font-medium text-foreground">
          {currentConfig.emoji} {currentConfig.title}
        </h3>

        {/* Semanal */}
        {data.ritmoAtual === 'semanal' && (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="saidaEstoque"
                checked={data.semanal.saidaEstoque}
                onCheckedChange={(checked) => handleSemanalChange('saidaEstoque', checked as boolean)}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="saidaEstoque" className="text-sm cursor-pointer">
                  Atualizar saída de estoque semanal
                </Label>
                <p className="text-xs text-muted-foreground">
                  Planilha: Saída de estoque mensal 2025
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Checkbox
                id="verificarBling"
                checked={data.semanal.verificarBling}
                onCheckedChange={(checked) => handleSemanalChange('verificarBling', checked as boolean)}
              />
              <Label htmlFor="verificarBling" className="text-sm cursor-pointer">
                Verificar estoque no Bling
              </Label>
            </div>
            
            <div className="flex items-center gap-3">
              <Checkbox
                id="produtoForaPadrao"
                checked={data.semanal.produtoForaPadrao}
                onCheckedChange={(checked) => handleSemanalChange('produtoForaPadrao', checked as boolean)}
              />
              <Label htmlFor="produtoForaPadrao" className="text-sm cursor-pointer">
                Algum produto com saída fora do padrão?
              </Label>
            </div>
          </div>
        )}

        {/* Quinzenal */}
        {data.ritmoAtual === 'quinzenal' && (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="planejamentoProducao"
                checked={data.quinzenal.planejamentoProducao}
                onCheckedChange={(checked) => handleQuinzenalChange('planejamentoProducao', checked as boolean)}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="planejamentoProducao" className="text-sm cursor-pointer">
                  Atualizar planejamento de produção
                </Label>
                <p className="text-xs text-muted-foreground">
                  Planilha: Planejamento de Produção – Nice Foods 2025
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Checkbox
                id="producaoFazSentido"
                checked={data.quinzenal.producaoFazSentido}
                onCheckedChange={(checked) => handleQuinzenalChange('producaoFazSentido', checked as boolean)}
              />
              <Label htmlFor="producaoFazSentido" className="text-sm cursor-pointer">
                Produção planejada ainda faz sentido?
              </Label>
            </div>
            
            <div className="flex items-center gap-3">
              <Checkbox
                id="ajustarSeNecessario"
                checked={data.quinzenal.ajustarSeNecessario}
                onCheckedChange={(checked) => handleQuinzenalChange('ajustarSeNecessario', checked as boolean)}
              />
              <Label htmlFor="ajustarSeNecessario" className="text-sm cursor-pointer">
                Ajustar se necessário
              </Label>
            </div>
          </div>
        )}

        {/* Mensal */}
        {data.ritmoAtual === 'mensal' && (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Checkbox
                id="saidaEstoqueMensal"
                checked={data.mensal.saidaEstoqueMensal}
                onCheckedChange={(checked) => handleMensalChange('saidaEstoqueMensal', checked as boolean)}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="saidaEstoqueMensal" className="text-sm cursor-pointer">
                  Atualizar saída de estoque mensal
                </Label>
                <p className="text-xs text-muted-foreground">
                  Planilha: Saída de estoque mensal 2025
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Checkbox
                id="saldoFinalEstoque"
                checked={data.mensal.saldoFinalEstoque}
                onCheckedChange={(checked) => handleMensalChange('saldoFinalEstoque', checked as boolean)}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="saldoFinalEstoque" className="text-sm cursor-pointer">
                  Conferir saldo final de estoque
                </Label>
                <p className="text-xs text-muted-foreground">
                  Relatório: Relatório de saldo em estoque 2025
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <Checkbox
                id="avaliarComportamento"
                checked={data.mensal.avaliarComportamento}
                onCheckedChange={(checked) => handleMensalChange('avaliarComportamento', checked as boolean)}
                className="mt-0.5"
              />
              <div>
                <Label htmlFor="avaliarComportamento" className="text-sm cursor-pointer">
                  Avaliar comportamento de produtos
                </Label>
                <p className="text-xs text-muted-foreground">
                  (caiu / manteve / cresceu)
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Texto âncora do ritmo */}
        <p className="text-xs text-muted-foreground italic pt-2 border-t border-border">
          "{currentConfig.ancora}"
        </p>
      </div>

      {/* Padrão de preenchimento - apenas no mensal */}
      {data.ritmoAtual === 'mensal' && (
        <div className="p-4 rounded-lg bg-muted/50 border border-border space-y-3">
          <h4 className="text-xs font-medium text-foreground">
            📋 Padrão de Preenchimento
          </h4>
          
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>Preencher aba Ecommerce (coluna A-B)</li>
            <li>Preencher aba Atacado (coluna A-B)</li>
            <li>Atualizar aba TOTAL (puxar fórmulas da C para B)</li>
          </ol>
          
          <p className="text-xs font-medium text-foreground italic pt-2 border-t border-border">
            "Sempre seguir este padrão. Não improvisar."
          </p>
        </div>
      )}
    </div>
  );
}
