// WRITING TASK 2 — OFFICIAL BAND 1–9
export interface IeltsWritingBandDescriptor {
	band: number;
	taskResponse: string;
	coherenceCohesion: string;
	lexicalResource: string;
	grammaticalRange: string;
}
export const IELTS_WRITING_BAND_DESCRIPTORS: Record<number, IeltsWritingBandDescriptor> = {
	9: {
		band: 9,
		taskResponse:
			'Fully addresses all parts of the task. ' +
			'Presents a fully developed position in answer to the question ' +
			'with relevant, fully extended and well supported ideas.',
		coherenceCohesion:
			'Uses cohesion in such a way that it attracts no attention. ' + 'Skilfully manages paragraphing.',
		lexicalResource:
			'Uses a wide range of vocabulary with very natural and sophisticated control of lexical features. ' +
			'Rare minor errors occur only as "slips".',
		grammaticalRange:
			'Uses a wide range of structures with full flexibility and accuracy. ' +
			'Rare minor errors occur only as "slips".',
	},
	8: {
		band: 8,
		taskResponse:
			'Sufficiently addresses all parts of the task. ' +
			'Presents, highlights and illustrates key ideas clearly and appropriately.',
		coherenceCohesion:
			'Sequences information and ideas logically. ' +
			'Manages all aspects of cohesion well. ' +
			'Uses paragraphing sufficiently and appropriately.',
		lexicalResource:
			'Uses a wide range of vocabulary fluently and flexibly to convey precise meanings. ' +
			'Skilfully uses uncommon lexical items but there may be occasional inaccuracies ' +
			'in word choice and collocation. ' +
			'Produces rare errors in spelling and/or word formation.',
		grammaticalRange:
			'Uses a wide range of structures. ' +
			'The majority of sentences are error-free. ' +
			'Makes only very occasional errors or inappropriacies.',
	},
	7: {
		band: 7,
		taskResponse:
			'Addresses all parts of the task. ' +
			'Presents, extends and supports main ideas, but there may be a tendency to over-generalise ' +
			'and/or supporting ideas may lack focus.',
		coherenceCohesion:
			'Logically organises information and ideas; there is clear progression throughout. ' +
			'Uses a range of cohesive devices appropriately although there may be some under-/over-use.',
		lexicalResource:
			'Uses a sufficient range of vocabulary to allow some flexibility and precision. ' +
			'Uses less common lexical items with some awareness of style and collocation. ' +
			'May produce occasional errors in word choice, spelling and/or word formation.',
		grammaticalRange:
			'Uses a variety of complex structures. ' +
			'Produces frequent error-free sentences. ' +
			'Has good control of grammar and punctuation but may make a few errors.',
	},
	6: {
		band: 6,
		taskResponse:
			'Addresses all parts of the task although some parts may be more fully covered than others. ' +
			'Presents a relevant position although the conclusions may become unclear or repetitive. ' +
			'Presents relevant main ideas but some may be inadequately developed/unclear.',
		coherenceCohesion:
			'Arranges information and ideas coherently and there is a clear overall progression. ' +
			'Uses cohesive devices effectively, but cohesion within and/or between sentences ' +
			'may be faulty or mechanical. ' +
			'May not always use referencing clearly or appropriately.',
		lexicalResource:
			'Uses an adequate range of vocabulary for the task. ' +
			'Attempts to use less common vocabulary but with some inaccuracy. ' +
			'Makes some errors in spelling and/or word formation, but they do not impede communication.',
		grammaticalRange:
			'Uses a mix of simple and complex sentence forms. ' +
			'Makes some errors in grammar and punctuation but they rarely reduce communication.',
	},
	5: {
		band: 5,
		taskResponse:
			'Addresses the task only partially; the format may be inappropriate in places. ' +
			'Expresses a position but the development is not always clear ' +
			'and there may be no conclusions drawn. ' +
			'Presents some main ideas but these are not sufficiently developed ' +
			'and there may be irrelevant detail.',
		coherenceCohesion:
			'Presents information with some organisation but there may be a lack of overall progression. ' +
			'Makes inadequate, inaccurate or over-use of cohesive devices. ' +
			'May be repetitive because of lack of referencing and substitution.',
		lexicalResource:
			'Uses a limited range of vocabulary, but this is minimally adequate for the task. ' +
			'May make noticeable errors in spelling and/or word formation ' +
			'that may cause some difficulty for the reader.',
		grammaticalRange:
			'Uses only a limited range of structures. ' +
			'Attempts complex sentences but these tend to be less accurate than simple sentences. ' +
			'May make frequent grammatical errors and punctuation may be faulty; ' +
			'errors can cause some difficulty for the reader.',
	},
	4: {
		band: 4,
		taskResponse:
			'Responds to the task only in a minimal way or the answer is tangential; ' +
			'the format may be inappropriate. ' +
			'Presents a position but this is unclear. ' +
			'Presents some main ideas but these are difficult to identify and may be repetitive, ' +
			'irrelevant or not well supported.',
		coherenceCohesion:
			'Presents information and ideas but these are not arranged coherently ' +
			'and there is no clear progression in the response. ' +
			'Uses some basic cohesive devices but these may be inaccurate or repetitive.',
		lexicalResource:
			'Uses only basic vocabulary which may be used repetitively ' +
			'or which may be inappropriate for the task. ' +
			'Has limited control of word formation and/or spelling; ' +
			'errors may cause strain for the reader.',
		grammaticalRange:
			'Uses only a very limited range of structures with only rare use of subordinate clauses. ' +
			'Some structures are accurate but errors predominate, and punctuation is often faulty.',
	},
	3: {
		band: 3,
		taskResponse:
			'Does not adequately address any part of the task. ' +
			'Does not express a clear position. ' +
			'Presents few ideas, which are largely undeveloped or irrelevant.',
		coherenceCohesion:
			'Does not organise ideas logically. ' +
			'May use a very limited range of cohesive devices, and those used ' +
			'may not indicate a logical relationship between ideas.',
		lexicalResource:
			'Uses only a very limited range of words and expressions ' +
			'with very limited control of word formation and/or spelling. ' +
			'Errors may severely distort the message.',
		grammaticalRange:
			'Attempts sentence forms but errors in grammar and punctuation ' + 'predominate and distort the meaning.',
	},
	2: {
		band: 2,
		taskResponse:
			'Barely responds to the task. Does not express a position. ' +
			'May attempt to present one or two ideas but there is no development.',
		coherenceCohesion: 'Has very little control of organisational features.',
		lexicalResource:
			'Uses an extremely limited range of vocabulary; ' +
			'essentially no control of word formation and/or spelling.',
		grammaticalRange: 'Cannot use sentence forms except in memorised phrases.',
	},
	1: {
		band: 1,
		taskResponse: 'Answer is completely unrelated to the task. ' + 'Does not communicate any relevant message.',
		coherenceCohesion: 'Fails to communicate any message.',
		lexicalResource: 'Can only use a few isolated words.',
		grammaticalRange: 'Cannot use sentence forms at all.',
	},
};
