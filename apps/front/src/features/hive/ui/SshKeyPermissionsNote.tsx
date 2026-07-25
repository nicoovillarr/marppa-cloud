"use client";

import { CodeBlock } from "@/core/ui/CodeBlock";

interface SshKeyPermissionsNoteProps {
  fileName: string;
}

export function SshKeyPermissionsNote({ fileName }: SshKeyPermissionsNoteProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm">
        A downloaded file inherits the permissions of the folder it lands in, and
        SSH refuses a private key other accounts can read. Fix them before
        connecting, or the key is ignored and you get{" "}
        <span className="font-semibold">Permission denied (publickey)</span>.
      </p>

      <p className="text-xs font-semibold">Windows (PowerShell)</p>
      <CodeBlock
        code={`icacls "$env:USERPROFILE\\Downloads\\${fileName}" /inheritance:r /grant:r "$($env:USERNAME):(F)"`}
      />

      <p className="text-xs font-semibold">Linux / macOS</p>
      <CodeBlock code={`chmod 600 ~/Downloads/${fileName}`} />
    </div>
  );
}
