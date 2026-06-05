export type GrammarErrorCategory =
	| 'subject_verb_agreement'
	| 'verb_pattern'
	| 'gerund_infinitive'
	| 'pronoun_reference'
	| 'article'
	| 'preposition'
	| 'word_form'
	| 'parallel_structure'
	| 'sentence_boundary'
	| 'punctuation'
	| 'spelling'
	| 'other';

export type GrammarIssueSeverity = 'low' | 'medium' | 'high';

export interface GrammarIssue {
	original: string;
	corrected: string;
	category: GrammarErrorCategory;
	severity: GrammarIssueSeverity;
	explanation: string;
	offset: number;
}

export interface GrammarCheckResult {
	issues: GrammarIssue[];
	mediumHighCount: number;
	graCeiling: number | null;
	// Legacy single source — kept for log compatibility
	source: 'languagetool' | 'custom_rules' | 'fallback_empty';
	// Extended metadata for debug/defense
	sources: Array<'languagetool' | 'custom_rules'>;
	ltStatus: 'ok' | 'timeout' | 'error';
	issueCountsByCategory: Partial<Record<GrammarErrorCategory, number>>;
}
