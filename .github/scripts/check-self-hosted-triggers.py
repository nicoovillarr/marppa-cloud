#!/usr/bin/env python3
"""Fail when a workflow can run on the self-hosted runner from a fork.

The self-hosted runner executes on the hypervisor host, as a user that can
rewrite the code the cloud-script service runs. Any trigger a fork can reach
turns that into remote code execution on the host, so the two must never meet
in one workflow.
"""

import sys
from pathlib import Path

import yaml

FORK_REACHABLE_TRIGGERS = {"pull_request", "pull_request_target"}
WORKFLOWS_DIR = Path(__file__).resolve().parents[1] / "workflows"


def triggers_of(workflow):
    declared = workflow.get("on", workflow.get(True))

    if isinstance(declared, dict):
        return set(declared)
    if isinstance(declared, list):
        return set(declared)
    if isinstance(declared, str):
        return {declared}

    return set()


def self_hosted_jobs(workflow):
    found = []

    for name, job in (workflow.get("jobs") or {}).items():
        runs_on = job.get("runs-on")
        labels = [runs_on] if isinstance(runs_on, str) else (runs_on or [])

        if any("self-hosted" in str(label) for label in labels):
            found.append(name)

    return found


def main():
    problems = []

    for path in sorted(WORKFLOWS_DIR.glob("*.y*ml")):
        workflow = yaml.safe_load(path.read_text(encoding="utf-8")) or {}
        reachable = triggers_of(workflow) & FORK_REACHABLE_TRIGGERS
        jobs = self_hosted_jobs(workflow)

        if reachable and jobs:
            problems.append(
                f"{path.name}: job(s) {', '.join(jobs)} run on self-hosted "
                f"and the workflow triggers on {', '.join(sorted(reachable))}"
            )

    if problems:
        print("Self-hosted runner reachable from a fork:\n")
        for problem in problems:
            print(f"  - {problem}")
        print(
            "\nMove the job to a GitHub-hosted runner, or drop the "
            "fork-reachable trigger."
        )
        return 1

    print("No workflow exposes the self-hosted runner to fork triggers.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
