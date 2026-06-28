import overview from '../../../docs/user-guide/01-overview.md?raw'
import install from '../../../docs/user-guide/02-install-and-first-launch.md?raw'
import overlay from '../../../docs/user-guide/03-overlay.md?raw'
import listen from '../../../docs/user-guide/04-listen-and-transcription.md?raw'
import asking from '../../../docs/user-guide/05-asking-ai.md?raw'
import profile from '../../../docs/user-guide/06-profile-and-skills.md?raw'
import providers from '../../../docs/user-guide/07-ai-providers.md?raw'
import intelligence from '../../../docs/user-guide/08-intelligence-and-memory.md?raw'
import calendar from '../../../docs/user-guide/09-calendar-and-recaps.md?raw'
import phone from '../../../docs/user-guide/10-phone.md?raw'
import auxWindows from '../../../docs/user-guide/11-global-chat-and-launcher.md?raw'
import keybinds from '../../../docs/user-guide/12-keybinds.md?raw'
import privacy from '../../../docs/user-guide/13-privacy-and-data.md?raw'
import troubleshooting from '../../../docs/user-guide/14-troubleshooting.md?raw'

export type DocPage = {
  slug: string
  title: string
  lede: string
  markdown: string
  group?: string
}

export const DOC_PAGES: DocPage[] = [
  {
    slug: 'overview',
    title: 'Overview',
    lede: 'What VeilAssist does, BYOK, the basic loop, and settings map.',
    markdown: overview,
    group: 'Start here',
  },
  {
    slug: 'install-and-first-launch',
    title: 'Install and first launch',
    lede: 'Download, consent, onboarding, tray, and uninstall.',
    markdown: install,
    group: 'Start here',
  },
  {
    slug: 'overlay',
    title: 'Floating overlay',
    lede: 'Notch, expand/collapse, move, resize, stealth, and reading modes.',
    markdown: overlay,
    group: 'Core features',
  },
  {
    slug: 'listen-and-transcription',
    title: 'Listen and transcription',
    lede: 'Start/stop session, mic, loopback, local vs cloud STT, recaps.',
    markdown: listen,
    group: 'Core features',
  },
  {
    slug: 'asking-ai',
    title: 'Asking AI',
    lede: 'Hotkeys, context sources, action chips, skills, and vision.',
    markdown: asking,
    group: 'Core features',
  },
  {
    slug: 'profile-and-skills',
    title: 'Profile and skills',
    lede: 'Persona modes, templates, resume, reference files, /skills.',
    markdown: profile,
    group: 'Core features',
  },
  {
    slug: 'ai-providers',
    title: 'AI providers',
    lede: 'Chat providers, models, custom endpoints, vision requirements.',
    markdown: providers,
    group: 'Configuration',
  },
  {
    slug: 'intelligence-and-memory',
    title: 'Intelligence and memory',
    lede: 'Smart routing, LTM, vector memory, search, Hindsight.',
    markdown: intelligence,
    group: 'Configuration',
  },
  {
    slug: 'calendar-and-recaps',
    title: 'Calendar and recaps',
    lede: 'Google Calendar, reminders, detection, session summaries.',
    markdown: calendar,
    group: 'Configuration',
  },
  {
    slug: 'phone',
    title: 'Phone companion',
    lede: 'Phone Link QR, remote mic, Android USB mirror.',
    markdown: phone,
    group: 'Configuration',
  },
  {
    slug: 'global-chat-and-launcher',
    title: 'Global Chat and Launcher',
    lede: 'Tray windows for text chat and quick session control.',
    markdown: auxWindows,
    group: 'Configuration',
  },
  {
    slug: 'keybinds',
    title: 'Keyboard shortcuts',
    lede: 'Default hotkeys and how to customize them.',
    markdown: keybinds,
    group: 'Reference',
  },
  {
    slug: 'privacy-and-data',
    title: 'Privacy and data',
    lede: 'What is stored locally, BYOK traffic, export and delete.',
    markdown: privacy,
    group: 'Reference',
  },
  {
    slug: 'troubleshooting',
    title: 'Troubleshooting',
    lede: 'Common fixes for capture, STT, vision, calendar, and phone.',
    markdown: troubleshooting,
    group: 'Reference',
  },
]

export function getDocPage(slug: string): DocPage | undefined {
  return DOC_PAGES.find((p) => p.slug === slug)
}

export const DOC_GROUPS = [...new Set(DOC_PAGES.map((p) => p.group).filter(Boolean))] as string[]
