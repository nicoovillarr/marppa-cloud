"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/core/ui/Button";
import { Select } from "@/core/ui/inputs/Select";
import { closeCurrentDialog } from "@/core/ui/DialogProvider";
import { useFiber } from "../models/use-fiber";

export function FiberCreateDialog({
  zoneId,
  nodeId,
  onCreated,
}: {
  zoneId: string;
  nodeId: string;
  onCreated?: () => void;
}) {
  const [protocol, setProtocol] = useState<string>("tcp");
  const [targetPort, setTargetPort] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { createFiber } = useFiber();

  const onCreate = async () => {
    const port = Number(targetPort);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      toast.error("Target port must be a number between 1 and 65535");
      return;
    }

    setIsSubmitting(true);
    const fiber = await createFiber(zoneId, nodeId, { protocol, targetPort: port });
    setIsSubmitting(false);

    if (fiber) {
      toast.success("Fiber creation queued");
      closeCurrentDialog();
      onCreated?.();
    } else {
      toast.error("Failed to create fiber");
    }
  };

  return (
    <div className="space-y-4 min-w-80">
      <p className="text-sm text-ink-muted">
        Expose a port of this node to the outside through the host
        (port-forward). The host port is picked automatically.
      </p>

      <Select
        options={[
          { value: "tcp", displayText: "TCP" },
          { value: "udp", displayText: "UDP" },
        ]}
        defaultValue="tcp"
        onChangedValue={(value: any) => setProtocol(value)}
      />

      <input
        type="number"
        min={1}
        max={65535}
        placeholder="Target port (e.g. 22, 80)"
        value={targetPort}
        onChange={(e) => setTargetPort(e.target.value)}
        className="w-full border border-border rounded-md px-3 py-2 text-sm"
      />

      <div className="flex justify-end">
        <Button
          type="button"
          text={isSubmitting ? "Creating..." : "Create Fiber"}
          onClick={onCreate}
        />
      </div>
    </div>
  );
}
