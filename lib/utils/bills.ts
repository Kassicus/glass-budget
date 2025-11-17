/**
 * Get the actual due date for a bill in a given month/year.
 * If the bill's dayOfMonth exceeds the days in the month (e.g., 31st in February),
 * it returns the last day of that month.
 */
export function getBillDueDate(dayOfMonth: number, month: number, year: number): Date {
  // Get the last day of the month
  const lastDayOfMonth = new Date(year, month, 0).getDate();

  // Use the bill's due day or the last day of the month, whichever is smaller
  const actualDay = Math.min(dayOfMonth, lastDayOfMonth);

  return new Date(year, month - 1, actualDay);
}

/**
 * Get the actual day number for a bill in a given month/year.
 * Returns the day of month, adjusted for shorter months.
 */
export function getActualDayOfMonth(dayOfMonth: number, month: number, year: number): number {
  const lastDayOfMonth = new Date(year, month, 0).getDate();
  return Math.min(dayOfMonth, lastDayOfMonth);
}

/**
 * Check if a bill is paid for a given month/year
 */
export function isBillPaidForMonth(
  bill: {
    isPaid: boolean;
    lastPaidMonth: number | null;
    lastPaidYear: number | null;
  },
  month: number,
  year: number
): boolean {
  return bill.isPaid && bill.lastPaidMonth === month && bill.lastPaidYear === year;
}

/**
 * Get all days in a month with their bills
 */
export function getBillsCalendar(
  bills: Array<{
    id: string;
    name: string;
    amount: number;
    dayOfMonth: number;
    category: string;
    isPaid: boolean;
    lastPaidMonth: number | null;
    lastPaidYear: number | null;
    isActive: boolean;
  }>,
  month: number,
  year: number
) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const calendar: Map<number, typeof bills> = new Map();

  // Initialize all days
  for (let day = 1; day <= daysInMonth; day++) {
    calendar.set(day, []);
  }

  // Place bills on their due days
  bills
    .filter((bill) => bill.isActive)
    .forEach((bill) => {
      const actualDay = getActualDayOfMonth(bill.dayOfMonth, month, year);
      const dayBills = calendar.get(actualDay) || [];
      dayBills.push(bill);
      calendar.set(actualDay, dayBills);
    });

  return calendar;
}
