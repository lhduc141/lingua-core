import { IELTS_WRITING_BAND_DESCRIPTORS } from '@app/shared/constants/ielts-writing-band-description.constant';
import { IELTS_SPEAKING_DESCRIPTORS } from '@app/shared/constants/ielts-speaking-band-description.constant';

// INTERFACES
export interface IeltsWritingDescriptor {
	band: string;
	taskResponse: string;
	coherenceCohesion: string;
	lexicalResource: string;
	grammaticalRange: string;
}

// CEFR → BAND MAPPING
export const CEFR_TO_BAND: Record<string, number> = {
	A1: 2,
	A2: 4,
	B1: 5,
	B2: 6,
	C1: 7,
	C2: 9,
};

// WRITING — CEFR MAPPED (backward compat)
export const IELTS_WRITING_DESCRIPTORS: Record<string, IeltsWritingDescriptor> = {
	A1: { ...IELTS_WRITING_BAND_DESCRIPTORS[2], band: 'Band 2' },
	A2: { ...IELTS_WRITING_BAND_DESCRIPTORS[4], band: 'Band 4' },
	B1: { ...IELTS_WRITING_BAND_DESCRIPTORS[5], band: 'Band 5' },
	B2: { ...IELTS_WRITING_BAND_DESCRIPTORS[6], band: 'Band 6' },
	C1: { ...IELTS_WRITING_BAND_DESCRIPTORS[7], band: 'Band 7' },
};

// LEVEL PROGRESSION
export const NEXT_CEFR_LEVEL: Record<string, string | null> = {
	A1: 'A2',
	A2: 'B1',
	B1: 'B2',
	B2: 'C1',
	C1: null,
};

// HELPERS
export function getWritingDescriptorText(cefrLevel: string): string {
	const d = IELTS_WRITING_DESCRIPTORS[cefrLevel] ?? IELTS_WRITING_DESCRIPTORS['B1'];
	return (
		`IELTS Writing Task 2 — ${d.band} (approximate for ${cefrLevel}):\n` +
		`- Task Response: ${d.taskResponse}\n` +
		`- Coherence & Cohesion: ${d.coherenceCohesion}\n` +
		`- Lexical Resource: ${d.lexicalResource}\n` +
		`- Grammatical Range & Accuracy: ${d.grammaticalRange}`
	);
}

export function getWritingBandReferenceTable(): string {
	const lines: string[] = ['=== IELTS Writing Task 2 — Official Band Descriptors (Reference) ==='];
	for (const band of [8, 7, 6, 5, 4]) {
		const d = IELTS_WRITING_BAND_DESCRIPTORS[band];
		lines.push(
			`\nBand ${d.band}:` +
				`\n  Task Response: ${d.taskResponse}` +
				`\n  Coherence & Cohesion: ${d.coherenceCohesion}` +
				`\n  Lexical Resource: ${d.lexicalResource}` +
				`\n  Grammatical Range & Accuracy: ${d.grammaticalRange}`,
		);
	}
	return lines.join('\n');
}

export function getSpeakingDescriptorText(cefrLevel: string): string {
	const d = IELTS_SPEAKING_DESCRIPTORS[cefrLevel] ?? IELTS_SPEAKING_DESCRIPTORS['B1'];
	return (
		`IELTS Speaking — ${d.band} (approximate for ${cefrLevel}):\n` +
		`- Fluency & Coherence: ${d.fluencyCoherence}\n` +
		`- Lexical Resource: ${d.lexicalResource}\n` +
		`- Grammatical Range & Accuracy: ${d.grammaticalRange}\n` +
		`- Pronunciation: ${d.pronunciation}`
	);
}
