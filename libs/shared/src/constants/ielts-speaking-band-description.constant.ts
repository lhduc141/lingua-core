// IELTS Speaking Band Descriptors — Band 1-9 (official public version)
// Source: IELTS Speaking Band Descriptors, British Council/IDP/Cambridge
export interface IeltsSpeakingDescriptor {
	band: string;
	fluencyCoherence: string;
	lexicalResource: string;
	grammaticalRange: string;
	pronunciation: string;
}

export interface IeltsSpeakingBandDescriptor {
	band: number;
	fluencyCoherence: string;
	lexicalResource: string;
	grammaticalRange: string;
	pronunciation: string;
}

// BAND 1-9
export const IELTS_SPEAKING_BAND_DESCRIPTORS: Record<number, IeltsSpeakingBandDescriptor> = {
	9: {
		band: 9,
		fluencyCoherence:
			'Fluent with only very occasional repetition or self-correction. ' +
			'Any hesitation that occurs is used only to prepare the content of the next utterance ' +
			'and not to find words or grammar. ' +
			'Speech is situationally appropriate and cohesive features are fully acceptable. ' +
			'Topic development is fully coherent and appropriately extended.',
		lexicalResource:
			'Total flexibility and precise use in all contexts. ' + 'Sustained use of accurate and idiomatic language.',
		grammaticalRange:
			'Structures are precise and accurate at all times, ' +
			"apart from 'mistakes' characteristic of native speaker speech.",
		pronunciation:
			'Uses a full range of phonological features to convey precise and/or subtle meaning. ' +
			'Flexible use of features of connected speech is sustained throughout. ' +
			'Can be effortlessly understood throughout. ' +
			'Accent has no effect on intelligibility.',
	},

	8: {
		band: 8,
		fluencyCoherence:
			'Fluent with only very occasional repetition or self-correction. ' +
			'Hesitation may occasionally be used to find words or grammar, ' +
			'but most will be content related. ' +
			'Topic development is coherent, appropriate and relevant.',
		lexicalResource:
			'Wide resource, readily and flexibly used to discuss all topics and convey precise meaning. ' +
			'Skilful use of less common and idiomatic items despite occasional inaccuracies ' +
			'in word choice and collocation. ' +
			'Effective use of paraphrase as required.',
		grammaticalRange:
			'Wide range of structures, flexibly used. ' +
			'The majority of sentences are error free. ' +
			'Occasional inappropriacies and non-systematic errors occur. ' +
			'A few basic errors may persist.',
		pronunciation:
			'Uses a wide range of phonological features to convey precise and/or subtle meaning. ' +
			'Can sustain appropriate rhythm. ' +
			'Flexible use of stress and intonation across long utterances, despite occasional lapses. ' +
			'Can be easily understood throughout. ' +
			'Accent has minimal effect on intelligibility.',
	},

	7: {
		band: 7,
		fluencyCoherence:
			'Able to keep going and readily produce long turns without noticeable effort. ' +
			'Some hesitation, repetition and/or self-correction may occur, often mid-sentence, ' +
			'and indicate problems with accessing appropriate language. ' +
			'However, these will not affect coherence. ' +
			'Flexible use of spoken discourse markers, connectives and cohesive features.',
		lexicalResource:
			'Resource flexibly used to discuss a variety of topics. ' +
			'Some ability to use less common and idiomatic items and an awareness of style ' +
			'and collocation is evident though inappropriacies occur. ' +
			'Effective use of paraphrase as required.',
		grammaticalRange:
			'A range of structures flexibly used. Error-free sentences are frequent. ' +
			'Both simple and complex sentences are used effectively despite some errors. ' +
			'A few basic errors persist.',
		pronunciation:
			'Displays all the positive features of band 6, ' +
			'and some, but not all, of the positive features of band 8.',
	},

	6: {
		band: 6,
		fluencyCoherence:
			'Able to keep going and demonstrates a willingness to produce long turns. ' +
			'Coherence may be lost at times as a result of hesitation, repetition and/or self-correction. ' +
			'Uses a range of spoken discourse markers, connectives and cohesive features ' +
			'though not always appropriately.',
		lexicalResource:
			'Resource sufficient to discuss topics at length. ' +
			'Vocabulary use may be inappropriate but meaning is clear. ' +
			'Generally able to paraphrase successfully.',
		grammaticalRange:
			'Produces a mix of short and complex sentence forms and a variety of structures ' +
			'with limited flexibility. ' +
			'Though errors frequently occur in complex structures, these rarely impede communication.',
		pronunciation:
			'Uses a range of phonological features, but control is variable. ' +
			'Chunking is generally appropriate, but rhythm may be affected by a lack of stress-timing ' +
			'and/or a rapid speech rate. ' +
			'Some effective use of intonation and stress, but this is not sustained. ' +
			'Individual words or phonemes may be mispronounced but this causes only occasional lack of clarity. ' +
			'Can generally be understood throughout without much effort.',
	},

	5: {
		band: 5,
		fluencyCoherence:
			'Usually able to keep going, but relies on repetition and self-correction to do so ' +
			'and/or on slow speech. ' +
			'Hesitations are often associated with mid-sentence searches for fairly basic lexis and grammar. ' +
			'Overuse of certain discourse markers, connectives and other cohesive features. ' +
			'More complex speech usually causes disfluency but simpler language may be produced fluently.',
		lexicalResource:
			'Resource sufficient to discuss familiar and unfamiliar topics ' +
			'but there is limited flexibility. ' +
			'Attempts paraphrase but not always with success.',
		grammaticalRange:
			'Basic sentence forms are fairly well controlled for accuracy. ' +
			'Complex structures are attempted but these are limited in range, ' +
			'nearly always contain errors and may lead to the need for reformulation.',
		pronunciation:
			'Displays all the positive features of band 4, ' +
			'and some, but not all, of the positive features of band 6.',
	},

	4: {
		band: 4,
		fluencyCoherence:
			'Unable to keep going without noticeable pauses. ' +
			'Speech may be slow with frequent repetition. Often self-corrects. ' +
			'Can link simple sentences but often with repetitious use of connectives. ' +
			'Some breakdowns in coherence.',
		lexicalResource:
			'Resource sufficient for familiar topics but only basic meaning can be conveyed ' +
			'on unfamiliar topics. ' +
			'Frequent inappropriacies and errors in word choice. ' +
			'Rarely attempts paraphrase.',
		grammaticalRange:
			'Can produce basic sentence forms and some short utterances are error-free. ' +
			'Subordinate clauses are rare and, overall, turns are short, ' +
			'structures are repetitive and errors are frequent.',
		pronunciation:
			'Uses some acceptable phonological features, but the range is limited. ' +
			'Produces some acceptable chunking, but there are frequent lapses in overall rhythm. ' +
			'Attempts to use intonation and stress, but control is limited. ' +
			'Individual words or phonemes are frequently mispronounced, causing lack of clarity. ' +
			'Understanding requires some effort and there may be patches of speech ' +
			'that cannot be understood.',
	},

	3: {
		band: 3,
		fluencyCoherence:
			'Frequent, sometimes long, pauses occur while candidate searches for words. ' +
			'Limited ability to link simple sentences and go beyond simple responses to questions. ' +
			'Frequently unable to convey basic message.',
		lexicalResource:
			'Resource limited to simple vocabulary used primarily to convey personal information. ' +
			'Vocabulary inadequate for unfamiliar topics.',
		grammaticalRange:
			'Basic sentence forms are attempted but grammatical errors are numerous ' +
			'except in apparently memorised utterances.',
		pronunciation:
			'Displays some features of band 2, ' + 'and some, but not all, of the positive features of band 4.',
	},

	2: {
		band: 2,
		fluencyCoherence:
			'Lengthy pauses before nearly every word. ' +
			'Isolated words may be recognisable but speech is of virtually no communicative significance.',
		lexicalResource:
			'Very limited resource. Utterances consist of isolated words or memorised utterances. ' +
			'Little communication possible without the support of mime or gesture.',
		grammaticalRange: 'No evidence of basic sentence forms.',
		pronunciation:
			'Uses few acceptable phonological features (possibly because sample is insufficient). ' +
			'Overall problems with delivery impair attempts at connected speech. ' +
			'Individual words and phonemes are mainly mispronounced and little meaning is conveyed. ' +
			'Often unintelligible.',
	},

	1: {
		band: 1,
		fluencyCoherence: 'Essentially none. Speech is totally incoherent.',
		lexicalResource: 'No resource bar a few isolated words. No communication possible.',
		grammaticalRange: 'No rateable language unless memorised.',
		pronunciation:
			'Can produce occasional individual words and phonemes that are recognisable, ' +
			'but no overall meaning is conveyed. Unintelligible.',
	},
};

