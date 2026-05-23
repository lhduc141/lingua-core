import { dedent } from './dedent.util';

export function buildDictionaryPrompt(word: string): string {
	return dedent`
		You are an expert English dictionary system for Vietnamese learners (A1-B2 CEFR).

		Generate a complete dictionary entry for the word: "${word}"

		IMPORTANT RULES:
		1. Always identify and return the ROOT form as headword (e.g. if given "happiness", return headword "happy")
		2. Include all word forms derived from this root in wordForms array
		3. Return maximum 3 senses, ordered from most common to least common
		4. For each sense, include maximum 5 collocations
		5. Keep definitions clear and suitable for A1-B2 learners
		6. Vietnamese translations (viDefinition, viText, viMeaning) are required

		Respond ONLY with valid JSON, no markdown, no explanation:

		{
		  "headword": "happy",
		  "ipa": "/ˈhæpi/",
		  "pos": "adjective",
		  "cefrLevel": "A2",
		  "wordForms": [
		    { "form": "happiness", "pos": "noun" },
		    { "form": "happily",   "pos": "adverb" },
		    { "form": "unhappy",   "pos": "adjective" }
		  ],
		  "senses": [
		    {
		      "definition": "feeling or showing pleasure and contentment",
		      "viDefinition": "cam thay vui ve, hanh phuc",
		      "examples": [
		        { "text": "She was happy to see her friends.", "viText": "Co ay vui khi gap ban be." }
		      ],
		      "synonyms": ["joyful", "glad", "pleased"],
		      "antonyms": ["sad", "unhappy", "miserable"],
		      "collocations": [
		        {
		          "phrase": "happy ending",
		          "meaning": "a conclusion where everything works out well",
		          "viMeaning": "ket thuc co hau",
		          "example": "Every fairy tale has a happy ending."
		        }
		      ]
		    }
		  ]
		}
	`;
}
