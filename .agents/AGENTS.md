# Workspace Rules

## Verification Commands
- Run non-destructive verification commands directly using `run_command`:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm run build`
  - `npm install`
  - `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`
- Always report the results to the user.

## Destructive Commands
- Ask for user approval before executing any destructive or irreversible commands:
  - Deleting/dropping files or databases
  - Overwriting existing uncommitted critical files without instruction
  - `git push`, `git reset`, database/schema modifications
