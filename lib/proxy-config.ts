export const APP_ROUTES = {
  page_builder: {
    path: '/page-builder',
    target: process.env.PAGE_BUILDER_URL || 'http://localhost:3002',
    name: 'Page Builder'
  },
  email: {
    path: '/email',
    target: process.env.EMAIL_APP_URL || 'http://localhost:3003',
    name: 'Email Marketing'
  },
  webinar: {
    path: '/webinar',
    target: process.env.WEBINAR_APP_URL || 'http://localhost:3004',
    name: 'Webinar Platform'
  },
  lms: {
    path: '/lms',
    target: process.env.LMS_APP_URL || 'http://localhost:3005',
    name: 'LMS'
  }
}

export function getAppFromPath(pathname: string): string | null {
  for (const [key, config] of Object.entries(APP_ROUTES)) {
    if (pathname.startsWith(config.path)) {
      return key
    }
  }
  return null
}