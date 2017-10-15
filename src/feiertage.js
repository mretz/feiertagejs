// @flow

/*!
 * feiertage.js
 * @repository https://github.com/sfakir/feiertagejs
 * @docs
 *
 * Copyright 2015-2017 Simon Fakir
 * Released under the MIT license
 */

//
// Additional readings
// - how to format a javascript date: http://blog.stevenlevithan.com/archives/date-time-format
// - the right javascript date: http://stackoverflow.com/questions/10286204/the-right-json-date-format
//

import type { Region } from './regions';
import { allRegions } from './regions';
import type { HolidayType } from './holiday-type';
import { allHolidays } from './holiday-type';
import type { Holiday } from './holiday';
import { germanTranslations } from './german-translations';

const env = 'prod'; // (process && process.env && process.env.NODE_ENV && process.env.NODE_ENV == 'test' ? 'test' : 'prod');

// translations

const defaultLanguage = 'de';
let currentLanguage = defaultLanguage;

/**
 * Map of {@link HolidayType} to translation string.
 */
export type TranslationTable = {
  [key: HolidayType]: string
};

const translations: { [key: string]: TranslationTable } = {
  de: germanTranslations
};

/**
 * adds a translation for the holidays (e.g. english).
 * This also allows to override the German names.
 * Hint: Interpolates German for missing translations
 * @param {string} isoCode of the new language
 * @param {TranslationTable} newTranslation  map of {HolidayType} to translation stringg
 */
export function addTranslation(
  isoCode: string,
  newTranslation: TranslationTable
) {
  isoCode = isoCode.toLowerCase();
  const defaultTranslation = translations[defaultLanguage];
  let missingFields = false;

  // fill new Translation with default Language
  for (let prop in defaultTranslation) {
    if (!defaultTranslation.hasOwnProperty(prop)) continue;
    if (!newTranslation[prop]) {
      missingFields = true;
      newTranslation[prop] = defaultTranslation[prop];
    }
  }
  if (missingFields) {
    console.warn(
      '[feiertagejs] addTranslation: you did not add all holidays in your translation! Took German as fallback'
    );
  }

  translations[isoCode] = newTranslation;
}

/**
 * Set a language to default language
 * @param {string} isoCode
 */
export function setLanguage(isoCode: string) {
  isoCode = isoCode.toLowerCase();
  if (!translations[isoCode]) {
    if (env !== 'test') {
      console.error(
        `[feiertagejs] tried to set language to ${isoCode} but the translation is missing. Please use addTranslation(isoCode,object) first`
      );
    }
    return;
  }
  currentLanguage = isoCode;
}

/**
 * Get currently set language
 * @returns {string}
 */
export function getLanguage(): string {
  return currentLanguage;
}

// holidays api

/**
 * Checks if a specific date is sunday or holiday.
 * @param date
 * @param region
 * @returns {boolean}
 */
export function isSunOrHoliday(date: Date, region: Region): boolean {
  checkRegion(region);
  return date.getDay() === 0 || isHoliday(date, region);
}

/**
 * Check is specific date is holiday.
 * @param date
 * @param {Region} region two character {@link Region} code
 * @returns {boolean}
 */
export function isHoliday(date: Date, region: Region): boolean {
  checkRegion(region);
  date = new Date(date);

  const year = date.getFullYear();
  const internalDate = toUtcTimestamp(date);
  const holidays = _getHolidaysIntegerRepresentation(year, region);

  return holidays.indexOf(internalDate) !== -1;
}

export function getHolidayByDate(
  date: Date,
  region: Region = 'ALL'
): Holiday | undefined {
  checkRegion(region);
  const holidays = _getHolidaysObjectRepresentation(date.getFullYear(), region);
  return holidays.find(holiday => holiday.equals(date));
}

// additional runtime checks

/**
 * Checks if the given region is a valid {@link Region}.
 *
 * @param region {@link Region} to check
 * @throws {Error}
 * @private
 */
function checkRegion(region: ?Region) {
  if (allRegions.indexOf(region) === -1) {
    throw new Error(
      `Invalid region: ${region}! Must be one of ${allRegions.toString()}`
    );
  }
}

/**
 * Checks if the given holidayName is a valid {@link HolidayType}.
 * @param holidayName {@link HolidayType} to check
 * @throws {Error}
 * @private
 */
function checkHolidayType(holidayName: ?HolidayType) {
  if (
    holidayName === null ||
    holidayName === undefined ||
    allHolidays.indexOf(holidayName) === -1
  ) {
    throw new Error(
      `feiertage.js: invalid holiday type "${holidayName}"! Must be one of ${allHolidays.toString()}`
    );
  }
}

