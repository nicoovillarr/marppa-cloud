"use client";

import { Button, ButtonRef } from "@/core/ui/Button";
import { useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { redirect } from "next/navigation";
import { FormInput } from "@/core/ui/inputs/form/FormInput";
import { toast } from "sonner";
import { useZone } from "../models/use-zone";
import { ZoneWithNodes } from "../api/zone.api.types";

export function ZoneCreateForm() {
  const {
    validateZone,
    createZone,
  } = useZone();

  const buttonRef = useRef<ButtonRef>(null);

  const methods = useForm<any>({
    defaultValues: {
      nodeName: "",
    },
  });

  const { handleSubmit, setError, control } = methods;

  const createNewNode = async (
    name: string,
    description?: string
  ): Promise<ZoneWithNodes | null> => {
    console.log("Create New Node");

    try {
      const newNode = await createZone(
        name,
        description
      );
      return newNode;
    } catch (error) {
      console.error("Error creating new node:", error);
      return null;
    }
  };

  const onSubmit = async (data: any) => {
    buttonRef.current?.setIsLoading(true);

    const validationErrors = await validateZone(data);
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
    const newNode = await createNewNode(name, description);

    if (newNode) {
      await buttonRef.current?.setIsLoading(false);
      redirect(`/dashboard/mesh/zones`);
    } else {
      toast.error("Failed to create node");
      buttonRef.current?.setError("Failed to create node");
    }
  };

  return (
    <FormProvider {...methods}>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <FormInput
          controlName="name"
          control={control}
          label="Node Name"
          className="w-full"
          required
        />

        <FormInput
          controlName="description"
          control={control}
          label="Description"
          className="w-full"
        />

        <Button ref={buttonRef} text="Save Node" type="submit" />
      </form>
    </FormProvider>
  );
}
