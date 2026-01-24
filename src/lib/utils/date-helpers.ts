import {
	startOfWeek,
	endOfWeek,
	startOfMonth,
	endOfMonth,
	eachDayOfInterval,
	format,
	addDays,
	isSameDay,
	isToday,
	parseISO
} from 'date-fns';
import type { Program, WeeklyPattern } from '$lib/types/program';

export function getWeekDays(date: Date): Date[] {
	const start = startOfWeek(date, { weekStartsOn: 0 });
	const end = endOfWeek(date, { weekStartsOn: 0 });
	return eachDayOfInterval({ start, end });
}

export function getMonthDays(date: Date): Date[] {
	const start = startOfMonth(date);
	const end = endOfMonth(date);
	return eachDayOfInterval({ start, end });
}

export function formatDate(date: Date, formatStr = 'MMM d, yyyy'): string {
	return format(date, formatStr);
}

export function getScheduledWorkout(
	program: Program,
	date: Date
): { workout: any; workoutIndex: number } | null {
	const dayOfWeek = date.getDay();
	const pattern = program.schedule.weeklyPattern.find((p) => p.dayOfWeek === dayOfWeek);

	if (!pattern) return null;

	const workout = program.workouts[pattern.workoutIndex];
	if (!workout) return null;

	return { workout, workoutIndex: pattern.workoutIndex };
}

export function getWeekSchedule(
	program: Program,
	weekStartDate: Date
): Array<{ date: Date; workout: any | null; workoutIndex: number | null }> {
	const days = getWeekDays(weekStartDate);
	return days.map((date) => {
		const scheduled = getScheduledWorkout(program, date);
		return {
			date,
			workout: scheduled?.workout || null,
			workoutIndex: scheduled?.workoutIndex ?? null
		};
	});
}

export function formatDuration(seconds: number): string {
	const mins = Math.floor(seconds / 60);
	const secs = seconds % 60;
	return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
