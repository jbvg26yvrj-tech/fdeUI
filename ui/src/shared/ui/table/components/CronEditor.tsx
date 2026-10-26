import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Input from '../../Input';
import { parseCronExpression } from '../lib/cron';
import Button from '../../Button';

// Компонент для редактирования Cron выражения
interface CronEditorProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  triggerRect: DOMRect | undefined;
}

export const CronEditor: React.FC<CronEditorProps> = ({ value, onChange, onBlur, triggerRect }) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [tempValue, setTempValue] = useState(value);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popupRef.current &&
        !popupRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsPopupOpen(false);
        if (onBlur) onBlur();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onBlur]);

  const commonValues = [
    { value: '* * * * * *', label: 'Ежесекундно' },
    { value: '0 0 * * * ?', label: 'Ежечасно' },
    { value: '0 0 0 * * ?', label: 'Ежедневно в полночь' },
    { value: '0 0 12 * * ?', label: 'Ежедневно в полдень' },
    { value: '0 0 9 * * MON-FRI', label: 'В будни в 9:00' },
    { value: '0 0 0 1 * ?', label: 'В первый день месяца' },
    { value: '0 0 0 * * MON', label: 'Каждый понедельник' },
    { value: '0 */5 * * * ?', label: 'Каждые 5 минут' },
    { value: '0 0 0 ? * SUN', label: 'Каждое воскресенье' },
  ];

  const handleApply = () => {
    onChange(tempValue);
    setIsPopupOpen(false);
    if (onBlur) onBlur();
  };

  const handleCommonValueSelect = (cronValue: string) => {
    setTempValue(cronValue);
  };

  const handleInputClick = () => {
    setIsPopupOpen(true);
    setTempValue(value);
  };

  const popupContent =
    isPopupOpen &&
    triggerRect &&
    createPortal(
      <div
        ref={popupRef}
        className='fixed z-[1000] bg-white border border-gray-200 rounded-lg shadow-lg w-80'
        style={{
          top: triggerRect.bottom + window.scrollY + 5,
          left: triggerRect.left + window.scrollX,
        }}
      >
        <div className='p-3 border-b border-gray-200'>
          <h4 className='text-sm font-medium text-gray-700'>Редактор Cron выражения</h4>
          <p className='text-xs text-gray-500 mt-1'>
            Формат: секунды минуты часы день_месяца месяц день_недели год
          </p>
        </div>

        <div className='p-3'>
          <Input
            value={tempValue}
            onChange={e => setTempValue(e.target.value)}
            placeholder='0 0 12 * * ?'
            inputSize='sm'
            className='w-full text-xs mb-2 font-mono'
            autoFocus
          />

          <div className='text-xs text-green-600 mb-3 p-2 bg-green-50 rounded'>
            {parseCronExpression(tempValue)}
          </div>

          <div className='mb-3'>
            <label className='block text-xs font-medium text-gray-600 mb-2'>Частые варианты:</label>
            <div className='grid grid-cols-1 gap-1 max-h-32 overflow-y-auto'>
              {commonValues.map((item, index) => (
                <button
                  key={index}
                  className='text-left p-2 text-xs hover:bg-gray-50 rounded border border-gray-100'
                  onClick={() => handleCommonValueSelect(item.value)}
                >
                  <div className='font-mono text-blue-600'>{item.value}</div>
                  <div className='text-gray-600'>{item.label}</div>
                </button>
              ))}
            </div>
          </div>

          <div className='flex space-x-2'>
            <Button variant='primary' size='sm' onClick={handleApply} className='flex-1'>
              Применить
            </Button>
            <Button variant='outlined' size='sm' onClick={() => setIsPopupOpen(false)}>
              Отмена
            </Button>
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <div className='relative'>
      <div ref={buttonRef}>
        <Input
          value={value}
          readOnly
          onClick={handleInputClick}
          placeholder='Нажмите для редактирования cron выражения'
          inputSize='sm'
          className='w-full text-xs pr-8 cursor-pointer'
        />
      </div>

      <button
        type='button'
        className='absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600'
        onClick={handleInputClick}
      >
        <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
          />
        </svg>
      </button>

      {popupContent}
    </div>
  );
};
