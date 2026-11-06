import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { PipelineCard } from './PipelinesCard';
import type { SimplePipelineData } from '../../types/Types';
const pipeline = {id: 'p1', pipelineName: 'Transfer'} as SimplePipelineData;
const permissions = {canPipelineDetails: true, canPipelineSessions: true, canPipelineSchedule: false, canPipelineUnschedule: false};
it('keeps sessions and calendar keyboard accessible beside the card details link', () => {
  const schedule = vi.fn(); const details = vi.fn();
  render(<MemoryRouter><PipelineCard pipeline={pipeline} permissions={permissions} onViewDetails={details} onViewSessions={vi.fn()} onSchedule={schedule} scheduleSummary={{status: 'absent'}} /></MemoryRouter>);
  expect(screen.getByRole('link', {name: 'Сессии →'})).toHaveAttribute('href', '/sessions?pipelineId=p1&history=all');
  fireEvent.click(screen.getByRole('button', {name: 'Расписание: Transfer'}));
  expect(schedule).toHaveBeenCalledWith(pipeline);
  expect(details).not.toHaveBeenCalled();
});
it('shows schedule text without edit control for readers', () => {
  render(<MemoryRouter><PipelineCard pipeline={pipeline} permissions={permissions} onViewDetails={vi.fn()} onViewSessions={vi.fn()} scheduleSummary={{status: 'ready', cron: '0 0 * * * ?'}} /></MemoryRouter>);
  expect(screen.getByText('0 0 * * * ?')).toBeInTheDocument();
  expect(screen.queryByRole('button', {name: /Расписание:/})).not.toBeInTheDocument();
});
