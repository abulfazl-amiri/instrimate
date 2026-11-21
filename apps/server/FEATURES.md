# Feature map

This is a compact map of the active features and a record of the workflows
removed from the earlier implementation. It is not a full API or implementation
specification.

## What runs today

The NestJS application mounts **Auth** and **Users** only. They use PostgreSQL
through Prisma; refresh sessions and short-lived reset/confirmation tokens use
Redis. The former feature implementations listed below have been removed from
the repository and are not available as API routes.

- **Auth and account security:** sign up or sign in creates an access token and
  a server-tracked refresh session. Refresh rotates the session token; logout
  revokes it. Forgot/reset password uses email, and password confirmation
  issues a short-lived token for sensitive actions.
- **Users:** users manage their own profile, account, and password. Admins can
  list, view, update, delete, and change the role of users. New accounts are
  teachers; the other role is admin.

## Removed feature inventory

- **Session management:** list active sign-ins and revoke one, all, or all
  except the current sign-in. Auth's Redis-backed refresh-session lifecycle
  remains; these management endpoints were removed.
- **Courses:** a teacher owns a course and can share its teaching roster with
  invited teachers. Owners manage courses; course teachers can work with the
  course's teaching data.
- **Lessons:** dated course entries with notes/plans and page or unit progress;
  each lesson uses a teaching resource.
- **Timetable:** one recurring weekly schedule per course, with day-level
  topics, times, and teaching-day flags.
- **Enrollments and students:** a teacher keeps student records; an enrollment
  links one student to one course and carries its own fee, discount, currency,
  and dates. A student can have enrollments across courses.
- **Invites:** a course owner invites another user to join a course. The
  recipient accepts or rejects; invites expire.
- **Resources and access sharing:** teachers maintain teaching materials.
  Resource access grants another teacher viewer access; the grant can be
  revoked. Lessons reference resources.
- **Non-teaching days:** holidays or cancellations are associated with a date
  and one or more courses, optionally with a note.
- **List controls:** legacy list endpoints share filtering, sorting, field
  selection, and pagination behavior.

## Relationship and workflow sketch

```text
User (teacher)
 ├─ owns Courses ── roster: Users (teachers)
 │    ├─ Lessons ── each references a Resource
 │    ├─ one Timetable
 │    ├─ Enrollments ── each links a Student
 │    ├─ Invites ── sent to another User
 │    └─ Non-teaching days ── date may cover multiple Courses
 ├─ owns Students ── each may have Enrollments
 └─ owns Resources ── may grant viewer access to other Users
```

In the former workflow, a teacher created courses, students, and resources;
enrollments connect students to courses, lessons use resources, and the course
timetable and non-teaching days describe when teaching happens. Course invites
extend a course's teacher roster, while resource grants allow read-only sharing
outside that roster.

## Migration boundary

Only Auth and Users remain in the current NestJS/Prisma application. The
relationships above summarize the removed implementation; they are not current
Prisma models or available API routes. Redis refresh-session storage remains
part of Auth, while the separate session-management feature was removed.
