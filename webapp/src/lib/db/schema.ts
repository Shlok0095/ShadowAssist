import { relations, sql } from 'drizzle-orm'
import {
  bigint,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core'

/**
 * RepRoom schema.
 *
 * `users.id` is the Supabase Auth user id (auth.users.id). We do not manage a
 * separate identity; every app row is keyed to the authenticated uid and RLS is
 * enforced on `auth.uid()` (see drizzle/0001_rls.sql).
 */

// ── Enums ─────────────────────────────────────────────────────────────────────
export const planEnum = pgEnum('plan', ['free', 'pro'])
export const seniorityEnum = pgEnum('seniority', [
  'intern',
  'junior',
  'mid',
  'senior',
  'staff',
  'lead',
])
export const sessionModeEnum = pgEnum('session_mode', [
  'behavioral',
  'technical',
  'system_design',
  'screen',
  'custom',
])
export const difficultyEnum = pgEnum('difficulty', ['warmup', 'standard', 'hard'])
export const sessionStatusEnum = pgEnum('session_status', [
  'active',
  'completed',
  'abandoned',
])
export const speakerEnum = pgEnum('speaker', ['interviewer', 'candidate'])

// ── users ─────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey(), // == auth.users.id
  email: text('email').notNull(),
  name: text('name'),
  plan: planEnum('plan').notNull().default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── profiles ──────────────────────────────────────────────────────────────────
export const profiles = pgTable('profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  resumeText: text('resume_text'),
  resumeFilePath: text('resume_file_path'),
  targetRole: text('target_role'),
  seniority: seniorityEnum('seniority'),
  industry: text('industry'),
  yearsExperience: integer('years_experience'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── job_targets ───────────────────────────────────────────────────────────────
export const jobTargets = pgTable(
  'job_targets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    company: text('company'),
    roleTitle: text('role_title'),
    jdText: text('jd_text'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('job_targets_user_idx').on(t.userId),
  }),
)

// ── sessions ──────────────────────────────────────────────────────────────────
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    jobTargetId: uuid('job_target_id').references(() => jobTargets.id, {
      onDelete: 'set null',
    }),
    mode: sessionModeEnum('mode').notNull(),
    difficulty: difficultyEnum('difficulty').notNull().default('standard'),
    status: sessionStatusEnum('status').notNull().default('active'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    durationSeconds: integer('duration_seconds'),
  },
  (t) => ({
    userStartedIdx: index('sessions_user_started_idx').on(t.userId, t.startedAt.desc()),
  }),
)

// ── turns ─────────────────────────────────────────────────────────────────────
export const turns = pgTable(
  'turns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    idx: integer('idx').notNull(),
    speaker: speakerEnum('speaker').notNull(),
    text: text('text').notNull().default(''),
    audioPath: text('audio_path'),
    startedAtMs: bigint('started_at_ms', { mode: 'number' }),
    endedAtMs: bigint('ended_at_ms', { mode: 'number' }),
    fillerCount: integer('filler_count').notNull().default(0),
    wordsPerMinute: real('words_per_minute'),
  },
  (t) => ({
    sessionIdxUnique: index('turns_session_idx').on(t.sessionId, t.idx),
  }),
)

// ── questions ─────────────────────────────────────────────────────────────────
export const questions = pgTable(
  'questions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    turnId: uuid('turn_id').references(() => turns.id, { onDelete: 'set null' }),
    text: text('text').notNull(),
    competency: text('competency'),
    followupOf: uuid('followup_of'),
  },
  (t) => ({
    sessionIdx: index('questions_session_idx').on(t.sessionId),
  }),
)

// ── evaluations ───────────────────────────────────────────────────────────────
export const evaluations = pgTable(
  'evaluations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => sessions.id, { onDelete: 'cascade' }),
    questionId: uuid('question_id').references(() => questions.id, {
      onDelete: 'set null',
    }),
    rubricScores: jsonb('rubric_scores').notNull(),
    strengths: jsonb('strengths').notNull(),
    gaps: jsonb('gaps').notNull(),
    modelAnswer: text('model_answer'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sessionIdx: index('evaluations_session_idx').on(t.sessionId),
  }),
)

// ── session_reports ───────────────────────────────────────────────────────────
export const sessionReports = pgTable('session_reports', {
  sessionId: uuid('session_id')
    .primaryKey()
    .references(() => sessions.id, { onDelete: 'cascade' }),
  overallScore: real('overall_score'),
  summaryMd: text('summary_md'),
  metrics: jsonb('metrics'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

// ── relations ─────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ one, many }) => ({
  profile: one(profiles, { fields: [users.id], references: [profiles.userId] }),
  jobTargets: many(jobTargets),
  sessions: many(sessions),
}))

export const sessionsRelations = relations(sessions, ({ one, many }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
  jobTarget: one(jobTargets, {
    fields: [sessions.jobTargetId],
    references: [jobTargets.id],
  }),
  turns: many(turns),
  questions: many(questions),
  evaluations: many(evaluations),
  report: one(sessionReports, {
    fields: [sessions.id],
    references: [sessionReports.sessionId],
  }),
}))

export const turnsRelations = relations(turns, ({ one }) => ({
  session: one(sessions, { fields: [turns.sessionId], references: [sessions.id] }),
}))

export const questionsRelations = relations(questions, ({ one }) => ({
  session: one(sessions, { fields: [questions.sessionId], references: [sessions.id] }),
  turn: one(turns, { fields: [questions.turnId], references: [turns.id] }),
}))

// Marker used by RLS-aware queries; keeps type inference centralized.
export type DbSchema = {
  users: typeof users
  profiles: typeof profiles
  jobTargets: typeof jobTargets
  sessions: typeof sessions
  turns: typeof turns
  questions: typeof questions
  evaluations: typeof evaluations
  sessionReports: typeof sessionReports
}

export { sql }
