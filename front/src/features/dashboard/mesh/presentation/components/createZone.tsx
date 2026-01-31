"use client";

import "@/dashboard/mesh/meshFactory";

import { Button, ButtonRef } from "@/core/presentation/components/button";
import { useRef } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { MeshService } from "../services/meshService";
import { useAppStore } from "@/libs/stores/app-store";
import { NodeDTO } from "@/libs/types/dto/node-dto";
import { useShallow } from "zustand/shallow";
import { redirect } from "next/navigation";
import FormInput from "@/core/presentation/components/inputs/form/form-input";
import { toast } from "sonner";

export default function CreateNodeForm() {
  const { user, zones } = useAppStore(
    useShallow((state) => ({
      user: state.user,
      zones: state.zones,
    }))
  );

  const buttonRef = useRef<ButtonRef>(null);

  const methods = useForm<any>({
    defaultValues: {
      nodeName: "",
    },
  });

  const { handleSubmit, setError, control } = methods;

  const createNewNode = async (
    name: string,
    description: string
  ): Promise<NodeDTO | null> => {
    console.log("Create New Node");

    try {
      const newNode = await MeshService.instance.createZone(
        user.companyId,
        name,
        description
      );

      console.log("New node created successfully:", newNode);

      newNode.createdAt = new Date(newNode.createdAt);
      return newNode as NodeDTO;
    } catch (error) {
      console.error("Error creating new node:", error);
      return null;
    }
  };

  const onSubmit = async (data: any) => {
    buttonRef.current?.setIsLoading(true);

    const validationErrors = await MeshService.instance.validateZone(data);
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
      redirect(`/dashboard/mesh`);
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
