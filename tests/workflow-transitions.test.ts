import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePassedSurveyStatus, resolveSurveyCompletionStatus } from '../lib/requests/workflow-transitions.ts';

test('METER survey completion enters billing and never the manager queue early', () => {
  assert.equal(resolveSurveyCompletionStatus('METER', false), 'WAIT_BILLING');
  assert.equal(resolveSurveyCompletionStatus('METER', true), 'SURVEY_COMPLETED');
  assert.equal(resolvePassedSurveyStatus('METER'), 'WAIT_BILLING');
});

test('METER_30_100_1P survey pass enters the dedicated pre-Krabi manager stage', () => {
  assert.equal(resolveSurveyCompletionStatus('METER_30_100_1P', false), 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL');
  assert.equal(resolvePassedSurveyStatus('METER_30_100_1P'), 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL');
});

test('METER_30_100_3P checks capability, then enters the dedicated pre-Krabi manager stage', () => {
  assert.equal(resolveSurveyCompletionStatus('METER_30_100_3P', false), 'CHECK_3PHASE_CAPABILITY');
  assert.equal(resolvePassedSurveyStatus('METER_30_100_3P'), 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL');
});
