import * as moment from 'moment';
import { stepInByPeriod } from './data';

const MINUTES_PER_DAY = 24 * 60;
const MILLISECONDS_PER_MINUTE = 1000 * 60;

function generateEmptyTripsArray(minutesPerPeriod: number) {
  const periods = Math.ceil(MINUTES_PER_DAY / minutesPerPeriod);
  const hour0 = moment().startOf('day').toDate();

  return Array.apply(null, {length: periods}).map((_: undefined, i: number) => ({
    date: new Date(hour0.getTime() + i * minutesPerPeriod * MILLISECONDS_PER_MINUTE),
    stepIn: 0
  }))
}

describe('data', () => {
  it('should partition 24 hour trips', () => {
    expect(stepInByPeriod([])).toEqual(generateEmptyTripsArray(60));
  });

  it('should partition per 24 minutes', () => {
    expect(stepInByPeriod([], 24)).toEqual(generateEmptyTripsArray(24));
  });

  it('should partition per 5.879 minutes', () => {
    expect(stepInByPeriod([], 5.879)).toEqual(generateEmptyTripsArray(5.879));
    console.log(stepInByPeriod([], 55.879))
  });
});
