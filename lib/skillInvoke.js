// Copyright (c) 2026 VeilAssist. All rights reserved.
// ESM re-export for Vite renderer.

import cjs from './skillInvoke.cjs'

export const parseSkillInvoke = cjs.parseSkillInvoke
export const normalizeSkillSlug = cjs.normalizeSkillSlug
export const SKILL_SLUG_RE = cjs.SKILL_SLUG_RE
export default cjs
