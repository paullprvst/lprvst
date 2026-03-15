import { jsPDF } from 'jspdf';
import type { Program, Workout, Exercise } from '$lib/types/program';
import type { SetLog, WorkoutSession } from '$lib/types/workout-session';
import { DAY_NAMES } from '$lib/utils/date-helpers';
import { workoutSessionRepository } from '$lib/services/storage/workout-session-repository';

const COLORS = {
	primary: [15, 23, 42] as [number, number, number], // slate-900
	secondary: [100, 116, 139] as [number, number, number], // slate-500
	accent: [6, 182, 212] as [number, number, number], // cyan-500
	warmup: [245, 158, 11] as [number, number, number], // amber-500
	cooldown: [16, 185, 129] as [number, number, number], // emerald-500
	divider: [226, 232, 240] as [number, number, number], // slate-200
	performanceLabel: [8, 145, 178] as [number, number, number], // cyan-700
	performanceFill: [248, 250, 252] as [number, number, number], // slate-50
	performanceBorder: [226, 232, 240] as [number, number, number], // slate-200
	performanceDateFill: [236, 254, 255] as [number, number, number], // cyan-50
	performanceDateBorder: [165, 243, 252] as [number, number, number], // cyan-200
	performanceMuted: [71, 85, 105] as [number, number, number] // slate-600
};

const MARGIN = 20;
const PAGE_WIDTH = 210; // A4 width in mm
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;
const PAGE_HEIGHT = 297; // A4 height in mm
const BOTTOM_MARGIN = 18;
const PERFORMANCE_HISTORY_LIMIT = 4;

interface ExercisePerformanceRecord {
	workoutId: string;
	performedDayOfWeek: number;
	performedAt: Date;
	sets: SetLog[];
	notes?: string;
}

