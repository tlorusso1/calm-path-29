import { useState } from 'react';
import { FocusMode, BacklogStage, BacklogTarefa, BacklogTempoEstimado, BacklogQuandoFazer } from '@/types/focus-mode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Plus, Star, Trash2, Lightbulb, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BacklogModeProps {
  mode: FocusMode;
  onUpdateBacklogData: (data: Partial<BacklogStage>) => void;
  onAddTarefa: (tarefa: Omit<BacklogTarefa, 'id'>) => void;
  onUpdateTarefa: (id: string, data: Partial<BacklogTarefa>) => void;
  onRemoveTarefa: (id: string) => void;
  onAddIdeia: (texto: string) => void;
  onUpdateIdeia: (id: string, texto: string) => void;
  onRemoveIdeia: (id: string) => void;
}

const TEMPO_EM_MINUTOS: Record<BacklogTempoEstimado, number> = {
  '15min': 15,
  '30min': 30,
  '1h': 60,
  '2h': 120,
  '+2h': 180,
};

const TEMPO_OPTIONS: BacklogTempoEstimado[] = ['15min', '30min', '1h', '2h', '+2h'];
const QUANDO_OPTIONS: { value: BacklogQuandoFazer; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'proximo', label: 'Próximo' },
  { value: 'depois', label: 'Depois' },
];

function calcularTempoHoje(tarefas: BacklogTarefa[]): number {
  return tarefas
    .filter(t => t.quandoFazer === 'hoje' && !t.completed)
    .reduce((acc, t) => acc + TEMPO_EM_MINUTOS[t.tempoEstimado], 0);
}

function formatarTempo(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;
  if (horas === 0) return `${mins}min`;
  if (mins === 0) return `${horas}h`;
  return `${horas}h ${mins}min`;
}

// Componente para renderizar uma tarefa individual
interface TarefaCardProps {
  tarefa: BacklogTarefa;
  borderColor: string;
  onUpdateTarefa: (id: string, data: Partial<BacklogTarefa>) => void;
  onRemoveTarefa: (id: string) => void;
}

