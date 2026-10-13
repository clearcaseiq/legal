<!-- Generated from app/src/data/attorneyGuides.ts. Do not edit by hand; run `pnpm --dir app guides:export`. -->

# Tasks and workflows

Build your firm’s case pipeline on the Workflow tab, apply it, and work the tasks it creates on each case and across your whole caseload.

_Last updated: 2026-10-12 · About 6 min read_

## Contents

- [How workflows are organized](#how-workflows-are-organized)
- [Building a workflow](#building-a-workflow)
- [Step types and options](#step-types-and-options)
- [Steps that only apply to some cases](#steps-that-only-apply-to-some-cases)
- [Applying a workflow](#applying-a-workflow)
- [How tasks are created and grouped](#how-tasks-are-created-and-grouped)
- [Working the task queue](#working-the-task-queue)
- [The cross-case Tasks hub](#the-cross-case-tasks-hub)

## How workflows are organized

A workflow is your firm’s standard pipeline for a practice area. It is made of ordered phases (for example Intake, Medical, Settlement, Litigation and Closing). Each phase holds one or more stages, and each stage holds a checklist of steps. Workflows are built on Firm Dashboard → Workflow by anyone with permission to manage the firm.

Where in the app: **Open the Firm Dashboard** (`/firm-dashboard`)

## Building a workflow

1. Open Firm Dashboard → Workflow. You can start from the recommended default or create a new workflow.
2. Give the workflow a name, choose its practice area and add a description.
3. Add phases, then stages inside each phase. Use the up and down arrows to reorder them.
4. Add steps to each stage and set each step’s type, owner, due date offset and whether it is required.
5. Save your changes.

> **Tip:** You can keep several named workflows. Workflows that are not active and not applied show as "Hidden".

## Step types and options

Each step has a type: task, milestone, checkpoint, deadline, document, or AI milestone. AI milestones are read-only and are checked off by the system, not by your team. Every step can also carry:

1. A suggested owner: a firm role or a specific team member, or leave it unassigned.
2. A due offset: how many days after the workflow starts the step is due.
3. A required flag, for steps that must always be done.
4. A linked firm template, so the step points to the document your team should use.
5. A condition, described below.

## Steps that only apply to some cases

By default a step applies to every case ("Always"). You can add a condition so the step is only included when the case matches, for example only for a particular claim type (such as Auto / Vehicle or Dog Bite), only in a particular state, or only at a particular case status. Pick values from the dropdown rather than typing them, so they match what the system compares against.

## Applying a workflow

Mark one workflow as your firm default by applying it. It then shows an "Applied" badge. Applying it to a specific case and tracking progress happens in the case workspace on Tasks → Workflow, where your team checks off steps, assigns owners and follows progress stage by stage.

## How tasks are created and grouped

Workflow steps become tasks on the case’s Tasks → Queue, so they can be assigned and tracked like any other work. To avoid dumping the whole pipeline on day one, only required steps and the steps in the earliest unfinished stage are turned into tasks; later stages appear as you progress. AI milestones never become tasks.

1. Tasks are grouped by the workflow phase and stage they belong to.
2. Tasks that did not come from a workflow step (such as checklist items, readiness items, client questions or statute-of-limitations reminders) are automatically filed into the matching phase and stage of the case’s workflow, or into its current stage if there is no better match.
3. Completing a task checks off its workflow step. If one step has several related tasks, the step is only completed when all of them are done.

## Working the task queue

The queue shows counts for Open, Done, Overdue and Due within 7 days. You can add a task yourself, choosing its title, due date, priority, type, workflow section, assignee and notes.

1. Assign a task to an attorney, a firm role, a specific team member, or to the client.
2. Use Auto-generate to create tasks from the case’s readiness blockers.
3. To merge duplicates, tick two or more tasks with the checkboxes and choose Merge to combine them into a single task.

> **Tip:** Staff without permission to work on active cases can open and read tasks but cannot create, complete, edit, assign or comment on them.

## The cross-case Tasks hub

Case Management → Tasks shows tasks across all your cases in one place, with a Deadlines tab for upcoming due dates. Use it to plan your week instead of opening each case.

Where in the app: **Open the Tasks hub** (`/attorney-dashboard/cases/tasks`)
