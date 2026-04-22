export const SUPPRESS_NAV_FOCUS_ATTR = 'data-suppress-nav-focus-ring';

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