export function isSpecificHoliday(
  date: Date,
  holidayName: HolidayType,
  region: Region = 'ALL'
): boolean {
  checkRegion(region);
  checkHolidayType(holidayName);
  const holidays = _getHolidaysObjectRepresentation(date.getFullYear(), region);
  return holidays.find(holiday => holiday.equals(date)) !== undefined;
}

/**
 * Returns all holidays of a year in a {@link Region}.
 * @param year
 * @param region
 * @returns {Array.<Holiday>}
 */
export function getHolidays(year: number, region: Region) {
  checkRegion(region);
  return _getHolidaysObjectRepresentation(year, region);
}

/**
 *
 * @param year
 * @param region
 * @returns {*}
 * @private
 */
function _getHolidaysIntegerRepresentation(year: number, region: Region) {
  const holidays = _getHolidaysOfYear(year, region);
  return holidays.integers;
}

/**
 *
 * @param year
 * @param region
 * @returns {Array.<Holiday>}
 * @private
 */
function _getHolidaysObjectRepresentation(year: number, region: Region) {
  const holidays = _getHolidaysOfYear(year, region);
  return holidays.objects;
}

/**
 *
 * @param year
 * @param region
 * @returns {{objects: Array.<Holiday>, integers}}
 * @private
 */
function _getHolidaysOfYear(year: number, region: Region) {
  const feiertageObjects: Array<Holiday> = [
    _newHoliday('NEUJAHRSTAG', _makeDate(year, 1, 1)),
    _newHoliday('TAG_DER_ARBEIT', _makeDate(year, 5, 1)),
    _newHoliday('DEUTSCHEEINHEIT', _makeDate(year, 10, 3)),
    _newHoliday('ERSTERWEIHNACHTSFEIERTAG', _makeDate(year, 12, 25)),
    _newHoliday('ZWEITERWEIHNACHTSFEIERTAG', _makeDate(year, 12, 26))
  ];

  const easter_date = getEasterDate(year);
  let karfreitag = new Date(easter_date.getTime());
  karfreitag = addDays(karfreitag, -2);
  let ostermontag = new Date(easter_date.getTime());
  ostermontag = addDays(ostermontag, 1);
  let christi_himmelfahrt = new Date(easter_date.getTime());
  christi_himmelfahrt = addDays(christi_himmelfahrt, 39);
  let pfingstsonntag = new Date(easter_date.getTime());
  pfingstsonntag = addDays(pfingstsonntag, 49);

  let pfingstmontag = new Date(easter_date.getTime());
  pfingstmontag = addDays(pfingstmontag, 50);

  feiertageObjects.push(_newHoliday('KARFREITAG', karfreitag));
  feiertageObjects.push(_newHoliday('OSTERMONTAG', ostermontag));
  feiertageObjects.push(_newHoliday('CHRISTIHIMMELFAHRT', christi_himmelfahrt));
  feiertageObjects.push(_newHoliday('PFINGSTMONTAG', pfingstmontag));

  // Heilige 3 Koenige
  if (
    region === 'BW' ||
    region === 'BY' ||
    region === 'ST' ||
    region === 'ALL'
  ) {
    feiertageObjects.push(
      _newHoliday('HEILIGEDREIKOENIGE', _makeDate(year, 1, 6))
    );
  }
  if (region === 'BB' || region === 'ALL') {
    feiertageObjects.push(_newHoliday('OSTERSONNTAG', easter_date));
    feiertageObjects.push(_newHoliday('PFINGSTSONNTAG', pfingstsonntag));
  }
  // Fronleichnam
  if (
    region === 'BW' ||
    region === 'BY' ||
    region === 'HE' ||
    region === 'NW' ||
    region === 'RP' ||
    region === 'SL' ||
    region === 'ALL'
  ) {
    let fronleichnam = new Date(easter_date.getTime());
    fronleichnam = addDays(fronleichnam, 60);
    feiertageObjects.push(_newHoliday('FRONLEICHNAM', fronleichnam));
  }

  // Maria Himmelfahrt
  if (region === 'SL' || region === 'ALL') {
    feiertageObjects.push(
      _newHoliday('MARIAHIMMELFAHRT', _makeDate(year, 8, 15))
    );
  }
  // Reformationstag

  if (
    year === 2017 ||
    region === 'BB' ||
    region === 'MV' ||
    region === 'SN' ||
    region === 'ST' ||
    region === 'TH' ||
    region === 'ALL'
  ) {
    feiertageObjects.push(
      _newHoliday('REFORMATIONSTAG', _makeDate(year, 10, 31))
    );
  }

  // Allerheiligen
  if (
    region === 'BW' ||
    region === 'BY' ||
    region === 'NW' ||
    region === 'RP' ||
    region === 'SL' ||
    region === 'ALL'
  ) {
    feiertageObjects.push(_newHoliday('ALLERHEILIGEN', _makeDate(year, 11, 1)));
  }

  // Buss und Bettag
  if (region === 'SN' || region === 'ALL') {
    // @todo write test
    const bussbettag = getBussBettag(year);
    feiertageObjects.push(
      _newHoliday(
        'BUBETAG',
        _makeDate(
          bussbettag.getUTCFullYear(),
          bussbettag.getUTCMonth() + 1,
          bussbettag.getUTCDate()
        )
      )
    );
  }

  feiertageObjects.sort(
    (a: Holiday, b: Holiday) => a.date.getTime() - b.date.getTime()
  );

  return {
    objects: feiertageObjects,
    integers: generateIntegerRepresentation(feiertageObjects)
  };
}

