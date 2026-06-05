// IELTS Writing Task 2 — Anchor Calibration Standards
export interface IeltsWritingAnchor {
	band: number;
	source: string;
	task: string;
	excerpt: string;
	scores: { TR: number; CC: number; LR: number; GRA: number };
	examinerRationale: string;
	keyWeaknesses: string[];
}

export const IELTS_WRITING_ANCHORS: IeltsWritingAnchor[] = [
	{
		band: 4.0,
		source: 'IELTS.org Academic Writing Sample Task 2A — Script A',
		task: 'Children from poor vs wealthy families — to what extent do you agree or disagree',
		excerpt:
			'I disagree that point about children brought up in families. ' +
			'because I show that situation around me at our country parents. ' +
			'They want they had everything give to their children. ' +
			'but, their behavior is not good effect to them ' +
			'On the other hands, children brought up by wealthy parents, ' +
			'they are strong. that means they can do prepare to deal with ' +
			'the problems of adult life',
		scores: { TR: 4, CC: 4, LR: 4, GRA: 4 },
		examinerRationale:
			'Position is difficult to identify from the introduction. ' +
			'Ideas are limited and not coherently linked. ' +
			'Language from the input material is used inappropriately. ' +
			'Vocabulary is basic and errors cause confusion. ' +
			'Range of structures is very limited; errors predominate and impede meaning.',
		keyWeaknesses: [
			'No clear position — reader cannot identify what the writer agrees or disagrees with',
			'Language copied or misused from the task rubric (e.g. "deal with the problems of adult life")',
			'Grammar errors predominate: wrong articles, missing verbs, incorrect word forms',
			'No overall progression — ideas are repetitive and incoherent',
		],
	},
	{
		band: 5.5,
		source: 'IELTS.org Academic Writing Sample Task 2B — Script A',
		task: 'International tourism — do disadvantages outweigh advantages',
		excerpt:
			'International tourism has brought enormous benefit to many places. ' +
			"At the same time there is concern about it's impaction on local inhabitants and the environment. " +
			'Do the disadvantages of international tourism outweight the advantages? ' +
			'In my opinion advantages outweight the disadvantages. ' +
			'Firstly, many countries like Egypt or Tailoud live from taurism ' +
			'lots of people work there as a seilonens or tourist quids. ' +
			"These countries without support of tourists wouldn't be able to fu- " +
			'motion properly.',
		scores: { TR: 5, CC: 5, LR: 5, GRA: 5 },
		examinerRationale:
			'A relevant position is expressed but development is not always clear. ' +
			'First five lines are directly copied rubric — no credit given for copied text. ' +
			'Ideas are relevant but sometimes insufficiently developed. ' +
			'Some effective cohesive devices but also mechanical use of linkers. ' +
			'Frequent spelling errors (impaction, outweight, Tailoud, seilonens, quids) ' +
			'that cause difficulties for the reader. ' +
			'Mix of simple and complex structures; control is variable.',
		keyWeaknesses: [
			'Opening paragraph largely copied from the task rubric',
			'Frequent spelling errors that strain the reader',
			'Ideas not sufficiently developed — assertions made without support',
			'Paragraphing inappropriate in places; some paragraphs too short',
		],
	},
	{
		band: 6.5,
		source: 'IELTS.org Academic Writing Sample Task 2A — Script B',
		task: 'Children from poor vs wealthy families — to what extent do you agree or disagree',
		excerpt:
			'I greatly support the idea about Children who are brought up in families ' +
			'that do not have large amounts of money are better prepared to deal with ' +
			'the problems of adult life than children brought up by wealthy parents. ' +
			'I support it, because of the following reason. ' +
			'Children who are brought up in families that do not have large amounts of money ' +
			'are rich in a certain psychological values. Such as the value of hardworking, ' +
			"dicipline, they are used to be in the condition where money doorsn't come easily " +
			'They have to earn it, work for it.',
		scores: { TR: 6, CC: 6, LR: 6, GRA: 6 },
		examinerRationale:
			'Arguments are generally well developed with a clear position. ' +
			'However the first paragraph and beginning of second are mainly copied from the rubric — ' +
			'this limits Task Response. ' +
			'Better paragraphing would allow clearer focus; there is some lapse into generalisation. ' +
			'Vocabulary is varied with some less common items but not always precise ' +
			'(e.g. "rich in a certain psychological values"). ' +
			"Regular errors (dicipline, doorsn't) detract from range of structures " +
			'although they do not prevent overall clarity. ' +
			'This is a generally good response but weaknesses in organisation and ' +
			'grammatical control limit the rating to Band 6.5.',
		keyWeaknesses: [
			'First body paragraph largely repeats rubric language rather than paraphrasing',
			'Over-generalisation towards the end of supporting paragraphs',
			'Regular grammar and spelling errors that are noticeable but do not block meaning',
			'Lacks ability to paraphrase — repetition of input language reveals this gap',
		],
	},
	{
		band: 7.5,
		source: 'IELTS.org Academic Writing Sample Task 2B — Script B',
		task: 'International tourism — do disadvantages outweigh advantages',
		excerpt:
			'Tourism is a very big industry in the modern time and is growing quite rapidly. ' +
			'Thousands and people travel everywhere to various destinations every year. ' +
			'Arguments have come up regarding the benefits and negative impacts of tourism ' +
			'on places and on its local inhabitants and environment; however, I believe ' +
			'there are more advantages than disadvantages of international tourism. ' +
			'People travel for various reasons; they we travel for business purpose, holidays, visit ' +
			'friends and relatives etc. Travelling is mostly seen as recreational activity. ' +
			"Tourism has many advantages. Tourism can play a tremendous part in a country's economy.",
		scores: { TR: 7, CC: 8, LR: 7, GRA: 8 },
		examinerRationale:
			'The test taker addresses both aspects of the task and presents a clear position throughout. ' +
			'Ideas are relevant, well extended and supported, although there are occasional lapses ' +
			'in content. Ideas are logically organised with a clear progression. ' +
			'Range of cohesive devices is used effectively; some under-use of connectives and ' +
			'substitution are noticeable. ' +
			'Wide range of vocabulary used flexibly — awkward expressions or ' +
			'inappropriacies are only occasional. ' +
			'Good range of sentence structures with high level of accuracy; ' +
			'frequent error-free sentences. Minor systematic errors persist ' +
			'and punctuation is unhelpful at times. ' +
			'Strength of lexical resource and appropriate task response make this a Band 7.5.',
		keyWeaknesses: [
			'Occasional lapses in content focus (e.g. opening of paragraph 2 could be tighter)',
			'Some under-use of substitution and referencing devices',
			'Minor systematic errors persist — not enough to impede communication but visible',
			'Punctuation occasionally unhelpful',
		],
	},
];

