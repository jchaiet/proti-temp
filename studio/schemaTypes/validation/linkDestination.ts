type LinkValue = {
  type?: string
}

type NavigationItemValue = {
  link?: unknown
  children?: unknown[]
  mode?: string
  megaMenu?: {sections?: unknown[]}
}

/**
 * Does this Link represent an authored destination?
 *
 * The shared Link schema intentionally supports `type: "none"` so optional
 * link fields can exist without navigating anywhere. Consumers that require a
 * real destination should use this helper rather than only checking whether
 * the Link object itself exists.
 */
export function hasLinkDestination(value: unknown): boolean {
  const link = value as LinkValue | undefined

  return Boolean(link?.type && link.type !== 'none')
}

/**
 * Shared field-level validator for places where a Link is mandatory.
 *
 * Destination-specific requirements (Internal Page, External URL, Email,
 * Phone, Anchor) remain owned by the shared Link schema. This validator only
 * closes the `type: "none"` loophole for required-link consumers.
 */
export function validateRequiredLink(
  value: unknown,
  message = 'Link must have a destination.',
): true | string {
  return hasLinkDestination(value) ? true : message
}

/**
 * Top-level Navigation Items may intentionally be dropdown-only. They are
 * valid when they have either a real Link destination or at least one child.
 */
export function validateNavigationItemDestination(value: unknown): true | string {
  if (!value) {
    return true
  }

  const item = value as NavigationItemValue

  if (item.mode === 'mega') {
    return (item.megaMenu?.sections?.length ?? 0) > 0
      ? true
      : 'Add a Mega Menu with at least one section.'
  }

  if (item.mode === 'dropdown') {
    return (item.children?.length ?? 0) > 0 ? true : 'Add at least one Dropdown Item.'
  }

  if (item.mode === 'link') {
    return hasLinkDestination(item.link) ? true : 'Add a Link destination.'
  }

  // Legacy documents have no explicit mode; infer their existing behavior.
  if (hasLinkDestination(item.link) || (item.children?.length ?? 0) > 0) {
    return true
  }

  return 'Add a Link or at least one Dropdown Item.'
}
