import {defineCliConfig} from 'sanity/cli'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.SANITY_STUDIO_DATASET
const appId = process.env.SANITY_STUDIO_APP_ID

export default defineCliConfig({
  api: {
    projectId,
    dataset,
  },

  deployment: {
    ...(appId ? {appId} : {}),
    autoUpdates: true,
  },
})
