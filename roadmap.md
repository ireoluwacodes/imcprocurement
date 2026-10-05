# Integra Procurement Platform — Roadmap

## Done

- Backend schema: profiles, roles, projects, PR, ES, MTF, approvals, attachments
- Email + Google sign-in, auth gate, app shell, Integra dark design system
- Landing page, dashboard, three form list views, approval trail component

- Purchase Request, Equipment Substitution and Material Transfer forms
- Projects, team directory with role assignment, approvals queue
- Attachments with private file store, reports with CSV export, form setup
- Permission rules per role, invite/suspend/remove members, company on profiles
- Profile editing, comment threads on all three forms, platform activity log

- Project site inventory: starting stock, project details page, warehouse totals

## To do

- Email notifications on approval steps
- Offline capture and sync

## Blocked / needs input

- Costpoint + CxAlloy integrations: no API endpoints or credentials supplied
- Email alerts: needs a verified sending domain
- Offline sync: deferred to a later phase

## Completed (this pass)
- Pending report now lists individual people, company, roles, oldest wait
- Form Setup custom fields stored centrally and rendered on all three forms
- Transfer date locked to creation date
- Type-ahead suggestions for parts, descriptions and vendors
- Project team assignment screen on Projects

## Done (Oct 1 batch)
- Rename Costpoint to Cost code; project number shown as Project ID
- "Updated manually" wording; activity shows person's name for role changes
- Photos on inventory items
- Company job roles (custom names, admin-created)
- CSV export of form lists + print/save PDF of a filled form
- Email on every update: needs a verified sending domain (workspace admin)
- Per-project access restriction (admin grants access)
- Photos on starting items in New project
