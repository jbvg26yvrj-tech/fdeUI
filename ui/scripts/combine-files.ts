import fs from 'fs';
import path from 'path';

const outputFile = 'combined_files.txt';
const excludePatterns = [
  'node_modules',
  '.git',
  '*.log',
  '*.exe',
  '*.bin',
  'combined_files.txt', // исключаем сам результат
  'package-lock.json',
  '.vscode',
  'build',
  'README.md',
];

function isExcluded(filePath: string): boolean {
  return excludePatterns.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      return regex.test(filePath);
    }
    return filePath.includes(pattern);
  });
}

function isTextFile(filePath: string): boolean {
  const textExtensions = [
    '.txt',
    '.md',
    '.js',
    '.ts',
    '.tsx',
    '.json',
    '.xml',
    '.html',
    '.css',
    '.yaml',
    '.yml',
  ];
  const ext = path.extname(filePath).toLowerCase();
  return textExtensions.includes(ext);
}

function processFile(filePath: string, outputStream: fs.WriteStream) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    outputStream.write(`Путь к файлу: [${filePath}]\n`);
    outputStream.write(`Имя файла: [${path.basename(filePath)}]\n`);
    outputStream.write('Содержимое файла:\n');
    outputStream.write(content + '\n');
    outputStream.write('-'.repeat(50) + '\n\n');
    console.log(`Обработан: ${filePath}`);
  } catch (err) {
    console.error(`Ошибка чтения файла ${filePath}:`, err);
  }
}

function processDirectory(dirPath: string, outputStream: fs.WriteStream) {
  try {
    const items = fs.readdirSync(dirPath);

    for (const item of items) {
      const fullPath = path.join(dirPath, item);

      try {
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          if (!isExcluded(fullPath)) {
            processDirectory(fullPath, outputStream);
          }
        } else {
          if (!isExcluded(fullPath) && isTextFile(fullPath)) {
            processFile(fullPath, outputStream);
          }
        }
      } catch (err) {
        console.error(`Ошибка доступа к ${fullPath}:`, err);
      }
    }
  } catch (err) {
    console.error(`Ошибка чтения директории ${dirPath}:`, err);
  }
}

// Запуск обработки
console.log('Начало обработки файлов...');
const outputStream = fs.createWriteStream(outputFile, { flags: 'w' });
processDirectory(process.cwd(), outputStream);
outputStream.end();
console.log(`Файлы объединены в ${outputFile}`);
