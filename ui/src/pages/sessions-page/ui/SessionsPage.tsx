import { PipelineSessionsTable } from '../../../features/pipeline-sessions';
import ProtectedPage from '../../../shared/components/ProtectedPage';

const PipelinesPage = () => {
  return (
    <ProtectedPage pages={['sessions']} permissions={['page.sessions']} pageName='SessionsPage'>
      <div className='space-y-4'>
        <PipelineSessionsTable />
      </div>
    </ProtectedPage>
  );
};

export default PipelinesPage;
