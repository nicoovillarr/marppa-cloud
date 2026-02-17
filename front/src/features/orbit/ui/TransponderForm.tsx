"use client";

import { Button } from "@/core/ui/Button";
import { FormInput } from "@/core/ui/inputs/form/FormInput";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { LuSave } from "react-icons/lu";
import { FormSelect } from "@/core/ui/inputs/form/FormSelect";
import { FormCheckbox } from "@/core/ui/inputs/form/FormCheckbox";
import { useTransponder } from "../models/use-transponder";
import { useNode } from "src/features/mesh/models/use-node";
import { TransponderMode } from "../models/transponder-mode.enum";
import { TransponderWithNodeResponseModel } from "../api/transponder.api.type";

interface TransponderFormProps {
  portalId: string;
  zoneId: string;
  transponder?: TransponderWithNodeResponseModel;
}

export function TransponderForm({
  portalId,
  zoneId,
  transponder,
}: TransponderFormProps) {
  const {
    createTransponder,
    updateTransponder,
  } = useTransponder();

  const {
    nodes,
    fetchNodes,
  } = useNode();

  const methods = useForm();
  const { control, handleSubmit, reset } = methods;

  const [isEnabled, setIsEnabled] = useState<boolean>(false);

  const onSubmit = async (data: any) => {
    if (transponder) {
      await updateTransponder(
        portalId,
        transponder.id,
        data
      );
    } else {
      await createTransponder(portalId, {
        ...data,
        zoneId,
      });
    }
  };

  useEffect(() => {
    if (transponder) {
      reset({ ...transponder });
    }

    setIsEnabled(transponder?.enabled ?? false);
  }, [transponder]);

  useEffect(() => {
    fetchNodes();
  }, [zoneId]);

  return (
    <FormProvider {...methods}>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-x-2 md:flex-row">
          <FormInput
            className="flex-1"
            label="Path"
            control={control}
            controlName="path"
            placeholder="e.g. /home"
            required
          />

          <FormSelect
            className="flex-1"
            label="Mode"
            control={control}
            controlName="mode"
            placeholder="Select a Transponder mode"
            options={Object.values(TransponderMode).map((mode) => ({
              value: mode,
              displayText: mode.charAt(0) + mode.slice(1).toLowerCase(),
            }))}
            required
          />
        </div>

        <div className="flex flex-col gap-x-2 md:flex-row">
          <FormSelect
            className="flex-1"
            label="IP"
            control={control}
            controlName="nodeId"
            placeholder="Link to a Node"
            isLoading={nodes == null}
            options={nodes?.map((node) => ({
              value: node.id,
              displayText: node.ipAddress,
            }))}
            required
          />

          <FormInput
            className="flex-1"
            label="Port"
            control={control}
            controlName="port"
            placeholder="e.g. 8080"
            type="number"
            required
          />
        </div>

        <div className="flex flex-col gap-x-2 md:flex-row">
          <FormInput
            className="flex-1"
            label="Priority"
            control={control}
            controlName="priority"
            type="number"
          />

          <FormCheckbox
            className="flex-1"
            label="Enabled"
            control={control}
            controlName="enabled"
            onChangedValue={setIsEnabled}
            text={isEnabled ? "Yes" : "No"}
          />
        </div>

        <Button
          className="ml-auto"
          type="submit"
          icon={<LuSave />}
          text="Save"
        />
      </form>
    </FormProvider>
  );
}
