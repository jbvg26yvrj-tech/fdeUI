import { useUserContext } from '../../shared/hooks/useUserContext';
export default function AboutPage() {
  const { isLoading, permissions, roles } = useUserContext();
  const hasPages =
    roles.includes('ADMIN') ||
    permissions.some(code =>
      ['page.pipelines', 'page.sessions', 'page.permissions'].includes(code),
    );
  return (
    <article className='max-w-4xl mx-auto py-8 sm:py-14 text-slate-800 dark:text-slate-100'>
      <p className='text-blue-700 dark:text-blue-300 font-semibold mb-4'>
        FDE · File Delivery Engine
      </p>
      <h1 className='text-3xl sm:text-5xl font-semibold tracking-tight leading-tight max-w-2xl'>
        Управление передачей файлов между системами
      </h1>
      <p className='mt-6 text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed'>
        FDE объединяет настройку потоков, расписания передачи и наблюдение за сессиями в одной
        рабочей панели.
      </p>
      <dl className='mt-10 divide-y divide-slate-200 dark:divide-slate-700 border-y border-slate-200 dark:border-slate-700'>
        {[
          ['Потоки', 'Отправитель, получатель и последовательность обработки файлов.'],
          ['Расписания', 'Запуск передачи в заданное время и управление выполнением.'],
          ['Сессии', 'История запусков, состояние обработки и диагностика ошибок.'],
        ].map(([title, text]) => (
          <div key={title} className='py-6 sm:grid sm:grid-cols-[160px_1fr] gap-6'>
            <dt className='font-semibold mb-2'>{title}</dt>
            <dd className='text-slate-600 dark:text-slate-300'>{text}</dd>
          </div>
        ))}
      </dl>
      {!isLoading && !hasPages && (
        <aside className='mt-8 border-l-4 border-blue-600 bg-blue-50 dark:bg-blue-950 p-5'>
          <h2 className='font-semibold'>Учётная запись готова. Доступ ещё не назначен.</h2>
          <p className='mt-2 text-slate-700 dark:text-slate-300'>
            Обратитесь к администратору FDE: сообщите свой логин и системы, с которыми будете
            работать. После назначения роли войдите снова.
          </p>
        </aside>
      )}
    </article>
  );
}
