"""Offline, item-specific annotation assembly. No model calls or plan-output inputs."""
import csv, json, hashlib, pathlib, collections, io
SRC=pathlib.Path('D:/Projects/Code/lingua-core/research/freeze')
OUT=pathlib.Path(__file__).resolve().parent
s=json.loads((SRC/'catalog-snapshot.json').read_text(encoding='utf-8-sig'))
m=json.loads((SRC/'freeze-manifest.json').read_text(encoding='utf-8-sig'))
details=s['catalog']['details']
# Explicit item-by-item decisions, keyed to the snapshot order and checked against short IDs.
# Binary order: TR CC LR GRA. Reasons identify instructional evidence, not topic/skill alone.
decisions=[
('03eb53ef','0011','Adjective/vocabulary gaps and descriptive-adjective practice target LR; there is/are and missing-preposition correction explicitly target GRA.'),
('01ecdb33','1000','The essay explicitly asks whether social-media use is positive or negative: taking a position is TR. No specific organization, vocabulary or form instruction is shown.'),
('0158362d','0000','Theory teaches scanning for goods and sensory details; samples ask when, what kind of market and what farmers sell. Descriptive words are comprehension cues, not explicit lexical-use training.'),
('5203057c','0000','Samples test the main topic, communication uses and information found on a phone. These are passage-comprehension targets, not the four Writing criteria.'),
('05b58a7a','1010','Theory says to give a specific example rather than merely state that one helps (TR); volunteer/support/community-style vocabulary gaps train LR. Tone and intonation receive no Writing label.'),
('01ceee74','0011','Description explicitly teaches past tenses and travel vocabulary; Where ___ you go tests form, and accommodation/sightseeing gaps test lexical choice.'),
('0b4b597f','0111','Description explicitly includes sequencing events (CC); adjective examples and festival-word gaps target LR; present/past rules and the missing-is correction target GRA.'),
('0475d138','0001','Description and verb-cued gaps explicitly practice be going to sentence formation. The future topic itself does not establish TR, CC or LR.'),
('30647e73','0100','Theory explicitly explains because/so/to as signals of reasons and relations (CC). Factual sample questions add no TR, LR or GRA target; receptive-to-Writing transfer needs review.'),
('6087ada1','0000','Questions ask topic, journey length and scenery. No criterion-focused instruction is provided beyond reading factual travel information.'),
('271ddacc','1010','Theory explicitly asks learners to explain why using because (TR); skill/practice/challenging vocabulary questions target LR. Pronouncing -ing is not GRA.'),
('0efea2c5','0000','A personal-memory Speaking prompt asks age, events and why it is remembered, without explicit instruction in written development or organization. TR transfer is ambiguous and withheld.'),
('1ea04422','0010','Shopping-list and buy/cost vocabulary gaps provide lexical practice. Listing quantities and budgeting alone are not paragraph organization or argument development; pragmatic politeness examples do not establish grammar instruction.'),
('1074d0fd','1000','Essay instruction asks for good and bad points of home study, requiring development of relevant points (TR); other criteria are not explicitly targeted.'),
('3a4e4ed5','0100','Theory explicitly teaches action order using first/then/next/after that/finally. This is sequencing/cohesive-device instruction (CC), with receptive transfer flagged.'),
('638d1ea8','0000','Samples ask the skill learned, starting time and teacher name. These are factual recall tasks, not criterion instruction.'),
('2cbb513f','1110','Theory teaches an opinion and both advantages/disadvantages (TR), on the one hand/on the other hand (CC), and internet-related vocabulary gaps (LR). Speech fillers are excluded.'),
('0f029511','0011','Located ___ to targets a spatial preposition (GRA); traffic and neighborhood-adjective gaps target lexical choice (LR), despite the Speaking skill label.'),
('26bd3eb0','0011','Theory explicitly teaches be going to for plans (GRA) and offers travel/stay/visit/relax vocabulary alongside lexical gaps (LR). A holiday topic alone is not TR.'),
('2571667f','0001','Can/should ability/advice gaps and the stated modal-verb objective explicitly target GRA only.'),
('3a677d8b','0000','Theory and samples focus on job facts, workplace and scanning. Mentioning verbs/nouns as reading cues does not explicitly train their forms or lexical choice.'),
('74b0d4dd','0000','Questions recall the city, street features and city life. No explicit Writing-criterion target appears in the supplied activity.'),
('3557e6d0','1010','Theory explicitly instructs clear opinion statements (TR); genre/plot/character vocabulary questions target LR. Fillers and speech planning are not Writing CC/GRA.'),
('1626ed34','0010','Salary/customer/uniform-style sentence gaps train occupational lexical selection. The future-work description does not itself target tense formation or arguments.'),
('0f8aacc6','1111','Report sections and ordered body/conclusion target CC; required what/when/where/why information targets TR; took place/participated/promote-style gaps target LR; explicit past-simple correction targets GRA.'),
('04944225','1000','The essay explicitly asks agreement/disagreement on the necessity of books, targeting a position and relevant response. No additional criterion instruction is visible.'),
('268a2aed','0100','Theory defines chronological order and demonstrates first/then/finally and time markers. This explicitly trains sequencing (CC), although in receptive reading.'),
('0b4b002a','0010','The sample explicitly asks the contextual meaning of broadens horizons (LR). Travel-benefit comprehension alone does not establish TR.'),
('1c1c237b','0010','Theory lists empathy/trust/conflict resolution and samples test empathy and communication vocabulary. Opinion phrases alone do not demonstrate supported argument development.'),
('01e3659d','0011','The conditional temperatures ___ to rise question targets grammatical completion (GRA); extinction and air-quality lexical gaps target LR. Environmental topic alone is not TR.'),
('1b078f42','1111','Who/What/When/Where/Why targets completeness (TR); transitioning from factual summary to opinion and stated clear structure target CC; neutral-versus-loaded lexical revision targets LR; past simple is explicitly instructed (GRA).'),
('05a2d95f','0001','Direct-to-reported speech transformations explicitly require tense/pronoun changes. No independent lexical or argument target is shown.'),
('292f565b','0000','Will/might/expected to are presented as prediction-identification cues in reading, not as form/accuracy practice. Questions identify technologies and benefits; GRA is withheld.'),
('55ec3d4b','0010','The question asking what crucial means explicitly targets lexical precision (LR); the remaining visible questions are comprehension.'),
('23e80c63','1110','Theory teaches definitions supported by examples (TR), For example/For instance linking (CC), and environmental terms/collocations in word gaps (LR).'),
('02a2850e','0010','Take up/give up and team-spirit-type gaps target phrasal verbs and collocations (LR). No tense or clause transformation is required by the shown stems.'),
('1c192cb3','1011','Theory replaces Exercise is good with an explanation of benefits (TR), supplies lexical alternatives to good (LR), and explicitly teaches imperatives/modals for advice (GRA).'),
('084675d7','1000','The visible essay prompt requires agreement/disagreement and reasons/examples, explicitly targeting supported response development (TR). Do not infer other criteria from essay format.'),
('323d6b18','0000','Theory teaches recognizing advantages/disadvantages in a passage and samples recall city pros/cons. Producing supported arguments or selecting vocabulary is not explicitly required.'),
('5cb6867d','0010','A sample asks for the meaning of sustainability, an explicit lexical-meaning target. Environmental facts alone do not earn TR/CC/GRA.'),
('3e1f78ad','1010','Description explicitly requires reasons for admirable qualities/influence (TR); theory teaches character adjectives/action verbs and samples test role-model vocabulary (LR).'),
('03078bcb','0000','Personal Speaking cue card lists gift details and reaction. It provides no explicit transferable development technique; treating cue-card completeness as Writing TR is uncertain and withheld.'),
('1c72fb39','1011','Theory models explaining why a career is desired (TR), teaches strong action verbs and career collocations (LR), and explicitly teaches will/going to future constructions (GRA).'),
('0d88e60a','1000','The essay explicitly requires agreement/disagreement plus reasons/examples about responsibility, targeting TR; no independent lexical/form/organization instruction is shown.'),
('3b42f9c7','0000','Theory explains identifying scientific concepts for comprehension; samples ask topic, AI definition and telescope purpose. Conceptual comprehension is not automatically lexical precision or written explanation.'),
('5f7f054f','0010','The question What does upskilling mean explicitly trains lexical meaning (LR). Other displayed questions are factual comprehension.'),
('65a4aea8','0010','Theory explicitly teaches trend-reporting expressions and health vocabulary; questions test sedentary/balanced diet/mindfulness meanings or collocations (LR). No explicit tense-form exercise is shown.'),
('049f05ad','1000','The Speaking prompt asks an evaluative judgment about technology and its disadvantages, giving explicit position/evaluation practice (TR). Transfer to Writing is provisional; no other criterion is explicit.'),
('03083c81','0010','Theory contrasts neutral/loaded vocabulary and explicitly explains diction/word choice; sample language/objectivity gaps support LR. General article-structure mention lacks a specific organization task in the visible detail, so CC is withheld.'),
('0180c93b','0001','Description explicitly teaches complex noun phrases; participial modifier gaps practice syntactic complexity (GRA), not merely topic vocabulary.'),
('0c646d8d','1010','Theory explicitly models supporting a general idea with facts/examples/reasons (TR); a contextual meaning question for exacerbated targets LR. Receptive-to-productive transfer needs review.'),
('17306214','0010','Description explicitly includes interpreting vocabulary, supporting LR provisionally; visible samples mostly test myth content, so omitted question evidence requires human checking.'),
('0b354673','1010','Theory supplies impact claims and A powerful example is scaffolding (TR), and explicitly teaches metaphor/simile word choice with topic vocabulary gaps (LR). Figurative language is not automatically grammar range.'),
('04286fce','0000','Visible stem presents competing GMO positions but cuts off at What; the requested response is missing. Ethics/safety topic alone cannot establish argument practice, so TR is withheld pending review.'),
('08e6954e','1110','Theory teaches a clear dilemma and contrasting stakeholder perspectives (TR); description explicitly targets clear argument structure (CC); appropriate vocabulary and dilemma/integrity/ethical-code gaps target LR.'),
('09ab972e','1000','Description explicitly asks debate on funding and the visible essay stem begins an agree/disagree instruction, supporting TR. Truncation is flagged; no other criterion is inferred.'),
('360a5740','0010','A contextual meaning question for subtly targets LR. Recognizing an author purpose or persuasion in reading is not itself instruction in producing a supported response.'),
('22d69dc0','0010','Description explicitly includes interpreting vocabulary; the cue definition question also supports lexical meaning. Habit mechanisms themselves do not establish TR/CC/GRA.'),
('427ab7ee','1011','Description explicitly teaches debating advantages/disadvantages (TR); vocabulary/collocation gaps target LR; comparative/superlative and as...as structures are explicitly taught (GRA).'),
('0d9ec35f','1000','The visible Speaking prompt requires agreement/disagreement and specific reasons/examples, directly training supported argumentation (TR). It does not explicitly train other criteria.'),
('15b87fd2','1110','Review outline includes thesis and example-supported analysis (TR), introduction/body/conclusion (CC), and explicit alternatives such as intricately woven/masterfully executed (LR).'),
('0f475693','1000','The essay asks extent of agreement/disagreement with a nuclear-energy claim, directly targeting a position/relevant response (TR). The missing ending is flagged; other criteria are not inferred.'),
('3af0c5c7','0110','Theory explicitly teaches cause/effect connections and because/since/as a result/consequently (CC); a word-meaning question for unprecedented targets LR. Receptive transfer is provisional.'),
('40ec8311','0010','Description explicitly identifies vocabulary in context as a practice objective (LR). Visible questions are mainly factual, so confirm the omitted lexical questions during review.'),
('477d478e','0010','Theory teaches reporting-verb choices (called/emphasize) and SDG topic vocabulary; sample gaps target blueprint/goals/development-type lexis. No reporting-clause transformation or explicit argument task is shown.'),
('1347387b','0010','Globalization sentence gaps target topical lexical choices/collocations such as production relocation and cultural effects. Analyze in the description does not make these MCQs argument-writing practice.'),
('1f8120a6','1110','Theory explicitly requires supported perspectives (TR) and introduction/body/conclusion with distinct arguments (CC); topic-vocabulary gaps target LR. Truncated impersonal-construction advice is insufficient for GRA=1.'),
('0fa488a5','0001','Inversion/emphasis instruction and negative-adverbial sentence gaps explicitly target syntactic range (GRA).'),
('416ec6b0','0010','Theory teaches inferring word meanings from context, with fragile example and an unraveling meaning question (LR); no other criterion-specific production target appears.'),
('539f8468','0010','Description explicitly includes interpreting vocabulary (LR); the visible AI-bias questions are mostly conceptual comprehension, so confirm unseen lexical questions rather than infer TR from ethical arguments.'),
('4a03fda7','0011','Theory explicitly teaches quantifier constructions for accurate group/statistical descriptions (GRA); inequality/wealth-gap/social-mobility gaps and analytical lexical frames target LR. Solution topic alone does not establish TR.'),
('226a70a9','0010','Sentence gaps require precise journalism vocabulary/collocations concerning sensationalism, bias and fact-checking (LR). Evaluating credibility is not automatically developing a written argument.'),
]
assert len(decisions)==72
sha=lambda b:hashlib.sha256(b).hexdigest()
canonical=lambda o:json.dumps(o,ensure_ascii=False,separators=(',',':')).encode()
without={k:v for k,v in s.items() if k!='snapshotSha256'}
assert sha(canonical(without))==s['snapshotSha256']==m['catalogSnapshotSha256']
pool=[d for p in s['candidatePoolsByCefr'].values() for d in p]
assert len(pool)==len(details)==72 and len({d['fullRefId'] for d in details})==72
catalog_records=s['catalog']['lessons']+s['catalog']['questionSets']
assert len(catalog_records)==72
catalog_ids=[r.get('lessonId',r.get('questionSetId')) for r in catalog_records]
assert len(set(catalog_ids))==72 and set(catalog_ids)=={d['fullRefId'] for d in details}
for level in ['A2','B1','B2']:
    p=s['candidatePoolsByCefr'][level]
    assert len(p)==24 and all(x['cefrLevel']==level for x in p)
    assert sha(canonical(p))==m['candidatePoolHashesByCefr'][level]==s['candidatePoolHashesByCefr'][level]
