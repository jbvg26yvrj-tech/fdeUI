import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../Button';
import clsx from 'clsx';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalCount,
  pageSize,
  onPageChange,
  className,
}) => {
  const [isNarrow, setIsNarrow] = useState(false);
  const outerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setIsNarrow(width < 350);
      }
    });

    resizeObserver.observe(outer);
    return () => resizeObserver.disconnect();
  }, []);

  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalCount);

  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 10) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const delta = 4;
    const left = currentPage - delta;
    const right = currentPage + delta;
    const pages: (number | string)[] = [];
    const range: number[] = [];

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= left && i <= right)) {
        range.push(i);
      }
    }

    let last: number | null = null;
    range.forEach(page => {
      if (last !== null) {
        if (page - last === 2) {
          pages.push(last + 1);
        } else if (page - last > 2) {
          pages.push('...');
        }
      }
      pages.push(page);
      last = page;
    });

    return pages;
  };

  const pageNumbers = getPageNumbers();

  const getMobileMiddle = (): number | string => {
    if (currentPage === 1 || currentPage === totalPages) {
      return '...';
    }
    return currentPage;
  };

  return (
    <div
      ref={outerRef}
      className={clsx(
        'px-4 py-3 border-t border-gray-200 dark:border-gray-700',
        'flex flex-wrap items-center justify-between gap-2',
        'max-[620px]:flex-col max-[620px]:items-stretch',
        className,
      )}
    >
      <div className='text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap'>
        Показано {startItem}-{endItem} из {totalCount}
      </div>

      <div
        className={clsx(
          'flex items-center',
          isNarrow ? 'flex-col items-center space-y-1' : 'flex-row space-x-1 flex-nowrap',
          'justify-center',
        )}
      >
        <Button
          variant='outlined'
          size='sm'
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
        >
          Назад
        </Button>

        <div className='hidden sm:flex items-center space-x-1'>
          {pageNumbers.map((item, index) => {
            if (typeof item === 'string') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className='px-2 text-gray-500 dark:text-gray-400 select-none'
                >
                  {item}
                </span>
              );
            }
            return (
              <Button
                key={item}
                variant={currentPage === item ? 'primary' : 'outlined'}
                size='sm'
                onClick={() => onPageChange(item)}
                className='min-w-[40px]'
              >
                {item}
              </Button>
            );
          })}
        </div>

        <div className='sm:hidden flex items-center justify-center space-x-1'>
          <Button
            variant={currentPage === 1 ? 'primary' : 'outlined'}
            size='sm'
            onClick={() => onPageChange(1)}
            className='min-w-[40px]'
          >
            1
          </Button>

          {getMobileMiddle() === '...' ? (
            <span className='px-2 text-gray-500 dark:text-gray-400 select-none min-w-[40px] text-center'>
              ...
            </span>
          ) : (
            <Button
              variant='primary'
              size='sm'
              onClick={() => onPageChange(currentPage)}
              className='min-w-[40px]'
            >
              {currentPage}
            </Button>
          )}

          <Button
            variant={currentPage === totalPages ? 'primary' : 'outlined'}
            size='sm'
            onClick={() => onPageChange(totalPages)}
            className='min-w-[40px]'
          >
            {totalPages}
          </Button>
        </div>

        <Button
          variant='outlined'
          size='sm'
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
        >
          Вперёд
        </Button>
      </div>
    </div>
  );
};
