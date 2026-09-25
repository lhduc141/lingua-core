// Run with node --require tsx/cjs research/robustness/run-robustness.cjs.
// Only orchestration is added; frozen input construction and pipeline are reused.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const root = path.resolve(process.env.ROBUSTNESS_SOURCE_ROOT || path.join(__dirname, '../..'));
const { validateFreeze, makeInput, EXPECTED_POOLS } = require(path.join(root, 'research/run-experiment.ts'));
const { runResearch } = require(path.join(root, 'research/run-pilot.ts'));
const { requestFor } = require(path.join(root, 'apps/ai-service/src/planning/structured-plan.ts'));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const configPath = path.join(__dirname, 'robustness-config.json');
const schedulePath = path.join(__dirname, 'robustness-run-schedule.json');
function validate() {
  const frozen = validateFreeze(root);
  const config = read(configPath), schedule = read(schedulePath);
  assert.equal(config.type, 'post-hoc robustness extension');
  assert.equal(config.experimentId, 'writing-w-ablation-v1-robustness');
  assert.equal(config.purpose, 'technical-repeat stability of paired WTR effects');
  assert.equal(config.inheritFrom, 'research/freeze/experiment-config.json');
  assert.equal(config.outputDirectory, 'research/robustness/output');
  assert.deepEqual(config.originalSeeds, frozen.config.seeds);
  assert.deepEqual(config.additionalSeeds, [404,505,606,707,808,909,1001]);
  assert.equal(config.frozenManifestSha256, sha(path.join(root, 'research/freeze/freeze-manifest.json')));
  assert.equal(config.expectedRuns, 168);
  assert.equal(config.expectedPairs, 84);
  assert.equal(config.expectedNominalStageCalls, 336);
  const expected = [];
  for (const profile of frozen.profiles) {
    for (const [i, seed] of config.additionalSeeds.entries()) {
      const pairId = `${profile.profileId}_seed${seed}`;
      const order = expected.length / 2 % 2 ? ['proposed','baseline'] : ['baseline','proposed'];
      for (const condition of order) expected.push({runIndex:expected.length+1,runId:`${pairId}_${condition}`,pairId,profileId:profile.profileId,condition,seed,repeat:i+4});
    }
  }
  assert.deepEqual(schedule, expected);
  assert.equal(new Set(schedule.map(e => e.runId)).size,168);
  assert.equal(new Set(schedule.map(e => e.pairId)).size,84);
  for (const condition of ['baseline','proposed']) assert.equal(schedule.filter(e=>e.condition===condition).length,84);
  for (const e of schedule) {
    assert.ok(!config.originalSeeds.includes(e.seed));
    const input = makeInput(frozen.profiles.find(p=>p.profileId===e.profileId), e, frozen.config, frozen.snapshot);
    assert.equal(input.synthetic,true); assert.equal(input.persist,false);
    assert.equal(input.config.selectorSeed,e.seed); assert.equal(input.config.plannerSeed,e.seed);
    for (const stage of ['selector','planner']) {
      const req = requestFor(stage,{...input.context,goals:input.context.learnerContext,seed:e.seed,allowCustomActivity:false});
      assert.equal(req.seed,e.seed);
      assert.equal(req.model,stage==='selector'?frozen.config.selectorModel:frozen.config.plannerModel);
    }
  }
  return {frozen, config, schedule};
}
async function main() {
  assert.ok(process.argv.length===3 && ['--validate-only','--run'].includes(process.argv[2]), 'Use --validate-only or --run');
  const {frozen,config,schedule}=validate();
  if (process.argv[2]==='--validate-only') {
    console.log(JSON.stringify({status:'PASS',profiles:12,runs:168,baseline:84,proposed:84,pairs:84,seeds:config.additionalSeeds,originalSeedsExcluded:true,frozenHashesVerified:true,providerCalls:0,dbCalls:0,azureCalls:0},null,2));
    return;
  }
  assert.ok(process.env.GROQ_API_KEY,'Supply GROQ_API_KEY in the process environment; no .env is loaded');
  const out=path.join(root,config.outputDirectory);
  // Exclusive creation refuses both restarts and overwrites.
  fs.mkdirSync(out);
  const handles={};
  const summary={experimentId:config.experimentId,type:config.type,expectedRuns:168,completed:0,succeeded:0,failed:0,status:'running',startedAt:new Date().toISOString()};
  const provenance={freezeManifestSha256:config.frozenManifestSha256,robustnessConfigSha256:sha(configPath),robustnessScheduleSha256:sha(schedulePath)};
  const append=(name,value)=>{fs.writeSync(handles[name],JSON.stringify(value)+'\n');fs.fsyncSync(handles[name]);};
  try {
    for (const name of ['runs','calls','validation']) handles[name]=fs.openSync(path.join(out,name+'.jsonl'),'ax');
    const {Groq}=require(require.resolve('groq-sdk',{paths:[root]}));
    const client=new Groq({apiKey:process.env.GROQ_API_KEY,maxRetries:0,timeout:frozen.config.timeoutMs});
    for (const e of schedule) {
      const input=makeInput(frozen.profiles.find(p=>p.profileId===e.profileId),e,{...frozen.config,experimentId:config.experimentId},frozen.snapshot);
      const result=await runResearch(input,client,a=>append('calls',a),r=>{
        append('runs',{...r,...provenance});
        append('validation',{runId:r.runId,pipelineStatus:r.pipelineStatus,candidatePoolHash:r.candidatePoolHash,hardConstraintResult:r.hardConstraintResult,rejections:r.rejections,normalizations:r.normalizations,failure:r.failure});
        assert.equal(r.candidatePoolHash,EXPECTED_POOLS[input.context.cefrLevel]);
      });
      summary.completed++; summary[result.pipelineStatus==='success'?'succeeded':'failed']++;
    }
    summary.status='completed';
  } catch(error) {
    summary.status='aborted'; throw error;
  } finally {
    for (const fd of Object.values(handles)) fs.closeSync(fd);
    fs.writeFileSync(path.join(out,'run-summary.json'),JSON.stringify({...summary,...provenance,finishedAt:new Date().toISOString()},null,2)+'\n',{flag:'wx'});
  }
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
