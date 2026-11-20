---
name: code-ops-commands
description: >-
  Standard for commands that write to a database, cloud account, deployed app, or vendor API: a
  staged pipeline that proves access and plans before it writes, confirms by blast radius, and
  reports what changed. Use when writing, reviewing, or planning such a command, menu action, or
  script.
---

# Code Ops Commands

A command that writes to a system people depend on is judged by what its user knows before, during,
and after it runs. This skill shapes such commands; their code still follows `code-standards` and
`code-architecture`, whose § CLI contract they keep.

## When to use

**MUST** apply when writing, changing, reviewing, or planning a command, menu action, or script that
writes outside the repository: a database, a cloud account, a deployed app's settings, a vendor API,
a credential. A read-only tool over the same systems applies [§ Access](#access) only.

## Scope

- The commands, their pipeline, their guidance catalog, and their tests
- The ledger the commands keep

## The pipeline

Every command runs the same stages, and prints the route before the first one starts:

| Stage     | Does                                                                                   | Writes     |
| --------- | -------------------------------------------------------------------------------------- | ---------- |
| Access    | Proves who the user is and each permission the later stages need                       | Never      |
| Preflight | Checks state: lifecycle guards, pending work, drift between config and the live system | Never      |
| Plan      | Lists the exact changes: targets, values, statements, calls, restarts, reversibility   | Never      |
| Confirm   | Shows the danger level and the consequences, then asks for the matching confirmation   | Never      |
| Execute   | Makes the changes, with progress per target (`app 3 of 8`)                             | Yes        |
| Verify    | Reads the result back from the live system                                             | Never      |
| Record    | Writes the ledger, reads it back, and says what comes next and when                    | The ledger |

- **One pipeline class runs every command.** It lives in `core/composer/`; a command supplies its
  stage implementations, never its own order, and the pipeline stops at the first stage that fails.
- **A dry run is the same pipeline stopping after Confirm**, never a second code path, so what it
  shows is what Execute will do.
- **Every Execute step is safe to repeat.** It sets a value rather than adding to it, skips a target
  already in the wanted state, and creates outside resources under a name it can find again. Running
  the command again is then a valid next step after any failure.
- **A long Execute shows where it is**: per target, with a count, on stderr; results stay on stdout.

## Access

- **Prove access without writing.** For every system the command touches, check who the user is (the
  provider's identity call) and whether they may do each action the later stages will do (a
  permission simulator, a test-permissions call, a read of the resource's access list). Only the
  systems the chosen command needs are checked.
- **Each check ends allowed, denied, or unknown**, always with its reason. Unknown is for what the
  provider cannot prove ahead: a resource policy the simulator skips, write rights with no read-only
  probe. Denied stops the run before Preflight and prints the fix: the sign-in command, or the role
  to ask for. Unknown continues, and on production the Confirm banner repeats it for the user to
  acknowledge.
- **Signed out is an outcome, not a crash** (`code-standards` § Outcomes and faults). The command
  prints why (expired session, no credentials, a rejected key) and the command that fixes it. A menu
  offers Sign in, Retry, and Exit; Retry builds new clients and bypasses any credential cache the
  SDK keeps for the process, so a login made in another terminal counts.
- **A menu checks before it lists.** Access runs before the actions are shown, so each one already
  says whether the user can run it.
- **A shared credential is announced.** When a service or shared key stands in for a person's login,
  the run says that the provider's audit log will name the key, not the person.
- **CI reads the environment only.** With `CI=true`, credentials come from the environment and no
  interactive sign-in is offered; the permission checks still run.

## Danger levels

| Level        | Shown as                        | When                                       | Confirmation                                                  |
| ------------ | ------------------------------- | ------------------------------------------ | ------------------------------------------------------------- |
| Read-only    | `✅ READ-ONLY`                  | Access, Preflight, Plan, dry runs, status  | None                                                          |
| Caution      | `⚠️ WRITES`                     | A write to a test or dev system            | `y/N`                                                         |
| Danger       | `🚨 DANGER ZONE`                | Any write to production, restarts included | Type the environment's name                                   |
| Irreversible | `⛔ DANGER ZONE · IRREVERSIBLE` | A delete or a drop, in any environment     | Type the resource's name, and on production the environment's |

- **The level follows from the plan** — the environment and whether each change can be undone —
  never from a flag the command sets, so a command cannot understate itself.
- Danger and irreversible levels show in red on every line that names them, and a confirmation is
  typed: no key press defaults to yes.

## Guidance

Every command, stage, and stop point has one entry in a single guidance catalog, keyed by command
and stage, in one shape:

| Part             | Answers                                                       |
| ---------------- | ------------------------------------------------------------- |
| Does             | One sentence, in the user's terms                             |
| Changes          | Which systems, targets, and data change                       |
| Impact           | Who notices: restarts, downtime, people holding the old value |
| Undo             | Reversible or not, and how                                    |
| If you stop here | The state left behind                                         |
| Next             | What comes after, and when                                    |

- **A test fails when an entry is missing**, so a new command cannot ship without its explanation.
- **Impact and Undo carry real numbers** from Preflight and Plan (targets, open sessions, last-used
  time), not generic text.

## When a step fails

A failure in Execute, Verify, or Record prints three things before the exit code:

- **What changed** so far, per target (`5 of 8 apps on the new value`).
- **State now**: which values work, and what the ledger says.
- **Safe next**: the exact command to run, usually the same one again.

Each command's failure windows — after which step, in what state, with what next — are written down
beside the command, and the runner prints from that table.

## The ledger

- **Status lives in the system being changed**, or in a store beside it (a secret manager's record,
  a table, resource tags), never in a file of the repository, which is stale the moment someone runs
  the command from another checkout.
- **Record writes and reads back**, and the next command's Preflight reads the same ledger. A step
  someone did by hand is recorded through the tool too, by a command for that.
- **The ledger says who and when**, never a secret value (`code-architecture` § Inputs and expensive
  steps).

## Tests

- Stages run on fakes of every outside client (`code-unit-tests-architecture`); a suite makes no wet
  run and no dry run against a live account.
- Each command's suite fails its pipeline at every Execute step and asserts the printed failure
  window.
- The guidance coverage test runs with the suites.
- A real run against a test environment is named in the README's `## Tests`.

## Review checklist

- The command runs through the shared pipeline; Access, Preflight, Plan, and Confirm write nothing,
  and a dry run stops after Confirm.
- Access proves identity and each permission ahead, ends each check allowed, denied, or unknown with
  its reason and fix, and treats signed out as an outcome.
- The danger level follows from the plan, and the confirmation matches it.
- Every Execute step is safe to repeat; a failure prints what changed, the state now, and the safe
  next command.
- The guidance catalog has an entry for every command, stage, and stop point, enforced by a test.
- The ledger lives in the live system, is read back after Record, and holds no secret.
