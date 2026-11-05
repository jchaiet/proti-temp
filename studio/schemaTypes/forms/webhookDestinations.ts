/**
 * Public, build-time Studio labels/keys. NEVER configure URLs or secrets here.
 * Example: SANITY_STUDIO_FORM_WEBHOOK_DESTINATIONS=
 *   contact:Contact Submissions,newsletter:Newsletter Signups,quotes:Quote Requests
 * The web API independently approves every key via server-only configuration.
 */
export function getFormWebhookDestinationOptions(configured = ''): Array<{
  title: string
  value: string
}> {
  const choices = [{title: 'Default Webhook', value: 'default'}]
  const seen = new Set(['default'])

  for (const entry of configured.split(',')) {
    const separator = entry.indexOf(':')
    if (separator < 1) continue
    const key = entry.slice(0, separator).trim()
    const title = entry.slice(separator + 1).trim()
    if (!/^[a-z][a-z0-9_-]{0,63}$/.test(key) || !title || seen.has(key)) continue
    seen.add(key)
    choices.push({title, value: key})
  }
  return choices
}
