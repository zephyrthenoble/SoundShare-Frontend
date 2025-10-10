import { Field } from 'react-querybuilder'
import type { Tag, QueryBuilderField } from '@/lib/api'
import { queryBuilderApi } from '@/lib/api'

/**
 * Converts backend QueryBuilderField to react-querybuilder Field format
 */
function convertBackendFieldToReactQueryBuilder(backendField: QueryBuilderField): Field {
  const field: Field = {
    name: backendField.name,
    label: backendField.label,
    inputType: backendField.inputType,
    operators: backendField.operators,
  }

  // Add values for select fields
  if (backendField.values && backendField.values.length > 0) {
    field.values = backendField.values
  }

  // Add validation for numeric fields
  if (backendField.inputType === 'number') {
    field.validation = {
      min: backendField.min,
      max: backendField.max,
      step: backendField.step,
    }
  }

  return field
}

/**
 * Fetches QueryBuilder field configuration from backend
 * This replaces the hardcoded field definitions with dynamic ones
 */
export async function fetchQueryBuilderFields(): Promise<Field[]> {
  try {
    const response = await queryBuilderApi.getFields()
    return response.fields.map(convertBackendFieldToReactQueryBuilder)
  } catch (error) {
    console.error('Failed to fetch QueryBuilder fields:', error)
    // Fallback to static fields if backend fails
    return createStaticQueryBuilderFields()
  }
}

/**
 * Legacy static field configuration (fallback)
 * Kept as backup in case dynamic loading fails
 */
function createStaticQueryBuilderFields(): Field[] {
  return [
    {
      name: 'artist',
      label: 'Artist',
      inputType: 'text',
      operators: [
        { name: '=', label: 'equals' },
        { name: 'contains', label: 'contains' },
        { name: 'beginsWith', label: 'begins with' },
        { name: 'endsWith', label: 'ends with' },
      ],
    },
    {
      name: 'album',
      label: 'Album',
      inputType: 'text',
      operators: [
        { name: '=', label: 'equals' },
        { name: 'contains', label: 'contains' },
        { name: 'beginsWith', label: 'begins with' },
        { name: 'endsWith', label: 'ends with' },
      ],
    },
    {
      name: 'genre',
      label: 'Genre',
      inputType: 'text',
      operators: [
        { name: '=', label: 'equals' },
        { name: 'contains', label: 'contains' },
        { name: 'beginsWith', label: 'begins with' },
        { name: 'endsWith', label: 'ends with' },
      ],
    },
    {
      name: 'year',
      label: 'Year',
      inputType: 'number',
      operators: [
        { name: '=', label: 'equals' },
        { name: '>', label: 'greater than' },
        { name: '<', label: 'less than' },
        { name: '>=', label: 'greater than or equal' },
        { name: '<=', label: 'less than or equal' },
        { name: 'between', label: 'between' },
      ],
    },
  ]
}

/**
 * QueryBuilder field configuration for song filtering (DEPRECATED - REMOVED)
 * Use fetchQueryBuilderFields() instead for dynamic configuration
 */
/* Deprecated function removed - was 115 lines of static field configuration */

/**
 * Default QueryBuilder operators
 * Default QueryBuilder operators
 * These are the standard operators available across most fields
 */
export const defaultOperators = [
  { name: '=', label: 'equals' },
  { name: '!=', label: 'does not equal' },
  { name: 'contains', label: 'contains' },
  { name: 'beginsWith', label: 'begins with' },
  { name: 'endsWith', label: 'ends with' },
  { name: '>', label: 'greater than' },
  { name: '<', label: 'less than' },
  { name: '>=', label: 'greater than or equal' },
  { name: '<=', label: 'less than or equal' },
  { name: 'between', label: 'between' },
  { name: 'in', label: 'in' },
]

/**
 * QueryBuilder combinators (AND/OR logic)
 */
export const combinators = [
  { name: 'and', label: 'AND' },
  { name: 'or', label: 'OR' },
]

/**
 * Default QueryBuilder configuration
 */
export const defaultQueryBuilderConfig = {
  combinators,
  showCombinatorsBetweenRules: true,
  showNotToggle: true,
  showCloneButtons: true,
  showShiftActions: true,
  enableDragAndDrop: true,
  resetOnFieldChange: true,
  resetOnOperatorChange: false,
  autoSelectField: true,
  autoSelectOperator: true,
  addRuleToNewGroups: true,
}