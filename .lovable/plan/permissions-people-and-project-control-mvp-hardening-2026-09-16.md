# Permissions, People and Project Control — MVP Hardening

Focus: make roles real. Today every signed-in person can do everything, and nobody is an administrator, so the role buttons on the Team page can't actually be used.

## Verified current state

- The database has one user account, and its only role is "superintendent" — there is no administrator, so the admin-only screens (creating projects, assigning roles) are locked for everyone.
- Role assignment and project creation are already restricted to administrators; everything else (editing any request, recording any approval decision) is open to any signed-in user regardless of role.
- There is no place to store comments, no record of who changed what, no way to remove a user, and no profile editing screen.

## What gets built

### 1. First administrator
Promote the existing account to administrator so the Team screen becomes usable, and add an ownership rule so there is always at least one admin.

### 2. Real role enforcement
Rewrite the access rules so each action checks the acting person's role:
- Create/edit a request: the person who created it, while it is a draft or sent back for revision. Administrators may always edit.
- Record an approval decision: only the person holding the role for that step (or an administrator). No more "anyone can approve anything".
- Delete a request: creator while draft, or administrator.
- Projects: administrators and project managers can create and rename; everyone can view.
- Procurement role: can fill in the purchase-order fields on approved requests.

### 3. User management (admin only)
A People screen where administrators can:
- Invite a new user by email, first/last name, company and starting role.
- Change or add roles per person (superintendent, executive, project manager, trade partner, installation, procurement, admin).
- Deactivate/remove a user. Their past forms and approvals remain for the audit trail.
- Assign people to specific projects.

### 4. Profile editing
Every user can edit their own name, phone, job title and company. Email stays fixed to the sign-in address.

### 5. Comments on forms
A comment thread on Material Transfer and Equipment Substitution forms (and Purchase Requests for consistency): any assigned participant can post, comments show author, role and timestamp, and cannot be silently edited away.

### 6. Company field
Add "company" to profiles so trade partners are distinguishable from Integra staff, shown in the directory and searchable.

### 7. Activity log
A recorded trail of meaningful events — form created, submitted, approved, rejected, commented, role changed, user added/removed, project renamed — visible on an Activity screen and on each form. Written by the database so it can't be skipped.

## Technical notes

- New tables: `comments` (form_type, form_id, author, body), `activity_log` (actor, action, entity type/id, metadata), `project_members` (project_id, user_id, role). All with grants, RLS, and `TO authenticated` policies scoped by `has_role()` / ownership.
- `profiles` gains `company` and `is_active`.
- Replace the permissive `USING (true)` policies on `purchase_requests`, `equipment_substitutions`, `material_transfers`, and `approvals` with role- and ownership-scoped policies. Reads stay broad (org-wide visibility); writes get locked down.
- Approval step authorization: policy on `approvals` requires `has_role(auth.uid(), approvals.role)` or admin, plus a trigger that blocks deciding a step while an earlier step is still pending.
- Activity log written by `AFTER INSERT/UPDATE` triggers plus explicit inserts for role/user changes; append-only (no update/delete policy).
- Invite + deactivate run through authenticated server functions using the admin client after verifying the caller is an admin via `has_role`.
- UI: new `/team` admin controls, new `/profile`, new `/activity` route, `<Comments>` component reused across the three form pages, and role-aware hiding of actions the current user cannot perform (with server-side rules as the real gate).

## Out of scope for this pass

Email notifications (needs a verified sending domain), Costpoint/CxAlloy/Procore lookups (need API credentials), offline sync.
