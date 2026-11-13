import { ValidationError } from '@shared/errors/DomainError';

/** Required even in development: an omitted or malformed boundary must never enable delivery. */
export function getMenuSendNotBefore(): Date {
  const value = process.env.MENU_SEND_NOT_BEFORE || '';
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/);
  const invalid = 'MENU_SEND_NOT_BEFORE에 명시적 타임존을 포함한 유효한 ISO timestamp가 필요합니다';
  if (!match) throw new ValidationError(invalid);
  const [, year, month, day, hour, minute, second, zone] = match;
  const calendar = new Date(`${year}-${month}-${day}T00:00:00Z`);
  if (
    !Number.isFinite(calendar.getTime()) || calendar.getUTCMonth() + 1 !== Number(month) ||
    calendar.getUTCDate() !== Number(day) || Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59 ||
    (zone !== 'Z' && (Number(zone.slice(1, 3)) > 23 || Number(zone.slice(4)) > 59))
  ) throw new ValidationError(invalid);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new ValidationError(invalid);
  return date;
}

/** Use UTC getters on the shifted clock so host timezone cannot change the KST window. */
export function isMenuCheckWindow(now = new Date()): boolean {
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return kst.getUTCDay() >= 1 && kst.getUTCDay() <= 5 &&
    kst.getUTCHours() >= 9 && kst.getUTCHours() <= 15;
}
