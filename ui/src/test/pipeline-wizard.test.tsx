import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { PipelineFormModal } from '../features/pipeline/components/PipelineFormModal';
const mocks = vi.hoisted(() => ({ props: vi.fn(), search: vi.fn(), get: vi.fn() }));
vi.mock('../features/pipeline/api/pipelinesCrudApi', () => ({
  pipelinesCrudApi: { getTaskProps: mocks.props },
  pipelineReuseApi: { search: mocks.search, get: mocks.get },
}));
beforeEach(() => {
  mocks.props.mockReset().mockImplementation(async (code: string) => ({
    required: [code.includes('Upload') ? 'targetDir' : 'sourceDir'],
    optional: ['fileMask', 'maskType', 'recursive'],
  }));
  mocks.search
    .mockReset()
    .mockResolvedValue({ content: [], page: 0, totalPages: 0, totalElements: 0 });
});
function general() {
  fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Новый маршрут' } });
  fireEvent.change(screen.getByLabelText('Клиент-источник'), { target: { value: 'source' } });
  fireEvent.change(screen.getByLabelText('Клиент-получатель'), { target: { value: 'recipient' } });
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
}
it('validates each step, retains fields, and only saves on explicit review confirmation', async () => {
  const save = vi.fn().mockResolvedValue({ id: 'p-123' });
  render(<PipelineFormModal isOpen mode='create' onClose={vi.fn()} onSave={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Заполните');
  general();
  await screen.findByLabelText('Директория источника');
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Директория источника');
  fireEvent.change(screen.getByLabelText('Директория источника'), { target: { value: '/inbox' } });
  fireEvent.click(screen.getByRole('button', { name: 'Назад' }));
  expect(screen.getByLabelText('Название')).toHaveValue('Новый маршрут');
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
  expect(screen.getByLabelText('Директория источника')).toHaveValue('/inbox');
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
  expect(save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Подтвердить и создать' }));
  await screen.findByText('Пайплайн создан');
  expect(save).toHaveBeenCalledTimes(1);
  expect(save.mock.calls[0][0].tasks[0]).toMatchObject({
    taskOrder: 1,
    typeCode: 'SftpDownloadTask',
    props: expect.arrayContaining([{ key: 'sourceDir', value: '/inbox' }]),
  });
  expect(screen.getByRole('link', { name: 'Открыть пайплайн' })).toHaveAttribute(
    'href',
    '/pipelines/p-123',
  );
});
it('protects a dirty draft when closing and retains data after a save rejection', async () => {
  const close = vi.fn();
  const save = vi.fn().mockRejectedValue(new Error('Ошибка сервера'));
  render(<PipelineFormModal isOpen mode='create' onClose={close} onSave={save} />);
  general();
  fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));
  expect(close).not.toHaveBeenCalled();
  expect(screen.queryByRole('button', { name: 'Далее' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Продолжить настройку' }));
  fireEvent.change(await screen.findByLabelText('Директория источника'), {
    target: { value: '/keep' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
  fireEvent.click(screen.getByRole('button', { name: 'Подтвердить и создать' }));
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Ошибка сервера'));
  fireEvent.click(screen.getByRole('button', { name: 'Изменить операцию 1' }));
  expect(screen.getByLabelText('Директория источника')).toHaveValue('/keep');
});
it('keeps Download first and validates the recursive dependency', async () => {
  mocks.props.mockResolvedValue({
    required: ['sourceDir'],
    optional: ['recursive', 'preserveStructure'],
  });
  render(<PipelineFormModal isOpen mode='create' onClose={vi.fn()} onSave={vi.fn()} />);
  general();
  fireEvent.change(await screen.findByLabelText('Директория источника'), {
    target: { value: '/in' },
  });
  expect(screen.getByRole('option', { name: 'Удалить (Delete)' })).toBeDisabled();
  fireEvent.click(screen.getByText('Дополнительные параметры'));
  fireEvent.click(screen.getByLabelText('Сохранять структуру'));
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
  expect(screen.getByRole('alert')).toHaveTextContent('рекурсивный обход');
  fireEvent.click(screen.getByLabelText('Рекурсивный обход'));
  fireEvent.click(screen.getByRole('button', { name: 'Добавить следующую операцию' }));
  fireEvent.change(screen.getByLabelText('Действие'), { target: { value: 'Upload' } });
  fireEvent.click(screen.getByRole('button', { name: 'Выше' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Первая операция');
});
it('copies a selected source only after confirmation and strips credentials and unsupported properties', async () => {
  mocks.search.mockResolvedValue({
    content: [{ id: 'source-1', pipelineName: 'Исходный', clientFrom: 'bank', clientTo: 'store' }],
    page: 0,
    totalPages: 1,
    totalElements: 1,
  });
  mocks.get.mockResolvedValue({
    id: 'source-1',
    pipelineName: 'Исходный',
    clientFrom: 'bank',
    clientTo: 'store',
    primaryDatacenter: 'SC',
    allOrNothing: false,
    tasks: [
      {
        id: 42,
        taskOrder: 7,
        typeCode: 'SftpDownloadTask',
        props: {
          sourceDir: '/from-template',
          password: 'secret',
          unknown: 'discard',
          targetDir: '/wrong',
        },
      },
    ],
  });
  const save = vi.fn().mockResolvedValue({ id: 'created' });
  render(<PipelineFormModal isOpen mode='create' onClose={vi.fn()} onSave={save} />);
  fireEvent.change(screen.getByLabelText('Название'), { target: { value: 'Draft' } });
  fireEvent.click(screen.getByText('На основе существующего пайплайна'));
  fireEvent.click(await screen.findByRole('button', { name: 'Выбрать Исходный' }));
  expect(mocks.get).toHaveBeenCalledWith('source-1');
  fireEvent.click(await screen.findByRole('button', { name: 'Скопировать весь пайплайн' }));
  expect(screen.getByLabelText('Название')).toHaveValue('Draft');
  fireEvent.click(screen.getByRole('button', { name: 'Заменить настройки' }));
  expect(screen.getByLabelText('Название')).toHaveValue('Исходный — копия');
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
  expect(await screen.findByLabelText('Директория источника')).toHaveValue('/from-template');
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
  fireEvent.click(screen.getByRole('button', { name: 'Подтвердить и создать' }));
  await screen.findByText('Пайплайн создан');
  const submitted = save.mock.calls[0][0];
  expect(submitted.tasks[0].taskOrder).toBe(1);
  expect(submitted.tasks[0].id).not.toBe('42');
  expect(submitted.tasks[0].props).not.toEqual(
    expect.arrayContaining([expect.objectContaining({ key: 'password' })]),
  );
  expect(submitted.tasks[0].props.map((p: { key: string }) => p.key)).not.toContain('unknown');
  expect(submitted.tasks[0].props.map((p: { key: string }) => p.key)).not.toContain('targetDir');
});
it('blocks duplicate saves and does not announce success without a created record', async () => {
  let finish!: (value: undefined) => void;
  const save = vi.fn().mockImplementation(
    () =>
      new Promise(resolve => {
        finish = resolve;
      }),
  );
  render(<PipelineFormModal isOpen mode='create' onClose={vi.fn()} onSave={save} />);
  general();
  fireEvent.change(await screen.findByLabelText('Директория источника'), {
    target: { value: '/in' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
  fireEvent.click(screen.getByRole('button', { name: 'Подтвердить и создать' }));
  expect(screen.getByRole('button', { name: 'Создание…' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Создание…' }));
  expect(save).toHaveBeenCalledTimes(1);
  finish(undefined);
  await screen.findByRole('alert');
  expect(screen.queryByText('Пайплайн создан')).not.toBeInTheDocument();
});
it('ignores stale protocol schemas and removes old action properties from review and payload', async () => {
  let resolveSmb!: (schema: { required: string[]; optional: string[] }) => void;
  mocks.props.mockImplementation((code: string) =>
    code.startsWith('Smb')
      ? new Promise(resolve => {
          resolveSmb = resolve;
        })
      : Promise.resolve({
          required: [code.includes('Upload') ? 'targetDir' : 'sourceDir'],
          optional: code.includes('Download') ? ['fileMask', 'maskType'] : [],
        }),
  );
  const save = vi.fn().mockResolvedValue({ id: 'clean' });
  render(<PipelineFormModal isOpen mode='create' onClose={vi.fn()} onSave={save} />);
  general();
  fireEvent.change(await screen.findByLabelText('Директория источника'), {
    target: { value: '/in' },
  });
  fireEvent.change(screen.getByLabelText('Протокол'), { target: { value: 'Smb' } });
  fireEvent.change(screen.getByLabelText('Протокол'), { target: { value: 'Ftps' } });
  await screen.findByLabelText('Директория источника');
  resolveSmb({ required: ['targetDir'], optional: [] });
  await waitFor(() => expect(screen.getByLabelText('Протокол')).toHaveValue('Ftps'));
  expect(screen.queryByLabelText('Директория назначения')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Скопировать эту операцию' }));
  fireEvent.click(screen.getByText('Дополнительные параметры'));
  fireEvent.change(screen.getByLabelText('Маска файлов'), { target: { value: '*.secret' } });
  fireEvent.change(screen.getByLabelText('Действие'), { target: { value: 'Delete' } });
  await waitFor(() =>
    expect(screen.queryByText('Дополнительные параметры')).not.toBeInTheDocument(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'Далее' }));
  expect(screen.queryByText(/\*\.secret/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Подтвердить и создать' }));
  await screen.findByText('Пайплайн создан');
  expect(save.mock.calls[0][0].tasks[1].props).toEqual([{ key: 'sourceDir', value: '/in' }]);
});
