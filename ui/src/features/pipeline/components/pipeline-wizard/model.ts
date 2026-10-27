import type { TaskType } from '../../types/TaskTypes';
import type { PipelineFormSaveValues } from '../PipelineFormModal';
import type { PipelineData } from '../../types/Types';
export type Draft = PipelineFormSaveValues;
export type DraftTask = Draft['tasks'][number];
export type Schema = { required: string[]; optional: string[] };
export const labels: Record<string, string> = {
  sourceDir: 'Директория источника',
  targetDir: 'Директория назначения',
  fileMask: 'Маска файлов',
  maskType: 'Тип маски',
  recursive: 'Рекурсивный обход',
  preserveStructure: 'Сохранять структуру',
};
export const allowed = new Set(Object.keys(labels));
export const protocols = ['Sftp', 'Smb', 'Ftps', 'Minio'] as const;
export const actions = ['Download', 'Upload', 'Delete'] as const;
export const actionLabels = { Download: 'Скачать', Upload: 'Загрузить', Delete: 'Удалить' };
export const protocolLabels = { Sftp: 'SFTP', Smb: 'SMB', Ftps: 'FTPS', Minio: 'MinIO' };
let sequence = 0;
export const newId = () => `draft-${++sequence}`;
export const emptyTask = (): DraftTask => ({
  id: newId(),
  taskOrder: 1,
  typeCode: 'SftpDownloadTask',
  props: [],
});
export const emptyDraft = (): Draft => ({
  pipelineName: '',
  clientFrom: '',
  clientTo: '',
  primaryDatacenter: 'SP',
  allOrNothing: false,
  tasks: [emptyTask()],
});
export function splitType(code: string) {
  return {
    protocol: protocols.find(p => code.startsWith(p)) ?? 'Sftp',
    action: actions.find(a => code.includes(a)) ?? 'Download',
  };
}
export function supported(code: string) {
  return protocols.some(p => actions.some(a => code === `${p}${a}Task`));
}
export function taskTitle(task: DraftTask) {
  const { protocol, action } = splitType(task.typeCode);
  return `${actionLabels[action]} · ${protocolLabels[protocol]}`;
}
export function propValue(task: DraftTask, key: string) {
  return (
    task.props.find(p => p.key === key)?.value ??
    (key === 'maskType' ? 'GLOB' : ['recursive', 'preserveStructure'].includes(key) ? 'false' : '')
  );
}
export function copyTask(
  task: { typeCode: TaskType; props: Record<string, string> },
  order: number,
): DraftTask {
  return {
    id: newId(),
    taskOrder: order,
    typeCode: task.typeCode,
    props: Object.entries(task.props)
      .filter(([key]) => allowed.has(key))
      .map(([key, value]) => ({ key, value })),
  };
}
export function copyPipeline(source: PipelineData): Draft {
  return {
    pipelineName: `${source.pipelineName.slice(0, 247)} — копия`,
    clientFrom: source.clientFrom,
    clientTo: source.clientTo,
    primaryDatacenter: source.primaryDatacenter === 'SC' ? 'SC' : 'SP',
    allOrNothing: source.allOrNothing,
    tasks: [...source.tasks]
      .sort((a, b) => a.taskOrder - b.taskOrder)
      .map((task, i) => copyTask(task, i + 1)),
  };
}
export function serialize(draft: Draft, schemas: Record<string, Schema>): Draft {
  return {
    ...draft,
    pipelineName: draft.pipelineName.trim(),
    clientFrom: draft.clientFrom.trim(),
    clientTo: draft.clientTo.trim(),
    tasks: draft.tasks.map((task, i) => {
      const schema = schemas[task.typeCode];
      return {
        ...task,
        taskOrder: i + 1,
        props: [...new Set([...schema.required, ...schema.optional])]
          .filter(k => allowed.has(k))
          .map(key => ({ key, value: propValue(task, key) }))
          .filter(p => p.value !== '' || schema.required.includes(p.key)),
      };
    }),
  };
}
