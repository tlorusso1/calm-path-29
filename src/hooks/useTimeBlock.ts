import { useState, useEffect } from 'react';
import { TimeBlock, BlockConfig } from '@/types/task';

const BLOCK_CONFIGS: Record<TimeBlock, BlockConfig> = {
  opening: {
    type: 'opening',
    title: 'Abertura do Dia',
    phrases: [
      'O que não pode esperar hoje?',
      'Se eu resolver só isso, o dia valeu.',
      'Qual incêndio eu apago primeiro?',
      'Vamos escolher uma coisa importante.',
    ],
  },
  focus: {
    type: 'focus',
    title: 'Bloco de Foco',
    phrases: [
      'Agora é só isso.',
      'Foco aqui. O resto espera.',
      'Uma coisa por vez.',
      'Resolve isso. Só isso.',
    ],
  },
  responses: {
    type: 'responses',
    title: 'Respostas Leves',
    phrases: [
      'Responder, não resolver tudo.',
      'Destrave alguém.',
      'Resolva o que é rápido.',
      'Nada grande agora.',
    ],
  },
  meetings: {
    type: 'meetings',
    title: 'Reuniões & Decisões',
    phrases: [
      'Decida o necessário.',
      'Distribua, não absorva.',
      'Quem pode fazer isso?',
      'Isso fica comigo ou não?',
    ],
  },
  tracking: {
    type: 'tracking',
    title: 'Acompanhamento',
    phrases: [
      'O que ficou com os outros?',
      'Onde eu preciso cobrar?',
      'Status rápido, sem absorver.',
      'Delegar é confiar, mas verificar.',
    ],
  },
  closing: {
    type: 'closing',
    title: 'Encerramento',
    phrases: [
      'O suficiente foi feito.',
      'O dia pode terminar.',
      'O que ficou pode esperar.',
      'Amanhã a gente continua.',
    ],
  },
  free: {
    type: 'free',
    title: 'Momento Livre',
    phrases: [
      'Sem pressa.',
      'O que faz sentido agora?',
      'Escolha com calma.',
      'Você decide o ritmo.',
    ],
  },
};

function getTimeInMinutes(): number {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

function getCurrentBlock(): TimeBlock {
  const minutes = getTimeInMinutes();
  
  // 09:00–09:20 (540-560)
  if (minutes >= 540 && minutes < 560) return 'opening';
  // 09:20–10:10 (560-610)
  if (minutes >= 560 && minutes < 610) return 'focus';
  // 11:00–11:30 (660-690)
  if (minutes >= 660 && minutes < 690) return 'responses';
  // 14:00–15:30 (840-930)
  if (minutes >= 840 && minutes < 930) return 'meetings';
  // 15:30–16:00 (930-960)
  if (minutes >= 930 && minutes < 960) return 'tracking';
  // 16:30–16:45 (990-1005)
  if (minutes >= 990 && minutes < 1005) return 'closing';
  
  return 'free';
}

export function useTimeBlock() {
  const [currentBlock, setCurrentBlock] = useState<TimeBlock>(getCurrentBlock);
  const [phrase, setPhrase] = useState<string>('');

  useEffect(() => {
    const updateBlock = () => {
      const block = getCurrentBlock();
      setCurrentBlock(block);
      
      const config = BLOCK_CONFIGS[block];
      const randomPhrase = config.phrases[Math.floor(Math.random() * config.phrases.length)];
      setPhrase(randomPhrase);
    };

    updateBlock();
    const interval = setInterval(updateBlock, 60000);

    return () => clearInterval(interval);
  }, []);

  const config = BLOCK_CONFIGS[currentBlock];

  return {
    block: currentBlock,
    config,
    phrase,
    refreshPhrase: () => {
      const randomPhrase = config.phrases[Math.floor(Math.random() * config.phrases.length)];
      setPhrase(randomPhrase);
    },
  };
}
