import {defineCliConfig} from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: '3k4hstk3',
    dataset: 'production',
  },
  deployment: {
    appId: 'wqr59yf1wbq7p3r2861n8z6t',
    autoUpdates: true,
  },
})
