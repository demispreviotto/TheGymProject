import type { ICONS } from './icons.registry';

/**
 * Union of every valid icon name — derived directly from the registry keys.
 * Adding a new entry to ICONS automatically widens this type.
 */
export type IconName = keyof typeof ICONS;
