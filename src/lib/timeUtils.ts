import type { TimeUnit } from '@/types';

export const convertToMinutes = (time: number, unit: TimeUnit): number => {
  if (isNaN(time) || time < 0) return 0;
  switch (unit) {
    case 'minutes':
      return time;
    case 'hours':
      return time * 60;
    case 'days':
      return time * 60 * 8; // Assuming 8-hour work days
    default:
      return 0;
  }
};

export const formatTime = (totalMinutes: number): string => {
  if (isNaN(totalMinutes) || totalMinutes < 0) return "0 minutes";

  const hoursInDay = 8;
  const minutesInHour = 60;

  if (totalMinutes === 0) return "0 minutes";

  const days = Math.floor(totalMinutes / (minutesInHour * hoursInDay));
  const remainingMinutesAfterDays = totalMinutes % (minutesInHour * hoursInDay);
  const hours = Math.floor(remainingMinutesAfterDays / minutesInHour);
  const minutes = remainingMinutesAfterDays % minutesInHour;

  let result = "";
  if (days > 0) {
    result += `${days} day${days > 1 ? 's' : ''} `;
  }
  if (hours > 0) {
    result += `${hours} hour${hours > 1 ? 's' : ''} `;
  }
  if (minutes > 0 || result === "") { // Show minutes if it's the only unit or non-zero
    result += `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  
  return result.trim();
};

export const calculateWeightedAverage = (optimistic: number, mostLikely: number, pessimistic: number, unit: TimeUnit): number => {
  if (isNaN(optimistic) || isNaN(mostLikely) || isNaN(pessimistic) || optimistic < 0 || mostLikely < 0 || pessimistic < 0) {
    return 0;
  }
  const o = convertToMinutes(optimistic, unit);
  const ml = convertToMinutes(mostLikely, unit);
  const p = convertToMinutes(pessimistic, unit);
  
  if (p < ml || ml < o ) { // Pessimistic should be >= mostLikely >= optimistic
    // Or handle this as an error state shown to user
    return 0; 
  }

  return (p + 4 * ml + o) / 6;
};
