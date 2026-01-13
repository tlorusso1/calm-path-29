import { useTimeBlock } from '@/hooks/useTimeBlock';
import { useTasks } from '@/hooks/useTasks';
import { CurrentTask } from '@/components/CurrentTask';
import { OpeningBlock } from '@/components/OpeningBlock';
import { ClosingBlock } from '@/components/ClosingBlock';
import { EmptyState } from '@/components/EmptyState';
import { CaptureButton } from '@/components/CaptureButton';
import { BacklogAccess } from '@/components/BacklogAccess';

const Index = () => {
  const { block, config, phrase } = useTimeBlock();
  const {
    tasks,
    dayState,
    addTask,
    completeTask,
    skipTask,
    setCriticalTask,
    setOpenItems,
    closeDay,
    getNextTask,
    getSuggestedCritical,
    resetSkippedToday,
  } = useTasks();

  const handleCapture = (text: string) => {
    addTask(text, 'light');
  };

  const handleCreateCritical = (text: string) => {
    const task = addTask(text, 'critical');
    setCriticalTask(task.id);
  };

  const handleSelectCritical = (taskId: string) => {
    setCriticalTask(taskId);
  };

  const handleDeleteTask = (id: string) => {
    // For now, we'll mark as completed (could add actual delete later)
    completeTask(id);
  };

  const renderContent = () => {
    // Opening block - choose critical task (also allow in 'free' block if no critical set)
    if ((block === 'opening' || block === 'free') && !dayState.criticalTaskId) {
      return (
        <OpeningBlock
          phrase={phrase}
          suggestedTask={getSuggestedCritical()}
          onSelectCritical={handleSelectCritical}
          onCreateCritical={handleCreateCritical}
        />
      );
    }

    // Closing block
    if (block === 'closing') {
      return (
        <ClosingBlock
          phrase={phrase}
          criticalCompleted={dayState.criticalCompleted}
          openItems={dayState.openItems}
          onSetOpenItems={setOpenItems}
          onCloseDay={closeDay}
          dayClosed={!!dayState.dayClosedAt}
        />
      );
    }

    // Get next task based on current block
    const nextTask = getNextTask(block);

    // Check if we have pending tasks but all are skipped
    const pendingTasks = tasks.filter(t => !t.completed);
    const allSkipped = pendingTasks.length > 0 && !nextTask;

    if (!nextTask) {
      return (
        <EmptyState 
          phrase={phrase} 
          blockTitle={config.title} 
          allSkipped={allSkipped}
          onResetSkipped={allSkipped ? resetSkippedToday : undefined}
        />
      );
    }

    return (
      <CurrentTask
        task={nextTask}
        phrase={phrase}
        onComplete={() => completeTask(nextTask.id)}
        onSkip={() => skipTask(nextTask.id)}
        showSkip={block !== 'focus'}
      />
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <BacklogAccess tasks={tasks} onDeleteTask={handleDeleteTask} />
      
      <main className="max-w-lg mx-auto min-h-screen flex flex-col">
        {renderContent()}
      </main>
      
      <CaptureButton onCapture={handleCapture} />
    </div>
  );
};

export default Index;
