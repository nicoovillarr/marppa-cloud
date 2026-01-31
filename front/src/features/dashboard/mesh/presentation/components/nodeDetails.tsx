import { NodeDTO } from "@/libs/types/dto/node-dto";
import { FormProvider, useForm } from "react-hook-form";
import FibersList from "./fibersList";

interface NodeDetailsProps {
  node: NodeDTO;
}

export default function NodeDetails({ node }: NodeDetailsProps) {
  const methods = useForm();
  const { control, handleSubmit, setError } = methods;

  const onSubmit = async (data: any) => {
    console.log(data);
  };

  return (
    <FormProvider {...methods}>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <FibersList zoneId={node?.zoneId} nodeId={node?.id} />
      </form>
    </FormProvider>
  );
}
