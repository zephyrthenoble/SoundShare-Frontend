import { RuleGroupType, RuleType } from 'react-querybuilder'

/**
 * Query JSON structure matching backend query_models.py
 */
export interface QueryJSON {
  combinator: 'and' | 'or'
  negated: boolean
  rules: RuleJSON[]
  groups: QueryJSON[]
}

export interface RuleJSON {
  field: string
  operator: string
  value: any
  not: boolean
}

/**
 * Generates a unique rule ID for QueryBuilder rules
 */
export const generateRuleId = (): string => {
  return `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Converts React Query Builder format to backend JSON query structure
 * This matches the Rule/Group/Query model in query_models.py
 */
export const convertQueryToJSON = (query: RuleGroupType): QueryJSON | null => {
  console.log('🔄 convertQueryToJSON called with:', query)
  
  if (!query.rules || query.rules.length === 0) {
    return null
  }

  return processRuleGroup(query)
}

const processRuleGroup = (group: RuleGroupType): QueryJSON => {
  const rules: RuleJSON[] = []
  const groups: QueryJSON[] = []

  group.rules.forEach((item: RuleType | RuleGroupType) => {
    if ('rules' in item) {
      // It's a nested group
      groups.push(processRuleGroup(item as RuleGroupType))
    } else {
      // It's a rule
      const rule = item as RuleType
      
      // Skip invalid rules
      if (!rule.field || rule.value === undefined || rule.value === null || rule.value === '') {
        return
      }

      rules.push({
        field: rule.field,
        operator: rule.operator,
        value: rule.value,
        not: !!(rule as any).not  // Type assertion for 'not' property
      })
    }
  })

  return {
    combinator: group.combinator as 'and' | 'or',
    negated: !!group.not,
    rules,
    groups
  }
}
