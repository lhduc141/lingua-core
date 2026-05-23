// SPEAKING DESCRIPTORS ─

export interface IeltsSpeakingDescriptor {
	band: string;
	fluencyCoherence: string;
	lexicalResource: string;
	grammaticalRange: string;
	pronunciation: string;
}
export const IELTS_SPEAKING_DESCRIPTORS: Record<string, IeltsSpeakingDescriptor> = {
	A1: {
		band: 'Band 2',
		fluencyCoherence:
			'Lengthy pauses before nearly every word. ' +
			'Isolated words may be recognisable but speech is of virtually no communicative significance.',
		lexicalResource:
			'Very limited resource. Utterances consist of isolated words or memorised utterances. ' +
			'Little communication possible without the support of mime or gesture.',
		grammaticalRange: 'No evidence of basic sentence forms.',
		pronunciation:
			'Individual words and phonemes are mainly mispronounced and little meaning is conveyed. ' +
			'Often unintelligible.',
	},
	A2: {
		band: 'Band 3–4',
		fluencyCoherence:
			'Unable to keep going without noticeable pauses. ' +
			'Speech may be slow with frequent repetition. Often self-corrects. ' +
			'Can link simple sentences but often with repetitious use of connectives. ' +
			'Some breakdowns in coherence.',
		lexicalResource:
			'Resource sufficient for familiar topics but only basic meaning can be conveyed on unfamiliar topics. ' +
			'Frequent inappropriacies and errors in word choice. Rarely attempts paraphrase.',
		grammaticalRange:
			'Can produce basic sentence forms and some short utterances are error-free. ' +
			'Subordinate clauses are rare; turns are short, structures are repetitive, and errors are frequent.',
		pronunciation:
			'Uses some acceptable phonological features but the range is limited. ' +
			'Individual words or phonemes are frequently mispronounced, causing lack of clarity. ' +
			'Understanding requires some effort.',
	},
	B1: {
		band: 'Band 5',
		fluencyCoherence:
			'Usually able to keep going, but relies on repetition and self-correction and/or slow speech. ' +
			'Hesitations often associated with mid-sentence searches for fairly basic lexis and grammar. ' +
			'Overuse of certain discourse markers, connectives and other cohesive features. ' +
			'More complex speech usually causes disfluency but simpler language may be produced fluently.',
		lexicalResource:
			'Resource sufficient to discuss familiar and unfamiliar topics but there is limited flexibility. ' +
			'Attempts paraphrase but not always with success.',
		grammaticalRange:
			'Basic sentence forms are fairly well controlled for accuracy. ' +
			'Complex structures are attempted but limited in range, nearly always contain errors, ' +
			'and may lead to the need for reformulation.',
		pronunciation:
			'Uses some phonological features consistently, although control is variable. ' +
			'Individual words or phonemes may be mispronounced; some lapses in rhythm and intonation.',
	},
	B2: {
		band: 'Band 6',
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
			'Produces a mix of short and complex sentence forms and a variety of structures with limited flexibility. ' +
			'Though errors frequently occur in complex structures, these rarely impede communication.',
		pronunciation:
			'Uses a range of phonological features, but control is variable. ' +
			'Chunking is generally appropriate but rhythm may be affected by a lack of stress-timing. ' +
			'Some effective use of intonation and stress but this is not sustained. ' +
			'Can generally be understood throughout without much effort.',
	},
	C1: {
		band: 'Band 7',
		fluencyCoherence:
			'Able to keep going and readily produce long turns without noticeable effort. ' +
			'Some hesitation, repetition and/or self-correction may occur, often mid-sentence, ' +
			'but these will not affect coherence. ' +
			'Flexible use of spoken discourse markers, connectives and cohesive features.',
		lexicalResource:
			'Resource flexibly used to discuss a variety of topics. ' +
			'Some ability to use less common and idiomatic items with an awareness of style and collocation, ' +
			'though inappropriacies occur. ' +
			'Effective use of paraphrase as required.',
		grammaticalRange:
			'A range of structures flexibly used. Error-free sentences are frequent. ' +
			'Both simple and complex sentences are used effectively despite some errors. ' +
			'A few basic errors persist.',
		pronunciation:
			'Uses a range of phonological features to convey precise meaning. ' +
			'Can sustain appropriate rhythm; some flexible use of stress and intonation. ' +
			'Can be generally understood throughout.',
	},
};
