// Copyright (c) 2026 VeilAssist. Profile settings — modes, background, and skills.

import React from 'react'
import { LayoutTemplate, Sparkles } from 'lucide-react'
import { SettingsCollapsible, SettingsPage } from './SettingsComponents'
import ProfileModesPanel from './ProfileModesPanel'
import PersonalBackgroundSection from './PersonalBackgroundSection'
import SkillsSettingsPanel from './SkillsSettingsPanel'

/** @type {{ id: string, label: string }[]} */
export const PROFILE_SECTIONS = [
  { id: 'modes', label: 'Modes & background' },
  { id: 'skills', label: 'Skills' },
]

export default function ProfileSettingsPanel({ profilePanel = {} }) {
  const panel = profilePanel

  return (
    <SettingsPage
      title="Profile"
      description="Persona modes, resume context, and overlay skills."
      wide
    >
      <div className="space-y-3">
        <SettingsCollapsible
          title="Modes & background"
          description="Interview modes, reference files, resume, and job description."
          icon={LayoutTemplate}
          defaultOpen
        >
          <div className="space-y-5 px-1 pb-1">
            <ProfileModesPanel {...panel} embedded />
            <PersonalBackgroundSection
              resumeContext={panel.resumeContext}
              jdContext={panel.jdContext}
              resumeSourceName={panel.resumeSourceName}
              profileDocBusy={panel.profileDocBusy}
              onResumeChange={panel.onResumeChange}
              onResumeBlur={panel.onResumeBlur}
              onJdChange={panel.onJdChange}
              onJdBlur={panel.onJdBlur}
              onUploadResume={panel.onUploadResume}
              onUploadJd={panel.onUploadJd}
              onClearResume={panel.onClearResume}
              onClearJd={panel.onClearJd}
            />
          </div>
        </SettingsCollapsible>

        <SettingsCollapsible
          title="Skills"
          description="Custom /skill-name prompts invoked from the overlay input."
          icon={Sparkles}
        >
          <div className="px-1 pb-1">
            <SkillsSettingsPanel embedded />
          </div>
        </SettingsCollapsible>
      </div>
    </SettingsPage>
  )
}
