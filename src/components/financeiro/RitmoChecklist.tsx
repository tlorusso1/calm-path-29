import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { SectionHeader } from './SectionHeader';
import { FinanceiroStage } from '@/types/focus-mode';

interface RitmoChecklistProps {
  checklistDiario: FinanceiroStage['checklistDiario'];
  checklistSemanal: FinanceiroStage['checklistSemanal'];
  checklistMensal: FinanceiroStage['checklistMensal'];
  onUpdateDiario: (updates: Partial<FinanceiroStage['checklistDiario']>) => void;
  onUpdateSemanal: (updates: Partial<FinanceiroStage['checklistSemanal']>) => void;
  onUpdateMensal: (updates: Partial<FinanceiroStage['checklistMensal']>) => void;
}

const ITEMS_DIARIO = [
  { key: 'atualizouCaixa', label: 'Atualizar caixa' },
  { key: 'olhouResultado', label: 'Conferir vencimentos' },
] as const;

const ITEMS_SEMANAL = [
  { key: 'dda', label: 'Pedidos semana anterior' },
  { key: 'agendouVencimentos', label: 'Conciliação revisada' },
  { key: 'atualizouCaixaMinimo', label: 'Decisão da semana' },
] as const;

const ITEMS_MENSAL = [
  { key: 'atualizouFaturamento', label: 'Premissas revisadas' },
] as const;

export function RitmoChecklist({
  checklistDiario,
  checklistSemanal,
  checklistMensal,
  onUpdateDiario,
  onUpdateSemanal,
  onUpdateMensal,
}: RitmoChecklistProps) {
  const countCompleted = (items: readonly { key: string }[], checklist: Record<string, boolean>) => {
    return items.filter(item => checklist[item.key as keyof typeof checklist]).length;
  };
  
  const totalDiario = countCompleted(ITEMS_DIARIO, checklistDiario);
  const totalSemanal = countCompleted(ITEMS_SEMANAL, checklistSemanal);
  const totalMensal = countCompleted(ITEMS_MENSAL, checklistMensal);
  const total = totalDiario + totalSemanal + totalMensal;
  const totalItems = ITEMS_DIARIO.length + ITEMS_SEMANAL.length + ITEMS_MENSAL.length;

  return (
    <Card>
      <CardContent className="p-4">
        <SectionHeader 
          icon="✅" 
          title="CHECKLIST FINAL — RITMO"
          badge={
            <span className="text-xs text-muted-foreground">
              {total}/{totalItems}
            </span>
          }
        />
        
        <div className="space-y-4">
          {/* HOJE */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              📅 HOJE
            </p>
            <div className="space-y-2 pl-4">
              {ITEMS_DIARIO.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={checklistDiario[key as keyof typeof checklistDiario]}
                    onCheckedChange={(checked) => 
                      onUpdateDiario({ [key]: checked === true })
                    }
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* SEMANA */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              📆 SEMANA
            </p>
            <div className="space-y-2 pl-4">
              {ITEMS_SEMANAL.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={checklistSemanal[key as keyof typeof checklistSemanal]}
                    onCheckedChange={(checked) => 
                      onUpdateSemanal({ [key]: checked === true })
                    }
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* MÊS */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              📅 MÊS
            </p>
            <div className="space-y-2 pl-4">
              {ITEMS_MENSAL.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={checklistMensal[key as keyof typeof checklistMensal]}
                    onCheckedChange={(checked) => 
                      onUpdateMensal({ [key]: checked === true })
                    }
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        
        {/* Regra de Ouro */}
        <div className="mt-6 pt-4 border-t">
          <p className="text-[11px] text-muted-foreground text-center space-y-0.5">
            <span className="block">🔒 Caixa Real decide • 💳 Caixa Contratado tranquiliza</span>
            <span className="block">🔮 Projeção orienta • ⚙️ Parâmetros controlam • 📊 Análise ensina</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