/**
 *
 * @param objects
 * @returns {Array}
 * @private
 */
function generateIntegerRepresentation(objects: Array<Holiday>) {
  return objects.map(holiday => toUtcTimestamp(holiday.date));
}

/**
 * Calculates the Easter date of a given year.
 * @param year {number}
 * @returns {Date} Easter date
 * @private
 */
function getEasterDate(year: number): Date {
  const C = Math.floor(year / 100);
  const N = year - 19 * Math.floor(year / 19);
  const K = Math.floor((C - 17) / 25);
  let I = C - Math.floor(C / 4) - Math.floor((C - K) / 3) + 19 * N + 15;
  I -= 30 * Math.floor(I / 30);
  I -=
    Math.floor(I / 28) *
    (1 -
      Math.floor(I / 28) *
        Math.floor(29 / (I + 1)) *
        Math.floor((21 - N) / 11));
  let J = year + Math.floor(year / 4) + I + 2 - C + Math.floor(C / 4);
  J -= 7 * Math.floor(J / 7);
  const L = I - J;
  const M = 3 + Math.floor((L + 40) / 44);
  const D = L + 28 - 31 * Math.floor(M / 4);
  return new Date(year, M - 1, D);
}

/**
 * Computes the "Buss- und Bettag"'s date.
 * @param jahr {number}
 * @returns {Date} the year's "Buss- und Bettag" date
 * @private
 */
function getBussBettag(jahr: number): Date {
  const weihnachten = new Date(jahr, 11, 25, 12, 0, 0);
  const ersterAdventOffset = 32;
  let wochenTagOffset = weihnachten.getDay() % 7;

  if (wochenTagOffset === 0) wochenTagOffset = 7;

  let tageVorWeihnachten = wochenTagOffset + ersterAdventOffset;

  let bbtag = new Date(weihnachten.getTime());
  bbtag = addDays(bbtag, -tageVorWeihnachten);

  return bbtag;
}

/**
 * Adds {@code days} days to the given {@link Date}.
 * @param date
 * @param days
 * @returns {Date}
 * @private
 */
function addDays(date: Date, days: number): Date {
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Creates a new {@link Date}.
 * @param year
 * @param naturalMonth month (1-12)
 * @param day
 * @returns {Date}
 * @private
 */
function _makeDate(year: number, naturalMonth: number, day: number): Date {
  return new Date(year, naturalMonth - 1, day);
}

/**
 *
 * @param name
 * @param date
 * @returns {Holiday}
 * @private
 */
function _newHoliday(name: HolidayType, date: Date): Holiday {
  return {
    name,
    date,
    dateString: _localeDateObjectToDateString(date),
    trans(lang = currentLanguage) {
      return translations[lang][this.name];
    },
    getNormalizedDate() {
      return toUtcTimestamp(this.date);
    },
    equals(date) {
      const string = _localeDateObjectToDateString(date);
      return this.dateString === string;
    }
  };
}

/**
 *
 * @param date
 * @returns {string}
 * @private
 */
function _localeDateObjectToDateString(date) {
  date = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  date.setUTCHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

/**
 * Returns the UTC timestamp of the given date with hours, minutes, seconds, and milliseconds set to zero.
 * @param date
 * @returns {number} UTC timestamp
 */
function toUtcTimestamp(date: Date): number {
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}