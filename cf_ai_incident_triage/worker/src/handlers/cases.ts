import { Env } from '../types/env';
import { successResponse } from '../utils/errors';
import { listCases, getCaseDetail } from '../services/db';
import { NotFoundError } from '../utils/errors';

/**
 * GET /api/cases — list all past cases
 */
export async function handleListCases(
  _request: Request,
  env: Env,
): Promise<Response> {
  const cases = await listCases(env.DB);
  return successResponse(cases);
}

/**
 * GET /api/cases/:id — get full case detail
 */
export async function handleGetCase(
  _request: Request,
  env: Env,
  caseId: string,
): Promise<Response> {
  const detail = await getCaseDetail(env.DB, caseId);
  if (!detail) throw new NotFoundError(`Case ${caseId} not found.`);
  return successResponse(detail);
}
