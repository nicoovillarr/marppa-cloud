"use client";

import { Button, ButtonRef } from "@/core/ui/Button";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { FormInput } from "@/core/ui/inputs/form/FormInput";
import { FormRadioCards } from "@/core/ui/inputs/form/FormRadioCards";
import { InlineCode } from "@/core/ui/InlineCode";
import { useDialog } from "@/core/ui/DialogProvider";
import { toast } from "sonner";
import { redirect } from "next/navigation";
import { LuTrash2 } from "react-icons/lu";
import { useAtom } from "../models/use-atom";
import { useAtomImage } from "../models/use-atom-image";
import { CreateAtomEnvVarDto } from "../api/atom.api.types";

const ATOM_NAME = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
const ENV_KEY = /^[A-Za-z_][A-Za-z0-9_]*$/;

export function CreateAtomForm() {
  const [envVars, setEnvVars] = useState<CreateAtomEnvVarDto[]>([]);
  const [envKey, setEnvKey] = useState("");
  const [envValue, setEnvValue] = useState("");
  const [requiredValues, setRequiredValues] = useState<Record<string, string>>({});

  const { showDialog } = useDialog();

  const { atoms, fetchAtom, fetchAtoms, createAtom } = useAtom();
  const { images, fetchImages } = useAtomImage();

  const buttonRef = useRef<ButtonRef>(null);

  const methods = useForm<any>({
    defaultValues: {
      atomName: "",
      atomImageId: "",
    },
  });

  const { handleSubmit, setError, control, watch } = methods;

  const atomImageId = watch("atomImageId");
  const selectedImage = images.find((img) => String(img.id) === String(atomImageId));
  const requiredKeys = selectedImage?.requiredEnvVars ?? [];

  useEffect(() => {
    setRequiredValues((prev) =>
      Object.fromEntries(requiredKeys.map((key) => [key, prev[key] ?? ""])),
    );
  }, [selectedImage?.id]);

  const addEnvVar = () => {
    const key = envKey.trim();

    if (!ENV_KEY.test(key)) {
      toast.error("The name must look like POSTGRES_PASSWORD");
      return;
    }

    if (requiredKeys.includes(key)) {
      toast.error(`${key} is required by this image — set it above`);
      return;
    }

    setEnvVars([...envVars.filter((v) => v.key !== key), { key, value: envValue }]);
    setEnvKey("");
    setEnvValue("");
  };

  const onSubmit = async (data: any) => {
    buttonRef.current?.setIsLoading(true);

    const { atomName, atomImageId } = data;

    if (!ATOM_NAME.test(atomName ?? "")) {
      setError("atomName", {
        type: "manual",
        message:
          "Lowercase letters, digits and '-' only — it becomes the container's DNS name inside the zone",
      });
      await buttonRef.current?.setIsLoading(false);
      return;
    }

    if (atoms.some((atom) => atom.name === atomName)) {
      setError("atomName", {
        type: "manual",
        message: "Atom name already exists",
      });
      await buttonRef.current?.setIsLoading(false);
      return;
    }

    if (
      !atomImageId ||
      isNaN(Number(atomImageId)) ||
      !images.some((img) => Number(img.id) === Number(atomImageId))
    ) {
      setError("atomImageId", {
        type: "manual",
        message: "Invalid image selected",
      });
      await buttonRef.current?.setIsLoading(false);
      return;
    }

    const missingRequired = requiredKeys.filter((key) => !requiredValues[key]?.trim());
    if (missingRequired.length > 0) {
      toast.error(`Set a value for: ${missingRequired.join(", ")}`);
      await buttonRef.current?.setIsLoading(false);
      return;
    }

    const allEnvVars = [
      ...requiredKeys.map((key) => ({ key, value: requiredValues[key] })),
      ...envVars,
    ];

    const newAtom = await createAtom(atomName, Number(atomImageId), allEnvVars);

    await buttonRef.current?.setIsLoading(false);

    if (newAtom) {
      showDialog({
        title: "Atom Created",
        onClose: async () => {
          await fetchAtom(newAtom.id);
          redirect(`/dashboard/nucleus/atoms`);
        },
        content: (
          <div className="space-y-2">
            <p>
              <InlineCode code={newAtom.name} /> has been created and its image
              is being pulled.
            </p>
            <p className="text-sm text-ink-muted">
              Before it can start it needs an address: assign it to a zone from
              Mesh → the zone's Nodes list. Ports are published with fibers on
              that node, never by the container itself.
            </p>
          </div>
        ),
      });
    } else {
      toast.error("Failed to create atom");
      buttonRef.current?.setError("Failed to create atom");
    }
  };

  useEffect(() => {
    fetchAtoms();
    fetchImages();
  }, []);

  return (
    <FormProvider {...methods}>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <FormInput
          controlName="atomName"
          control={control}
          label="Atom Name"
          placeholder="my-redis"
          className="w-full"
          required
        />

        <FormRadioCards
          controlName="atomImageId"
          control={control}
          label="Image"
          options={images?.map((img) => ({
            value: img.id,
            title: img.name,
            subtitle: `${img.registry}/${img.repository}:${img.tag}`,
          }))}
          required
        />

        <p className="text-xs text-ink-muted -mt-2">
          Only approved images are listed. Adding one is a change to the catalog
          in the repo, not something you can do from here.
        </p>

        {requiredKeys.length > 0 && (
          <section className="space-y-2">
            <h3 className="font-semibold text-sm">
              Required by <InlineCode code={selectedImage!.name} />
            </h3>

            {requiredKeys.map((key) => (
              <div key={key} className="flex gap-2 items-center">
                <span className="flex-1 text-sm font-mono truncate">{key}</span>
                <input
                  className="flex-1 text-sm border border-border dark: rounded px-2 py-1 bg-transparent font-mono"
                  placeholder="value"
                  value={requiredValues[key] ?? ""}
                  onChange={(event) =>
                    setRequiredValues({ ...requiredValues, [key]: event.target.value })
                  }
                />
              </div>
            ))}
          </section>
        )}

        <section className="space-y-2">
          <h3 className="font-semibold text-sm">Environment variables</h3>

          {envVars.length > 0 && (
            <ul className="space-y-1">
              {envVars.map((envVar) => (
                <li
                  key={envVar.key}
                  className="flex items-center justify-between gap-2 text-sm border border-border dark: rounded px-2 py-1"
                >
                  <span className="font-mono truncate">
                    {envVar.key}={envVar.value}
                  </span>
                  <Button
                    type="button"
                    icon={<LuTrash2 />}
                    style="danger"
                    onClick={() =>
                      setEnvVars(envVars.filter((v) => v.key !== envVar.key))
                    }
                  />
                </li>
              ))}
            </ul>
          )}

          <div className="flex gap-2">
            <input
              className="flex-1 text-sm border border-border dark: rounded px-2 py-1 bg-transparent font-mono"
              placeholder="POSTGRES_PASSWORD"
              value={envKey}
              onChange={(event) => setEnvKey(event.target.value)}
            />
            <input
              className="flex-1 text-sm border border-border dark: rounded px-2 py-1 bg-transparent font-mono"
              placeholder="value"
              value={envValue}
              onChange={(event) => setEnvValue(event.target.value)}
            />
            <Button
              type="button"
              text="Add"
              style="secondary"
              disabled={!envKey.trim() || !envValue}
              onClick={addEnvVar}
            />
          </div>

          <p className="text-xs text-ink-muted">
            You can also add or change these later, while the atom is stopped.
          </p>
        </section>

        <Button ref={buttonRef} text="Save Atom" type="submit" />
      </form>
    </FormProvider>
  );
}
