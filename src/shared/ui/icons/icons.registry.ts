/**
 * Icon registry — assembles the ICONS map from individual svg/* modules.
 *
 * This file is intentionally thin. All SVG data lives in svg/<name>.ts.
 * To add an icon: create svg/<name>.ts, import it here, add the key below.
 *
 * The `as const` assertion lets TypeScript derive IconName automatically
 * from the keys — no manual type union to maintain.
 *
 * ── Where the icons come from ──────────────────────────────────────────────
 * Every icon is from Phosphor Icons (https://phosphoricons.com), Regular
 * weight, MIT licensed. To add one:
 *   1. Find it at https://phosphoricons.com and pick the "Regular" weight.
 *   2. Click the icon → "Copy SVG" (or fetch the file from
 *      https://github.com/phosphor-icons/core/tree/main/assets/regular).
 *   3. Create svg/<name>.ts with a `// Phosphor: <Name> — <url>` header and
 *      the inner elements of the <svg> (without the <svg> wrapper) as a string.
 *   4. Import it below and add the key to ICONS.
 * All icons use a 256×256 viewBox and `currentColor`, so size and colour come
 * from the Tailwind classes passed to <app-icon>.
 */
import { addressBookTabs } from './svg/address-book-tabs';
import { arrowRightFromBracket } from './svg/arrow-right-from-bracket';
import { barbell } from './svg/barbell';
import { bars } from './svg/bars';
import { bolt } from './svg/bolt';
import { brain } from './svg/brain';
import { calendar } from './svg/calendar';
import { check } from './svg/check';
import { checks } from './svg/checks';
import { chevronDown } from './svg/chevron-down';
import { dotsThree } from './svg/dots-three';
import { dragHandle } from './svg/drag-handle';
import { envelope } from './svg/envelope';
import { eye } from './svg/eye';
import { eyeSlash } from './svg/eye-slash';
import { listNumbers } from './svg/list-numbers';
import { lockClosed } from './svg/lock-closed';
import { lockers } from './svg/lockers';
import { lockOpen } from './svg/lock-open';
import { minus } from './svg/minus';
import { pencil } from './svg/pencil';
import { plus } from './svg/plus';
import { share } from './svg/share';
import { trash } from './svg/trash';
import { shieldSlash } from './svg/shield-slash';
import { spinner } from './svg/spinner';
import { star } from './svg/star';
import { strategy } from './svg/strategy';
import { timer } from './svg/timer';
import { translate } from './svg/translate';
import { user } from './svg/user';
import { userGroup } from './svg/user-group';
import { userPlus } from './svg/user-plus';
import { users } from './svg/users';
import { xMark } from './svg/x-mark';

export const ICONS = {
  'address-book-tabs': addressBookTabs,
  'arrow-right-from-bracket': arrowRightFromBracket,
  'barbell': barbell,
  'bars': bars,
  'bolt': bolt,
  'brain': brain,
  'calendar': calendar,
  'check': check,
  'checks': checks,
  'chevron-down': chevronDown,
  'dots-three': dotsThree,
  'drag-handle': dragHandle,
  'envelope': envelope,
  'eye': eye,
  'eye-slash': eyeSlash,
  'list-numbers': listNumbers,
  'lock-closed': lockClosed,
  'lock-open': lockOpen,
  'lockers': lockers,
  'minus': minus,
  'pencil': pencil,
  'plus': plus,
  'share': share,
  'trash': trash,
  'shield-slash': shieldSlash,
  'spinner': spinner,
  'star': star,
  'strategy': strategy,
  'timer': timer,
  'translate': translate,
  'user': user,
  'user-group': userGroup,
  'user-plus': userPlus,
  'users': users,
  'x-mark': xMark,
} as const;
