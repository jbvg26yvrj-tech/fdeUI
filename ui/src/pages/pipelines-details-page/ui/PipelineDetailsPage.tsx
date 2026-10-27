import PipelinesDetails from '../../../features/pipeline/pipelines-details/ui/PipelinesDetails';
import { Link, useLocation, useParams } from 'react-router-dom';

const PipelineDetailsPage = () => {
  const { id } = useParams();
  const location = useLocation();
  const from = location.state?.returnTo;
  const returnTo = typeof from === "string" && /^\/pipelines(?:\?|$)/.test(from) ? from : "/pipelines";

  if (!id) {
    return <div>Error: Pipeline ID not found.</div>;
  }

  return (
    <>
      <Link className="fde-list-back" to={returnTo}>← Назад к пайплайнам</Link>
      <h1 className='text-2xl font-bold mb-6'>Детали пайплайна</h1>
      <PipelinesDetails id={id} />
    </>
  );
};


export default PipelineDetailsPage;