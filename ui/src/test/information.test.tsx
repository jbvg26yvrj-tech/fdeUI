import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { it, expect, vi, beforeEach } from 'vitest';
import InformationSettingsPage from '../pages/settings-page/InformationSettingsPage';
import { InformationBlocks } from '../features/information/InformationBlocks';
import { informationApi } from '../features/information/api';
vi.mock('../features/information/api', async importOriginal => ({
  ...(await importOriginal<typeof import('../features/information/api')>()),
  informationApi: { read: vi.fn(), save: vi.fn() },
}));
vi.mock('../shared/hooks/useUserContext', () => ({
  useUserContext: () => ({ roles: ['ADMIN'], permissions: [], isLoading: false }),
}));
beforeEach(() => vi.resetAllMocks());
it('loads, adds a block and saves the document version', async () => {
  vi.mocked(informationApi.read).mockResolvedValue({ version: 7, blocks: [] });
  vi.mocked(informationApi.save).mockImplementation(async d => ({ ...d, version: 8 }));
  render(
    <MemoryRouter>
      <InformationSettingsPage />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Добавить раздел' }));
  fireEvent.change(screen.getByLabelText('Заголовок 1'), { target: { value: 'Инструкция' } });
  fireEvent.change(screen.getByLabelText('Текст 1'), { target: { value: 'Как начать' } });
  fireEvent.change(screen.getByLabelText('Аудитория 1'), { target: { value: 'ADMIN' } });
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
  await screen.findByText('Изменения сохранены');
  expect(vi.mocked(informationApi.save).mock.calls[0][0]).toMatchObject({
    version: 7,
    blocks: [{ title: 'Инструкция', body: 'Как начать', audience: 'ADMIN' }],
  });
});
it('keeps unsaved text on a conflict and offers explicit reload', async () => {
  vi.mocked(informationApi.read).mockResolvedValue({ version: 0, blocks: [] });
  vi.mocked(informationApi.save).mockRejectedValue(
    Object.assign(new Error('conflict'), { status: 409 }),
  );
  render(
    <MemoryRouter>
      <InformationSettingsPage />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Добавить раздел' }));
  fireEvent.change(screen.getByLabelText('Заголовок 1'), { target: { value: 'Мой текст' } });
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
  await screen.findByRole('alert');
  expect(screen.getByLabelText('Заголовок 1')).toHaveValue('Мой текст');
  expect(screen.getByRole('button', { name: 'Загрузить актуальную версию' })).toBeInTheDocument();
});
it('renders text and suppresses unsafe links', () => {
  render(
    <InformationBlocks
      blocks={[
        {
          id: 'a',
          title: 'Помощь',
          body: '<img src=x onerror=alert(1)>',
          audience: 'ALL',
          links: [
            { label: 'Bad', url: 'javascript:alert(1)' },
            { label: 'Docs', url: 'https://docs.example' },
          ],
        },
      ]}
    />,
  );
  expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Bad' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Docs' })).toHaveAttribute('rel', 'noopener noreferrer');
});
it('reorders blocks and links and previews only the selected audience', async () => {
  vi.mocked(informationApi.read).mockResolvedValue({
    version: 2,
    blocks: [
      {
        id: 'a',
        title: 'Для всех',
        body: 'Общее описание',
        audience: 'ALL',
        links: [
          { label: 'Первый', url: 'https://one.example' },
          { label: 'Второй', url: 'https://two.example' },
        ],
      },
      {
        id: 'b',
        title: 'Администраторам',
        body: 'Закрытая инструкция',
        audience: 'ADMIN',
        links: [],
      },
    ],
  });
  vi.mocked(informationApi.save).mockImplementation(async d => ({ ...d, version: 3 }));
  render(
    <MemoryRouter>
      <InformationSettingsPage />
    </MemoryRouter>,
  );
  await screen.findByLabelText('Заголовок 1');
  expect(screen.queryByRole('heading', { name: 'Администраторам' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Показать для'), { target: { value: 'ADMIN' } });
  expect(screen.getByRole('heading', { name: 'Администраторам' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Ссылка 1.2 выше' }));
  fireEvent.click(screen.getByRole('button', { name: 'Раздел 2 выше' }));
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
  await screen.findByText('Изменения сохранены');
  const payload = vi.mocked(informationApi.save).mock.calls[0][0];
  expect(payload.blocks.map(b => b.id)).toEqual(['b', 'a']);
  expect(payload.blocks[1].links.map(l => l.label)).toEqual(['Второй', 'Первый']);
});
it('validates unsafe links before a save and allows their removal', async () => {
  vi.mocked(informationApi.read).mockResolvedValue({
    version: 0,
    blocks: [{ id: 'a', title: 'Инструкция', body: '', audience: 'ALL', links: [] }],
  });
  render(
    <MemoryRouter>
      <InformationSettingsPage />
    </MemoryRouter>,
  );
  fireEvent.click(await screen.findByRole('button', { name: 'Добавить ссылку в раздел 1' }));
  fireEvent.change(screen.getByLabelText('Подпись ссылки 1.1'), {
    target: { value: 'Небезопасная' },
  });
  fireEvent.change(screen.getByLabelText('Адрес ссылки 1.1'), {
    target: { value: 'javascript:alert(1)' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Сохранить' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('HTTP(S)');
  expect(informationApi.save).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Удалить ссылку 1.1' }));
  expect(screen.queryByLabelText('Адрес ссылки 1.1')).not.toBeInTheDocument();
});
