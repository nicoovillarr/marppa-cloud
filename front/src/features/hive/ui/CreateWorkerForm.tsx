"use client";


import { Button, ButtonRef } from "@/core/presentation/components/button";
import { useEffect, useRef, useState } from "react";
import { FormProvider, useForm } from "react-hook-form";
import FormInput from "@/core/presentation/components/inputs/form/form-input";
import { toast } from "sonner";
import { ColumnMapping } from "@/libs/types/column-mapping";
import { WorkerMmiDTO } from "@/libs/types/dto/worker-mmi-dto";
import FormTable from "@/core/presentation/components/inputs/form/form-table-select";
import FormRadioCards from "@/core/presentation/components/inputs/form/form-radio-cards";
import { useDialog } from "@/core/presentation/hooks/use-dialog";
import CodeBlock from "@/core/presentation/components/code-block";
import { redirect } from "next/navigation";
import Code from "@/core/presentation/components/code";
import * as forge from "node-forge";
import { useWorker } from "../models/use-worker";
import { useWorkerFlavor } from "../models/use-worker-flavor";
import { useWorkerImage } from "../models/use-worker-image";
import { WorkerFlavorResponseDto } from "../api/worker-flavor.api.types";
import { useWorkerFamily } from "../models/use-worker-family";

export default function CreateWorkerForm() {
  const [flavors, setFlavors] = useState<WorkerFlavorResponseDto[]>([]);

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

  const [columns, setColumns] = useState<ColumnMapping<WorkerMmiDTO>>();

  const buttonRef = useRef<ButtonRef>(null);

  const methods = useForm<any>({
    defaultValues: {
      workerName: "",
      workerMmiId: "",
      workerImageId: "",
      publicSshKey: "",
    },
  });

  const { handleSubmit, setError, setValue, control } = methods;

  useEffect(() => {
    const columns: ColumnMapping<WorkerFlavorResponseDto> = {
      id: {
        label: "#",
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
    };

    setColumns(columns);
    buttonRef.current?.setIsLoading(false);
  }, [families]);

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
      !workerMmiId ||
      isNaN(Number(workerMmiId)) ||
      !flavors.some((mmi) => mmi.id === Number(workerMmiId))
    ) {
      setError("workerMmiId", {
        type: "manual",
        message: "Invalid Instance Type selected",
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

    const { publicSsh, privatePem } = await createSshCredentials(workerName);
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
          redirect(`/dashboard/hive`);
        },
        content: (
          <div className="space-y-4">
            <p>
              <Code code={newWorker.name} /> has been created successfully.
              Please save the SSH credentials:
            </p>
            <CodeBlock code={privatePem} fileName={`${workerName}_id_rsa`} />
          </div>
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
    fetchFamilies().then((families) => {
      setFlavors(families.flatMap((family) => family.flavors));
    });
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

        <FormTable
          controlName="workerMmiId"
          control={control}
          label="Instance Type"
          data={flavors}
          columns={columns}
          getKey={(flavor) => flavor.id}
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

        <Button ref={buttonRef} text="Save Worker" type="submit" />
      </form>
    </FormProvider>
  );
}
