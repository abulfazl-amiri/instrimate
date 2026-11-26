# Instrimate PRD (completed)

Nov 23, 2026 · @Amiri

## 1. Problem and vision

Instrimate is a minimal tool for part-time and independent teachers in Afghanistan to track classes, homework, attendance and student progress, and to produce parent and manager reports in minutes instead of from memory.

**The problem, stated measurably.** Teachers running 3+ classes lose track of what was assigned, what was taught and who is falling behind. When a manager or parent asks for a report, it is rebuilt from memory, which hurts trust. _Gap in the original:_ no number yet. Interview 10 teachers and record how many classes they run, how long a monthly report takes today, and what they use now (paper, Excel, Telegram, WhatsApp).

**Vision.** The calmest tool a teacher owns: one place for plans, logs and reports, with no feature the teacher did not ask for.

**What Instrimate is not.** Not a video-class platform, not a tutoring marketplace like Preply, not a course library like Coursera, and not a full school ERP.

**Honest flags on the original text**

- "Competition between individuals" through leaderboards conflicts with the minimal, no-noise positioning and can discourage weaker students. Make it opt-in per class.
- Group chat is the most expensive feature to build and moderate (minors, abuse, notifications), and students already live in WhatsApp and Telegram. Cut it from the MVP.
- "Free tier" is defined but the value of paying is not. Section 5 fixes this.

## 2. Users and jobs to be done

The teacher is the user and first buyer; the center manager and the parent are readers of the output, and later buyers.

| Persona            | Who                                        | Job to be done                                                   | Pain today                        | Pays?                                  |
| ------------------ | ------------------------------------------ | ---------------------------------------------------------------- | --------------------------------- | -------------------------------------- |
| Part-time teacher  | Teaches 2-6 classes at one or more centers | Know what to teach next, what homework is pending, who is behind | Memory and scattered notes        | Yes, first buyer                       |
| Center manager     | Runs a language or tutoring center         | See attendance and progress across teachers                      | Teachers report inconsistently    | Maybe, later                           |
| Parent or guardian | Pays for the student                       | Know if the child is progressing                                 | Gets no updates until a complaint | No, but the strongest pull for reports |
| Student            | Teen or adult learner                      | See assignments and deadlines                                    | Forgets homework                  | No                                     |

_Gap in the original:_ it names students and parents but never says whether they get accounts. Recommendation for the MVP: teacher-only accounts. Parents and students receive read-only report links, shared by WhatsApp or Telegram. This removes login, chat and moderation work.

## 3. Market and competition

The PRD compares Instrimate to Preply and Coursera, but those are not the real competitors. Your real competitors are free and already installed.

| Alternative                                                     | Why teachers use it        | Where it fails                                                            | Your wedge                                                       |
| --------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Paper notebook                                                  | Zero cost, always works    | No reports, easy to lose                                                  | Reports in one tap                                               |
| Excel / Google Sheets                                           | Flexible, free             | Manual, no reminders, painful on phones                                   | Structured logs and generated reports                            |
| WhatsApp / Telegram groups                                      | Where students already are | No records, no history                                                    | Use them as the delivery channel, do not replace them            |
| Global tools (Google Classroom, ClassDojo, Teachable-style LMS) | Polished, free tiers       | Built for schools, English-first, assume reliable internet, no Persian UI | Offline-first, Persian and English UI, built for private centers |

**Assumptions to validate (not facts):** that Afghan private English centers employ many part-time teachers with 3+ classes, that teachers own smartphones, and that connectivity is unreliable enough that offline matters. Before building, run 10 interviews and count centers in your own city as a rough market size.

_Gap in the original:_ no market size, no pricing benchmark, no language plan. Decide now if the UI is Persian (Dari), Pashto, English, or all three. RTL support affects the whole front-end and is much cheaper to plan at the start.

## 4. Scope: MVP versus later

The original lists about 10 features at the same weight. A solo developer cannot ship that. The MVP should prove one thing: a teacher uses it every week and shares a report with a parent or manager.

### Phase 1: MVP (responsive website, you are the first user)

| Feature                                           | Why                            |
| ------------------------------------------------- | ------------------------------ |
| Teacher account, classes, student list            | Foundation                     |
| Attendance per session                            | Daily habit, builds retention  |
| Assignments with due dates                        | Second daily habit             |
| Roadmap (what to teach by date), simple version   | Core differentiator            |
| Session log with a fixed question set             | Feeds the reports              |
| Student profile with teacher-only contacts, basic | Needed for parent follow-up    |
| Report generation: PDF and shareable link         | The hook and the reason to pay |

