"use client";

import FormInput from "@/core/presentation/components/inputs/form/form-input";
import FormSelect from "@/core/presentation/components/inputs/form/form-select";
import { useEffect, useRef, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import Button, { ButtonRef } from "@/core/presentation/components/button";
import { LuSave } from "react-icons/lu";
import { IoReloadSharp } from "react-icons/io5";
import { useZone } from "src/features/mesh/models/use-zone";
import { PortalTranspondersList } from "./PortalTranspondersList";
import { redirect } from "next/navigation";
import { CreatePortalDto, PortalWithTranspondersResponseDto } from "../api/portal.api.types";

interface PortalFormProps {
  className?: string;
  portal?: PortalWithTranspondersResponseDto;
  portalTypes: string[];
  onSubmit: (data: CreatePortalDto) => Promise<void>;
}

export function PortalForm({
  className = "space-y-4",
  portal,
  portalTypes,
  onSubmit,
}: PortalFormProps) {
  const {
    zones,
    fetchZones,
  } = useZone();

  const [disableApiKey, setDisableApiKey] = useState(true);

  const buttonRef = useRef<ButtonRef>(null);
  const methods = useForm();

  const { control, handleSubmit, reset } = methods;

  const internalSubmit = async (data: CreatePortalDto) => {
    const form = {
      id: portal?.id,
      name: data.name,
      address: data.address,
      type: data.type,
      apiKey: portal != null && disableApiKey ? undefined : data.apiKey,
      zoneId: data.zoneId,
    };

    buttonRef.current?.setIsLoading(true);
    buttonRef.current?.setProgress(50);

    await onSubmit(form);

    setDisableApiKey(true);

    buttonRef.current?.setProgress(100);
    buttonRef.current?.setIsLoading(false);

    redirect('/dashboard/orbit/portals');
  };

  const resetApiKey = () => {
    setDisableApiKey(false);
    methods.setValue("apiKey", "");
  };

  useEffect(() => {
    if (portal) {
      reset({
        name: portal.name,
        address: portal.address,
        type: portal.type,
        zoneId: portal.zoneId,
      });
    }

    setDisableApiKey(portal != null);
  }, [portal]);

  useEffect(() => {
    fetchZones();
  }, []);

  return (
    <FormProvider {...methods}>
      <form className={className} onSubmit={handleSubmit(internalSubmit)}>
        <FormInput
          controlName="name"
          control={control}
          label="Portal Name"
          required
        />

        <FormInput
          controlName="address"
          control={control}
          label="Address"
          placeholder="your-domain.com"
          required
        />

        <aside className="flex gap-x-2">
          <FormSelect
            className="w-1/4 min-w-48"
            controlName="type"
            control={control}
            label="Configure Dynamic DNS"
            placeholder="Select Provider"
            options={portalTypes.map((tt) => ({
              value: tt,
              displayText: tt[0].toUpperCase() + tt.slice(1).toLowerCase(),
            }))}
            onChangedValue={() => resetApiKey()}
            required
          />

          <FormInput
            className="flex-1 mt-6"
            controlName="apiKey"
            control={control}
            placeholder={disableApiKey ? "" : "API Key"}
            disabled={disableApiKey}
            disabledText="Hidden"
            type={disableApiKey ? "password" : "text"}
            required
          />

          {disableApiKey && (
            <Button
              className="mt-6 h-[42px] aspect-square"
              icon={<IoReloadSharp />}
              type="button"
              onClick={resetApiKey}
              style="secondary"
            />
          )}
        </aside>

        {portal && (
          <>
            <hr className="my-8" />
            <FormSelect
              className="w-1/3"
              label="Zone ID"
              controlName="zoneId"
              control={control}
              placeholder="Select Zone"
              isLoading={zones == null}
              options={zones?.map((zone) => ({
                value: zone.id,
                displayText: `${zone.name} (${zone.id})`,
              }))}
              clearText="None"
            />
            {portal.zoneId && <PortalTranspondersList portal={portal} />}
          </>
        )}

        <Button
          ref={buttonRef}
          className="ml-auto"
          text="Save"
          icon={<LuSave />}
          type="submit"
        />
      </form>
    </FormProvider>
  );
}
