import { EventTypeKey, ResourceStatus } from './enums';

/**
 * Canonical state transition for an infra command event.
 *
 * Convention (single rule for every dispatched infra event):
 *  - `entry`: the backend sets the primary resource to this status *before*
 *    dispatch; the processor validates it as its precondition.
 *  - `work`:  the processor moves the resource here while doing the work.
 *  - `ok`:    terminal status on success.
 *  - `fail`:  terminal status on definitive failure (after retries are exhausted;
 *             on a retryable failure the processor re-sets `entry`).
 *
 * This map is the single source of truth consumed by BOTH the backend dispatch
 * path and the cloud-scripts processors, so the two can never desync again.
 */
export interface EventStateTransition {
  entry: ResourceStatus;
  work: ResourceStatus;
  ok: ResourceStatus;
  fail: ResourceStatus;
}

const {
  QUEUED,
  PROVISIONING,
  UPDATING,
  ACTIVE,
  INACTIVE,
  FAILED,
  TERMINATING,
  TERMINATED,
  DELETING,
  DELETED,
} = ResourceStatus;

/**
 * Rows marked "verified" match the happy-path processors end-to-end
 * (Zone→Worker→Assign→Start→Fiber). The remaining rows follow the naming
 * convention and MUST be confirmed against their processor when that transition
 * is wired to this map (see the "audit other transitions" gap).
 */
export const EVENT_STATE_MACHINE: Partial<
  Record<EventTypeKey, EventStateTransition>
> = {
  // --- happy path (verified) ---
  [EventTypeKey.ZONE_CREATE]: { entry: QUEUED, work: PROVISIONING, ok: ACTIVE, fail: FAILED },
  [EventTypeKey.WORKER_CREATE]: { entry: QUEUED, work: PROVISIONING, ok: INACTIVE, fail: FAILED },
  [EventTypeKey.WORKER_START]: { entry: QUEUED, work: PROVISIONING, ok: ACTIVE, fail: FAILED },
  [EventTypeKey.NODE_ASSIGN_WORKER]: { entry: QUEUED, work: PROVISIONING, ok: ACTIVE, fail: FAILED },
  [EventTypeKey.NODE_CREATE_FIBER]: { entry: QUEUED, work: PROVISIONING, ok: ACTIVE, fail: FAILED },
  // Terminate ends at INACTIVE (not TERMINATED) so the worker can be started
  // again or deleted — both of those transitions require INACTIVE.
  [EventTypeKey.WORKER_TERMINATE]: { entry: QUEUED, work: TERMINATING, ok: INACTIVE, fail: FAILED },
  [EventTypeKey.ZONE_DELETE]: { entry: QUEUED, work: DELETING, ok: DELETED, fail: FAILED },
  [EventTypeKey.NODE_DELETE_FIBER]: { entry: QUEUED, work: DELETING, ok: DELETED, fail: FAILED },

  // --- power on/off (reversible; the DB row survives) ---
  // "start" rebuilds host config from the row; "stop" tears it down but keeps
  // the row at INACTIVE so it can be started again. Guards in the backend block
  // stopping/deleting a parent that still has live children (fiber→node→zone).
  [EventTypeKey.ZONE_START]: { entry: QUEUED, work: PROVISIONING, ok: ACTIVE, fail: FAILED },
  [EventTypeKey.ZONE_STOP]: { entry: QUEUED, work: TERMINATING, ok: INACTIVE, fail: FAILED },
  [EventTypeKey.NODE_START]: { entry: QUEUED, work: PROVISIONING, ok: ACTIVE, fail: FAILED },
  [EventTypeKey.NODE_STOP]: { entry: QUEUED, work: TERMINATING, ok: INACTIVE, fail: FAILED },
  [EventTypeKey.NODE_START_FIBER]: { entry: QUEUED, work: PROVISIONING, ok: ACTIVE, fail: FAILED },
  [EventTypeKey.NODE_STOP_FIBER]: { entry: QUEUED, work: TERMINATING, ok: INACTIVE, fail: FAILED },
  // Unassign starts from the node's live ACTIVE state (the backend does not
  // pre-set a status before dispatch for this transition).
  [EventTypeKey.NODE_UNASSIGN_WORKER]: { entry: ACTIVE, work: TERMINATING, ok: INACTIVE, fail: FAILED },

  // --- orbit (verified) ---
  [EventTypeKey.PORTAL_CREATE]: { entry: QUEUED, work: PROVISIONING, ok: ACTIVE, fail: FAILED },
  [EventTypeKey.PORTAL_UPDATE]: { entry: QUEUED, work: UPDATING, ok: ACTIVE, fail: FAILED },
  [EventTypeKey.PORTAL_DELETE]: { entry: QUEUED, work: DELETING, ok: DELETED, fail: FAILED },
  [EventTypeKey.TRANSPONDER_CREATE]: { entry: QUEUED, work: PROVISIONING, ok: ACTIVE, fail: FAILED },
  [EventTypeKey.TRANSPONDER_UPDATE]: { entry: QUEUED, work: UPDATING, ok: ACTIVE, fail: FAILED },
  [EventTypeKey.TRANSPONDER_DELETE]: { entry: QUEUED, work: DELETING, ok: DELETED, fail: FAILED },

  // --- pending per-processor verification (convention defaults) ---
  [EventTypeKey.WORKER_UPDATE]: { entry: QUEUED, work: UPDATING, ok: ACTIVE, fail: FAILED },
  [EventTypeKey.WORKER_DELETE]: { entry: QUEUED, work: DELETING, ok: DELETED, fail: FAILED },
  [EventTypeKey.NODE_UPDATE_FIBER]: { entry: QUEUED, work: UPDATING, ok: ACTIVE, fail: FAILED },
};

/** Returns the canonical transition for a command event, or throws if none is defined. */
export function getEventStateTransition(type: EventTypeKey): EventStateTransition {
  const transition = EVENT_STATE_MACHINE[type];
  if (!transition) {
    throw new Error(`No state machine transition defined for event type: ${type}`);
  }
  return transition;
}
