import {
	startOfWeek,
	endOfWeek,
	startOfMonth,
	endOfMonth,
	eachDayOfInterval,
	format,
	addDays,
	isSameDay
} from 'date-fns';
import type { Program, WeeklyPattern } from '$lib/types/program';
import type { WorkoutSession } from '$lib/types/workout-session';

export function getWeekDays(date: Date): Date[] {
	const start = startOfWeek(date, { weekStartsOn: 1 });
	const end = endOfWeek(date, { weekStartsOn: 1 });
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
	// Convert JS getDay() (0=Sunday) to Monday-based (0=Monday, 6=Sunday)
	const dayOfWeek = (date.getDay() + 6) % 7;
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

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const DAY_NAMES_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function getCompletedWorkoutForDate(
	sessions: WorkoutSession[],
	date: Date
): WorkoutSession | null {
	return sessions.find((session) => {
		if (!session.completedAt) return false;
		return isSameDay(new Date(session.completedAt), date);
	}) || null;
}

export function getUpcomingWorkouts(
	program: Program,
	completedSessions: WorkoutSession[],
	count: number = 5
): Array<{ date: Date; workout: any; workoutIndex: number }> {
	const upcoming: Array<{ date: Date; workout: any; workoutIndex: number }> = [];
	let currentDate = new Date();
	currentDate.setHours(0, 0, 0, 0);

	// Look ahead up to 60 days to find enough workouts
	const maxDays = 60;
	let daysChecked = 0;

	while (upcoming.length < count && daysChecked < maxDays) {
		const scheduled = getScheduledWorkout(program, currentDate);
		if (scheduled) {
			// Check if this workout is already completed on this date
			const isCompleted = getCompletedWorkoutForDate(completedSessions, currentDate) !== null;
			if (!isCompleted) {
				upcoming.push({
					date: new Date(currentDate),
					workout: scheduled.workout,
					workoutIndex: scheduled.workoutIndex
				});
			}
		}
		currentDate = addDays(currentDate, 1);
		daysChecked++;
	}

	return upcoming;
}
