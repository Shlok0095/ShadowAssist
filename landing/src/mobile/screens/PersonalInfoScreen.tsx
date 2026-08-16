import { useCallback, useEffect, useRef, useState } from 'react'
import {
  mergeCvIntoProfile,
  type Education,
  type PersonalProfile,
  type Project,
  type WorkExperience,
} from '../profileTypes'
import { DraggableList, type ReorderControls } from '../components/DraggableList'
import { ExpandableProfileCard, FilledField } from '../components/ExpandableProfileCard'
import { ScreenHeader } from '../components/MobileUi'
import { extractDocumentText } from '../pdfExtract'
import { getActiveApiKey, loadAppSettings } from '../profileStorage'
import { structureResumeText } from '../resumeParser'
import { structureCvWithLlm } from '../structureCv'
import { resolveNvidiaCvCredentials } from '../nvidiaCv'

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function PersonalInfoScreen({
  profile,
  onChange,
  onBack,
}: {
  profile: PersonalProfile
  onChange: (profile: PersonalProfile) => void
  onBack: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [local, setLocal] = useState(profile)
  const localRef = useRef(local)
  localRef.current = local
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const commitProfile = useCallback(
    (next: PersonalProfile) => {
      onChange({ ...next, updatedAt: Date.now() })
    },
    [onChange],
  )

  const patch = useCallback(
    (partial: Partial<PersonalProfile> | ((prev: PersonalProfile) => PersonalProfile)) => {
      setLocal((prev) => {
        const next = typeof partial === 'function' ? partial(prev) : { ...prev, ...partial }
        if (saveTimer.current) clearTimeout(saveTimer.current)
        saveTimer.current = setTimeout(() => commitProfile(next), 500)
        return next
      })
    },
    [commitProfile],
  )

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      commitProfile(localRef.current)
    }
  }, [commitProfile])

  const onUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('PDF only, max 10MB.')
      return
    }
    setUploading(true)
    setUploadError(null)
    try {
      const text = await extractDocumentText(file)
      let structured: PersonalProfile

      const freshSettings = loadAppSettings()
      if (resolveNvidiaCvCredentials(freshSettings) || getActiveApiKey(freshSettings)) {
        try {
          structured = await structureCvWithLlm(text, freshSettings, file.name)
        } catch (llmErr) {
          console.warn('[cv]', llmErr)
          structured = structureResumeText(text, file.name)
        }
      } else {
        structured = structureResumeText(text, file.name)
      }

      const merged = mergeCvIntoProfile(local, structured)
      setLocal(merged)
      commitProfile(merged)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Could not read that file')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className={`mobile-screen${uploading ? ' is-frozen' : ''}`} aria-busy={uploading}>
      <ScreenHeader title="Edit Personal Info" onBack={onBack} />

      <div className="mobile-screen-body">
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void onUpload(file)
            e.target.value = ''
          }}
        />
        <div className="mobile-upload-wrap">
          <button
            type="button"
            className={`mobile-upload-btn${uploading ? ' is-busy' : ''}`}
            disabled={uploading}
            aria-label={uploading ? 'Uploading resume' : 'Upload resume'}
            onClick={() => fileRef.current?.click()}
          >
            {uploading ? (
              <span className="mobile-interview-spinner" aria-hidden />
            ) : (
              <>
                <span className="mobile-upload-btn-icon" aria-hidden>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 16V5M12 5l-4 4M12 5l4 4"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M5 19h14"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span className="mobile-upload-btn-label">Upload resume</span>
              </>
            )}
          </button>
        </div>
        <p className="mobile-upload-hint">PDF only, max 10MB</p>
        {uploadError ? <p className="mobile-interview-error">{uploadError}</p> : null}

        <h2 className="mobile-section-title">Basic Info</h2>
        <div className="mobile-settings-card mobile-info-stack">
          <FilledField label="Name" value={local.name} onChange={(name) => patch({ name })} />
          <FilledField
            label="Professional Summary"
            value={local.summary}
            onChange={(summary) => patch({ summary })}
            multiline
            rows={5}
          />
        </div>

        <h2 className="mobile-section-title">Work Experience</h2>
        <p className="mobile-section-hint">
          Show your relevant experience. Use bullet points with numbers and facts — e.g. “Increased sales by 30%”.
        </p>
        <DraggableList
          items={local.experience}
          onReorder={(experience) => patch({ experience })}
        >
          {(exp, _i, controls) => (
            <ExperienceCard
              key={exp.id}
              exp={exp}
              controls={controls}
              onChange={(next) =>
                patch((prev) => ({
                  ...prev,
                  experience: prev.experience.map((e) => (e.id === exp.id ? next : e)),
                }))
              }
              onRemove={() =>
                patch((prev) => ({
                  ...prev,
                  experience: prev.experience.filter((e) => e.id !== exp.id),
                }))
              }
            />
          )}
        </DraggableList>
        <button
          type="button"
          className="mobile-add-btn"
          onClick={() =>
            patch((prev) => ({
              ...prev,
              experience: [
                ...prev.experience,
                { id: uid(), title: '', company: '', dateRange: '', bullets: '' },
              ],
            }))
          }
        >
          + Add one more experience
        </button>

        <h2 className="mobile-section-title">Skills</h2>
        <div className="mobile-chips">
          {local.skills.map((skill, i) => (
            <span key={`${i}-${skill}`} className="mobile-chip">
              {skill}
              <button
                type="button"
                aria-label={`Remove ${skill}`}
                onClick={() => patch((prev) => ({ ...prev, skills: prev.skills.filter((_, idx) => idx !== i) }))}
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            className="mobile-chip-add"
            onClick={() => {
              const val = prompt('Add skill')
              if (val?.trim()) {
                const skill = val.trim()
                patch((prev) =>
                  prev.skills.includes(skill) ? prev : { ...prev, skills: [...prev.skills, skill] },
                )
              }
            }}
          >
            + Add
          </button>
        </div>

        <h2 className="mobile-section-title">Projects</h2>
        <DraggableList items={local.projects} onReorder={(projects) => patch({ projects })}>
          {(proj, _i, controls) => (
            <ProjectCard
              key={proj.id}
              proj={proj}
              controls={controls}
              onChange={(next) =>
                patch((prev) => ({
                  ...prev,
                  projects: prev.projects.map((p) => (p.id === proj.id ? next : p)),
                }))
              }
              onRemove={() =>
                patch((prev) => ({
                  ...prev,
                  projects: prev.projects.filter((p) => p.id !== proj.id),
                }))
              }
            />
          )}
        </DraggableList>
        <button
          type="button"
          className="mobile-add-btn"
          onClick={() =>
            patch((prev) => ({
              ...prev,
              projects: [...prev.projects, { id: uid(), name: '', tech: '', description: '' }],
            }))
          }
        >
          + Add one more project
        </button>

        <h2 className="mobile-section-title">Education</h2>
        <DraggableList items={local.education} onReorder={(education) => patch({ education })}>
          {(edu, _i, controls) => (
            <EducationCard
              key={edu.id}
              edu={edu}
              controls={controls}
              onChange={(next) =>
                patch((prev) => ({
                  ...prev,
                  education: prev.education.map((e) => (e.id === edu.id ? next : e)),
                }))
              }
              onRemove={() =>
                patch((prev) => ({
                  ...prev,
                  education: prev.education.filter((e) => e.id !== edu.id),
                }))
              }
            />
          )}
        </DraggableList>
        <button
          type="button"
          className="mobile-add-btn"
          onClick={() =>
            patch((prev) => ({
              ...prev,
              education: [...prev.education, { id: uid(), degree: '', details: '' }],
            }))
          }
        >
          + Add one more
        </button>

        <h2 className="mobile-section-title">Extra Context</h2>
        <div className="mobile-settings-card mobile-info-stack">
          <FilledField
            label="Extra context"
            value={local.extraContext}
            onChange={(extraContext) => patch({ extraContext })}
            multiline
            rows={4}
            placeholder="e.g., I'm transitioning from backend to frontend development…"
          />
        </div>
      </div>
    </div>
  )
}

function ExperienceCard({
  exp,
  controls,
  onChange,
  onRemove,
}: {
  exp: WorkExperience
  controls: ReorderControls
  onChange: (e: WorkExperience) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const headline = [exp.title, exp.company].filter(Boolean).join(' at ') || 'Experience'
  return (
    <ExpandableProfileCard
      title={headline}
      secondary={exp.dateRange || undefined}
      preview={open ? undefined : exp.bullets || undefined}
      open={open}
      onToggle={() => setOpen((o) => !o)}
      controls={controls}
      onDelete={onRemove}
    >
      <FilledField label="Job title" value={exp.title} onChange={(title) => onChange({ ...exp, title })} />
      <FilledField label="Company" value={exp.company} onChange={(company) => onChange({ ...exp, company })} />
      <FilledField
        label="Dates"
        value={exp.dateRange}
        onChange={(dateRange) => onChange({ ...exp, dateRange })}
        placeholder="Jun 2025 – Present"
      />
      <FilledField
        label="Highlights"
        value={exp.bullets}
        onChange={(bullets) => onChange({ ...exp, bullets })}
        multiline
        rows={4}
        placeholder="Bullet points with numbers and facts…"
      />
    </ExpandableProfileCard>
  )
}

function ProjectCard({
  proj,
  controls,
  onChange,
  onRemove,
}: {
  proj: Project
  controls: ReorderControls
  onChange: (p: Project) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <ExpandableProfileCard
      title={proj.name || 'Project'}
      meta={proj.tech || undefined}
      preview={proj.description || undefined}
      open={open}
      onToggle={() => setOpen((o) => !o)}
      controls={controls}
      onDelete={onRemove}
    >
      <FilledField label="Project name" value={proj.name} onChange={(name) => onChange({ ...proj, name })} />
      <FilledField
        label="Technologies"
        value={proj.tech}
        onChange={(tech) => onChange({ ...proj, tech })}
        placeholder="BERT, Python, TensorFlow"
      />
      <FilledField
        label="Description"
        value={proj.description}
        onChange={(description) => onChange({ ...proj, description })}
        multiline
        rows={4}
      />
    </ExpandableProfileCard>
  )
}

function EducationCard({
  edu,
  controls,
  onChange,
  onRemove,
}: {
  edu: Education
  controls: ReorderControls
  onChange: (e: Education) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <ExpandableProfileCard
      title={edu.degree || 'Education'}
      preview={edu.details || undefined}
      open={open}
      onToggle={() => setOpen((o) => !o)}
      controls={controls}
      onDelete={onRemove}
    >
      <FilledField label="Degree" value={edu.degree} onChange={(degree) => onChange({ ...edu, degree })} />
      <FilledField
        label="Details"
        value={edu.details}
        onChange={(details) => onChange({ ...edu, details })}
        multiline
        rows={2}
      />
    </ExpandableProfileCard>
  )
}