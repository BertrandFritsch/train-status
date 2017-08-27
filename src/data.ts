import * as moment from 'moment';

const MINUTES_PER_DAY = 24 * 60;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const MILLISECONDS_PER_MINUTE = 1000 * 60;
const MILLISECONDS_PER_TIMEZONEOFFSET = new Date().getTimezoneOffset() * 60 * 1000;

interface RawTrip {
  date: string,
  stops: Array<{
    date: string,
    id: string,
    stepIn: number,
    stepOut: number
  }>
}

interface TripStopPoint {
  date: Date,
  id: string,
  stepIn: number,
  stepOut: number
}

interface Trip {
  date: Date,
  stops: Array<TripStopPoint>
}

export interface StepInByPeriod {
  date: Date,
  stepIn: number
}

const trips: Trip[] =
  (require('../data/completed-trips.json') as RawTrip[])
    .map(trip => ({
      date: new Date(trip.date),
      stops: trip.stops.map(stop => ({
        ...stop,
        date: new Date(stop.date)
      }))
    }));

export function filterTripsOfStopPoint(id: string) {
  return trips
    .filter(trip => trip.stops.some(stop => stop.id === id))
    .map(trip => trip.stops.filter(stop => stop.id === id)[ 0 ]);
}

function getMinutesOfDay(date: Date) {
  return (date.getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).getTime()) / MILLISECONDS_PER_MINUTE;
}

/**
 * Get the number of travellers (step in) by the provided interval
 * @param {TripStopPoint[]} stops The list of stop points to consider
 * @param {number} minutesPerPeriod The interval
 * @returns {StepInByPeriod[]}
 */
export function stepInByPeriod(stops: StepInByPeriod[], minutesPerPeriod: number = 60): StepInByPeriod[] {
  // const periods = Math.ceil(24 * 60 / minutesByPeriod);
  const periods = Math.ceil(MINUTES_PER_DAY / minutesPerPeriod);

  const hour0 = moment().startOf('day').toDate();
  const arr = Array.apply(null, {length: periods}).map((_: undefined, i: number) => ({
    date: new Date(hour0.getTime() + i * minutesPerPeriod * MILLISECONDS_PER_MINUTE),
    stepIn: 0
  }));

  return stops
    .reduce((acc, stop) => {
      const period = Math.floor(getMinutesOfDay(stop.date) / minutesPerPeriod);
      acc[ period ].stepIn += stop.stepIn;

      return acc;
    }, arr);
}

export function groupTrainByHour(stops: TripStopPoint[]) {
  const tripsByHour = stops.reduce((acc, stop) => {

    const time = (stop.date.getTime() - MILLISECONDS_PER_TIMEZONEOFFSET) % MILLISECONDS_PER_DAY;
    if (!acc[ time ]) {
      acc[ time ] = {stepIn: 0, count: 0};
    }

    acc[ time ].stepIn += stop.stepIn;
    ++acc[ time ].count;

    return acc;
  }, ({} as { [ hour: number ]: { stepIn: number, count: number } }));

  const hour0 = moment().startOf('day').toDate().getTime();
  return Object.keys(tripsByHour)
               .sort()
               .map(stime => {
                 const time = parseInt(stime);
                 return {date: new Date(hour0 + time), stepIn: tripsByHour[ time ].stepIn / tripsByHour[ time ].count};
               });
}

export function filterStopPointByYear(tripsByStopPoint: TripStopPoint[], year: number) {
  return tripsByStopPoint.filter(trip => trip.date.getFullYear() === year);
}

export function filterStopPointByDate(tripsByStopPoint: TripStopPoint[], date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  return tripsByStopPoint.filter(trip => trip.date.getFullYear() === year && trip.date.getMonth() === month && trip.date.getDate() === day);
}

export function filterStopPointByFrequency(tripsByStopPoint: TripStopPoint[], day: number) {
  return tripsByStopPoint.filter(trip => trip.date.getDay() === day);
}

export function filterStopPointByMonth(tripsByStopPoint: TripStopPoint[], month: number) {
  return tripsByStopPoint.filter(trip => trip.date.getMonth() === month);
}

export function filterStopPointByWeek(tripsByStopPoint: TripStopPoint[], date: Date) {
  return tripsByStopPoint.filter(trip => moment(trip.date).startOf('week').toDate().getTime() === date.getTime());
}

export function gaterWeeksOfStopPoints(tripsByStopPoint: TripStopPoint[]) {
  return tripsByStopPoint.reduce((acc, trip) => {
    const startOfWeek = moment(trip.date).startOf('week').toDate();
    if (acc.length == 0 || acc[ acc.length - 1 ].getTime() !== startOfWeek.getTime()) {
      // start a new week
      acc.push(startOfWeek);
    }

    return acc;
  }, ([] as Date[]));
}
