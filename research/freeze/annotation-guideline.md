# Writing-criterion relevance annotation guideline

Status: FROZEN_AI_ASSISTED_SECOND_PASS. A separate second-pass source review was completed before any final experiment outputs were inspected. Labels describe explicit instructional relevance, not proven learning gains or grading accuracy.

## Labels

Assign each label independently: **1** means the activity explicitly trains the criterion; **0** means it is not an explicit instructional target in the available evidence. Multiple labels may be 1; all-zero is valid.

| Label | Explicit instructional targets | Positive example | Negative example |
|---|---|---|---|
| TR — Task Response | Addressing task requirements; developing a position; answering fully/relevantly; supporting ideas with explanations/examples; developing arguments/claims; response relevance/completeness | Essay prompt asks for agreement/disagreement and supporting reasons; lesson demonstrates replacing an unsupported claim with an explanation | Reading factual questions about a trip; a topic title alone |
| CC — Coherence & Cohesion | Paragraph organization; logical progression/sequencing; sentence/paragraph cohesion; linking devices; information structure; ordering ideas | Lesson teaches introduction/body/conclusion or first/then/finally as sequencing devices | A chronological story with factual recall questions but no instruction on sequencing |
| LR — Lexical Resource | Vocabulary range/precision; word choice; collocation; paraphrasing; lexical variation; academic/topic vocabulary | Explicit vocabulary alternatives, collocation gaps or contextual word-meaning questions | Reading about the environment without lexical instruction/questions; merely writing in English |
| GRA — Grammatical Range & Accuracy | Accuracy/range; sentence complexity; clauses; agreement; tense/aspect; articles/prepositions; sentence formation; punctuation materially supporting syntax | Going-to formation, inversion, tense transformations, preposition gaps | Pronunciation of -ing; fillers; grammar naturally needed to write an essay |

## Evidence and boundary rules

1. Read description, theorySummary, questionTypes and sampleStems together; title is orientation only. Record a short evidence-based reason. No model/planner rationale is evidence.
2. A direct production instruction (e.g., take a position, give reasons) is explicit practice even without corrective feedback. Do not automatically give essays CC/LR/GRA. A word count alone earns no label. Routine comprehension questions are not TR simply because they must be answered.
3. Reading/Speaking may qualify when their actual instruction/exercise targets a transferable criterion: vocabulary selection, grammatical formation, explicit linking/organization, or supported argumentation. Pure pronunciation, fluency, factual recall and topic exposure do not qualify. Flag uncertainty about transfer for human review. An ordinary personal Speaking cue card is not automatically Writing TR.
4. Vocabulary-meaning questions explicitly practice lexical precision, including receptive practice; that does not establish transfer to written lexical production. Flag this boundary for review. Gap completion must target a word/collocation or a grammatical form; do not assign both merely because both are needed to read the sentence.
5. Give multiple labels only with separate supporting evidence for each. A cohesive phrase can support CC; do not label LR as well merely because the phrase contains words. A model sentence is not automatically GRA: require explicit form instruction, a grammatical correction, or form-focused questions.
6. For ambiguous/weak/truncated evidence, label only what is supported, state which additional label was withheld, use medium/low confidence as appropriate, and require review. Zero means no explicit target demonstrated, not proof of no possible benefit. Do not reconstruct omitted text after an ellipsis.
7. High confidence: direct, specific instruction or question supports the decision. Medium: transfer/boundary or partial-content issue could change the decision. Low: evidence is insufficient to distinguish plausible targets. Flag every multi-label item, every medium/low item and every uncertainty, even if confidence in the assigned labels is high.
8. The frozen snapshot is the annotation source. Its bounded summaries/sample stems support provisional annotation, not an assertion that every full exercise was inspected. Human reviewers may request source content to resolve uncertainty; record provenance and preserve the frozen catalog.

## Timing and human review

Assign labels before inspecting final experiment outputs. This pass used only the three supplied freeze artifacts; no plan outputs, prior pilot rationales, provider calls or new experiments were used. AI labels are a proposed draft, not independent human agreement. A separate second-pass review checked the draft against the full frozen source content in db.zip and resolved source-truncation cases before freeze. Do not tune labels to make a condition perform better.
