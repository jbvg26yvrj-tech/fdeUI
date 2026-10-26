import PipelinesDetails from '../../../features/pipeline/pipelines-details/ui/PipelinesDetails';
import { useParams } from 'react-router-dom';

const PipelineDetailsPage = () => {
  const { id } = useParams();

  if (!id) {
    return <div>Error: Pipeline ID not found.</div>;
  }

  return (
    <>
      <h1 className='text-2xl font-bold mb-6'>Детали пайплайна</h1>
      <PipelinesDetails id={id} />
    </>
  );
};


export default PipelineDetailsPage;