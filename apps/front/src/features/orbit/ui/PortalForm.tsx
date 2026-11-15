"use client";

import { FormInput } from "@/core/ui/inputs/form/FormInput";
import { useEffect, useMemo, useRef } from "react";
import { FormCheckbox } from "@/core/ui/inputs/form/FormCheckbox";
import { FormSelect } from "@/core/ui/inputs/form/FormSelect";
import { useForm, FormProvider, FieldValues } from "react-hook-form";
import { Button, ButtonRef } from "@/core/ui/Button";
import { LuSave } from "react-icons/lu";
import { LuKeyRound } from "react-icons/lu";
import { useZone } from "src/features/mesh/models/use-zone";
import { PortalTranspondersList } from "./PortalTranspondersList";
import { CreatePortalDto, PortalWithTranspondersResponseDto } from "../api/portal.api.types";
import { useDnsApiKey } from "../models/use-dns-api-key";
import { formatPortalType } from "../models/format-portal-type";
import { PortalType } from "../models/portal-type.enum";
import { useDialog } from "@/core/ui/DialogProvider";
import { DnsApiKeyDialog } from "./DnsApiKeyDialog";

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

  const { dnsApiKeys, fetchDnsApiKeys } = useDnsApiKey();
  const { showDialog } = useDialog();

  const buttonRef = useRef<ButtonRef>(null);
  const methods = useForm({
    defaultValues: { corsEnabled: true, enableCompression: true } as FieldValues,
  });

  const { control, handleSubmit, reset, watch, setValue } = methods;

  const selectedType = watch("type") as PortalType | undefined;
  const selectedKeyId = watch("dnsApiKeyId") as number | undefined;

  const keyOptions = useMemo(
    () =>
      (dnsApiKeys ?? [])
        .filter((key) => key.type === selectedType)
        .map((key) => ({ value: key.id, displayText: key.name })),
    [dnsApiKeys, selectedType]
  );

  const internalSubmit = async (data: CreatePortalDto) => {
    const addressChanged = portal == null || data.address !== portal.address;
    const keyChanged = portal == null || data.dnsApiKeyId !== portal.dnsApiKeyId;

    const form = {
      name: data.name,
      description: data.description,
      address: addressChanged ? data.address : undefined,
      type: data.type,
      dnsApiKeyId: keyChanged ? Number(data.dnsApiKeyId) : undefined,
      corsEnabled: data.corsEnabled,
      enableCompression: data.enableCompression,
      zoneId: data.zoneId,
    } as CreatePortalDto;

    buttonRef.current?.setIsLoading(true);
    buttonRef.current?.setProgress(50);

    await onSubmit(form);

    buttonRef.current?.setProgress(100);
    buttonRef.current?.setIsLoading(false);
  };

  const onTypeChanged = () => {
    setValue("dnsApiKeyId", undefined);
  };

  const openNewKeyDialog = () =>
    showDialog({
      title: "Add API key",
      content: (
        <DnsApiKeyDialog
          portalTypes={portalTypes}
          initialType={selectedType}
          onSaved={(key) => setValue("dnsApiKeyId", key.id, { shouldValidate: true })}
        />
      ),
    });

  useEffect(() => {
    if (portal) {
      reset({
        name: portal.name,
        description: portal.description,
        address: portal.address,
        type: portal.type,
        corsEnabled: portal.corsEnabled,
        enableCompression: portal.enableCompression,
        zoneId: portal.zoneId,
        dnsApiKeyId: portal.dnsApiKeyId ?? undefined,
      });
    }
  }, [portal]);

  useEffect(() => {
    fetchZones();
    fetchDnsApiKeys();
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
          controlName="description"
          control={control}
          label="Description"
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
              displayText: formatPortalType(tt),
            }))}
            onChangedValue={onTypeChanged}
            required
          />

          <FormSelect
            key={`${selectedType ?? "none"}-${keyOptions.length}-${selectedKeyId ?? "unset"}`}
            className="flex-1 mt-6"
            controlName="dnsApiKeyId"
            control={control}
            placeholder={
              selectedType == null
                ? "Select a provider first"
                : keyOptions.length === 0
                  ? "No API keys for this provider yet"
                  : "Select API Key"
            }
            isLoading={dnsApiKeys == null}
            disabled={selectedType == null || keyOptions.length === 0}
            options={keyOptions}
            required
          />

          <Button
            className="mt-6 h-[42px]"
            text="New key"
            icon={<LuKeyRound />}
            type="button"
            disabled={selectedType == null}
            onClick={openNewKeyDialog}
            style="secondary"
          />
        </aside>

        <aside className="flex gap-x-8">
          <FormCheckbox
            controlName="corsEnabled"
            control={control}
            label="CORS"
            text="Allow requests from any origin"
          />

          <FormCheckbox
            controlName="enableCompression"
            control={control}
            label="Compression"
            text="Encode responses with gzip and zstd"
          />
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
            {portal.zoneId && <PortalTranspondersList portalId={portal.id} />}
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
