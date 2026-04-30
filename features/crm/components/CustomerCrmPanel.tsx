'use client'

import { useState } from 'react'
import { Clock, Phone, CheckSquare, User, TrendingUp } from 'lucide-react'
import { CrmTimeline }     from './timeline/CrmTimeline'
import { InteractionList } from './interactions/InteractionList'
import { TaskList }        from './tasks/TaskList'
import { ContactList }     from './contacts/ContactList'
import { OpportunityList } from './opportunities/OpportunityList'

type Tab = 'timeline' | 'interactions' | 'tasks' | 'contacts' | 'opportunities'

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'timeline',      label: 'Aktivita',      icon: Clock },
  { id: 'interactions',  label: 'Interakce',     icon: Phone },
  { id: 'tasks',         label: 'Úkoly',         icon: CheckSquare },
  { id: 'contacts',      label: 'Kontakty',      icon: User },
  { id: 'opportunities', label: 'Příležitosti',  icon: TrendingUp },
]

interface Props {
  customerId:   string
  customerName: string
}

export function CustomerCrmPanel({ customerId, customerName }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('timeline')

  return (
    <div className="mt-4 border border-gray-100 rounded-xl bg-white overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">CRM — {customerName}</p>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-gray-100 overflow-x-auto">
        {TABS.map(tab => {
          const Icon    = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors border-b-2 -mb-px
                ${isActive
                  ? 'border-blue-600 text-blue-700 bg-white'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div className="p-4">
        {activeTab === 'timeline'      && <CrmTimeline     customerId={customerId} />}
        {activeTab === 'interactions'  && <InteractionList customerId={customerId} />}
        {activeTab === 'tasks'         && <TaskList        customerId={customerId} />}
        {activeTab === 'contacts'      && <ContactList     customerId={customerId} />}
        {activeTab === 'opportunities' && <OpportunityList customerId={customerId} />}
      </div>
    </div>
  )
}
