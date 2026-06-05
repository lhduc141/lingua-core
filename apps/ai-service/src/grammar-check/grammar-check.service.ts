import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
	GrammarCheckResult,
	GrammarErrorCategory,
	GrammarIssue,
	GrammarIssueSeverity,
} from './grammar-check.interface';

// LanguageTool response types
interface LtReplacement {
	value: string;
}

interface LtRule {
	id: string;
	category?: { id: string };
}

interface LtMatch {
	message: string;
	offset: number;
	length: number;
	replacements: LtReplacement[];
	rule: LtRule;
	context: { text: string; offset: number; length: number };
}

interface LtResponse {
	matches: LtMatch[];
}

interface CustomRule {
	pattern: RegExp;
	category: GrammarErrorCategory;
	severity: GrammarIssueSeverity;
	explanation: string;
	getCorrected: (match: RegExpExecArray) => string;
}

// Fix gerund → base verb: handles silent-e verbs and double-consonant correctly
function gerundToBaseVerb(word: string): string {
	const irregulars: Record<string, string> = {
		providing: 'provide',
		making: 'make',
		using: 'use',
		taking: 'take',
		giving: 'give',
		having: 'have',
		coming: 'come',
		writing: 'write',
		living: 'live',
		loving: 'love',
		moving: 'move',
		leaving: 'leave',
		becoming: 'become',
		including: 'include',
		continuing: 'continue',
		changing: 'change',
		choosing: 'choose',
		increasing: 'increase',
		reducing: 'reduce',
		producing: 'produce',
		introducing: 'introduce',
		encouraging: 'encourage',
		achieving: 'achieve',
		improving: 'improve',
		removing: 'remove',
		creating: 'create',
		managing: 'manage',
		solving: 'solve',
	};
	const w = word.toLowerCase();
	if (irregulars[w]) return irregulars[w];
	// Double consonant: running → run, getting → get
	const doubleConsonant = word.replace(/([bcdfghjklmnpqrstvwxyz])\1ing$/, '$1');
	if (doubleConsonant !== word) return doubleConsonant;
	// Regular: playing → play
	return word.replace(/ing$/, '');
}

