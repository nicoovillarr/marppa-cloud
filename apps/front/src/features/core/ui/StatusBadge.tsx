import { ResourceStatus } from "@/core/models/resource-status.enum";

type StatusBucket = "active" | "progress" | "danger" | "idle";

const BUCKET_BY_STATUS: Record<ResourceStatus, StatusBucket> = {
  [ResourceStatus.ACTIVE]: "active",
  [ResourceStatus.PROVISIONING]: "progress",
  [ResourceStatus.QUEUED]: "progress",
  [ResourceStatus.UPDATING]: "progress",
  [ResourceStatus.TERMINATING]: "progress",
  [ResourceStatus.DELETING]: "progress",
  [ResourceStatus.FAILED]: "danger",
  [ResourceStatus.INACTIVE]: "idle",
  [ResourceStatus.TERMINATED]: "idle",
  [ResourceStatus.DELETED]: "idle",
};

const LABEL_BY_STATUS: Record<ResourceStatus, string> = {
  [ResourceStatus.ACTIVE]: "Active",
  [ResourceStatus.PROVISIONING]: "Provisioning",
  [ResourceStatus.QUEUED]: "Queued",
  [ResourceStatus.UPDATING]: "Updating",
  [ResourceStatus.TERMINATING]: "Terminating",
  [ResourceStatus.DELETING]: "Deleting",
  [ResourceStatus.FAILED]: "Failed",
  [ResourceStatus.INACTIVE]: "Inactive",
  [ResourceStatus.TERMINATED]: "Terminated",
  [ResourceStatus.DELETED]: "Deleted",
};

const BUCKET_CLASSES: Record<StatusBucket, string> = {
  active: "bg-status-active-tint text-status-active",
  progress: "bg-status-progress-tint text-status-progress",
  danger: "bg-status-danger-tint text-status-danger",
  idle: "bg-status-idle-tint text-status-idle",
};

const DOT_CLASSES: Record<StatusBucket, string> = {
  active: "bg-status-active",
  progress: "bg-status-progress animate-pulse motion-reduce:animate-none",
  danger: "bg-status-danger",
  idle: "bg-status-idle",
};

export function StatusBadge({ status }: { status: ResourceStatus }) {
  const bucket = BUCKET_BY_STATUS[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs uppercase tracking-wide ${BUCKET_CLASSES[bucket]}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASSES[bucket]}`} />
      {LABEL_BY_STATUS[status]}
    </span>
  );
}
