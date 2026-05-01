/**
 * Re-exports from canonical lib/ locations.
 * Import directly from lib/returns/ReturnCommandService or lib/returns/returnMapper
 * in new code — this file exists only for backward compatibility.
 */
export { RETURN_FULL_INCLUDE, RETURN_LIST_INCLUDE } from '@/lib/returns/ReturnCommandService'
export { mapReturnFull } from '@/lib/returns/returnMapper'
