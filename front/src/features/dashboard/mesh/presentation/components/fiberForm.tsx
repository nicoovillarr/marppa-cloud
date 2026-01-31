"use client";

import "@/dashboard/mesh/meshFactory";

import FormInput from "@/core/presentation/components/inputs/form/form-input";
import { FiberDTO } from "@/libs/types/dto/fiber-dto";
import { FormProvider, useForm } from "react-hook-form";
import FormSelect from "@/core/presentation/components/inputs/form/form-select";
import Button from "@/core/presentation/components/button";
import { LuSave } from "react-icons/lu";
import { useEffect } from "react";
import { MeshService } from "@/dashboard/mesh/presentation/services/meshService";

interface FiberFormProps {
  fiber?: FiberDTO;
  onSubmit?: (data: any) => void;
}

export default function FiberForm({ fiber, onSubmit }: FiberFormProps) {
  const methods = useForm();
  const { control, handleSubmit, setError } = methods;

  const internalOnSubmit = async (data: FiberDTO) => {
    const form = {
      ...fiber,
      ...data,
    };

    const validationErrors = await MeshService.instance.validateFiber(form);
    if (Object.keys(validationErrors).length > 0) {
      for (const field in validationErrors) {
        setError(field as any, {
          type: "manual",
          message: validationErrors[field],
        });
      }
      return;
    }

    onSubmit?.(form);
  };

  useEffect(() => {
    if (fiber) {
      methods.reset({
        protocol: fiber.protocol,
        targetPort: fiber.targetPort,
      });
    }
  }, [fiber]);

  return (
    <FormProvider {...methods}>
      <form onSubmit={handleSubmit(internalOnSubmit)} className="space-y-4">
        <section className="flex gap-x-2">
          <FormInput
            className="flex-1"
            label="Target Port"
            controlName="targetPort"
            control={control}
            type="number"
            defaultValue={fiber?.targetPort || 80}
            required
          />

          <FormSelect
            className="flex-1"
            label="Protocol"
            controlName="protocol"
            control={control}
            options={[
              { value: "tcp", displayText: "TCP" },
              { value: "udp", displayText: "UDP" },
            ]}
            defaultValue={fiber?.protocol || "tcp"}
            required
          />
        </section>

        <Button icon={<LuSave />} text="Save" type="submit" />
      </form>
    </FormProvider>
  );
}
