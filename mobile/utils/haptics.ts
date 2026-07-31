import * as Haptics from 'expo-haptics';

/**
 * Safe haptic helpers — every call is fire-and-forget and swallows errors
 * (simulators / web / devices with haptics disabled must never crash a press).
 */

/** Light tap — tab presses, toggles, small buttons. */
export function tapHaptic(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Medium impact — primary CTAs, likes, sends. */
export function impactHaptic(): void {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}

/** Selection tick — pickers, segmented controls, option changes. */
export function selectHaptic(): void {
  Haptics.selectionAsync().catch(() => {});
}

/** Success notification — completed actions (RSVP, verified, posted). */
export function successHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

/** Warning notification — destructive confirms, validation errors. */
export function warningHaptic(): void {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
}
