import { feature } from 'bun:bundle'
import { getFeatureValue_CACHED_MAY_BE_STALE } from '../analytics/growthbook.js'

export function isSkillSearchEnabled(): boolean {
  return feature('EXPERIMENTAL_SKILL_SEARCH')
    ? getFeatureValue_CACHED_MAY_BE_STALE('tengu_glacier_2xr', false)
    : false
}
