export interface VocabularyListItem {
	id: string;
	status: string;
	note: string | null;
	context: string | null;
	addedAt: Date;
	entry: VocabularyEntryBrief;
}