export function getRelevantAnchors(cefrLevel: string): IeltsWritingAnchor[] {
	if (cefrLevel === 'A1' || cefrLevel === 'A2') {
		return IELTS_WRITING_ANCHORS.filter((a) => a.band <= 5.5);
	}
	if (cefrLevel === 'B1') {
		return IELTS_WRITING_ANCHORS.filter((a) => a.band >= 5.5 && a.band <= 6.5);
	}
	return IELTS_WRITING_ANCHORS.filter((a) => a.band >= 6.5);
}

export function buildAnchorCalibrationBlock(cefrLevel: string): string {
	const anchors = getRelevantAnchors(cefrLevel);

	const anchorLines = anchors.map(
		(a) =>
			`[BAND ${a.band} — ${a.source}]\n` +
			`Task type: ${a.task}\n` +
			`Excerpt: "${a.excerpt}"\n` +
			`Official scores: TR:${a.scores.TR} CC:${a.scores.CC} LR:${a.scores.LR} GRA:${a.scores.GRA} → Overall Band ${a.band}\n` +
			`Why this band: ${a.examinerRationale}\n` +
			`Key weaknesses: ${a.keyWeaknesses.map((w, i) => `${i + 1}) ${w}`).join(' | ')}`,
	);

	return (
		`BAND CALIBRATION — mandatory. Grade strictly against these verified IELTS examiner standards.\n` +
		`Source: IELTS.org official sample candidate writing scripts with examiner comments.\n\n` +
		anchorLines.join('\n\n')
	);
}
