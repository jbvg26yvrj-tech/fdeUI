// Форматирование ISO-даты в ДД.ММ.ГГГГ
export const formatDateForDisplay = (isoDate: string): string => {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-');
  if (year && month && day) {
    return `${day}.${month}.${year}`;
  }
  return isoDate;
};

// Парсинг ДД.ММ.ГГГГ в ISO
export const parseDisplayToIso = (display: string): string => {
  const digits = display.replace(/\D/g, '');
  if (digits.length !== 8) return '';
  const day = digits.slice(0, 2);
  const month = digits.slice(2, 4);
  const year = digits.slice(4, 8);
  return `${year}-${month}-${day}`;
};

// Проверка валидности ISO-даты
export const isValidDate = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
};

// Проверка валидности времени ЧЧ:ММ:СС
export const isValidTime = (timeStr: string): boolean => {
  if (!timeStr) return true;
  const parts = timeStr.split(':');
  if (parts.length !== 3) return false;
  const [hh, mm, ss] = parts.map(Number);
  if (isNaN(hh) || isNaN(mm) || isNaN(ss)) return false;
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59 && ss >= 0 && ss <= 59;
};

// Коррекция цифр времени (ограничение часов 23, минут/секунд 59)
export const correctTimeDigits = (digits: string): string => {
  if (digits.length === 0) return '';
  const parts: string[] = [];
  for (let i = 0; i < digits.length; i += 2) {
    parts.push(digits.slice(i, i + 2));
  }
  const corrected = parts.map((part, index) => {
    if (part.length === 2) {
      const num = parseInt(part, 10);
      if (index === 0) {
        return num > 23 ? '23' : part;
      } else {
        return num > 59 ? '59' : part;
      }
    }
    return part;
  });
  return corrected.join('');
};

// Форматирование ввода времени (вставляет двоеточия)
export const formatTimeInput = (input: string): string => {
  const digits = input.replace(/\D/g, '');
  const corrected = correctTimeDigits(digits.slice(0, 6));
  const limited = corrected.slice(0, 6);
  if (limited.length <= 2) return limited;
  if (limited.length <= 4) return `${limited.slice(0, 2)}:${limited.slice(2)}`;
  return `${limited.slice(0, 2)}:${limited.slice(2, 4)}:${limited.slice(4, 6)}`;
};

// Парсинг вставленного текста с датой и временем
export const parsePastedDateTime = (
  input: string,
): { dateIso: string; dateDisplay: string; time: string } | null => {
  const trimmed = input.trim();
  const dateMatch = trimmed.match(/(\d{2})[.-](\d{2})[.-](\d{4})/);
  if (!dateMatch) return null;
  const day = dateMatch[1];
  const month = dateMatch[2];
  const year = dateMatch[3];
  const dateIso = `${year}-${month}-${day}`;
  const dateDisplay = `${day}.${month}.${year}`;

  const afterDate = trimmed.slice(dateMatch.index! + dateMatch[0].length);
  const timeMatch = afterDate.match(/[,\s]*(\d{2}):(\d{2})(?::(\d{2}))?/);
  let time = '';
  if (timeMatch) {
    const hh = timeMatch[1];
    const mm = timeMatch[2];
    const ss = timeMatch[3] || '00';
    const rawTime = `${hh}:${mm}:${ss}`;
    if (isValidTime(rawTime)) {
      time = rawTime;
    } else {
      const digits = hh + mm + ss;
      const correctedDigits = correctTimeDigits(digits);
      if (correctedDigits.length === 6) {
        const ch = correctedDigits.slice(0, 2);
        const cm = correctedDigits.slice(2, 4);
        const cs = correctedDigits.slice(4, 6);
        time = `${ch}:${cm}:${cs}`;
      }
    }
  }
  return { dateIso, dateDisplay, time };
};

// Парсинг полного ввода (для onBlur)
export const parseFullDateTime = (input: string): { dateIso: string; time: string } | null => {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const dateMatch = trimmed.match(/(\d{2})[.-](\d{2})[.-](\d{4})/);
  if (!dateMatch) return null;
  const day = dateMatch[1];
  const month = dateMatch[2];
  const year = dateMatch[3];
  const dateIso = `${year}-${month}-${day}`;
  if (!isValidDate(dateIso)) return null;

  const afterDate = trimmed.slice(dateMatch.index! + dateMatch[0].length);
  const timeMatch = afterDate.match(/[,\s]*(\d{2}):(\d{2})(?::(\d{2}))?/);
  let time = '';
  if (timeMatch) {
    const hh = timeMatch[1];
    const mm = timeMatch[2];
    const ss = timeMatch[3] || '00';
    const rawTime = `${hh}:${mm}:${ss}`;
    if (isValidTime(rawTime)) {
      time = rawTime;
    } else {
      const digits = hh + mm + ss;
      const correctedDigits = correctTimeDigits(digits);
      if (correctedDigits.length === 6) {
        const ch = correctedDigits.slice(0, 2);
        const cm = correctedDigits.slice(2, 4);
        const cs = correctedDigits.slice(4, 6);
        time = `${ch}:${cm}:${cs}`;
      } else {
        return null;
      }
    }
  }
  return { dateIso, time };
};