### Phase 2: Pilot (10 teachers, manual Pro billing)

| Feature                                                                 | Why                           |
| ----------------------------------------------------------------------- | ----------------------------- |
| Free/Pro gating by service type, with 1 watermarked free report a month | Lets you test the paid offer  |
| Manual Pro upgrade through a simple admin panel                         | Payments before automation    |
| Phone verification, one account per number                              | Stops multiple free accounts  |
| Exam dates inside the roadmap                                           | Requested often, cheap to add |
| Feedback fixes from real use                                            | Decide what stays             |

### Phase 3: Grow (about 20 paying teachers)

| Feature                               | Why                                        |
| ------------------------------------- | ------------------------------------------ |
| Export to docx, xls and txt           | PDF and links cover most needs before this |
| Custom report questions and templates | Makes reports fit each teacher             |
| Student progress history and charts   | Pro value that builds over time            |
| Resources upload, with storage caps   | Storage cost, so after demand is proven    |
| Hessab Pay automated billing          | After manual billing is working            |

### Phase 4: Expand (only with 100+ active teachers and real demand)

| Feature                                               | Why                                              |
| ----------------------------------------------------- | ------------------------------------------------ |
| Native mobile app with offline storage and sync       | Needs a separate app and the hardest engineering |
| Center plan with manager dashboard                    | Needs sales effort and data trust                |
| Parent and student accounts                           | Needs permissions and privacy design             |
| Leaderboards, opt-in per class                        | Risky for students, not core                     |
| Group chat, or links to WhatsApp and Telegram instead | Costly to moderate                               |
| WhatsApp or SMS reminders as a paid add-on            | Cost passes through to the user                  |

**Free versus Pro, decided:** free covers the daily-work tools (unlimited classes, roadmap, assignments, basic attendance and session log). Pro covers the output and history tools (reports, exports, progress history, resources, offline). Splitting by service type, not class count, means extra accounts do not help a teacher avoid paying.

## 5. Business model and revenue paths

