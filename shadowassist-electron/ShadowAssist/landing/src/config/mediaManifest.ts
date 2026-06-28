/**
 * Media slots for the marketing homepage.
 * Put files in `landing/public/` and reference them here (e.g. `/videos/hero.mp4`).
 *
 * | Key                    | Section              | Type              | Behavior when set        |
 * |------------------------|----------------------|-------------------|--------------------------|
 * | heroVideo              | Hero (top)           | .mp4 / .webm      | Autoplay, muted, loop    |
 * | meetingListenClip      | How it works · left  | .mp4 mini clip    | Autoplay, muted, loop    |
 * | meetingAssistClip      | How it works · right | .mp4 mini clip    | Autoplay, muted, loop    |
 * | notesScreenshot        | Instant notes        | image             | Static screenshot        |
 * | undetectable[0..2]     | 3 feature cards      | image / 3D render | Static                   |
 * | transcriptionScreenshot| Transcription split  | image             | Static screenshot        |
 * | footerDecor            | Footer CTA           | image / 3D keys   | Static                   |
 */
export const MEDIA = {
  heroVideo: '',
  meetingListenClip: '',
  meetingAssistClip: '',
  notesScreenshot: '',
  undetectable: ['', '', ''] as const,
  transcriptionScreenshot: '',
  footerDecor: '',
} as const
