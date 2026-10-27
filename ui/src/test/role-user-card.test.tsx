import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RoleUserCard } from '../pages/permissions-page/components/RoleUserCard';
import type { UserDto } from '../features/auth/types/types';
it('shows the assigned user login from the actual user DTO', () => {
  render(<RoleUserCard user={{id:'user-42',login:'dwh.operator'} as UserDto} onDelete={vi.fn()} />);
  expect(screen.getByRole('heading', {name:'dwh.operator'})).toBeInTheDocument();
});

it('removes the selected assignment using its actual user id and login', () => {
  const onDelete = vi.fn();
  render(<RoleUserCard user={{id:'user-42',login:'dwh.operator'} as UserDto} onDelete={onDelete} />);
  fireEvent.click(screen.getByRole('button', {name:'Open actions menu'}));
  fireEvent.click(screen.getByRole('menuitem', {name:'Удалить'}));
  expect(onDelete).toHaveBeenCalledWith('user-42', 'dwh.operator');
});
