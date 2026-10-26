import { PipelinesTable } from '../../../features/pipeline/pipelines-table';
import ProtectedPage from '../../../shared/components/ProtectedPage';

const PipelinesPage = () => {
  return (
    <ProtectedPage pages={['pipelines']} permissions={['page.pipelines']} pageName='PipelinePage'>
      <PipelinesTable />
    </ProtectedPage>
  );
};

export default PipelinesPage;
