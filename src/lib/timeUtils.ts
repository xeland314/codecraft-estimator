import type { TimeUnit } from '@/types';
import { Decimal } from 'decimal.js';

Decimal.set({ precision: 10 }); // Set precision for decimal calculations

export const convertToMinutes = (time: number | Decimal, unit: TimeUnit): Decimal => {
  const timeDecimal = new Decimal(time);
  if (timeDecimal.isNaN() || timeDecimal.isNegative()) return new Decimal(0);

  switch (unit) {
    case 'minutes':
      return timeDecimal;
    case 'hours':
      return timeDecimal.times(60);
    case 'days':
      return timeDecimal.times(60).times(24); // Assuming 8-hour work days
    default:
      return new Decimal(0);
  }
};

export const formatTime = (totalMinutesInput: number | Decimal): string => {
  const totalMinutes = new Decimal(totalMinutesInput);
  if (totalMinutes.isNaN() || totalMinutes.isNegative()) return "0 minutes";

  const hoursInDay = new Decimal(24);
  const minutesInHour = new Decimal(60);

  if (totalMinutes.isZero()) return "0 minutes";

  const days = totalMinutes.dividedBy(minutesInHour.times(hoursInDay)).floor();
  const remainingMinutesAfterDays = totalMinutes.modulo(minutesInHour.times(hoursInDay));
  const hours = remainingMinutesAfterDays.dividedBy(minutesInHour).floor();
  const minutes = remainingMinutesAfterDays.modulo(minutesInHour);

  let result = "";
  if (days.greaterThan(0)) {
    result += `${days.toString()} day${days.greaterThan(1) ? 's' : ''} `;
  }
  if (hours.greaterThan(0)) {
    result += `${hours.toString()} hour${hours.greaterThan(1) ? 's' : ''} `;
  }
  // Show minutes if it's the only unit or non-zero, or if total time is less than 1 minute but not 0
  if (minutes.greaterThan(0) || result === "" || (totalMinutes.lessThan(1) && !totalMinutes.isZero())) {
     // For very small durations like 0.5 minutes, ensure it shows correctly.
    const displayMinutes = minutes.equals(0) && totalMinutes.lessThan(1) && !totalMinutes.isZero() 
                           ? totalMinutes 
                           : minutes;
    result += `${displayMinutes.toSignificantDigits(4).toString()} minute${displayMinutes.equals(1) ? '' : 's'}`;
  }
  
  return result.trim();
};

export const calculateWeightedAverage = (optimistic: number, mostLikely: number, pessimistic: number, unit: TimeUnit): Decimal => {
  const opt = new Decimal(optimistic);
  const ml = new Decimal(mostLikely);
  const pess = new Decimal(pessimistic);

  if (opt.isNaN() || ml.isNaN() || pess.isNaN() || opt.isNegative() || ml.isNegative() || pess.isNegative()) {
    return new Decimal(0);
  }

  const o = convertToMinutes(opt, unit);
  const m = convertToMinutes(ml, unit);
  const p = convertToMinutes(pess, unit);
  
  if (p.lessThan(m) || m.lessThan(o)) { 
    // Pessimistic should be >= mostLikely >= optimistic
    // Or handle this as an error state shown to user. For now, return 0 or based on valid parts.
    // Returning average of valid parts or just most_likely if others are invalid.
    // For simplicity, if order is wrong, we might default to most_likely or an average.
    // However, the prompt expects this to be handled by user input validation mostly.
    // For calculation robustness, we'll proceed but this data indicates an issue.
    // Using formula regardless, as time estimates might be equal.
  }

  // PERT formula: (Optimistic + 4 * MostLikely + Pessimistic) / 6
  const weightedAverage = o.plus(m.times(4)).plus(p).dividedBy(6);
  return weightedAverage;
};
