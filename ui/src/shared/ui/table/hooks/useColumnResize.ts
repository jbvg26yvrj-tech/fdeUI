import { useState, useCallback, useRef } from 'react';

interface UseColumnResizeProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: any[];
  resizable?: boolean;
  minColumnWidth?: number;
  resizeSensitivity?: number;
  onColumnResize?: (columnKey: string, newWidth: number) => void;
}

export const useColumnResize = ({
  columns,
  resizable = true,
  minColumnWidth = 10,
  resizeSensitivity = 1,
  onColumnResize,
}: UseColumnResizeProps) => {
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [isResizing, setIsResizing] = useState(false);

  const resizeDataRef = useRef<{
    columnKey: string;
    startX: number;
    startWidth: number;
    minWidth: number;
    sensitivity: number;
  } | null>(null);

  // Инициализация ширины колонок
  const initializeWidths = useCallback(() => {
    const initialWidths: Record<string, number> = {};
    columns.forEach(column => {
      const columnKey = column.key as string;
      initialWidths[columnKey] = column.width || 150;
    });
    //setColumnWidths(initialWidths);
  }, [columns]);

  const startResize = useCallback(
    (columnKey: string, event: React.MouseEvent) => {
      if (!resizable) return;

      event.preventDefault();
      event.stopPropagation();

      const currentWidth = columnWidths[columnKey] || 150;
      const column = columns.find(col => col.key === columnKey);
      const columnMinWidth = column?.minWidth ?? minColumnWidth;

      resizeDataRef.current = {
        columnKey,
        startX: event.clientX,
        startWidth: currentWidth,
        minWidth: columnMinWidth,
        sensitivity: resizeSensitivity,
      };

      setIsResizing(true);

      const handleMouseMove = (e: MouseEvent) => {
        if (!resizeDataRef.current) return;

        const { columnKey, startX, startWidth, minWidth, sensitivity } = resizeDataRef.current;

        const deltaX = (e.clientX - startX) * sensitivity;
        const newWidth = Math.max(minWidth, Math.round(startWidth + deltaX));

        setColumnWidths(prev => {
          if (prev[columnKey] === newWidth) return prev;
          return {
            ...prev,
            [columnKey]: newWidth,
          };
        });

        if (onColumnResize) {
          onColumnResize(columnKey, newWidth);
        }
      };

      const handleMouseUp = () => {
        if (resizeDataRef.current) {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);

          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          document.body.style.pointerEvents = '';

          setIsResizing(false);
          resizeDataRef.current = null;
        }
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.body.style.pointerEvents = 'none';
    },
    [columnWidths, resizable, resizeSensitivity, minColumnWidth, columns, onColumnResize],
  );

  return {
    columnWidths,
    isResizing,
    initializeWidths,
    startResize,
    setColumnWidths,
  };
};
