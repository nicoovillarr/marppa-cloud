# MVP — Execution checklist (Release 0.1 + 0.2)

> Tasks ordered by dependency within each epic: foundational ones first.

---

# Epic: Mesh

## [ ] Decide the Mesh model as equivalent to a subnet (Zone)

**Description**

Fix that a Mesh == a Zone (a `cidr` + `gateway`) and record the decision.

**Status**

- [x] Pending
- [ ] Done

## [ ] Align the Mesh vocabulary in the shared types

**Description**

Update `api-types` to use the Mesh name consistently.

**Status**

- [x] Pending
- [ ] Done

## [ ] Align the Mesh vocabulary in the API routes

**Description**

Expose network operations under the Mesh name (or an alias over Zone).

**Status**

- [x] Pending
- [ ] Done

## [ ] Align the Mesh vocabulary in the UI

**Description**

Rename labels, navigation and breadcrumbs from Zone to Mesh.

**Status**

- [x] Pending
- [ ] Done

## [ ] Show CIDR and gateway in the Mesh detail view

**Description**

Add the basic network data to the detail view.

**Status**

- [x] Pending
- [ ] Done

## [ ] Show the DHCP range in the Mesh detail view

**Description**

Show the range of addresses the network hands out.

**Status**

- [x] Pending
- [ ] Done

## [ ] List IPs taken by Nodes in the Mesh detail view

**Description**

Show which IPs in the range are assigned and to which Worker.

**Status**

- [x] Pending
- [ ] Done

## [ ] Visually indicate free vs. taken IPs

**Description**

Distinguish available from used addresses at a glance.

**Status**

- [x] Pending
- [ ] Done

---

# Epic: Workers

## [ ] Create the Worker in QUEUED state

**Description**

Change the initial creation state from `PROVISIONING` to `QUEUED`.

**Status**

- [x] Pending
- [ ] Done

## [ ] Verify the PROVISIONING → INACTIVE transition in the processor

**Description**

Confirm the processor picks up the Worker in `QUEUED` and completes the flow.

**Status**

- [x] Pending
- [ ] Done

## [ ] Add a Worker-creation integration test with StubHiveService

**Description**

Cover the full creation flow without depending on a real host.

**Status**

- [x] Pending
- [ ] Done

## [ ] Replace the seed image with a valid qcow2 cloud image

**Description**

Change the default image URL to a cloud image compatible with `virt-install --import`.

**Status**

- [x] Pending
- [ ] Done

## [ ] Fix the seed image record's name, version and type

**Description**

Make the image metadata consistent with the real cloud image.

**Status**

- [x] Pending
- [ ] Done

## [ ] Verify a VM boots with the new image

**Description**

Test end-to-end that a created Worker boots correctly.

**Status**

- [x] Pending
- [ ] Done

## [ ] Generate and deliver SSH credentials on Worker creation

**Description**

Confirm the private key is shown once with a save warning.

**Status**

- [x] Pending
- [ ] Done

## [ ] Show the failure reason in the Worker detail view

**Description**

Expose the last failure event's reason when the Worker ends up in `FAILED`.

**Status**

- [x] Pending
- [ ] Done

---

# Epic: Nodes (connecting Worker ↔ Mesh)

## [ ] Inject EventDispatchService into NodeApiService

**Description**

Enable event dispatch from Node creation.

**Status**

- [x] Pending
- [ ] Done

## [ ] Persist the Node in QUEUED state on creation

**Description**

Change the Node's initial state from `ACTIVE` to `QUEUED`.

**Status**

- [x] Pending
- [ ] Done

## [ ] Dispatch the NODE_ASSIGN_WORKER event on Node creation

**Description**

Queue the network provisioning when a Worker is assigned to a Mesh.

**Status**

- [x] Pending
- [ ] Done

## [ ] Reflect the Node's QUEUED → PROVISIONING → ACTIVE transitions

**Description**

Update the Node's state as processing progresses.

**Status**

- [x] Pending
- [ ] Done

## [ ] Emit NODE_ASSIGN_WORKER_FAILED and mark FAILED on error

**Description**

Communicate an assignment failure with the corresponding state and event.

**Status**

- [x] Pending
- [ ] Done

## [ ] Verify the DHCP reservation and attached NIC after assignment

**Description**

Confirm the `dhcp-host` reservation appears and the interface is connected to the
bridge.

**Status**

- [x] Pending
- [ ] Done

