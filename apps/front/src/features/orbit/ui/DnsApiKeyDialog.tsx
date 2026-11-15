"use client";

import { useState } from "react";
import { Button } from "@/core/ui/Button";
import { Input } from "@/core/ui/inputs/Input";
import { Select } from "@/core/ui/inputs/Select";
import { closeCurrentDialog } from "@/core/ui/DialogProvider";
import { PortalType } from "../models/portal-type.enum";
import { DnsApiKeyResponseDto } from "../api/dns-api-key.api.types";
import { useDnsApiKey } from "../models/use-dns-api-key";
import { formatPortalType } from "../models/format-portal-type";

interface DnsApiKeyDialogProps {
  dnsApiKey?: DnsApiKeyResponseDto;
  portalTypes: string[];
  initialType?: PortalType;
  onSaved?: (dnsApiKey: DnsApiKeyResponseDto) => void;
}

export function DnsApiKeyDialog({
  dnsApiKey,
  portalTypes,
  initialType,
  onSaved,
}: DnsApiKeyDialogProps) {
  const { busy, createDnsApiKey, updateDnsApiKey } = useDnsApiKey();

  const isEditing = dnsApiKey != null;

  const [name, setName] = useState(dnsApiKey?.name ?? "");
  const [type, setType] = useState<PortalType | undefined>(
    dnsApiKey?.type ?? initialType ?? (portalTypes[0] as PortalType | undefined),
  );
  const [apiKey, setApiKey] = useState("");

  const trimmedName = name.trim();
  const trimmedApiKey = apiKey.trim();

  const canSubmit = isEditing
    ? !busy &&
      trimmedName.length > 0 &&
      (trimmedName !== dnsApiKey.name || trimmedApiKey.length > 0)
    : !busy && trimmedName.length > 0 && trimmedApiKey.length > 0 && type != null;

  const submit = async () => {
    const saved = isEditing
      ? await updateDnsApiKey(dnsApiKey.id, {
          name: trimmedName !== dnsApiKey.name ? trimmedName : undefined,
          apiKey: trimmedApiKey.length > 0 ? trimmedApiKey : undefined,
        })
      : await createDnsApiKey({ name: trimmedName, type: type!, apiKey: trimmedApiKey });

    if (saved) {
      closeCurrentDialog();
      onSaved?.(saved);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm text-ink-muted">Name</label>
        <Input
          value={name}
          placeholder="e.g. Cloudflare marppa.com"
          onChangedValue={(value) => setName(String(value))}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-ink-muted">Provider</label>
        <Select
          options={portalTypes.map((portalType) => ({
            value: portalType,
            displayText: formatPortalType(portalType),
          }))}
          defaultValue={type}
          disabled={isEditing || initialType != null}
          onChangedValue={(value) => setType(value as PortalType)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm text-ink-muted">
          {isEditing ? "New API token" : "API token"}
        </label>
        <Input
          type="password"
          value={apiKey}
          placeholder={isEditing ? "Leave empty to keep the current token" : "API token"}
          onChangedValue={(value) => setApiKey(String(value))}
        />
        <p className="text-xs text-ink-muted">
          {isEditing && dnsApiKey.portalCount > 0
            ? `The new token is checked against the ${dnsApiKey.portalCount} portal${dnsApiKey.portalCount === 1 ? "" : "s"} using this key, which then re-sync.`
            : "Stored write-only: it is never shown again."}
        </p>
      </div>

      <Button
        text={isEditing ? "Save" : "Add API key"}
        disabled={!canSubmit}
        onClick={submit}
      />
    </div>
  );
}
