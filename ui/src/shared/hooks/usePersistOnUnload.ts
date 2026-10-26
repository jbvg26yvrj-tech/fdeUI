import { useEffect, useRef } from 'react';

interface PersistableComponent {
  persistState?: () => Promise<void> | void;
  clearState?: () => Promise<void> | void;
}

/**
 * Хук для сохранения состояния при выходе из приложения
 */
export function usePersistOnUnload(components: PersistableComponent[] = []) {
  const componentsRef = useRef(components);
  const isSavingRef = useRef(false);

  useEffect(() => {
    componentsRef.current = components;
  }, [components]);

  useEffect(() => {
    const saveAllStates = async () => {
      if (isSavingRef.current) return;
      isSavingRef.current = true;

      try {
        console.log('[PersistOnUnload] Сохранение состояний при выходе...');

        const savePromises = componentsRef.current
          .filter(comp => comp.persistState)
          .map(comp => {
            try {
              return comp.persistState?.();
            } catch (error) {
              console.error('[PersistOnUnload] Ошибка сохранения компонента:', error);
              return Promise.resolve();
            }
          });

        // Используем Promise.allSettled для гарантии выполнения всех операций
        await Promise.allSettled(savePromises);

        // Также отправляем beacon запрос для дополнительной гарантии
        if (navigator.sendBeacon) {
          const data = JSON.stringify({
            timestamp: Date.now(),
            action: 'persist_settings',
          });
          navigator.sendBeacon('/api/v1/user-settings', data);
        }

        console.log('[PersistOnUnload] Все состояния сохранены');
      } catch (error) {
        console.error('[PersistOnUnload] Ошибка сохранения:', error);
      } finally {
        isSavingRef.current = false;
      }
    };

    // Функция для обработки beforeunload
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Только если есть что сохранять
      const hasComponentsToSave = componentsRef.current.some(comp => comp.persistState);

      if (hasComponentsToSave) {
        // Предотвращаем немедленное закрытие для завершения сохранения
        event.preventDefault();

        // Устанавливаем стандартное сообщение (браузер покажет свое)
        event.returnValue = '';

        // Запускаем асинхронное сохранение
        saveAllStates();
      }
    };

    // Обработчики событий
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        saveAllStates();
      }
    };

    const handlePageHide = () => {
      saveAllStates();
    };

    // Добавляем обработчики
    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);

      // Сохраняем при размонтировании компонента
      saveAllStates();
    };
  }, []);
}
