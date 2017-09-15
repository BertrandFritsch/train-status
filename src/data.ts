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

export interface TripStopPoint {
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

export function filterTripsOfStopPointByTimeSlot(id: string, beginDate: Date, endDate: Date) {
  const beginTime = (beginDate.getTime() - MILLISECONDS_PER_TIMEZONEOFFSET) % MILLISECONDS_PER_DAY;
  const endTime = (endDate.getTime() - MILLISECONDS_PER_TIMEZONEOFFSET) % MILLISECONDS_PER_DAY;

  return trips
    .filter(trip => {
      const sp = trip.stops.find(s => s.id === id);
      if (sp) {
        const time = (sp.date.getTime() - MILLISECONDS_PER_TIMEZONEOFFSET) % MILLISECONDS_PER_DAY;
        return beginTime <= time && time <= endTime;
      }
      else {
        return false;
      }
    });
}

export function filterTripsByZoomLevel(id: string, trips: Trip[], zoomLevel: number) {
  if (zoomLevel > 1) {
    const interval = 1;

    return trips.map(trip => {
      const spIndex = trip.stops.findIndex(s => s.id === id);

      const stops = trip.stops.slice(Math.max(0, spIndex - interval), Math.min(spIndex + interval + 1, trip.stops.length));
      stops[ 0 ] = {
        ...stops[ 0 ],
        stepIn: trip.stops.slice(0, Math.max(0, spIndex - interval + 1)).reduce((acc, s) => acc + s.stepIn - s.stepOut, 0),
        stepOut: 0
      };

      return {
        ...trip,
        stops
      }
    });
  }
  else {
    return trips;
  }
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

export function groupTrainsByHour(stops: TripStopPoint[]) {
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

export function groupTripsByHour(trips: Trip[]) {
  const hour0 = (new Date().getTime() - MILLISECONDS_PER_TIMEZONEOFFSET) % MILLISECONDS_PER_DAY;

  const tripsByHour = trips.reduce((acc, trip) => {

    // order trips by start time and number of stop points
    // use the number of stop points as decimal part
    const time = (trip.date.getTime() - MILLISECONDS_PER_TIMEZONEOFFSET) % MILLISECONDS_PER_DAY;
    const timeAndLength = time + (trip.stops.length / 100);
    if (!acc[ timeAndLength ]) {
      acc[ timeAndLength ] = { date: new Date(hour0 + time), trips: [] };
    }

    acc[ timeAndLength ].trips.push(trip.stops);

    return acc;
  }, ({} as { [ hour: string ]: { date: Date, trips: TripStopPoint[][] } }));

  return Object.keys(tripsByHour)
    .sort()
    .map(time => {
      const trips = tripsByHour[ time ].trips;
      const reducedTrips = trips[ 0 ].map(sp => ({ ...sp, date: shiftMinutesToToday(sp.date) }));
      for (let i = 0, iEnd = reducedTrips.length; i < iEnd; ++i) {
        for (let j = 1, jEnd = trips.length; j < jEnd; ++j) {
          reducedTrips[i].stepIn += trips[j][i].stepIn;
          reducedTrips[i].stepOut += trips[j][i].stepOut;
        }

        reducedTrips[i].stepIn /= trips.length;
        reducedTrips[i].stepOut /= trips.length;
      }

      return reducedTrips;
    });
}

export function filterStopPointByYear<T extends { date: Date }>(trips: T[], year: number) {
  return trips.filter(trip => trip.date.getFullYear() === year);
}

export function filterStopPointByDate<T extends { date: Date }>(trips: T[], date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  return trips.filter(trip => trip.date.getFullYear() === year && trip.date.getMonth() === month && trip.date.getDate() === day);
}

export function filterStopPointByFrequency<T extends { date: Date }>(trips: T[], day: number) {
  return trips.filter(trip => trip.date.getDay() === day);
}

export function filterStopPointByMonth<T extends { date: Date }>(trips: T[], month: number) {
  return trips.filter(trip => trip.date.getMonth() === month);
}

export function filterStopPointByWeek<T extends { date: Date }>(trips: T[], date: Date) {
  return trips.filter(trip => moment(trip.date).startOf('week').toDate().getTime() === date.getTime());
}

export function gaterWeeksOfStopPoints(/* tripsByStopPoint: TripStopPoint[] */) {
  // take all weeks of the year until 09/01
  const weeks = [];

  // start at the first week of the year
  let m = moment(new Date(new Date().getFullYear(), 0, 1)).startOf('week');
  if (m.year() !== new Date().getFullYear()) {
    m.add(1, 'week');
  }

  for (let m2 = moment(new Date(new Date().getFullYear(), 8, 1)); m.isBefore(m2); m.add(1, 'weeks')) {
    weeks.push(m.toDate());
  }

  return weeks;

  // Code to get the used weeks only
  // return tripsByStopPoint.reduce((acc, trip) => {
  //   const startOfWeek = moment(trip.date).startOf('week').toDate();
  //   if (acc.length == 0 || acc[ acc.length - 1 ].getTime() !== startOfWeek.getTime()) {
  //     // start a new week
  //     acc.push(startOfWeek);
  //   }
  //
  //   return acc;
  // }, ([] as Date[]));
}

export function shiftMinutesToToday(date: Date) {
  const hour0 = moment().startOf('day').toDate().getTime();
  return new Date(hour0 + (date.getTime() - MILLISECONDS_PER_TIMEZONEOFFSET) % MILLISECONDS_PER_DAY);
}
