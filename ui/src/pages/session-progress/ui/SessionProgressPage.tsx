import { SessionProgressTable } from '../../../features/session-progress';
import ProtectedPage from '../../../shared/components/ProtectedPage';

const PipelinesPage = () => {
  return (
    <ProtectedPage
      pages={['sessions']}
      permissions={['page.session-progress']}
      pageName='SessionProgressPage'
    >
      <div className='space-y-4'>
        <SessionProgressTable />
      </div>
    </ProtectedPage>
  );
};

export default PipelinesPage;
