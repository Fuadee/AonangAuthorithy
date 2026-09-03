import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  resolveEligibilityReviewStatus,
  resolveExpansionPostEstimationStatus,
  resolvePassedSurveyStatus,
  resolveSurveyCompletionStatus,
  resolveThreePhaseCapabilityStatus
} from '../lib/requests/workflow-transitions.ts';

test('METER goes from a passed survey to manager review without financial workflow states', () => {
  assert.equal(resolveSurveyCompletionStatus('METER', false), 'WAIT_MANAGER_REVIEW');
  assert.equal(resolveSurveyCompletionStatus('METER', true), 'SURVEY_COMPLETED');
  assert.equal(resolvePassedSurveyStatus('METER'), 'WAIT_MANAGER_REVIEW');
});

test('METER_TO_3PHASE routes supported work to manager and unsupported work to expansion', () => {
  assert.equal(resolveSurveyCompletionStatus('METER_TO_3PHASE', false), 'CHECK_3PHASE_CAPABILITY');
  assert.equal(resolveThreePhaseCapabilityStatus('METER_TO_3PHASE', 'SUPPORTED'), 'WAIT_MANAGER_REVIEW');
  assert.equal(resolveThreePhaseCapabilityStatus('METER_TO_3PHASE', 'UNSUPPORTED'), 'WAIT_LAYOUT_DRAWING');
  assert.equal(resolvePassedSurveyStatus('METER_TO_3PHASE'), 'WAIT_MANAGER_REVIEW');
});

test('EXPANSION goes from survey to layout and from completed estimation to construction coordination', () => {
  assert.equal(resolveSurveyCompletionStatus('EXPANSION', false), 'WAIT_LAYOUT_DRAWING');
  assert.equal(resolveExpansionPostEstimationStatus(), 'COORDINATED_WITH_CONSTRUCTION');
});

test('METER_30_100_1P keeps pre-Krabi and final approvals while skipping billing/payment', () => {
  assert.equal(resolveSurveyCompletionStatus('METER_30_100_1P', false), 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL');
  assert.equal(resolvePassedSurveyStatus('METER_30_100_1P'), 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL');
  assert.equal(resolveEligibilityReviewStatus(true), 'WAIT_AONANG_MANAGER_FINAL_APPROVAL');
  assert.equal(resolveEligibilityReviewStatus(false), 'WAIT_AONANG_MANAGER_FINAL_APPROVAL');
});

test('METER_30_100_3P joins the 1-phase approval flow when supported and expansion when unsupported', () => {
  assert.equal(resolveSurveyCompletionStatus('METER_30_100_3P', false), 'CHECK_3PHASE_CAPABILITY');
  assert.equal(resolveThreePhaseCapabilityStatus('METER_30_100_3P', 'SUPPORTED'), 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL');
  assert.equal(resolveThreePhaseCapabilityStatus('METER_30_100_3P', 'UNSUPPORTED'), 'WAIT_LAYOUT_DRAWING');
  assert.equal(resolvePassedSurveyStatus('METER_30_100_3P'), 'WAIT_AONANG_MANAGER_PRE_KRABI_APPROVAL');
});

test('active workflow sources cannot create removed financial states or expose /billing navigation', () => {
  const removedStatuses = ['WAIT_BILLING', 'WAIT_ACTION_CONFIRMATION', 'BILL_ISSUED', 'WAIT_PAYMENT'];
  const activeWorkflowSources = [
    readFileSync('app/actions.ts', 'utf8'),
    readFileSync('lib/requests/types.ts', 'utf8'),
    readFileSync('lib/requests/workflow-action-config.ts', 'utf8'),
    readFileSync('lib/requests/workflow-transitions.ts', 'utf8'),
    readFileSync('supabase/schema.sql', 'utf8')
  ].join('\n');

  for (const status of removedStatuses) {
    assert.equal(activeWorkflowSources.includes(status), false, `${status} remains in active workflow source`);
  }

  const navigation = readFileSync('components/top-navigation.tsx', 'utf8');
  assert.equal(navigation.includes('/billing'), false);
});

test('migration maps every known financial state and preserves historical finance columns', () => {
  const migration = readFileSync('supabase/migrations/202609030001_remove_financial_workflow.sql', 'utf8');

  assert.match(migration, /request_type in \('METER', 'METER_TO_3PHASE'\)/);
  assert.match(migration, /set status = 'WAIT_MANAGER_REVIEW'/);
  assert.match(migration, /request_type in \('METER_30_100_1P', 'METER_30_100_3P'\)/);
  assert.match(migration, /set status = 'WAIT_AONANG_MANAGER_FINAL_APPROVAL'/);
  assert.match(migration, /set status = 'COORDINATED_WITH_CONSTRUCTION'/);
  assert.match(migration, /Unmapped financial workflow records; migration aborted/);
  assert.doesNotMatch(migration, /drop column/i);
});

test('manager approval has no invoice/payment prerequisite', () => {
  const actions = readFileSync('app/actions.ts', 'utf8');
  const start = actions.indexOf('export async function approveManagerReviewAction');
  const end = actions.indexOf('const MANAGER_RESURVEY_CHECKLIST_KEYS', start);
  const managerApproval = actions.slice(start, end);

  assert.ok(start >= 0 && end > start);
  assert.doesNotMatch(managerApproval, /invoice|paid_at|payment|billing/i);
  assert.match(managerApproval, /status:\s*'COMPLETED'/);
});

test('customer correction, Krabi correction, and manager resurvey paths remain available', () => {
  const actions = readFileSync('app/actions.ts', 'utf8');
  const actionConfig = readFileSync('lib/requests/workflow-action-config.ts', 'utf8');

  for (const actionName of [
    'reportCustomerFixAction',
    'moveToResurveyAction',
    'rejectFixPhotoAndRequireResurveyAction',
    'markKrabiRejectedForMeterAction',
    'startDocumentFixForMeterAction',
    'resendToKrabiForMeterAction',
    'returnRequestForResurveyAction',
    'restartReturnedResurveyAction'
  ]) {
    assert.match(actions, new RegExp(`export async function ${actionName}`));
  }

  for (const actionKey of [
    'REPORT_CUSTOMER_FIX',
    'SCHEDULE_RESURVEY',
    'PHOTO_REJECT_TO_RESURVEY',
    'MARK_KRABI_REJECTED',
    'START_DOCUMENT_FIX',
    'RESENT_TO_KRABI',
    'MANAGER_RETURN_FOR_RESURVEY',
    'RESTART_RETURNED_RESURVEY'
  ]) {
    assert.match(actionConfig, new RegExp(actionKey));
  }
});
