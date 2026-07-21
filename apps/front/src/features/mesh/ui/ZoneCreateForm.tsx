"use client";

import { Button, ButtonRef } from "@/core/ui/Button";
import { useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { redirect } from "next/navigation";
import { FormInput } from "@/core/ui/inputs/form/FormInput";
import { toast } from "sonner";
import { useZone } from "../models/use-zone";

const CIDR_PATTERN = /^(?:\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;

export function ZoneCreateForm() {
  const {
    validateZone,
    createZone,
  } = useZone();

  const buttonRef = useRef<ButtonRef>(null);

  const methods = useForm<any>({
    defaultValues: {
      name: "",
      description: "",
      cidr: "",
    },
  });

  const { handleSubmit, setError, control } = methods;

  const onSubmit = async (data: any) => {
    buttonRef.current?.setIsLoading(true);

    const validationErrors = await validateZone(data);

    const cidr = (data.cidr ?? "").trim();
    if (cidr && !CIDR_PATTERN.test(cidr)) {
      validationErrors.cidr = "CIDR must look like 10.10.0.0/24";
    }

    if (Object.keys(validationErrors).length > 0) {
      for (const [field, message] of Object.entries(validationErrors)) {
        setError(field, {
          type: "manual",
          message: message,
        });
      }

      await buttonRef.current?.setIsLoading(false);

      return;
    }

    const { name, description } = data;

    let newZone = null;
    try {
      newZone = await createZone(name, description, cidr || undefined);
    } catch (error) {
      console.error("Error creating zone:", error);
    }

    if (newZone) {
      await buttonRef.current?.setIsLoading(false);
      redirect(`/dashboard/mesh/zones`);
    } else {
      toast.error("Failed to create zone");
      buttonRef.current?.setError("Failed to create zone");
    }
  };

  return (
    <FormProvider {...methods}>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <FormInput
          controlName="name"
          control={control}
          label="Zone Name"
          className="w-full"
          required
        />

        <FormInput
          controlName="description"
          control={control}
          label="Description"
          className="w-full"
        />

        <FormInput
          controlName="cidr"
          control={control}
          label="CIDR (optional, e.g. 10.10.0.0/24 — auto-assigned if empty)"
          className="w-full"
        />

        <Button ref={buttonRef} text="Save Zone" type="submit" />
      </form>
    </FormProvider>
  );
}
