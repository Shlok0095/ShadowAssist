import { useRef, useState } from 'react'
import type { AppSettings, Education, PersonalProfile, Project, WorkExperience } from '../profileTypes'
import { DraggableList, DragHandle, type ReorderControls } from '../components/DraggableList'
import { extractDocumentText } from '../pdfExtract'
import { getActiveApiKey } from '../profileStorage'
import { structureResumeText } from '../resumeParser'
import { structureCvWithLlm } from '../structureCv'

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function PersonalInfoScreen({
  profile,
  settings,
  onChange,
  onBack,
}: {
  profile: PersonalProfile
  settings: AppSettings
  onChange: (profile: PersonalProfile) => void
  onBack: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [uploadNote, setUploadNote] = useState<string | null>(null)

  const patch = (partial: Partial<PersonalProfile>) => onChange({ ...profile, ...partial })
  const hasApiKey = !!getActiveApiKey(settings)

  const onUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('PDF only, max 10MB.')
      return
    }
    setUploading(true)
    setUploadError(null)
    setUploadNote(null)
    try {
      const text = await extractDocumentText(file)
      let structured: PersonalProfile
      let note: string

      if (hasApiKey) {
        setUploadNote('Deep extraction with AI…')
        try {
          structured = await structureCvWithLlm(text, settings, file.name)
          note = 'CV imported with AI deep extraction.'
        } catch (llmErr) {
          console.warn('[cv]', llmErr)
          structured = structureResumeText(text, file.name)
          note = 'AI extraction failed — used basic parser. Check API key or try again.'
        }
      } else {
        structured = structureResumeText(text, file.name)
        note = 'CV imported. Add an API key in Settings for deeper extraction.'
      }

      onChange({
        ...structured,
        jobDescription: profile.jobDescription,
        extraContext: profile.extraContext || structured.extraContext,
      })
      setUploadNote(note)
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mobile-screen">
      <header className="mobile-screen-header">
        <button type="button" className="mobile-interview-icon-btn" onClick={onBack}>←</button>
        <h1 className="mobile-screen-title">Edit Personal Info</h1>
        <span className="w-9" />
      </header>

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
        <button
          type="button"
          className="mobile-upload-btn"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          📄 {uploading ? 'Parsing CV…' : 'Upload CV to auto-fill'}
        </button>
        <p className="mobile-upload-hint">
          PDF only, max 10MB{hasApiKey ? ' · AI deep extraction enabled' : ' · add API key for AI extraction'}
        </p>
        {uploadNote ? <p className="mobile-upload-note">{uploadNote}</p> : null}
        {uploadError ? <p className="mobile-interview-error">{uploadError}</p> : null}

        <h2 className="mobile-section-title">Basic Info</h2>
        <label className="mobile-field block">
          <span>Name</span>
          <input value={profile.name} onChange={(e) => patch({ name: e.target.value })} />
        </label>
        <label className="mobile-field block">
          <span>Professional Summary</span>
          <textarea
            rows={5}
            value={profile.summary}
            onChange={(e) => patch({ summary: e.target.value })}
          />
        </label>

        <h2 className="mobile-section-title">Work Experience</h2>
        <p className="mobile-section-hint">
          Drag ⋮⋮ or use arrows to reorder. Use bullet points with numbers and facts.
        </p>
        <DraggableList
          items={profile.experience}
          onReorder={(experience) => patch({ experience })}
        >
          {(exp, _i, controls) => (
            <ExperienceCard
              key={exp.id}
              exp={exp}
              controls={controls}
              onChange={(next) =>
                patch({
                  experience: profile.experience.map((e) => (e.id === exp.id ? next : e)),
                })
              }
              onRemove={() => patch({ experience: profile.experience.filter((e) => e.id !== exp.id) })}
            />
          )}
        </DraggableList>
        <button
          type="button"
          className="mobile-add-btn"
          onClick={() =>
            patch({
              experience: [
                ...profile.experience,
                { id: uid(), title: '', company: '', dateRange: '', bullets: '' },
              ],
            })
          }
        >
          + Add one more experience
        </button>

        <h2 className="mobile-section-title">Skills</h2>
        <p className="mobile-section-hint">Add skills that show you fit the position.</p>
        <div className="mobile-chips">
          {profile.skills.map((skill) => (
            <span key={skill} className="mobile-chip">
              {skill}
              <button
                type="button"
                aria-label={`Remove ${skill}`}
                onClick={() => patch({ skills: profile.skills.filter((s) => s !== skill) })}
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
              if (val?.trim()) patch({ skills: [...profile.skills, val.trim()] })
            }}
          >
            + Add
          </button>
        </div>

        <h2 className="mobile-section-title">Projects</h2>
        <p className="mobile-section-hint">Drag to reorder projects. Showcase portfolio pieces and impact.</p>
        <DraggableList items={profile.projects} onReorder={(projects) => patch({ projects })}>
          {(proj, _i, controls) => (
            <ProjectCard
              key={proj.id}
              proj={proj}
              controls={controls}
              onChange={(next) =>
                patch({ projects: profile.projects.map((p) => (p.id === proj.id ? next : p)) })
              }
              onRemove={() => patch({ projects: profile.projects.filter((p) => p.id !== proj.id) })}
            />
          )}
        </DraggableList>
        <button
          type="button"
          className="mobile-add-btn"
          onClick={() =>
            patch({
              projects: [...profile.projects, { id: uid(), name: '', tech: '', description: '' }],
            })
          }
        >
          + Add one more project
        </button>

        <h2 className="mobile-section-title">Education</h2>
        <p className="mobile-section-hint">Include degrees, certifications, and relevant coursework.</p>
        <DraggableList items={profile.education} onReorder={(education) => patch({ education })}>
          {(edu, _i, controls) => (
            <EducationCard
              key={edu.id}
              edu={edu}
              controls={controls}
              onChange={(next) =>
                patch({ education: profile.education.map((e) => (e.id === edu.id ? next : e)) })
              }
              onRemove={() => patch({ education: profile.education.filter((e) => e.id !== edu.id) })}
            />
          )}
        </DraggableList>
        <button
          type="button"
          className="mobile-add-btn"
          onClick={() =>
            patch({
              education: [...profile.education, { id: uid(), degree: '', details: '' }],
            })
          }
        >
          + Add one more
        </button>

        <h2 className="mobile-section-title">Extra Context</h2>
        <p className="mobile-section-hint">
          Career transitions, gaps, strengths to highlight, or other context for better answers.
        </p>
        <textarea
          className="mobile-textarea"
          rows={4}
          value={profile.extraContext}
          onChange={(e) => patch({ extraContext: e.target.value })}
          placeholder="e.g., I'm transitioning from backend to frontend development…"
        />

        <h2 className="mobile-section-title">Job Description</h2>
        <textarea
          className="mobile-textarea"
          rows={4}
          value={profile.jobDescription}
          onChange={(e) => patch({ jobDescription: e.target.value })}
          placeholder="Paste the role JD for fit questions…"
        />
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
    <div {...controls.cardProps}>
      <button type="button" className="mobile-list-card-head" onClick={() => setOpen((o) => !o)}>
        <DragHandle controls={controls} />
        <div className="mobile-list-card-title">
          <strong>{headline}</strong>
          {exp.dateRange ? <span>{exp.dateRange}</span> : null}
        </div>
        <span>{open ? '⌃' : '⌄'}</span>
      </button>
      {open ? (
        <div className="mobile-list-card-body">
          <input placeholder="Title" value={exp.title} onChange={(e) => onChange({ ...exp, title: e.target.value })} />
          <input
            placeholder="Company"
            value={exp.company}
            onChange={(e) => onChange({ ...exp, company: e.target.value })}
          />
          <input
            placeholder="Jun 2025 – Present"
            value={exp.dateRange}
            onChange={(e) => onChange({ ...exp, dateRange: e.target.value })}
          />
          <textarea
            rows={4}
            placeholder="Bullet points…"
            value={exp.bullets}
            onChange={(e) => onChange({ ...exp, bullets: e.target.value })}
          />
          <button type="button" className="mobile-remove-btn" onClick={onRemove}>Remove</button>
        </div>
      ) : null}
    </div>
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
  const headline = proj.name || 'Project'
  return (
    <div {...controls.cardProps}>
      <button type="button" className="mobile-list-card-head" onClick={() => setOpen((o) => !o)}>
        <DragHandle controls={controls} />
        <div className="mobile-list-card-title">
          <strong>{headline}</strong>
          {proj.tech ? <span>{proj.tech}</span> : null}
        </div>
        <span>{open ? '⌃' : '⌄'}</span>
      </button>
      {open ? (
        <div className="mobile-list-card-body">
          <input placeholder="Name" value={proj.name} onChange={(e) => onChange({ ...proj, name: e.target.value })} />
          <input
            placeholder="Tech stack"
            value={proj.tech}
            onChange={(e) => onChange({ ...proj, tech: e.target.value })}
          />
          <textarea
            rows={3}
            placeholder="Description"
            value={proj.description}
            onChange={(e) => onChange({ ...proj, description: e.target.value })}
          />
          <button type="button" className="mobile-remove-btn" onClick={onRemove}>Remove</button>
        </div>
      ) : null}
    </div>
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
    <div {...controls.cardProps}>
      <button type="button" className="mobile-list-card-head" onClick={() => setOpen((o) => !o)}>
        <DragHandle controls={controls} />
        <div className="mobile-list-card-title">
          <strong>{edu.degree || 'Education'}</strong>
        </div>
        <span>{open ? '⌃' : '⌄'}</span>
      </button>
      {open ? (
        <div className="mobile-list-card-body">
          <input
            placeholder="Degree"
            value={edu.degree}
            onChange={(e) => onChange({ ...edu, degree: e.target.value })}
          />
          <textarea
            rows={2}
            placeholder="Details"
            value={edu.details}
            onChange={(e) => onChange({ ...edu, details: e.target.value })}
          />
          <button type="button" className="mobile-remove-btn" onClick={onRemove}>Remove</button>
        </div>
      ) : null}
    </div>
  )
}
