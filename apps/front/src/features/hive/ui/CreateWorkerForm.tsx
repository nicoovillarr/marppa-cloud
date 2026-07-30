"use client";

import { Button, ButtonRef } from "@/core/ui/Button";
import { useEffect, useMemo, useRef } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { FormInput } from "@/core/ui/inputs/form/FormInput";
import { toast } from "sonner";
import { FormTable } from "@/core/ui/inputs/form/FormTableSelect";
import { FormRadioCards } from "@/core/ui/inputs/form/FormRadioCards";
import { CodeBlock } from "@/core/ui/CodeBlock";
import { redirect } from "next/navigation";
import { InlineCode } from "@/core/ui/InlineCode";
import { SshKeyPermissionsNote } from "./SshKeyPermissionsNote";
import * as forge from "node-forge";
import { useWorker } from "../models/use-worker";
import { useWorkerImage } from "../models/use-worker-image";
import { WorkerFlavorResponseDto } from "../api/worker-flavor.api.types";
import { useWorkerFamily } from "../models/use-worker-family";
import { useDialog } from "@/core/ui/DialogProvider";
import { ColumnMapping } from "@/core/ui/Table";
import { isValidSshPublicKey } from "@marppa-cloud/shared";


export function CreateWorkerForm() {
  const { showDialog } = useDialog();

  const {
    isLoading: isLoadingWorkers,
    workers,
    fetchWorker,
    fetchWorkers,
    createWorker,
  } = useWorker();

  const {
    isLoading: isLoadingFamilies,
    families,
    fetchFamilies,
  } = useWorkerFamily();

  const {
    isLoading: isLoadingImages,
    images,
    fetchImages,
  } = useWorkerImage();

  const methods = useForm<any>({
    defaultValues: {
      workerName: "",
      workerMmiId: "",
      workerImageId: "",
      publicSshKey: "",
      ownPublicKey: "",
    },
  });

  const { handleSubmit, setError, setValue, control } = methods;

  const selectedImageId = useWatch({ control, name: "workerImageId" });
  const selectedFlavorId = useWatch({ control, name: "workerMmiId" });

  const selectedImage = useMemo(
    () => images.find((image) => Number(image.id) === Number(selectedImageId)),
    [images, selectedImageId]
  );

  const flavors = useMemo(() => {
    if (!selectedImage) {
      return [];
    }

    return families
      .filter((family) => family.architecture === selectedImage.architecture)
      .flatMap((family) => family.flavors);
  }, [families, selectedImage]);

  useEffect(() => {
    if (selectedFlavorId && !flavors.some((flavor) => flavor.id === Number(selectedFlavorId))) {
      setValue("workerMmiId", "");
    }
  }, [flavors, selectedFlavorId, setValue]);

  const columns = useMemo<ColumnMapping<WorkerFlavorResponseDto>>(() => ({
    id: {
      label: "Instance type",
      width: "100%",
      minWidth: "200px",
      renderFn: (flavor: WorkerFlavorResponseDto) => {
        const family = families.find(f => f.id === flavor.familyId);
        if (!family) {
          return "N/A";
        }

        return `${family?.name}.${flavor.name}`;
      },
    },
    familyId: {
      label: "Best for",
      minWidth: "260px",
      renderFn: (flavor: WorkerFlavorResponseDto) =>
        families.find((family) => family.id === flavor.familyId)?.description ?? "",
    },
    cpuCores: {
      label: "vCPU Cores",
      minWidth: "150px",
    },
    ramMB: {
      label: "RAM (MB)",
      minWidth: "150px",
    },
    diskGB: {
      label: "Disk (GB)",
      minWidth: "150px",
    },
  }), [families]);

  const buttonRef = useRef<ButtonRef>(null);

  const onSubmit = async (data: any) => {
    console.log("Form submitted with data:", data);
    buttonRef.current?.setIsLoading(true);
    buttonRef.current?.setProgress(0);

    const { workerName, workerMmiId, workerImageId } = data;

    if (!workerName) {
      setError("workerName", {
        type: "manual",
        message: "Worker name is required",
      });
      await buttonRef.current?.setIsLoading(false);
      return;
    }

    if (workers.some((worker) => worker.name === workerName)) {
      setError("workerName", {
        type: "manual",
        message: "Worker name already exists",
      });
      await buttonRef.current?.setIsLoading(false);
      return;
    }

    if (
      !workerImageId ||
      isNaN(Number(workerImageId)) ||
      !images.some((img) => Number(img.id) === Number(workerImageId))
    ) {
      setError("workerImageId", {
        type: "manual",
        message: "Invalid Worker Image selected",
      });
      await buttonRef.current?.setIsLoading(false);
      return;
    }

    if (
      !workerMmiId ||
      isNaN(Number(workerMmiId)) ||
      !flavors.some((mmi) => mmi.id === Number(workerMmiId))
    ) {
      setError("workerMmiId", {
        type: "manual",
        message: `Pick an instance type available for ${selectedImage?.architecture} images`,
      });
      await buttonRef.current?.setIsLoading(false);
      return;
    }

    const ownPublicKey = (data.ownPublicKey ?? "").trim();

    if (ownPublicKey && !isValidSshPublicKey(ownPublicKey)) {
      setError("ownPublicKey", {
        type: "manual",
        message:
          "Not an OpenSSH public key. It should start with ssh-ed25519, ssh-rsa or ecdsa-sha2-…",
      });
      await buttonRef.current?.setIsLoading(false);
      return;
    }

    const { publicSsh, privatePem } = ownPublicKey
      ? { publicSsh: ownPublicKey, privatePem: null }
      : await createSshCredentials(workerName);

    setValue("publicSshKey", publicSsh);

    buttonRef.current?.setProgress(50);

    const newWorker = await createWorker(
      workerName,
      workerImageId,
      workerMmiId,
      publicSsh
    );

    if (newWorker) {
      await buttonRef.current?.setIsLoading(false);
      showDialog({
        title: "Worker Created",
        onClose: async () => {
          await fetchWorker(newWorker.id);
          redirect(`/dashboard/hive/workers`);
        },
        content: privatePem ? (
          <div className="space-y-4">
            <p>
              <InlineCode code={newWorker.name} /> has been created successfully.
              Please save the SSH credentials:
            </p>
            <CodeBlock code={privatePem} fileName={`${workerName}_id_rsa`} />
            <SshKeyPermissionsNote fileName={`${workerName}_id_rsa`} />
          </div>
        ) : (
          <p>
            <InlineCode code={newWorker.name} /> has been created successfully.
            It accepts the public key you provided, so there are no credentials
            to save here.
          </p>
        ),
      });
    } else {
      toast.error("Failed to create worker");
      buttonRef.current?.setError("Failed to create worker");
    }
  };

  const createSshCredentials = async (workerName: string) => {
    const { pki, util } = forge;

    const keypair = pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });

    const privatePem = pki.privateKeyToPem(keypair.privateKey);

    const sshPublic = forge.ssh.publicKeyToOpenSSH(
      keypair.publicKey,
      `ubuntu@${workerName}`
    );

    return { publicSsh: sshPublic, privatePem };
  };

  useEffect(() => {
    fetchWorkers();
    fetchFamilies();
    fetchImages();
  }, []);

  return (
    <FormProvider {...methods}>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <FormInput
          controlName="workerName"
          control={control}
          label="Worker Name"
          className="w-full"
          required
        />

        <FormRadioCards
          controlName="workerImageId"
          control={control}
          label="Worker Image"
          options={images?.map((img) => ({
            value: img.id,
            title: img.name,
            subtitle: img.architecture,
          }))}
          required
        />

        {selectedImage ? (
          <FormTable
            controlName="workerMmiId"
            control={control}
            label="Instance Type"
            data={flavors}
            columns={columns}
            getKey={(flavor) => flavor.id}
            required
          />
        ) : (
          <p className="text-sm text-ink-muted">
            Pick a worker image first: instance types are filtered by the
            architecture the image runs on.
          </p>
        )}

        {selectedImage && flavors.length === 0 && (
          <p className="text-sm text-ink-muted">
            No instance type available for {selectedImage.architecture} images.
          </p>
        )}

        <FormInput
          controlName="ownPublicKey"
          control={control}
          label="Your SSH public key (optional)"
          placeholder="ssh-ed25519 AAAAC3... you@laptop"
          className="w-full"
        />

        <p className="text-xs text-ink-muted -mt-2">
          Leave it empty and a key pair is generated in your browser; you get the
          private key once, and have to fix its file permissions before using it.
          Paste your own public key instead and there is nothing to download.
        </p>

        <Button ref={buttonRef} text="Save Worker" type="submit" />
      </form>
    </FormProvider>
  );
}
