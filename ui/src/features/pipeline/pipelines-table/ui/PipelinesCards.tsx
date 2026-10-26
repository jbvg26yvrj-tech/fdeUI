import React from 'react';
import type { SimplePipelineData } from '../../types/Types';
import { PipelineCard } from './PipelinesCard';

interface PipelinesCardsProps {
  data: SimplePipelineData[];
  permissions: {
    canPipelineDetails: boolean;
    canPipelineSessions: boolean;
    canPipelineSchedule: boolean;
    canPipelineUnschedule: boolean;
  };
  onViewDetails: (pipeline: SimplePipelineData) => void;
  onViewSessions: (pipeline: SimplePipelineData) => void;
}

export const PipelinesCards: React.FC<PipelinesCardsProps> = ({
  data,
  permissions,
  onViewDetails,
  onViewSessions,
}) => {
  if (data.length === 0) {
    return (
      <div className='text-center py-8 text-gray-500 dark:text-gray-400'>Пайплайны не найдены</div>
    );
  }

  return (
    <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'>
      {data.map(pipeline => (
        <PipelineCard
          key={pipeline.id}
          pipeline={pipeline}
          permissions={permissions}
          onViewDetails={onViewDetails}
          onViewSessions={onViewSessions}
        />
      ))}
    </div>
  );
};