// CEFR -> BAND MAPPED (backward compat)
export const IELTS_SPEAKING_DESCRIPTORS: Record<string, IeltsSpeakingDescriptor> = {
	A1: { ...IELTS_SPEAKING_BAND_DESCRIPTORS[2], band: 'Band 2' },
	A2: { ...IELTS_SPEAKING_BAND_DESCRIPTORS[4], band: 'Band 3-4' },
	B1: { ...IELTS_SPEAKING_BAND_DESCRIPTORS[5], band: 'Band 5' },
	B2: { ...IELTS_SPEAKING_BAND_DESCRIPTORS[6], band: 'Band 6' },
	C1: { ...IELTS_SPEAKING_BAND_DESCRIPTORS[7], band: 'Band 7' },
};

// HELPERS
export function getSpeakingBandReferenceTable(): string {
	const lines: string[] = ['=== IELTS Speaking Band Descriptors (Fluency, Lexical, Grammar — Reference) ==='];
	for (const band of [8, 7, 6, 5, 4]) {
		const d = IELTS_SPEAKING_BAND_DESCRIPTORS[band];
		lines.push(
			`\nBand ${d.band}:` +
				`\n  Fluency & Coherence: ${d.fluencyCoherence}` +
				`\n  Lexical Resource: ${d.lexicalResource}` +
				`\n  Grammatical Range & Accuracy: ${d.grammaticalRange}`,
		);
	}
	return lines.join('\n');
}
