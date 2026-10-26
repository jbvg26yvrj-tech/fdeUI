import { cp, access, constants, rm, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Проверяет, существует ли директория
 */
async function directoryExists(dirPath) {
  try {
    await access(dirPath, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Подсчитывает файлы в директории (рекурсивно)
 */
async function countFiles(dir) {
  const { readdir, stat } = await import('fs/promises');
  const { join } = await import('path');

  let count = 0;
  const items = await readdir(dir);

  for (const item of items) {
    const itemPath = join(dir, item);
    const stats = await stat(itemPath);

    if (stats.isDirectory()) {
      count += await countFiles(itemPath);
    } else {
      count++;
    }
  }

  return count;
}

async function copyDist(targetDir) {
  try {
    const sourceDir = path.join(__dirname, '..', 'dist');

    console.log('📦 Начинаю копирование сборки...');
    console.log(`📂 Источник: ${sourceDir}`);
    console.log(`🎯 Назначение: ${targetDir}`);

    // Проверяем существует ли исходная директория
    if (!existsSync(sourceDir)) {
      console.error(`❌ Ошибка: Исходная директория не существует: ${sourceDir}`);
      console.log('ℹ️  Сначала выполните сборку: npm run build');
      process.exit(1);
    }

    // Удаляем старую папку assets и index.html, если они существуют
    console.log('🧹 Очищаю предыдущие файлы (assets и index.html)...');
    try {
      await rm(path.join(targetDir, 'assets'), { recursive: true, force: true });
      console.log('   ✅ Удалена папка assets');
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('   ⚠️ Ошибка при удалении assets:', err.message);
      } else {
        console.log('   ℹ️ Папка assets не существовала, пропускаем');
      }
    }

    try {
      await unlink(path.join(targetDir, 'index.html'));
      console.log('   ✅ Удалён файл index.html');
    } catch (err) {
      if (err.code !== 'ENOENT') {
        console.error('   ⚠️ Ошибка при удалении index.html:', err.message);
      } else {
        console.log('   ℹ️ Файл index.html не существовал, пропускаем');
      }
    }

    // Копируем новые файлы
    console.log('🔄 Копирую файлы...');
    await cp(sourceDir, targetDir, {
      recursive: true,
      force: true,
      preserveTimestamps: true,
    });

    // Получаем количество скопированных файлов
    const fileCount = await countFiles(sourceDir);
    console.log(`✅ Успешно скопировано ${fileCount} файлов`);
    console.log('🎉 Сборка успешно скопирована!');
  } catch (error) {
    console.error('❌ Ошибка при копировании:', error.message);
    process.exit(1);
  }
}

// Получаем аргументы командной строки
const args = process.argv.slice(2);
const targetDir = args[0];

if (!targetDir) {
  console.error('❌ Ошибка: Не указана целевая папка для копирования');
  console.log('ℹ️  Использование: npm run copy:build -- <путь-к-папке>');
  console.log(
    'Пример: npm run copy:build -- "C:\\Users\\ttabdukarov\\IdeaProjects\\fde-manager\\backend\\src\\main\\resources\\static"',
  );
  process.exit(1);
}

copyDist(targetDir);
