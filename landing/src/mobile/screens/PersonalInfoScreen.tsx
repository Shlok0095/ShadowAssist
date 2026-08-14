import { useRef, useState } from 'react'
import type { Education, PersonalProfile, Project, WorkExperience } from '../profileTypes'
import { extractDocumentText } from '../pdfExtract'
import { structureResumeText } from '../resumeParser'

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
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const patch = (partial: Partial<PersonalProfile>) => onChange({ ...profile, ...partial })

  const onUpload = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('PDF only, max 10MB.')
      return
    }
    setUploading(true)
    setUploadError(null)
    try {
      const text = await extractDocumentText(file)
      const structured = structureResumeText(text, file.name)
      onChange({
        ...structured,
        jobDescription: profile.jobDescription,
        extraContext: profile.extraContext || structured.extraContext,
      })
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
        <p className="mobile-upload-hint">PDF only, max 10MB</p>
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
          Show your relevant experience. Use bullet points with numbers and facts.
        </p>
        {profile.experience.map((exp) => (
          <ExperienceCard
            key={exp.id}
            exp={exp}
            onChange={(next) =>
              patch({
                experience: profile.experience.map((e) => (e.id === exp.id ? next : e)),
              })
            }
            onRemove={() => patch({ experience: profile.experience.filter((e) => e.id !== exp.id) })}
          />
        ))}
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
        <p className="mobile-section-hint">Personal projects or portfolio pieces that showcase your skills.</p>
        {profile.projects.map((proj) => (
          <ProjectCard
            key={proj.id}
            proj={proj}
            onChange={(next) =>
              patch({ projects: profile.projects.map((p) => (p.id === proj.id ? next : p)) })
            }
            onRemove={() => patch({ projects: profile.projects.filter((p) => p.id !== proj.id) })}
          />
        ))}
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
        {profile.education.map((edu) => (
          <EducationCard
            key={edu.id}
            edu={edu}
            onChange={(next) =>
              patch({ education: profile.education.map((e) => (e.id === edu.id ? next : e)) })
            }
            onRemove={() => patch({ education: profile.education.filter((e) => e.id !== edu.id) })}
          />
        ))}
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
  onChange,
  onRemove,
}: {
  exp: WorkExperience
  onChange: (e: WorkExperience) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const headline = [exp.title, exp.company].filter(Boolean).join(' at ') || 'Experience'
  return (
    <div className="mobile-list-card">
      <button type="button" className="mobile-list-card-head" onClick={() => setOpen((o) => !o)}>
        <span className="mobile-drag">⋮⋮</span>
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
  onChange,
  onRemove,
}: {
  proj: Project
  onChange: (p: Project) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  const headline = proj.name || 'Project'
  return (
    <div className="mobile-list-card">
      <button type="button" className="mobile-list-card-head" onClick={() => setOpen((o) => !o)}>
        <span className="mobile-drag">⋮⋮</span>
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
  onChange,
  onRemove,
}: {
  edu: Education
  onChange: (e: Education) => void
  onRemove: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mobile-list-card">
      <button type="button" className="mobile-list-card-head" onClick={() => setOpen((o) => !o)}>
        <span className="mobile-drag">⋮⋮</span>
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
