"use client";

import Button from "@/core/presentation/components/button";
import FormInput from "@/core/presentation/components/inputs/form/form-input";
import { TransponderDTO } from "@/libs/types/dto/transponder-dto";
import { useEffect, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { LuSave } from "react-icons/lu";
import FormSelect from "@/core/presentation/components/inputs/form/form-select";
import { TransponderMode } from "@prisma/client";
import { NodeDTO } from "@/libs/types/dto/node-dto";
import { MeshService } from "@/dashboard/mesh/presentation/services/meshService";
import FormCheckbox from "@/core/presentation/components/inputs/form/form-checkbox";
import OrbitService from "../services/orbitService";

interface TransponderFormProps {
  portalId: string;
  zoneId: string;
  transponder?: TransponderDTO;
}

export function TransponderForm({
  portalId,
  zoneId,
  transponder,
}: TransponderFormProps) {
  const methods = useForm();
  const { control, handleSubmit, setError, reset } = methods;

  const [availableNodes, setAvailableNodes] = useState<NodeDTO[]>(undefined);
  const [enabledText, setEnabledText] = useState<string>("");

  const onSubmit = async (data: any) => {
    const validationErrors = await OrbitService.instance.validateTransponder({
      ...transponder,
      ...data,
      zoneId,
    });

    if (Object.keys(validationErrors).length > 0) {
      for (const field in validationErrors) {
        setError(field as any, {
          type: "manual",
          message: validationErrors[field],
        });
      }
      return;
    }

    if (transponder) {
      await OrbitService.instance.updateTransponder(
        portalId,
        transponder.id,
        data
      );
    } else {
      await OrbitService.instance.createTransponder(portalId, {
        ...data,
        zoneId,
      });
    }
  };

  const onTransponderEnabledChanged = (value: boolean) => {
    if (value) {
      setEnabledText("Yes");
    } else {
      setEnabledText("No");
    }
  };

  useEffect(() => {
    if (transponder) {
      reset({ ...transponder });
    }

    onTransponderEnabledChanged(transponder?.enabled ?? false);
  }, [transponder]);

  useEffect(() => {
    const fetchNodes = async () => {
      const zone = await MeshService.instance.getZoneById(zoneId);
      setAvailableNodes(zone.nodes || []);
    };

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
            isLoading={availableNodes == null}
            options={availableNodes?.map((node) => ({
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
            onChangedValue={onTransponderEnabledChanged}
            text={enabledText}
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