const CUSTOM_RULES: CustomRule[] = [
	// Rule 1: verb pattern after passive — "required providing" → "required to provide"
	{
		pattern:
			/\b(required|needed|expected|asked|told|encouraged|forced|allowed|permitted)\s+(providing|doing|making|giving|taking|having|using|going|coming|getting|putting|setting|working|helping|showing|finding|keeping|leaving|moving|saying|seeing|thinking|trying|turning|writing|reading|speaking|listening|learning|studying|practicing|changing|choosing|increasing|reducing|producing|introducing|encouraging|achieving|improving|removing|creating|managing|solving)\b/gi,
		category: 'verb_pattern',
		severity: 'medium',
		explanation:
			"After passive structures like 'be required/expected/asked', use infinitive 'to + verb', not gerund.",
		getCorrected: (m) => `${m[1]} to ${gerundToBaseVerb(m[2])}`,
	},

	// Rule 2: adjective + gerund — "more likely adopting" → "more likely to adopt"
	{
		pattern:
			/\b(more\s+likely|unlikely|ready|able|unable|willing|unwilling|eager|hesitant|reluctant|determined|supposed|meant)\s+(adopting|using|doing|making|going|having|taking|giving|getting|working|helping|finding|keeping|leaving|moving|saying|seeing|thinking|trying|turning|writing|reading|speaking|learning|studying|choosing|changing|increasing|reducing|improving|achieving)\b/gi,
		category: 'gerund_infinitive',
		severity: 'medium',
		explanation:
			"Adjectives like 'likely', 'ready', 'able', 'willing' should be followed by 'to + verb', not gerund.",
		getCorrected: (m) => `${m[1]} to ${gerundToBaseVerb(m[2])}`,
	},

	// Rule 3a: simple singular subject-verb agreement — "this problem are"
	{
		pattern: /\b(this|that|each|every|one)\s+(\w+)\s+(have|are|were|do)\b/gi,
		category: 'subject_verb_agreement',
		severity: 'medium',
		explanation: "Singular subject requires singular verb form ('has', 'is', 'was', 'does').",
		getCorrected: (m) => {
			const verbMap: Record<string, string> = { have: 'has', are: 'is', were: 'was', do: 'does' };
			return `${m[1]} ${m[2]} ${verbMap[m[3].toLowerCase()] ?? m[3]}`;
		},
	},

	// Rule 3b: long noun phrase subject-verb agreement — "the amount of energy they burn are"
	// Conservative: bỏ majority/variety/quality (thường dùng plural), không cross comma/semicolon/colon, window 60
	{
		pattern:
			/\bthe\s+(amount|number|level|rate|proportion|quantity|extent|degree)\s+of\b[^.!?,;:]{3,60}\b(are|were|have)\b/gi,
		category: 'subject_verb_agreement',
		severity: 'medium',
		explanation: "'The amount/number/level of...' is a singular noun phrase — use 'is/was/has'.",
		getCorrected: (m) =>
			m[0].replace(/\b(are|were|have)\b/, (v: string) => ({ are: 'is', were: 'was', have: 'has' })[v] ?? v),
	},

	// Rule 4: wrong preposition — "invest money on" → "invest money in"
	{
		pattern: /\binvest\s+(?:more\s+|less\s+|extra\s+)?money\s+on\b/gi,
		category: 'preposition',
		severity: 'medium',
		explanation: "Use 'invest money in', not 'invest money on'. 'Invest in' is the correct collocation.",
		getCorrected: (m) => m[0].replace(/\bon\b$/, 'in'),
	},

	// Rule 5: missing article — "excessive amount of" → "an excessive amount of"
	{
		pattern: /\b(?:buying|consuming|purchasing|eating|spending|producing|using)\s+excessive\s+amount\s+of\b/gi,
		category: 'article',
		severity: 'medium',
		explanation:
			"'Excessive amount' is a countable noun phrase — use 'an excessive amount of' or 'excessive amounts of'.",
		getCorrected: (m) => m[0].replace('excessive amount', 'an excessive amount'),
	},

	// Rule 6: unnatural verb pattern — "make people become less/more [adj]"
	{
		pattern:
			/\bmake\s+(people|students|children|citizens|employees|workers|individuals|learners|adults)\s+become\s+(less|more|very|quite|increasingly)\b/gi,
		category: 'verb_pattern',
		severity: 'low',
		explanation:
			"'Make someone become [adj]' is unnatural. Prefer 'make someone [adj]' or 'cause someone to become [adj]'.",
		getCorrected: (m) => m[0].replace('become ', ''),
	},

	// Rule 7: pronoun reference — "these measures ... but it would"
	{
		pattern:
			/\b(these|those)\s+(\w+s)\b[^.!?]{5,80}\b(it)\s+(would|could|should|will|can|may|might|has|have|is|was)\b/gi,
		category: 'pronoun_reference',
		severity: 'low',
		explanation: "Pronoun 'it' may not match a plural antecedent. Consider using 'they' or 'them'.",
		getCorrected: (m) => m[0].replace(/\bit\b/, 'they'),
	},

	// Rule 8: missing space after punctuation
	{
		pattern: /([a-z])([.!?,;:])([A-Z])/g,
		category: 'punctuation',
		severity: 'low',
		explanation: 'Missing space after punctuation mark.',
		getCorrected: (m) => `${m[1]}${m[2]} ${m[3]}`,
	},
];

function mapLtRuleToCategory(ruleId: string): GrammarErrorCategory {
	const id = ruleId.toUpperCase();
	if (id.includes('AGREEMENT') || id.includes('VERB_FORM') || id.includes('SVA')) return 'subject_verb_agreement';
	if (id.includes('SPELL') || id.includes('MORFOLOGIK')) return 'spelling';
	if (id.includes('PUNCT') || id.includes('COMMA') || id.includes('PERIOD')) return 'punctuation';
	if (id.includes('ARTICLE') || id.includes('DET_')) return 'article';
	if (id.includes('PREP') || id.includes('PREPOSITION')) return 'preposition';
	if (id.includes('GERUND') || id.includes('INFINITIVE') || id.includes('TO_VB')) return 'gerund_infinitive';
	if (id.includes('PRONOUN') || id.includes('REFERENCE') || id.includes('IT_VBZ')) return 'pronoun_reference';
	if (id.includes('PARALLEL') || id.includes('STRUCT')) return 'parallel_structure';
	if (id.includes('WORD_FORM') || id.includes('WRONG_FORM')) return 'word_form';
	return 'other';
}

function mapLtSeverity(ruleId: string, categoryId?: string): GrammarIssueSeverity {
	const id = ruleId.toUpperCase();
	const cat = (categoryId ?? '').toUpperCase();
	if (id.includes('SPELL') || id.includes('MORFOLOGIK')) return 'low';
	if (cat === 'GRAMMAR' || cat === 'AGREEMENT') return 'medium';
	if (id.includes('AGREEMENT') || id.includes('SVA') || id.includes('VERB_FORM')) return 'medium';
	return 'low';
}

function computeGraCeiling(mediumHighCount: number): number | null {
	if (mediumHighCount >= 4) return 6.0;
	if (mediumHighCount >= 2) return 6.5;
	return null;
}

function buildIssueCountsByCategory(issues: GrammarIssue[]): Partial<Record<GrammarErrorCategory, number>> {
	const counts: Partial<Record<GrammarErrorCategory, number>> = {};
	for (const issue of issues) {
		counts[issue.category] = (counts[issue.category] ?? 0) + 1;
	}
	return counts;
}