## [ ] Dispatch NODE_UNASSIGN_WORKER on Node deletion

**Description**

Queue the network rollback on unassignment.

**Status**

- [x] Pending
- [ ] Done

## [ ] Verify the DHCP rollback and NIC disconnection

**Description**

Confirm the reservation is removed and the interface disconnected.

**Status**

- [x] Pending
- [ ] Done

## [ ] Validate that an already-assigned Worker can't be reassigned

**Description**

Reject the assignment if the Worker already has a Node.

**Status**

- [x] Pending
- [ ] Done

## [ ] Validate that the assigned IP is within the Mesh's range

**Description**

Prevent assignments outside the network's DHCP range.

**Status**

- [x] Pending
- [ ] Done

## [ ] Return clear errors on invalid assignments

**Description**

Respond with `409/400` and understandable messages in invalid cases.

**Status**

- [x] Pending
- [ ] Done

## [ ] Add Node assignment/unassignment tests

**Description**

Cover the happy and invalid paths of the Node flow.

**Status**

- [x] Pending
- [ ] Done

## [ ] Add the "Assign Worker" button to the Mesh detail view

**Description**

Entry point for assignment from the network side.

**Status**

- [x] Pending
- [ ] Done

## [ ] Create the unassigned-Workers picker

**Description**

List the Workers available to assign to the Mesh.

**Status**

- [x] Pending
- [ ] Done

## [ ] Call the Node creation endpoint from the assignment UI

**Description**

Wire the picker to the Node creation endpoint.

**Status**

- [x] Pending
- [ ] Done

## [ ] Refresh the Node list after assignment

**Description**

Refresh the Node table once assignment completes.

**Status**

- [x] Pending
- [ ] Done

## [ ] Show the IP assigned to the Worker

**Description**

Expose the address resulting from the assignment.

**Status**

- [x] Pending
- [ ] Done

## [ ] Show the assignment's live status

**Description**

Reflect assignment progress via WebSocket without refreshing.

**Status**

- [x] Pending
- [ ] Done

## [ ] Show the error if assignment fails

**Description**

Clearly indicate the assignment failure in the UI.

**Status**

- [x] Pending
- [ ] Done

## [ ] Add the "Unassign" action with confirmation

**Description**

Allow reverting the Worker ↔ Mesh relation from the Node list.

**Status**

- [x] Pending
- [ ] Done

## [ ] Refresh the Node list after unassignment

**Description**

Refresh the table once unassignment completes.

**Status**

- [x] Pending
- [ ] Done

---

# Epic: Operations UX

## [ ] Expose each resource's in-progress operation to the front end

**Description**

Make the current operation's status queryable from the resource.

**Status**

- [x] Pending
- [ ] Done

## [ ] Show the in-progress operation in each resource's detail view

**Description**

Reflect that an action is in progress when opening the resource.

**Status**

- [x] Pending
- [ ] Done

## [ ] Update the operation's status live without refreshing

**Description**

Push status changes over WebSocket as the operation progresses.

**Status**

- [x] Pending
- [ ] Done

## [ ] Show the operation's final Completed or Failed status

**Description**

Close the operation with an unambiguous result.

**Status**

- [x] Pending
- [ ] Done

## [ ] Define the Worker step vocabulary

**Description**

List the steps with human-readable labels (download image, create disk,
cloud-init, etc.).

**Status**

- [x] Pending
- [ ] Done

## [ ] Define the Mesh step vocabulary

**Description**

List the network creation steps (bridge, DHCP, firewall).

**Status**

- [x] Pending
- [ ] Done

## [ ] Define the Node step vocabulary

**Description**

List the assignment steps (reserve IP, connect NIC, verify connectivity).

**Status**

- [x] Pending
- [ ] Done

## [ ] Show the current step with its human-readable label

**Description**

Reflect the concrete in-progress step in the UI, not a generic "processing".

**Status**

- [x] Pending
- [ ] Done

## [ ] Style the FAILED status with a distinctive color and icon

**Description**

Make a failure clearly stand out.

**Status**

- [x] Pending
- [ ] Done

## [ ] Show a one-line summary of the failure reason

**Description**

Accompany the failed status with a summarized cause.

**Status**

- [x] Pending
- [ ] Done

## [ ] Create the status visual guide

**Description**

Define colors, icons and labels per resource status.

**Status**

- [x] Pending
- [ ] Done

