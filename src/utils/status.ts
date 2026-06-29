import { messages, type MessageKey } from '@/i18n/messages'
import type { CheckinStatus, LanguagePreference } from '@/types'

const statusTextKeys: Record<CheckinStatus, MessageKey> = {
  available: 'statusAvailable',
  not_started: 'statusNotStarted',
  ended: 'statusEnded',
  before_time_window: 'statusBeforeTimeWindow',
  after_time_window: 'statusAfterTimeWindow',
  completed: 'statusCompleted',
  completed_can_continue: 'statusCompletedCanContinue',
  archived: 'statusArchived',
  deleted: 'statusDeleted',
}

const statusHintKeys: Record<CheckinStatus, MessageKey> = {
  available: 'hintAvailable',
  not_started: 'hintNotStarted',
  ended: 'hintEnded',
  before_time_window: 'hintBeforeTimeWindow',
  after_time_window: 'hintAfterTimeWindow',
  completed: 'hintCompleted',
  completed_can_continue: 'hintCompletedCanContinue',
  archived: 'hintArchived',
  deleted: 'hintDeleted',
}

function translated(key: MessageKey, language: LanguagePreference) {
  return messages[language][key] ?? messages.zh[key]
}

export function statusText(status: CheckinStatus, language: LanguagePreference = 'zh') {
  const key = statusTextKeys[status]
  if (!key) {
    return translated('statusPending', language)
  }

  return translated(key, language)
}

export function statusHint(status: CheckinStatus, language: LanguagePreference = 'zh') {
  const key = statusHintKeys[status]
  if (!key) {
    return ''
  }

  return translated(key, language)
}
