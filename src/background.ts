/**
 * DeluluTab's background service worker. Its one job: finish a Pomodoro session and notify the user when the
 * timer runs out while no new tab page is open (the page can't, because it is gone). It is woken by chrome.alarms.
 */
import { armAlarm, complete, loadPomodoro, normalize, notifyPhaseEnd, NOTIFICATION_PREFIX, POMODORO_ALARM, savePomodoro, minutes } from '@/lib/pomodoro'

const DEFAULTS = { workMs: minutes(25), breakMs: minutes(5) }
/** Alarms never fire early, but allow a little slack for clock rounding. */
const SLACK_MS = 1000

async function finishIfDue() {
  const state = normalize(await loadPomodoro(), DEFAULTS, Date.now())
  const result = complete(state, Date.now(), SLACK_MS)
  if (result) {
    await savePomodoro(result.state)
    notifyPhaseEnd(result.finished, result.state)
  } else if (state.status === 'running' && state.endsAt) {
    armAlarm(state.endsAt) // woken early (e.g. by a restart); wait for the real end
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === POMODORO_ALARM) void finishIfDue()
})

// Alarms do not survive a browser restart, so put the pending one back (or finish a session that ended while closed).
chrome.runtime.onStartup.addListener(() => void finishIfDue())
chrome.runtime.onInstalled.addListener(() => void finishIfDue())

chrome.notifications.onClicked.addListener((id) => {
  if (!id.startsWith(NOTIFICATION_PREFIX)) return
  void chrome.notifications.clear(id)
  void chrome.tabs.create({})
})
