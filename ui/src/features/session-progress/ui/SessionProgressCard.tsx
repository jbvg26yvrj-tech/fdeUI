// Session progress card is not used - file-level progress is not available in fde-api.
// Kept as a stub for backwards compatibility.

import React from 'react';
import type { SessionProgressPageDto } from '../types/types';

interface SessionProgressCardProps {
  item: SessionProgressPageDto;
}

export const SessionProgressCard: React.FC<SessionProgressCardProps> = ({ item }) => {
  return (
    <div className='p-4 border border-gray-200 dark:border-gray-700 rounded-lg'>
      <span className='text-sm text-gray-500 dark:text-gray-400'>
        {item.fileName} - Прогресс недоступен
      </span>
    </div>
  );
};