## [ ] Apply the status visual guide across all lists and resources

**Description**

Use the same visual language for Workers, Meshes, Nodes and Fibers.

**Status**

- [x] Pending
- [ ] Done

## [ ] Reflect live status changes in lists

**Description**

Update resource tables without needing to refresh.

**Status**

- [x] Pending
- [ ] Done

## [ ] Create the vertical operation timeline component

**Description**

Show an operation's steps on a timeline.

**Status**

- [x] Pending
- [ ] Done

## [ ] Mark done, current, pending and failed steps on the timeline

**Description**

Visually distinguish each step's status.

**Status**

- [x] Pending
- [ ] Done

## [ ] Open the timeline from the resource and from the feed

**Description**

Allow reaching the operation detail from both places.

**Status**

- [x] Pending
- [ ] Done

## [ ] Add a progress bar derived from completed steps

**Description**

Communicate how much is left based on completed vs. total steps.

**Status**

- [x] Pending
- [ ] Done

## [ ] Show the step where it failed and the cause in human language

**Description**

Indicate the exact failure point and an understandable reason.

**Status**

- [x] Pending
- [ ] Done

## [ ] Show an action suggestion on error

**Description**

Guide the user on what they can do to resolve it.

**Status**

- [x] Pending
- [ ] Done

## [ ] Add a Retry button on failed operations

**Description**

Allow relaunching a retryable failed operation.

**Status**

- [x] Pending
- [ ] Done

## [ ] Relaunch the operation and revive the timeline on retry

**Description**

Bring the operation back to "In progress" and continue the steps.

**Status**

- [x] Pending
- [ ] Done

## [ ] Add an Abort button with confirmation

**Description**

Allow cancelling an in-progress operation.

**Status**

- [x] Pending
- [ ] Done

## [ ] Leave the resource in a consistent state after aborting

**Description**

Guarantee the resource doesn't end up in an ambiguous state.

**Status**

- [x] Pending
- [ ] Done

## [ ] Add the "Activity" tab with per-resource history

**Description**

Chronologically list a resource's past operations.

**Status**

- [x] Pending
- [ ] Done

## [ ] Create the global "Activity" view

**Description**

Show in-progress and recent operations across all infrastructure.

**Status**

- [x] Pending
- [ ] Done

## [ ] Add resource and status filters to the global feed

**Description**

Allow narrowing the activity view.

**Status**

- [x] Pending
- [ ] Done

## [ ] Show each step's duration on the timeline

**Description**

Expose how long each stage took.

**Status**

- [x] Pending
- [ ] Done

## [ ] Show the operation's total duration

**Description**

Expose the total time in human-readable format.

**Status**

- [x] Pending
- [ ] Done

## [ ] Add the "Affected resources" section with links

**Description**

List the resources the operation touches and link to them.

**Status**

- [x] Pending
- [ ] Done

## [ ] Translate per-step messages into human language

**Description**

Replace raw technical output with readable messages.

**Status**

- [x] Pending
- [ ] Done

## [ ] Collapse the raw technical detail

**Description**

Keep the technical log available but hidden by default.

**Status**

- [x] Pending
- [ ] Done

## [ ] Add empty states with a call-to-action

**Description**

Guide the next action when there are no resources.

**Status**

- [x] Pending
- [ ] Done

## [ ] Add skeletons while loading

**Description**

Show placeholders while data is loading.

**Status**

- [x] Pending
- [ ] Done

## [ ] Add confirmation when deleting a Worker, Mesh or Node

**Description**

Require explicit confirmation on destructive operations.

**Status**

- [x] Pending
- [ ] Done

## [ ] Show a notification when an operation completes or fails

**Description**

Notify the user even if they navigated elsewhere.

**Status**

- [x] Pending
- [ ] Done

## [ ] Link to the resource from the notification

**Description**

Allow going straight to the resource from the notification.

**Status**

- [x] Pending
- [ ] Done

---

# Epic: Platform

## [ ] Redirect to login when accessing /dashboard without a session

**Description**

Protect dashboard routes on the front end.

**Status**

- [x] Pending
- [ ] Done

## [ ] Make the seed idempotent

**Description**

Guarantee that running the seed multiple times doesn't duplicate data.

**Status**

- [x] Pending
- [ ] Done

## [ ] Create the initial company and user in the seed

**Description**

Leave a ready entry point for first use.

**Status**

- [x] Pending
- [ ] Done