for d in details:
    assert isinstance(d['estimatedMinutes'],int) and d['estimatedMinutes']>0
    assert d['description'].strip() and d['sampleStems'] and d['questionTypes']
    p=next(x for x in pool if x['fullRefId']==d['fullRefId'])
    assert all(p[k]==d[k] for k in ['title','skillName','itemType','cefrLevel','estimatedMinutes'])
    record=next(r for r in catalog_records if r.get('lessonId',r.get('questionSetId'))==d['fullRefId'])
    assert all(record[k]==d[k] for k in ['title','skillName','cefrLevel','estimatedMinutes'])
rows=list(csv.DictReader((SRC/'relevance-matrix.csv').read_text(encoding='utf-8-sig').splitlines()))
assert len(rows)==72 and len({r['content_id'] for r in rows})==72
assert {r['content_id'] for r in rows}=={d['fullRefId'] for d in details}
by_id={r['content_id']:r for r in rows}
review=[]
# These cases require an explicit human decision beyond the automatic truncation/multi-label flags.
boundary={2,8,10,11,12,14,16,17,22,26,27,29,32,33,38,39,40,41,44,45,47,48,50,51,53,56,57,59,62,63,64,65,68,69,70,71}
for index,((prefix,bits,reason),d) in enumerate(zip(decisions,details)):
    assert d['refId']==prefix
    r=by_id[d['fullRefId']]
    assert r['title']==d['title'] and r['cefr']==d['cefrLevel'] and int(r['estimated_minutes'])==d['estimatedMinutes']
    assert r['skill']==d['skillName'] and r['item_type']==d['itemType'] and r['description']==d['description']
    trunc=any('…' in x for x in [d.get('theorySummary') or '',*d['sampleStems']])
    multi=bits.count('1')>1
    weak=index in {51,53,63,69}
    confidence='low' if index==53 else 'medium' if index in boundary or trunc else 'high'
    needs_review=multi or confidence!='high' or weak
    r.update(dict(zip(['TR','CC','LR','GRA'],bits)))
    r.update(annotation_reason=reason,annotation_confidence=confidence,review_required=str(needs_review).lower())
    if needs_review:
        issues=[]
        if multi:issues.append('Multiple proposed criteria: verify independent evidence for each label.')
        if trunc:issues.append('Snapshot truncates theory or stem; omitted content was not inferred.')
        if index in boundary:issues.append('Instruction-versus-incidental practice or receptive/oral-to-Writing transfer boundary requires human judgment.')
        if weak:issues.append('Sample does not fully expose the criterion-focused question/instruction.')
        evidence=json.dumps({k:d.get(k) for k in ['description','theorySummary','questionTypes','sampleStems']},ensure_ascii=False)
        review.append({'content_id':d['fullRefId'],'title':d['title'],'proposed_labels':';'.join(f'{k}={v}' for k,v in zip(['TR','CC','LR','GRA'],bits)), 'exact_evidence':evidence,'ambiguity_reason':' '.join(issues),'recommended_decision':reason+' Retain as provisional only; inspect full source if needed and resolve consistently before final approval.','annotation_confidence':confidence})