@Injectable()
export class GrammarCheckService {
	private readonly logger = new Logger(GrammarCheckService.name);
	private readonly ltBaseUrl: string;
	private readonly timeoutMs = 10000;

	constructor(private readonly configService: ConfigService) {
		this.ltBaseUrl = this.configService.get<string>('LANGUAGE_TOOL_URL', 'http://languagetool:8081');
		this.logger.log(`[GrammarCheck] ltBaseUrl=${this.ltBaseUrl}`);
	}

	async check(text: string): Promise<GrammarCheckResult> {
		let ltStatus: GrammarCheckResult['ltStatus'] = 'ok';

		const [ltIssues, customIssues] = await Promise.all([
			this.runLanguageTool(text).catch((err) => {
				this.logger.warn(`[GrammarCheck] LanguageTool error: ${(err as Error).message}`);
				ltStatus = 'error';
				return [] as GrammarIssue[];
			}),
			Promise.resolve(this.runCustomRules(text)),
		]);

		const merged = this.mergeAndDeduplicate([...ltIssues, ...customIssues]);
		const mediumHighCount = merged.filter((i) => i.severity === 'medium' || i.severity === 'high').length;

		const sources: Array<'languagetool' | 'custom_rules'> = [];
		if (ltIssues.length > 0) sources.push('languagetool');
		if (customIssues.length > 0) sources.push('custom_rules');

		const legacySource: GrammarCheckResult['source'] =
			ltIssues.length > 0 ? 'languagetool' : customIssues.length > 0 ? 'custom_rules' : 'fallback_empty';

		return {
			issues: merged,
			mediumHighCount,
			graCeiling: computeGraCeiling(mediumHighCount),
			source: legacySource,
			sources,
			ltStatus,
			issueCountsByCategory: buildIssueCountsByCategory(merged),
		};
	}

	private async runLanguageTool(text: string): Promise<GrammarIssue[]> {
		try {
			const controller = new AbortController();
			const timer = setTimeout(() => {
				controller.abort();
			}, this.timeoutMs);

			const body = new URLSearchParams({ text, language: 'en-US', enabledOnly: 'false' });

			const response = await fetch(`${this.ltBaseUrl}/v2/check`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
				body: body.toString(),
				signal: controller.signal,
			});

			clearTimeout(timer);

			if (!response.ok) {
				this.logger.warn(`[GrammarCheck] LanguageTool HTTP ${response.status}`);
				return [];
			}

			const data = (await response.json()) as LtResponse;
			return this.normalizeLtMatches(data.matches ?? [], text);
		} catch (err) {
			const msg = (err as Error).message ?? String(err);
			if (msg.includes('abort') || msg.includes('timed out')) {
				this.logger.warn(`[GrammarCheck] LanguageTool timeout after ${this.timeoutMs}ms`);
			} else {
				this.logger.warn(`[GrammarCheck] LanguageTool unavailable: ${msg}`);
			}
			return [];
		}
	}

	private normalizeLtMatches(matches: LtMatch[], text: string): GrammarIssue[] {
		return matches
			.filter((m) => m.replacements.length > 0)
			.map((m): GrammarIssue => {
				const original = text.substring(m.offset, m.offset + m.length);
				const corrected = m.replacements[0]?.value ?? original;
				const category = mapLtRuleToCategory(m.rule.id);
				const severity = mapLtSeverity(m.rule.id, m.rule.category?.id);

				return {
					original,
					corrected,
					category,
					severity,
					explanation: m.message,
					offset: m.offset,
				};
			})
			.filter((issue) => issue.original !== issue.corrected);
	}

	private runCustomRules(text: string): GrammarIssue[] {
		const issues: GrammarIssue[] = [];

		for (const rule of CUSTOM_RULES) {
			rule.pattern.lastIndex = 0;
			let match: RegExpExecArray | null;

			while ((match = rule.pattern.exec(text)) !== null) {
				const original = match[0];
				const corrected = rule.getCorrected(match);

				if (original.toLowerCase() !== corrected.toLowerCase()) {
					issues.push({
						original,
						corrected,
						category: rule.category,
						severity: rule.severity,
						explanation: rule.explanation,
						offset: match.index,
					});
				}
			}
		}

		return issues;
	}

	private mergeAndDeduplicate(issues: GrammarIssue[]): GrammarIssue[] {
		const seen = new Set<string>();
		const result: GrammarIssue[] = [];

		for (const issue of issues) {
			const key = `${issue.offset}:${issue.original.toLowerCase()}`;
			if (!seen.has(key)) {
				seen.add(key);
				result.push(issue);
			}
		}

		return result.sort((a, b) => a.offset - b.offset);
	}
}
