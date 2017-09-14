"use strict";
var __assign = (this && this.__assign) || Object.assign || function(t) {
    for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
    }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
var moment = require("moment");
var MINUTES_PER_DAY = 24 * 60;
var MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
var MILLISECONDS_PER_MINUTE = 1000 * 60;
var MILLISECONDS_PER_TIMEZONEOFFSET = new Date().getTimezoneOffset() * 60 * 1000;
var trips = require('../data/completed-trips.json')
    .map(function (trip) { return ({
    date: new Date(trip.date),
    stops: trip.stops.map(function (stop) { return (__assign({}, stop, { date: new Date(stop.date) })); })
}); });
function filterTripsOfStopPoint(id) {
    return trips
        .filter(function (trip) { return trip.stops.some(function (stop) { return stop.id === id; }); })
        .map(function (trip) { return trip.stops.filter(function (stop) { return stop.id === id; })[0]; });
}
exports.filterTripsOfStopPoint = filterTripsOfStopPoint;
function filterTripsOfStopPointByTimeSlot(id, beginDate, endDate) {
    var beginTime = (beginDate.getTime() - -MILLISECONDS_PER_TIMEZONEOFFSET) % MILLISECONDS_PER_DAY;
    var endTime = (endDate.getTime() - -MILLISECONDS_PER_TIMEZONEOFFSET) % MILLISECONDS_PER_DAY;
    return trips
        .filter(function (trip) {
        var sp = trip.stops.find(function (s) { return s.id === id; });
        if (sp) {
            var time = (sp.date.getTime() - -MILLISECONDS_PER_TIMEZONEOFFSET) % MILLISECONDS_PER_DAY;
            return beginTime <= time && time <= endTime;
        }
        else {
            return false;
        }
    });
}
exports.filterTripsOfStopPointByTimeSlot = filterTripsOfStopPointByTimeSlot;
function getMinutesOfDay(date) {
    return (date.getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0).getTime()) / MILLISECONDS_PER_MINUTE;
}
/**
 * Get the number of travellers (step in) by the provided interval
 * @param {TripStopPoint[]} stops The list of stop points to consider
 * @param {number} minutesPerPeriod The interval
 * @returns {StepInByPeriod[]}
 */
function stepInByPeriod(stops, minutesPerPeriod) {
    if (minutesPerPeriod === void 0) { minutesPerPeriod = 60; }
    // const periods = Math.ceil(24 * 60 / minutesByPeriod);
    var periods = Math.ceil(MINUTES_PER_DAY / minutesPerPeriod);
    var hour0 = moment().startOf('day').toDate();
    var arr = Array.apply(null, { length: periods }).map(function (_, i) { return ({
        date: new Date(hour0.getTime() + i * minutesPerPeriod * MILLISECONDS_PER_MINUTE),
        stepIn: 0
    }); });
    return stops
        .reduce(function (acc, stop) {
        var period = Math.floor(getMinutesOfDay(stop.date) / minutesPerPeriod);
        acc[period].stepIn += stop.stepIn;
        return acc;
    }, arr);
}
exports.stepInByPeriod = stepInByPeriod;
function groupTrainsByHour(stops) {
    var tripsByHour = stops.reduce(function (acc, stop) {
        var time = (stop.date.getTime() - MILLISECONDS_PER_TIMEZONEOFFSET) % MILLISECONDS_PER_DAY;
        if (!acc[time]) {
            acc[time] = { stepIn: 0, count: 0 };
        }
        acc[time].stepIn += stop.stepIn;
        ++acc[time].count;
        return acc;
    }, {});
    var hour0 = moment().startOf('day').toDate().getTime();
    return Object.keys(tripsByHour)
        .sort()
        .map(function (stime) {
        var time = parseInt(stime);
        return { date: new Date(hour0 + time), stepIn: tripsByHour[time].stepIn / tripsByHour[time].count };
    });
}
exports.groupTrainsByHour = groupTrainsByHour;
function groupTripsByHour(trips) {
    var hour0 = new Date().getTime() - MILLISECONDS_PER_TIMEZONEOFFSET % MILLISECONDS_PER_DAY;
    var tripsByHour = trips.reduce(function (acc, trip) {
        // order trips by start time and number of stop points
        // use the number of stop points as decimal part
        var time = (trip.date.getTime() - MILLISECONDS_PER_TIMEZONEOFFSET) % MILLISECONDS_PER_DAY;
        var timeAndLength = time + (trip.stops.length / 100);
        if (!acc[timeAndLength]) {
            acc[timeAndLength] = { date: new Date(hour0 + time), trips: [] };
        }
        acc[timeAndLength].trips.push(trip.stops);
        return acc;
    }, {});
    return Object.keys(tripsByHour)
        .sort()
        .map(function (time) {
        var trips = tripsByHour[time].trips;
        var reducedTrips = trips[0].map(function (sp) { return (__assign({}, sp)); });
        for (var i = 0, iEnd = reducedTrips.length; i < iEnd; ++i) {
            for (var j = 1, jEnd = trips.length; j < jEnd; ++jEnd) {
                reducedTrips[i].stepIn += trips[j][i].stepIn;
                reducedTrips[i].stepOut += trips[j][i].stepOut;
            }
            reducedTrips[i].stepIn /= trips.length;
            reducedTrips[i].stepOut /= trips.length;
        }
        return reducedTrips;
    });
}
exports.groupTripsByHour = groupTripsByHour;
function filterStopPointByYear(trips, year) {
    return trips.filter(function (trip) { return trip.date.getFullYear() === year; });
}
exports.filterStopPointByYear = filterStopPointByYear;
function filterStopPointByDate(trips, date) {
    var year = date.getFullYear();
    var month = date.getMonth();
    var day = date.getDate();
    return trips.filter(function (trip) { return trip.date.getFullYear() === year && trip.date.getMonth() === month && trip.date.getDate() === day; });
}
exports.filterStopPointByDate = filterStopPointByDate;
function filterStopPointByFrequency(trips, day) {
    return trips.filter(function (trip) { return trip.date.getDay() === day; });
}
exports.filterStopPointByFrequency = filterStopPointByFrequency;
function filterStopPointByMonth(trips, month) {
    return trips.filter(function (trip) { return trip.date.getMonth() === month; });
}
exports.filterStopPointByMonth = filterStopPointByMonth;
function filterStopPointByWeek(trips, date) {
    return trips.filter(function (trip) { return moment(trip.date).startOf('week').toDate().getTime() === date.getTime(); });
}
exports.filterStopPointByWeek = filterStopPointByWeek;
function gaterWeeksOfStopPoints(tripsByStopPoint) {
    // take all weeks of the year until 09/01
    var weeks = [];
    // start at the first week of the year
    var m = moment(new Date(new Date().getFullYear(), 0, 1)).startOf('week');
    if (m.year() !== new Date().getFullYear()) {
        m.add(1, 'week');
    }
    for (var m2 = moment(new Date(new Date().getFullYear(), 8, 1)); m.isBefore(m2); m.add(1, 'weeks')) {
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
exports.gaterWeeksOfStopPoints = gaterWeeksOfStopPoints;
