export const SUPPRESS_NAV_FOCUS_ATTR = 'data-suppress-nav-focus-ring';

export function isNestedInteractivePointerTarget(
  target: EventTarget | null,
  currentTarget: HTMLElement,
) {
  if (!(target instanceof HTMLElement) || target === currentTarget) {
    return false;
  }

  const navigableId = currentTarget.getAttribute('data-navigable-id');
  if (navigableId?.startsWith('group-header:') && target.closest('.group-toggle')) {
    return false;
  }

  if (target.isContentEditable) {
    return true;
  }

  const interactiveTarget = target.closest(
    'input, textarea, select, button, a, [contenteditable="true"], [role="textbox"]',
  );

  if (interactiveTarget && (interactiveTarget as HTMLElement).dataset.navigableAction === 'true') {
    return false;
  }

  return Boolean(interactiveTarget && currentTarget.contains(interactiveTarget));
}

export function focusElementWithManagedRingSuppression(
  element: HTMLElement,
  options?: { suppressFocusRingAttribute?: boolean },
) {
  const suppressFocusRingAttribute = options?.suppressFocusRingAttribute ?? true;
  let cleared = false;
  const clearSuppress = () => {
    if (cleared) {
      return;
    }
    cleared = true;
    element.removeEventListener('blur', onBlur);
    element.removeAttribute(SUPPRESS_NAV_FOCUS_ATTR);
  };
  const onBlur = () => {
    clearSuppress();
  };

  element.addEventListener('blur', onBlur, { once: true });
  if (suppressFocusRingAttribute) {
    element.setAttribute(SUPPRESS_NAV_FOCUS_ATTR, 'true');
  }
  element.focus({ preventScroll: true });
}