**Goal.** Instrimate is first a portfolio project and a real tool for teachers, and second an income source. Expect side income, not a salary. Pro costs $1.99 a month (about 3.5% of a 4-class teacher's income) and is sold to individual teachers only. The price may be raised later for new users if pilot teachers accept it easily. The center plan waits until real users ask for it.

**Revenue paths, in order**

1. **Teacher subscription at $1.99 a month, about $16 a year.** Sold by service type, not class count, so extra accounts do not help. Free: teaching space with unlimited classes, roadmap, assignments, basic attendance and session log. Pro: reports with downloads and share links, student progress history, exports, resources, offline use. Free users get 1 watermarked report a month. One account per verified phone number.
2. **Add-ons later.** WhatsApp or SMS reminders (cost passes through), custom report templates, certificates.
3. **Center plan, only later.** Build it only after at least 100 active teachers and a manager asks for it. Until then, a teacher can share a report link with a manager.
4. **Not recommended now:** ads (breaks the minimal promise) and a resource marketplace (needs scale and moderation).

**Payments.** Credit cards are likely rare among your target teachers, so make the manual method the main path at launch: bank transfer, mobile money or Hessab Pay confirmed by you, with the account upgraded in an admin panel. Integrate automated Hessab Pay only after about 20 paying users. Verify which payout and banking routes actually work for you before promising anything.

**Realistic income.** At $1.99 and about 5% conversion, 50 payers is about $100 a month and needs roughly 1,000 free users; 200 payers is about $400 a month and needs roughly 4,000. About 10 payers cover the estimated $15-25 monthly running costs. Track cost per active teacher, conversion and monthly churn. The 5% rate is a rough benchmark for freemium tools, not a promise.

## 6. Go-to-market

The PRD has no plan to get users. For a solo founder with no budget, the plan is manual and personal.

1. **Dogfood first.** Use it for your own classes for 4 weeks and generate real reports.
2. **Recruit 10 pilot teachers** from colleagues and friends, free for 3 months, in exchange for weekly feedback.
3. **Tell the true story:** "built by a working English teacher". Show real reports from your own classes, collect little data, and let teachers export or delete it.
4. **Spread through teacher networks:** Telegram and WhatsApp teacher groups and Facebook groups. Free-tier reports carry a small "Made with Instrimate" footer.
5. **Managers find you through reports:** a teacher shares a report link with the manager. No sales process.
6. **Start charging at about 20 active pilot teachers**, not before.

**Decision gate:** if fewer than 5 of 10 pilot teachers are still using it weekly after 6 weeks, change the product before adding features.

## 7. Technical, privacy and payment constraints

- **Stack.** NestJS, PostgreSQL and Prisma for the server. A responsive React website for the client. The same API can serve a mobile app later.
- **Build order.** Vertical slices, not all backend then all frontend. Build one feature end to end (for example attendance: API, then screen), use it in your real classes, then move to the next.
- **Mobile app and offline.** Not in the first versions. Offline use is a feature, not the foundation. If real use shows teachers need it (stored data and files on the device), build a native app (Expo) then, reusing the same API. Offline sync with conflict handling is the hardest item in this PRD, so it waits.
- **Test with yourself first.** You are the first user. Decide what stays, changes or goes after real use in your own classes, then update this PRD.
- **Student data.** Store the minimum: name, contact, attendance, progress. Contacts are visible only to the owning teacher, encrypted in transit, backed up, with an account-deletion path that removes a student's data on request.
- **Roles and permissions.** Teacher (owner) only for the MVP. Co-teacher, manager and read-only report viewer come later.
- **Language and calendar.** RTL layout, Persian and English strings from day one, and a decision on Solar Hijri versus Gregorian dates.
- **Cost control.** Cap free-tier file storage and generate reports as PDFs on demand rather than storing them.
- **Reliability basics.** Rate limiting, an audit log for plan changes, and daily database backups.

## 8. Metrics, risks, roadmap and open questions

**Success metrics**

| Metric                                         | Target for first 3 months                                            | Why                          |
| ---------------------------------------------- | -------------------------------------------------------------------- | ---------------------------- |
| Activation                                     | 70% of new teachers create a class and take attendance within 7 days | Shows the first habit forms  |
| Weekly active teachers                         | 20                                                                   | Proof of repeat use          |
| Reports generated per active teacher per month | 4 or more                                                            | Shows the core value is used |
| Free to paid conversion                        | 5% or more of active teachers                                        | Proof of willingness to pay  |
| Pilot center signed                            | 1                                                                    | First B2B proof              |

**Risks**

| Risk                                   | Impact                  | Mitigation                                               |
| -------------------------------------- | ----------------------- | -------------------------------------------------------- |
| Teachers keep using paper and WhatsApp | No adoption             | Make attendance a 3-tap action; pilot with real teachers |
| Price too high for local teachers      | No revenue              | Localized price, test before billing, center plan        |
| Solo developer overload                | Product never ships     | Strict MVP, cut chat and leaderboards                    |
| Payment and banking limits             | Cannot collect money    | Manual payments first, verify routes early               |
| Student data privacy                   | Trust and legal trouble | Collect minimum, teacher-only contacts, deletion path    |

**Roadmap**

| Phase       | Goal                                                               | Exit gate                                      |
| ----------- | ------------------------------------------------------------------ | ---------------------------------------------- |
| 0. Validate | 10 teacher interviews, paper prototype                             | At least 6 confirm the report problem          |
| 1. MVP      | Classes, attendance, assignments, roadmap, session log, PDF report | You use it daily for your own classes          |
| 2. Pilot    | 10 teachers, manual Pro billing                                    | 5 of 10 active after 6 weeks                   |
| 3. Grow     | Docx/xls export, offline cache, Hessab Pay                         | 20 paying teachers                             |
| 4. Expand   | Center plan, parent accounts, leaderboards, resources, native app  | Only with 100+ active teachers and real demand |

**Decisions made (previously open questions)**

- **Language:** Persian (Dari) and English at launch, with RTL and LTR layout and translatable strings from day one. Pashto only if pilot teachers ask.
- **Price:** Pro at $1.99 a month, about $16 a year. Raise it later for new users if pilot teachers accept it easily.
- **Payment:** Hessab Pay and mobile money or cash. In Phase 2 the teacher pays you directly and you upgrade the account by hand in the admin panel; automated Hessab Pay billing waits until Phase 3. Confirm the real Hessab Pay terms and fees before pilot.
- **Founder identity:** named openly as a working English teacher who built it, shown on the website with a short story and real sample reports.
- **Time budget:** 5 to 10 hours a week, so Phase 1 is planned for about 2 to 3 months, built in weekly vertical slices. Do not add features during this time; any new idea goes into the Phase 3 or 4 table.
- **Still to validate in interviews:** whether pilot teachers accept $1.99, and how many of them want a mobile app.