function TarefaCard({ tarefa, borderColor, onUpdateTarefa, onRemoveTarefa }: TarefaCardProps) {
  return (
    <Card 
      className={cn(
        "p-3 space-y-3 border-l-4",
        borderColor,
        tarefa.completed && "opacity-50",
        tarefa.urgente && !tarefa.completed && "border-l-yellow-500"
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={tarefa.completed}
          onCheckedChange={() => onUpdateTarefa(tarefa.id, { completed: !tarefa.completed })}
          className="mt-0.5"
        />
        <Input
          value={tarefa.descricao}
          onChange={(e) => onUpdateTarefa(tarefa.id, { descricao: e.target.value })}
          className={cn(
            "flex-1 text-sm h-7 border-none shadow-none px-1 bg-transparent focus-visible:ring-1",
            tarefa.completed && "line-through text-muted-foreground"
          )}
        />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
          onClick={() => onRemoveTarefa(tarefa.id)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      {!tarefa.completed && (
        <>
          {/* Tempo estimado */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">⏱️</span>
            {TEMPO_OPTIONS.map(tempo => (
              <Button
                key={tempo}
                variant={tarefa.tempoEstimado === tempo ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onUpdateTarefa(tarefa.id, { tempoEstimado: tempo })}
              >
                {tempo}
              </Button>
            ))}
          </div>

          {/* Urgente */}
          <Button
            variant={tarefa.urgente ? "default" : "outline"}
            size="sm"
            className={cn(
              "h-6 text-xs gap-1",
              tarefa.urgente && "bg-yellow-500 hover:bg-yellow-600 text-yellow-950"
            )}
            onClick={() => onUpdateTarefa(tarefa.id, { urgente: !tarefa.urgente })}
          >
            <Star className={cn("h-3 w-3", tarefa.urgente && "fill-current")} />
            Urgente
          </Button>

          {/* Quando fazer */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">🗓️</span>
            {QUANDO_OPTIONS.map(({ value, label }) => (
              <Button
                key={value}
                variant={tarefa.quandoFazer === value ? "default" : "outline"}
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onUpdateTarefa(tarefa.id, { quandoFazer: value })}
              >
                {label}
              </Button>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

// Componente para renderizar uma seção de tarefas
interface TarefaSectionProps {
  titulo: string;
  emoji: string;
  tarefas: BacklogTarefa[];
  borderColor: string;
  bgColor: string;
  onUpdateTarefa: (id: string, data: Partial<BacklogTarefa>) => void;
  onRemoveTarefa: (id: string) => void;
}

function TarefaSection({ 
  titulo, 
  emoji,
  tarefas, 
  borderColor,
  bgColor,
  onUpdateTarefa,
  onRemoveTarefa,
}: TarefaSectionProps) {
  if (tarefas.length === 0) return null;
  
  // Ordenar: urgentes primeiro, depois não-completas
  const sortedTarefas = [...tarefas].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.urgente !== b.urgente) return a.urgente ? -1 : 1;
    return 0;
  });
  
  return (
    <div className="space-y-2">
      <div className={cn("text-xs font-medium uppercase tracking-wide px-2 py-1 rounded flex items-center gap-2", bgColor)}>
        <span>{emoji}</span>
        {titulo} ({tarefas.length})
      </div>
      {sortedTarefas.map(tarefa => (
        <TarefaCard
          key={tarefa.id}
          tarefa={tarefa}
          borderColor={borderColor}
          onUpdateTarefa={onUpdateTarefa}
          onRemoveTarefa={onRemoveTarefa}
        />
      ))}
    </div>
  );
}

export function BacklogMode({
  mode,
  onUpdateBacklogData,
  onAddTarefa,
  onUpdateTarefa,
  onRemoveTarefa,
  onAddIdeia,
  onUpdateIdeia,
  onRemoveIdeia,
}: BacklogModeProps) {
  const [novaTarefa, setNovaTarefa] = useState('');
  const [novaIdeia, setNovaIdeia] = useState('');

  const backlogData = mode.backlogData || { tempoDisponivelHoje: 480, tarefas: [], ideias: [] };
  const tempoDisponivelHoje = backlogData.tempoDisponivelHoje ?? 480;
  const tarefas = backlogData.tarefas ?? [];
  const ideias = backlogData.ideias ?? [];

  // Separar tarefas por categoria
  const tarefasHoje = tarefas.filter(t => t.quandoFazer === 'hoje');
  const tarefasProximo = tarefas.filter(t => t.quandoFazer === 'proximo');
  const tarefasDepois = tarefas.filter(t => t.quandoFazer === 'depois');

  const tempoHoje = calcularTempoHoje(tarefas);
  const percentual = tempoDisponivelHoje > 0 ? (tempoHoje / tempoDisponivelHoje) * 100 : 0;
  
  const getCapacidadeStatus = () => {
    if (percentual < 80) return { color: 'bg-green-500', label: 'Cabe no dia', emoji: '🟢' };
    if (percentual <= 100) return { color: 'bg-yellow-500', label: 'Estourando', emoji: '🟡' };
    return { color: 'bg-red-500', label: 'Passou do limite', emoji: '🔴' };
  };

  const capacidadeStatus = getCapacidadeStatus();

  const handleAddTarefa = () => {
    if (novaTarefa.trim()) {
      onAddTarefa({
        descricao: novaTarefa.trim(),
        tempoEstimado: '30min',
        urgente: false,
        quandoFazer: 'depois',
        completed: false,
      });
      setNovaTarefa('');
    }
  };

  const handleAddIdeia = () => {
    if (novaIdeia.trim()) {
      onAddIdeia(novaIdeia.trim());
      setNovaIdeia('');
    }
  };

  const handleKeyDownTarefa = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddTarefa();
  };

  const handleKeyDownIdeia = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAddIdeia();
  };

  return (
    <div className="space-y-6">
      {/* CAPACIDADE DO DIA */}
      <Card className="p-4 space-y-4 border-2">
        <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
          Capacidade do Dia
        </h3>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground whitespace-nowrap">Tempo disponível:</span>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={0}
              max={24}
              value={Math.floor(tempoDisponivelHoje / 60)}
              onChange={(e) => onUpdateBacklogData({ tempoDisponivelHoje: parseInt(e.target.value || '0') * 60 })}
              className="w-16 h-8 text-center"
            />
            <span className="text-sm text-muted-foreground">horas</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Tarefas de hoje: <strong>{formatarTempo(tempoHoje)}</strong></span>
            <span className="flex items-center gap-1">
              {capacidadeStatus.emoji} {capacidadeStatus.label}
            </span>
          </div>
          <div className="relative">
            <Progress value={Math.min(percentual, 100)} className="h-3" />
            <div 
              className={cn(
                "absolute inset-0 h-3 rounded-full transition-all",
                capacidadeStatus.color
              )}
              style={{ width: `${Math.min(percentual, 100)}%` }}
            />
          </div>
          {percentual > 100 && (
            <p className="text-xs text-destructive">
              Excedeu em {formatarTempo(tempoHoje - tempoDisponivelHoje)}
            </p>
          )}
        </div>

        <p className="text-xs text-muted-foreground italic text-center border-t pt-3">
          "Se não couber hoje, fica para outro dia. Isso é decisão, não atraso."
        </p>
      </Card>

      {/* BACKLOG DE TAREFAS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Backlog de Tarefas</h3>
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Nova tarefa..."
            value={novaTarefa}
            onChange={(e) => setNovaTarefa(e.target.value)}
            onKeyDown={handleKeyDownTarefa}
            className="flex-1"
          />
          <Button onClick={handleAddTarefa} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Seções por categoria */}
        <div className="space-y-6">
          {tarefas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhuma tarefa no backlog.
            </p>
          ) : (
            <>
              <TarefaSection 
                titulo="Hoje" 
                emoji="🟢"
                tarefas={tarefasHoje}
                borderColor="border-l-green-500"
                bgColor="bg-green-500/10 text-green-700 dark:text-green-400"
                onUpdateTarefa={onUpdateTarefa}
                onRemoveTarefa={onRemoveTarefa}
              />
              <TarefaSection 
                titulo="Próximo" 
                emoji="🔵"
                tarefas={tarefasProximo}
                borderColor="border-l-blue-500"
                bgColor="bg-blue-500/10 text-blue-700 dark:text-blue-400"
                onUpdateTarefa={onUpdateTarefa}
                onRemoveTarefa={onRemoveTarefa}
              />
              <TarefaSection 
                titulo="Depois" 
                emoji="⚪"
                tarefas={tarefasDepois}
                borderColor="border-l-muted"
                bgColor="bg-muted/50 text-muted-foreground"
                onUpdateTarefa={onUpdateTarefa}
                onRemoveTarefa={onRemoveTarefa}
              />
            </>
          )}
        </div>
      </div>

      {/* BACKLOG DE IDEIAS */}
      <div className="space-y-4 bg-muted/30 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <h3 className="font-semibold">Backlog de Ideias</h3>
        </div>

        <p className="text-xs text-muted-foreground italic">
          "Ideia não é tarefa. Registrar já é suficiente."
        </p>

        <div className="flex gap-2">
          <Input
            placeholder="Nova ideia..."
            value={novaIdeia}
            onChange={(e) => setNovaIdeia(e.target.value)}
            onKeyDown={handleKeyDownIdeia}
            className="flex-1 bg-background"
          />
          <Button onClick={handleAddIdeia} size="icon" variant="secondary">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-2">
          {ideias.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-2">
              Nenhuma ideia registrada.
            </p>
          ) : (
            ideias.map(ideia => (
              <div 
                key={ideia.id}
                className="flex items-center gap-2 p-2 bg-background rounded border"
              >
                <span className="text-sm text-muted-foreground">•</span>
                <Input
                  value={ideia.texto}
                  onChange={(e) => onUpdateIdeia(ideia.id, e.target.value)}
                  className="flex-1 text-sm h-7 border-none shadow-none px-1 bg-transparent focus-visible:ring-1"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveIdeia(ideia.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
