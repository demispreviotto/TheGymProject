/**
 * Icon registry — assembles the ICONS map from individual svg/* modules.
 *
 * This file is intentionally thin. All SVG data lives in svg/<name>.ts.
 * To add an icon: create svg/<name>.ts, import it here, add the key below.
 *
 * The `as const` assertion lets TypeScript derive IconName automatically
 * from the keys — no manual type union to maintain.
 */
import { addressBookTabs } from './svg/address-book-tabs';
import { arrowRightFromBracket } from './svg/arrow-right-from-bracket';
import { bars } from './svg/bars';
import { bolt } from './svg/bolt';
import { calendar } from './svg/calendar';
import { check } from './svg/check';
import { chevronDown } from './svg/chevron-down';
import { dragHandle } from './svg/drag-handle';
import { envelope } from './svg/envelope';
import { eye } from './svg/eye';
import { eyeSlash } from './svg/eye-slash';
import { listNumbers } from './svg/list-numbers';
import { lockClosed } from './svg/lock-closed';
import { lockOpen } from './svg/lock-open';
import { plus } from './svg/plus';
import { share } from './svg/share';
import { shieldSlash } from './svg/shield-slash';
import { spinner } from './svg/spinner';
import { star } from './svg/star';
import { strategy } from './svg/strategy';
import { translate } from './svg/translate';
import { user } from './svg/user';
import { userGroup } from './svg/user-group';
import { userPlus } from './svg/user-plus';
import { users } from './svg/users';
import { xMark } from './svg/x-mark';

export const ICONS = {
  'address-book-tabs': addressBookTabs,
  'arrow-right-from-bracket': arrowRightFromBracket,
  'bars': bars,
  'bolt': bolt,
  'calendar': calendar,
  'check': check,
  'chevron-down': chevronDown,
  'drag-handle': dragHandle,
  'envelope': envelope,
  'eye': eye,
  'eye-slash': eyeSlash,
  'list-numbers': listNumbers,
  'lock-closed': lockClosed,
  'lock-open': lockOpen,
  'plus': plus,
  'share': share,
  'shield-slash': shieldSlash,
  'spinner': spinner,
  'star': star,
  'strategy': strategy,
  'translate': translate,
  'user': user,
  'user-group': userGroup,
  'user-plus': userPlus,
  'users': users,
  'x-mark': xMark,
} as const;
