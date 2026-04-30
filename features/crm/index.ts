export { CustomerCrmPanel }  from './components/CustomerCrmPanel'
export { CrmTimeline }       from './components/timeline/CrmTimeline'
export { InteractionList }   from './components/interactions/InteractionList'
export { TaskList }          from './components/tasks/TaskList'
export { ContactList }       from './components/contacts/ContactList'
export { OpportunityList }   from './components/opportunities/OpportunityList'

export { useCrmContacts }      from './hooks/useCrmContacts'
export { useCrmInteractions }  from './hooks/useCrmInteractions'
export { useCrmTasks }         from './hooks/useCrmTasks'
export { useCrmOpportunities } from './hooks/useCrmOpportunities'
export { useCrmTimeline }      from './hooks/useCrmTimeline'

export {
  INTERACTION_TYPE_LABELS, TASK_TYPE_LABELS, TASK_STATUS_LABELS,
  TASK_PRIORITY_LABELS, OPPORTUNITY_STAGE_LABELS, RELATIONSHIP_STAGE_LABELS,
} from './types'

export type {
  CrmContact, CrmInteraction, CrmTask, CrmOpportunity,
  CrmRelationshipStatus, TimelineEvent,
  InteractionType, TaskType, TaskStatus, TaskPriority, OpportunityStage, RelationshipStage,
  CrmContactFormData, CrmInteractionFormData, CrmTaskFormData, CrmOpportunityFormData,
} from './types'