def save_csv(name,rs,fields):
    with (OUT/name).open('w',newline='',encoding='utf-8') as f:
        w=csv.DictWriter(f,fieldnames=fields);w.writeheader();w.writerows(rs)
save_csv('relevance-matrix.csv',rows,list(rows[0]))
save_csv('annotation-review.csv',review,list(review[0]))
labels=['TR','CC','LR','GRA']
def counts(rs):return {k:sum(int(r[k]) for r in rs) for k in labels}
coverage={'relevantItems':counts(rows),'relevantMinutes':{k:sum(int(r[k])*int(r['estimated_minutes']) for r in rows) for k in labels},'byCefr':{level:counts([r for r in rows if r['cefr']==level]) for level in ['A2','B1','B2']},'byItemType':{typ:counts([r for r in rows if r['item_type']==typ]) for typ in ['lesson','practice_session']},'reviewItems':len(review),'allZeroItems':sum(not any(int(r[k]) for k in labels) for r in rows)}
for r in rows:assert all(r[k] in ['0','1'] for k in labels) and r['annotation_reason']
original_source_hash=m['sourceDbSha256'];assert original_source_hash==s['sourceDbSha256']
m.update(relevanceMatrixSha256=sha((OUT/'relevance-matrix.csv').read_bytes()),annotationGuidelineSha256=sha((OUT/'annotation-guideline.md').read_bytes()),annotationReviewSha256=sha((OUT/'annotation-review.csv').read_bytes()),annotationItemCount=72,annotationCoverageSummary=coverage,annotationStatus='DRAFT_REVIEWED_BY_AI')
m['annotationProvenance']={'method':'Single AI-assisted item-by-item draft; not independent human annotation','sources':['catalog-snapshot.json','relevance-matrix.csv (unlabeled input)','freeze-manifest.json'],'dbZipUsed':False,'planOutputsUsed':False,'plannerRationalesUsed':False,'sourceSkillAloneUsedForLabels':False,'humanReviewPending':True,'snapshotHashConvention':'SHA-256 of compact UTF-8 JSON, insertion order, ensure_ascii=false, excluding snapshotSha256; not raw-file SHA-256','catalogSnapshotFileSha256':sha((SRC/'catalog-snapshot.json').read_bytes())}
assert m['sourceDbSha256']==original_source_hash
(OUT/'freeze-manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
validation={'catalogIntegrity':'PASS','uniqueItems':72,'levels':{l:24 for l in ['A2','B1','B2']},'candidatePoolHashMatch':True,'canonicalSnapshotHashMatch':True,'durationsValid':True,'semanticEvidenceAvailable':True,'semanticEvidenceLimitation':'Descriptions/types/sample stems available for all items; truncated evidence and transfer boundaries require human review, not final approval.','matrixBijection':True,'binaryComplete':True,'sourceDbHashPreserved':True,'coverage':coverage,'verdict':'READY FOR HUMAN ANNOTATION REVIEW'}
(OUT/'annotation-validation.json').write_text(json.dumps(validation,indent=2)+'\n',encoding='utf-8')
def table(title,data):
    return '\n'+title+'\n\n| Group | TR | CC | LR | GRA |\n|---|---:|---:|---:|---:|\n'+''.join('| '+key+' | '+' | '.join(str(val[k]) for k in labels)+' |\n' for key,val in data.items())
report='# Stage-1 criterion-relevance annotation validation\n\n**READY FOR HUMAN ANNOTATION REVIEW**\n\nStatus: DRAFT_REVIEWED_BY_AI. No annotation has been marked final. No Groq call, experiment, production-code change, or Stage-2 work was performed.\n\n'
report+='## Integrity — PASS\n\n72 unique frozen content IDs, 24 at each of A2/B1/B2; 72 complete matrix rows in one-to-one correspondence; all durations positive integers. Candidate metadata matches detail records. All three candidate-pool hashes match both snapshot and manifest. Descriptions, question types and sample stems exist for every item; bounded/truncated text is adequate for provisional decisions but not a claim that full source questions were inspected. db.zip was unnecessary.\n\n'
report+='The snapshot hash is canonical content hashing, not raw-file hashing: compact UTF-8 JSON with the snapshotSha256 field omitted reproduces `'+s['snapshotSha256']+'`. The raw file hash is recorded separately in annotationProvenance. The original sourceDbSha256 and candidate/snapshot hashes remain unchanged. New annotation-file hashes refer to exact output bytes.\n\n'
report+=table('## Coverage',{'Relevant items':coverage['relevantItems'],'Relevant minutes':coverage['relevantMinutes']})
report+=table('## Counts by CEFR',coverage['byCefr'])+table('## Counts by item type',coverage['byItemType'])
report+='\nCounts and minutes are per label; multi-label items contribute to more than one column and totals must not be summed as unique content. These are annotation coverage checks, not experiment metrics.\n\n'
report+=f"## Review and consistency\n\n{len(review)} items require review; {coverage['allZeroItems']} have all-zero proposed labels. Binary-domain, missing-label, ID uniqueness and catalog/matrix coverage checks passed. Every row has an item-specific evidence-based reason. Review rows preserve exact snapshot description/theory/types/stems in a JSON evidence cell. Multi-label, truncated and boundary cases are included. No plan/rationale data was loaded or used. No labels were generated by a skill-name rule.\n\n"
report+='Severe structural imbalance: CC has zero relevant practice_session items; all 12 CC items are lessons. Review and disclose this item-type confounding before final approval. Do not add labels to balance the catalog. Reading lexical-meaning practice and oral argument scaffolds are marked relevant only when explicit, and their transfer boundary is flagged. Generic personal Speaking cue cards and factual comprehension receive no automatic TR credit. The truncated GMO question is low confidence and all-zero pending source review. Human reviewers should resolve these shared policy boundaries consistently, not by condition outcomes.\n\n'
low=[f'{g}/{k}={v}' for g,cs in coverage['byCefr'].items() for k,v in cs.items() if v<=1]
report+='Severe-low-coverage diagnostic: '+('; '.join(low) if low else 'no CEFR×criterion cell has zero or one relevant item')+'. This zero/one-item screen is an annotation warning, not a new performance metric or a scientific cutoff. Zero-coverage item-type cells are visible above and must be disclosed.\n\n'
report+='## Deliverables and next boundary\n\nUpdated matrix, concise guideline, review queue, updated manifest and machine-readable validation accompany this report. They are review copies under this workspace; authoritative input files on D: were not overwritten. The annotation script records explicit per-item decisions and can recheck hashes/coverage offline. This is one AI draft, not two independent annotators or measured inter-rater agreement. Human review and adjudication are still required before any final status. Do not start Stage 2.\n'
(OUT/'stage-1-validation-report.md').write_text(report,encoding='utf-8')
print(json.dumps(validation,indent=2))
