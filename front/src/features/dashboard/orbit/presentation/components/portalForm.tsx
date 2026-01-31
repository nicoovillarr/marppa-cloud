"use client";

import FormInput from "@/core/presentation/components/inputs/form/form-input";
import FormSelect from "@/core/presentation/components/inputs/form/form-select";
import { PortalDTO } from "@/libs/types/dto/portal-dto";
import { useEffect, useRef, useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import OrbitService from "../services/orbitService";
import Button, { ButtonRef } from "@/core/presentation/components/button";
import { LuSave } from "react-icons/lu";
import { IoReloadSharp } from "react-icons/io5";
import { PortalTranspondersList } from "./portalTranspondersList";
import { ZoneDTO } from "@/libs/types/dto/zone-dto";
import { MeshService } from "@/dashboard/mesh/presentation/services/meshService";

interface PortalFormProps {
  className?: string;
  portal?: PortalDTO;
  portalTypes: string[];
  onSubmit: (data: PortalDTO) => Promise<void>;
}

export default function PortalForm({
  className = "space-y-4",
  portal,
  portalTypes,
  onSubmit,
}: PortalFormProps) {
  const [zones, setZones] = useState<ZoneDTO[]>(undefined);
  const [disableApiKey, setDisableApiKey] = useState(true);

  const buttonRef = useRef<ButtonRef>(null);
  const methods = useForm();

  const { control, handleSubmit, setError, reset } = methods;

  const internalSubmit = async (data: PortalDTO) => {
    const form = {
      id: portal?.id,
      name: data.name,
      address: data.address,
      type: data.type,
      apiKey: portal != null && disableApiKey ? undefined : data.apiKey,
      zoneId: data.zoneId,
    };

    buttonRef.current?.setIsLoading(true);
    buttonRef.current?.setProgress(0);

    const validationErrors = await OrbitService.instance.validatePortal(
      form,
      !disableApiKey
    );

    buttonRef.current?.setProgress(70);

    if (Object.keys(validationErrors).length > 0) {
      for (const [field, message] of Object.entries(validationErrors)) {
        setError(field, {
          type: "manual",
          message: message,
        });
      }

      buttonRef.current?.setError(true);
      return;
    }

    await onSubmit(form);

    setDisableApiKey(true);

    buttonRef.current?.setProgress(100);
    buttonRef.current?.setIsLoading(false);
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
    const fetchZones = async () => {
      const zones = await MeshService.instance.getZones();
      setZones(zones || []);

      console.log(zones);
    };

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
