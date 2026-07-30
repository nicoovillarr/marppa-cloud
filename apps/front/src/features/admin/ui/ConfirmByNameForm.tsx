"use client";

import { Button } from "@/core/ui/Button";
import { Input } from "@/core/ui/inputs/Input";
import { useState } from "react";

interface ConfirmByNameFormProps {
  expected: string;
  actionText: string;
  warning: string;
  onConfirm: () => Promise<void>;
}

export function ConfirmByNameForm({
  expected,
  actionText,
  warning,
  onConfirm,
}: ConfirmByNameFormProps) {
  const [typed, setTyped] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">{warning}</p>

      <p className="text-sm">
        Type <span className="font-mono font-semibold">{expected}</span> to
        confirm.
      </p>

      <Input value={typed} onChangedValue={setTyped} placeholder={expected} />

      <Button
        className="ml-auto"
        style="danger"
        text={actionText}
        disabled={typed !== expected}
        onClick={onConfirm}
      />
    </div>
  );
}
