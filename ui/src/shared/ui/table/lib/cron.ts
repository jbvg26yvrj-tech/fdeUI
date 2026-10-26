export const getCronHint = (value: unknown): string => {
  if (typeof value !== 'string') return String(value || '');

  const cronString = String(value || '');
  const decoded = parseCronExpression(cronString);

  return `${cronString}\n${decoded}`;
};

export const parseCronExpression = (cron: string): string => {
  if (!cron || cron.trim() === '') return 'Не задано';

  const parts = cron.trim().split(/\s+/);
  if (parts.length < 6) return 'Неверный формат cron';

  try {
    const [seconds, minutes, hours, dayOfMonth, month, dayOfWeek, year] = parts;

    const descriptions: string[] = [];

    // Секунды
    if (seconds !== '*' && seconds !== '?') {
      descriptions.push(`в ${seconds} секунд`);
    }

    // Минуты
    if (minutes !== '*' && minutes !== '?') {
      if (minutes === '0') descriptions.push('в 00 минут');
      else if (minutes.includes('/')) descriptions.push(`каждые ${minutes.split('/')[1]} минут`);
      else if (minutes.includes('-'))
        descriptions.push(`с ${minutes.split('-')[0]} по ${minutes.split('-')[1]} минут`);
      else if (minutes.includes(',')) descriptions.push(`в ${minutes.split(',').join(', ')} минут`);
      else descriptions.push(`в ${minutes} минут`);
    }

    // Часы
    if (hours !== '*' && hours !== '?') {
      if (hours === '0') descriptions.push('в 00 часов');
      else if (hours.includes('/')) descriptions.push(`каждые ${hours.split('/')[1]} часов`);
      else if (hours.includes('-'))
        descriptions.push(`с ${hours.split('-')[0]} по ${hours.split('-')[1]} часов`);
      else if (hours.includes(',')) descriptions.push(`в ${hours.split(',').join(', ')} часов`);
      else descriptions.push(`в ${hours} часов`);
    }

    // День месяца
    if (dayOfMonth !== '*' && dayOfMonth !== '?') {
      if (dayOfMonth === 'L') descriptions.push('в последний день месяца');
      else if (dayOfMonth.endsWith('W'))
        descriptions.push(`в ближайший будний день к ${dayOfMonth.replace('W', '')} числу`);
      else if (dayOfMonth.includes('/'))
        descriptions.push(`каждые ${dayOfMonth.split('/')[1]} дней`);
      else if (dayOfMonth.includes('-'))
        descriptions.push(`с ${dayOfMonth.split('-')[0]} по ${dayOfMonth.split('-')[1]} число`);
      else if (dayOfMonth.includes(','))
        descriptions.push(`в ${dayOfMonth.split(',').join(', ')} числа`);
      else descriptions.push(`в ${dayOfMonth} число`);
    }

    // Месяц
    if (month !== '*' && month !== '?') {
      const monthNames: { [key: string]: string } = {
        '1': 'январе',
        '2': 'феврале',
        '3': 'марте',
        '4': 'апреле',
        '5': 'мае',
        '6': 'июне',
        '7': 'июле',
        '8': 'августе',
        '9': 'сентябре',
        '10': 'октябре',
        '11': 'ноябре',
        '12': 'декабре',
        JAN: 'январе',
        FEB: 'феврале',
        MAR: 'марте',
        APR: 'апреле',
        MAY: 'мае',
        JUN: 'июне',
        JUL: 'июле',
        AUG: 'августе',
        SEP: 'сентябре',
        OCT: 'октябре',
        NOV: 'ноябре',
        DEC: 'декабре',
      };

      if (month.includes('/')) descriptions.push(`каждые ${month.split('/')[1]} месяцев`);
      else if (month.includes('-')) {
        const [start, end] = month.split('-');
        descriptions.push(`с ${monthNames[start] || start} по ${monthNames[end] || end}`);
      } else if (month.includes(',')) {
        const months = month.split(',').map(m => monthNames[m] || m);
        descriptions.push(`в ${months.join(', ')}`);
      } else {
        descriptions.push(`в ${monthNames[month] || month}`);
      }
    }

    // День недели
    if (dayOfWeek !== '*' && dayOfWeek !== '?') {
      const dayNames: { [key: string]: string } = {
        '1': 'воскресенье',
        '2': 'понедельник',
        '3': 'вторник',
        '4': 'среду',
        '5': 'четверг',
        '6': 'пятницу',
        '7': 'субботу',
        SUN: 'воскресенье',
        MON: 'понедельник',
        TUE: 'вторник',
        WED: 'среду',
        THU: 'четверг',
        FRI: 'пятницу',
        SAT: 'субботу',
      };

      if (dayOfWeek === 'L') descriptions.push('в последний день недели');
      else if (dayOfWeek.includes('#')) {
        const [day, week] = dayOfWeek.split('#');
        descriptions.push(`в ${week}-ю ${dayNames[day] || day}`);
      } else if (dayOfWeek.includes('/'))
        descriptions.push(`каждые ${dayOfWeek.split('/')[1]} дней недели`);
      else if (dayOfWeek.includes('-')) {
        const [start, end] = dayOfWeek.split('-');
        descriptions.push(`с ${dayNames[start] || start} по ${dayNames[end] || end}`);
      } else if (dayOfWeek.includes(',')) {
        const days = dayOfWeek.split(',').map(d => dayNames[d] || d);
        descriptions.push(`по ${days.join(', ')}`);
      } else {
        descriptions.push(`по ${dayNames[dayOfWeek] || dayOfWeek}`);
      }
    }

    // Год
    if (year && year !== '*' && year !== '?') {
      descriptions.push(`в ${year} году`);
    }

    if (descriptions.length === 0) return 'Каждую секунду';

    return `Выполняется ${descriptions.join(', ')}`.replace(/,([^,]*)$/, ' и$1');
  } catch {
    return 'Неверный формат cron выражения';
  }
};