export async function exportProgramToPdf(program: Program): Promise<void> {
	const doc = new jsPDF();
	const sessions = await workoutSessionRepository.getByProgram(program.id);
	const performanceMaps = buildPerformanceMaps(sessions);
	let y = MARGIN;

	// Title
	doc.setFontSize(24);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(...COLORS.primary);
	doc.text(program.name, MARGIN, y);
	y += 10;

	// Description
	if (program.description) {
		doc.setFontSize(11);
		doc.setFont('helvetica', 'normal');
		doc.setTextColor(...COLORS.secondary);
		const descLines = doc.splitTextToSize(program.description, CONTENT_WIDTH);
		doc.text(descLines, MARGIN, y);
		y += descLines.length * 5 + 5;
	}

	// Schedule
	const scheduleDays = program.schedule.weeklyPattern.map((p) => DAY_NAMES[p.dayOfWeek]).join(', ');
	doc.setFontSize(10);
	doc.setTextColor(...COLORS.accent);
	doc.text(`Schedule: ${scheduleDays}`, MARGIN, y);
	y += 10;

	// Divider
	doc.setDrawColor(...COLORS.divider);
	doc.setLineWidth(0.5);
	doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
	y += 10;

	// Workouts - ordered by schedule (day of week)
	const sortedPattern = [...program.schedule.weeklyPattern].sort((a, b) => a.dayOfWeek - b.dayOfWeek);

	for (let i = 0; i < sortedPattern.length; i++) {
		const pattern = sortedPattern[i];
		const workout = program.workouts[pattern.workoutIndex];
		if (!workout) continue;

		// Check if we need a new page
		if (y > 250) {
			doc.addPage();
			y = MARGIN;
		}

		y = renderWorkout(doc, workout, y, DAY_NAMES[pattern.dayOfWeek], pattern.dayOfWeek, performanceMaps);
		y += 10;
	}

	// Save
	const filename = `${program.name.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
	doc.save(filename);
}

function renderWorkout(
	doc: jsPDF,
	workout: Workout,
	startY: number,
	dayName: string,
	dayOfWeek: number,
	performanceMaps: ReturnType<typeof buildPerformanceMaps>
): number {
	let y = startY;

	// Workout header
	doc.setFontSize(14);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(...COLORS.primary);
	doc.text(`${dayName} - ${workout.name}`, MARGIN, y);

	// Duration badge
	const duration = formatDuration(workout.estimatedDuration);
	doc.setFontSize(9);
	doc.setFont('helvetica', 'normal');
	doc.setTextColor(...COLORS.secondary);
	doc.text(duration, PAGE_WIDTH - MARGIN, y, { align: 'right' });
	y += 6;

	// Notes
	if (workout.notes) {
		doc.setFontSize(9);
		doc.setTextColor(...COLORS.secondary);
		const notesLines = doc.splitTextToSize(workout.notes, CONTENT_WIDTH);
		doc.text(notesLines, MARGIN, y);
		y += notesLines.length * 4 + 3;
	}

	// Group exercises by type
	const warmupExercises = workout.exercises.filter((e) => e.type === 'warmup');
	const mainExercises = workout.exercises.filter((e) => e.type === 'main');
	const cooldownExercises = workout.exercises.filter((e) => e.type === 'cooldown');

	if (warmupExercises.length > 0) {
		y = renderExerciseSection(
			doc,
			'Warm-up',
			warmupExercises,
			y,
			COLORS.warmup,
			workout.id,
			dayOfWeek,
			performanceMaps
		);
	}

	if (mainExercises.length > 0) {
		y = renderExerciseSection(
			doc,
			'Main',
			mainExercises,
			y,
			COLORS.accent,
			workout.id,
			dayOfWeek,
			performanceMaps
		);
	}

	if (cooldownExercises.length > 0) {
		y = renderExerciseSection(
			doc,
			'Cool-down',
			cooldownExercises,
			y,
			COLORS.cooldown,
			workout.id,
			dayOfWeek,
			performanceMaps
		);
	}

	return y;
}

function renderExerciseSection(
	doc: jsPDF,
	title: string,
	exercises: Exercise[],
	startY: number,
	color: [number, number, number],
	workoutId: string,
	dayOfWeek: number,
	performanceMaps: ReturnType<typeof buildPerformanceMaps>
): number {
	let y = startY + 3;

	// Check page break
	if (y > 270) {
		doc.addPage();
		y = MARGIN;
	}

	// Section header
	doc.setFontSize(9);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(...color);
	doc.text(title.toUpperCase(), MARGIN, y);
	y += 5;

	// Exercises
	doc.setFont('helvetica', 'normal');
	doc.setTextColor(...COLORS.primary);

	for (const [index, exercise] of exercises.entries()) {
		if (index > 0) {
			y += 5;
		}

		const performanceHistory = getPerformanceHistory(exercise, workoutId, dayOfWeek, performanceMaps).slice(
			0,
			PERFORMANCE_HISTORY_LIMIT
		);
		const estimatedHeight = estimateExerciseBlockHeight(doc, performanceHistory);
		y = ensurePageSpace(doc, y, estimatedHeight);

		// Exercise name
		doc.setFontSize(10);
		doc.text(`• ${exercise.name}`, MARGIN + 2, y);

		// Sets/reps
		const details = formatExerciseDetails(exercise);
		doc.setFontSize(9);
		doc.setTextColor(...COLORS.secondary);
		doc.text(details, PAGE_WIDTH - MARGIN, y, { align: 'right' });
		doc.setTextColor(...COLORS.primary);

		y += 5;

		if (performanceHistory.length > 0) {
			y = renderPerformanceHistory(doc, performanceHistory, y);
		} else {
			y += 1.5;
		}
	}

	return y;
}

function renderPerformanceHistory(
	doc: jsPDF,
	history: ExercisePerformanceRecord[],
	startY: number
): number {
	let y = startY + 1;
	const sectionX = MARGIN + 6;
	const sectionWidth = CONTENT_WIDTH - 6;
	const dateBadgeWidth = 24;

	doc.setFontSize(8);
	doc.setFont('helvetica', 'bold');
	doc.setTextColor(...COLORS.performanceLabel);
	doc.text('RECENT PERFORMANCE', sectionX, y);
	doc.setFont('helvetica', 'normal');
	doc.setTextColor(...COLORS.secondary);
	doc.text('(last 4 matching sessions)', sectionX + 37, y);
	y += 4;

	for (const record of history) {
		const rowTextX = sectionX + dateBadgeWidth + 6;
		const rowTextStartX = rowTextX + 8;
		const rowRightPadding = 4;
		const rowTextWidth = sectionX + sectionWidth - rowTextStartX - rowRightPadding;
		const rowLayout = getPerformanceRowLayout(doc, record, rowTextWidth);

		doc.setDrawColor(...COLORS.performanceBorder);
		doc.setFillColor(...COLORS.performanceFill);
		doc.roundedRect(sectionX, y, sectionWidth, rowLayout.height, 2, 2, 'FD');

		doc.setDrawColor(...COLORS.performanceDateBorder);
		doc.setFillColor(...COLORS.performanceDateFill);
		doc.roundedRect(sectionX + 2.5, y + 2, dateBadgeWidth, rowLayout.height - 4, 2, 2, 'FD');

		doc.setFontSize(7.5);
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(...COLORS.performanceLabel);
		doc.text(formatDateBadgeTop(record.performedAt), sectionX + 5, y + 6.2);

		doc.setFontSize(7);
		doc.setFont('helvetica', 'normal');
		doc.setTextColor(...COLORS.performanceMuted);
		doc.text(formatDateBadgeBottom(record.performedAt), sectionX + 5, y + 10);

		doc.setFontSize(8.5);
		doc.setFont('helvetica', 'bold');
		doc.setTextColor(...COLORS.primary);
		doc.text('Sets', rowTextX, y + 5.2);

		doc.setFont('helvetica', 'normal');
		doc.setTextColor(...COLORS.performanceMuted);
		doc.text(rowLayout.setLines, rowTextStartX, y + 5.2);

		if (rowLayout.noteLines.length > 0) {
			doc.setFontSize(8);
			doc.setFont('helvetica', 'italic');
			doc.text(rowLayout.noteLines, rowTextX, y + 5.2 + rowLayout.setLines.length * 3.7 + 1.8);
		}

		y += rowLayout.height + 2.5;
	}

	return y + 1.5;
}

function formatExerciseDetails(exercise: Exercise): string {
	const parts: string[] = [];

	if (exercise.sets) {
		if (exercise.reps) {
			parts.push(`${exercise.sets} × ${exercise.reps}`);
		} else if (exercise.duration) {
			parts.push(`${exercise.sets} × ${exercise.duration}s`);
		} else {
			parts.push(`${exercise.sets} sets`);
		}
	}

	if (exercise.restBetweenSets > 0) {
		parts.push(`${exercise.restBetweenSets}s rest`);
	}

	return parts.join(' · ');
}

function buildPerformanceMaps(sessions: WorkoutSession[]): {
	byExerciseId: Map<string, ExercisePerformanceRecord[]>;
	byExerciseName: Map<string, ExercisePerformanceRecord[]>;
} {
	const byExerciseId = new Map<string, ExercisePerformanceRecord[]>();
	const byExerciseName = new Map<string, ExercisePerformanceRecord[]>();
	const completedSessions = sessions
		.filter((session) => session.status === 'completed' || Boolean(session.completedAt))
		.sort((a, b) => {
			const aDate = a.completedAt || a.startedAt;
			const bDate = b.completedAt || b.startedAt;
			return bDate.getTime() - aDate.getTime();
		});

	for (const session of completedSessions) {
		const performedAt = session.completedAt || session.startedAt;
		const performedDayOfWeek = getMondayBasedDayOfWeek(performedAt);

		for (const exerciseLog of session.exercises) {
			if (exerciseLog.skipped) continue;

			const completedSets = exerciseLog.sets.filter((set) => set.completed);
			if (completedSets.length === 0) continue;

			const record: ExercisePerformanceRecord = {
				workoutId: session.workoutId,
				performedDayOfWeek,
				performedAt,
				sets: completedSets,
				notes: exerciseLog.notes
			};

			const recordsById = byExerciseId.get(exerciseLog.exerciseId) || [];
			recordsById.push(record);
			byExerciseId.set(exerciseLog.exerciseId, recordsById);

			const exerciseNameKey = normalizeName(exerciseLog.exerciseName);
			if (exerciseNameKey) {
				const recordsByName = byExerciseName.get(exerciseNameKey) || [];
				recordsByName.push(record);
				byExerciseName.set(exerciseNameKey, recordsByName);
			}
		}
	}

	return { byExerciseId, byExerciseName };
}

function getPerformanceHistory(
	exercise: Exercise,
	workoutId: string,
	dayOfWeek: number,
	performanceMaps: ReturnType<typeof buildPerformanceMaps>
): ExercisePerformanceRecord[] {
	const byId = (performanceMaps.byExerciseId.get(exercise.id) || []).filter(
		(record) => record.workoutId === workoutId && record.performedDayOfWeek === dayOfWeek
	);
	if (byId.length > 0) return byId;

	return (performanceMaps.byExerciseName.get(normalizeName(exercise.name)) || []).filter(
		(record) => record.workoutId === workoutId && record.performedDayOfWeek === dayOfWeek
	);
}

function normalizeName(name: string | undefined): string {
	return (name || '').toLowerCase().trim();
}

function getMondayBasedDayOfWeek(date: Date): number {
	return (date.getDay() + 6) % 7;
}

function formatSetForPdf(set: SetLog, index: number): string {
	const parts: string[] = [`S${index + 1}`];

	if (set.reps !== undefined) {
		parts.push(`${set.reps} reps`);
	}

	if (set.weight !== undefined && set.weight > 0) {
		parts.push(`at ${formatNumber(set.weight)} kg`);
	}

	if (set.duration !== undefined) {
		parts.push(`${set.duration}s`);
	}

	return parts.join(' ');
}

function estimateExerciseBlockHeight(doc: jsPDF, history: ExercisePerformanceRecord[]): number {
	let height = 8;

	if (history.length === 0) {
		return height;
	}

	height += 6;

	for (const record of history) {
		const rowTextWidth = CONTENT_WIDTH - 6 - 24 - 18;
		height += getPerformanceRowLayout(doc, record, rowTextWidth).height + 2.5;
	}

	return height + 2;
}

function ensurePageSpace(doc: jsPDF, y: number, requiredHeight: number): number {
	if (y + requiredHeight <= PAGE_HEIGHT - BOTTOM_MARGIN) {
		return y;
	}

	doc.addPage();
	return MARGIN;
}

function formatNumber(value: number): string {
	return Number.isInteger(value) ? `${value}` : `${value.toFixed(1)}`;
}

function formatDateBadgeTop(date: Date): string {
	const month = date.toLocaleString('en-US', { month: 'short' }).toUpperCase();
	return `${month} ${date.getDate()}`;
}

function formatDateBadgeBottom(date: Date): string {
	return `${date.getFullYear()}`;
}

function getPerformanceRowLayout(
	doc: jsPDF,
	record: ExercisePerformanceRecord,
	textWidth: number
): { setLines: string[]; noteLines: string[]; height: number } {
	const setsText = record.sets.map((set, index) => formatSetForPdf(set, index)).join('   |   ');

	doc.setFont('helvetica', 'normal');
	doc.setFontSize(8.5);
	const setLines = doc.splitTextToSize(setsText, textWidth) as string[];

	const note = record.notes?.trim();
	let noteLines: string[] = [];
	if (note) {
		doc.setFont('helvetica', 'italic');
		doc.setFontSize(8);
		noteLines = doc.splitTextToSize(`Note: ${note}`, textWidth) as string[];
	}

	const topPadding = 5.5;
	const bottomPadding = 4;
	const setLinesHeight = setLines.length * 3.9;
	const noteGap = noteLines.length > 0 ? 2.3 : 0;
	const noteLinesHeight = noteLines.length * 3.4;
	const contentHeight = topPadding + setLinesHeight + noteGap + noteLinesHeight + bottomPadding;

	return {
		setLines,
		noteLines,
		height: Math.max(16, contentHeight)
	};
}

function formatDuration(minutes: number): string {
	if (minutes < 60) {
		return `${minutes} min`;
	}
	const hours = Math.floor(minutes / 60);
	const mins = minutes % 60;
	return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
