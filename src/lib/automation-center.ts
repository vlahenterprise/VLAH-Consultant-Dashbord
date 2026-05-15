import {
  AutomationDispatchLog,
  AutomationQueueItem,
  Client,
  MeetingAction,
} from "@/lib/types";

function buildQueueItemId(ruleId: string, clientId: string, relatedId: string) {
  return `${ruleId}:${clientId}:${relatedId}`;
}

function hasDispatched(
  logs: AutomationDispatchLog[],
  queueItemId: string,
) {
  return logs.some((log) => log.queueItemId === queueItemId && log.status === "Poslato");
}

function getActionDate(action: MeetingAction) {
  return new Date(action.dueDate).getTime();
}

function buildActionSummary(client: Client, action: MeetingAction) {
  return `${client.name}: ${action.title} / owner ${action.owner} / rok ${action.dueDate}`;
}

export function getPendingAutomationQueue(
  clients: Client[],
  logs: AutomationDispatchLog[],
) {
  const now = Date.now();
  const next24Hours = now + 24 * 60 * 60 * 1000;
  const queue: AutomationQueueItem[] = [];

  clients.forEach((client) => {
    const actionSource =
      client.sharedActionBoard.length > 0
        ? client.sharedActionBoard
        : client.meetings.flatMap((meeting) => meeting.actions);

    actionSource.forEach((action) => {
      if (action.done) {
        return;
      }

      if (action.reminderOnCreate) {
        const queueItemId = buildQueueItemId("task-create", client.id, action.id);
        if (!hasDispatched(logs, queueItemId)) {
          queue.push({
            id: queueItemId,
            ruleId: "task-create",
            clientId: client.id,
            clientName: client.name,
            audience: "Klijent + odgovorni konsultant",
            trigger: "Odmah po kreiranju",
            scheduledFor: action.dueDate,
            summary: buildActionSummary(client, action),
            relatedActionId: action.id,
          });
        }
      }

      if (
        action.reminderBeforeDue &&
        getActionDate(action) >= now &&
        getActionDate(action) <= next24Hours
      ) {
        const queueItemId = buildQueueItemId("task-before-due", client.id, action.id);
        if (!hasDispatched(logs, queueItemId)) {
          queue.push({
            id: queueItemId,
            ruleId: "task-before-due",
            clientId: client.id,
            clientName: client.name,
            audience: "Nosilac zadatka",
            trigger: "24h pre roka",
            scheduledFor: action.dueDate,
            summary: buildActionSummary(client, action),
            relatedActionId: action.id,
          });
        }
      }

      if (action.reminderWhenOverdue && getActionDate(action) < now) {
        const queueItemId = buildQueueItemId("task-overdue", client.id, action.id);
        if (!hasDispatched(logs, queueItemId)) {
          queue.push({
            id: queueItemId,
            ruleId: "task-overdue",
            clientId: client.id,
            clientName: client.name,
            audience: "Nosilac + manager",
            trigger: "Na dan probijenog roka",
            scheduledFor: action.dueDate,
            summary: buildActionSummary(client, action),
            relatedActionId: action.id,
          });
        }
      }
    });

    client.meetings.forEach((meeting) => {
      if (!meeting.aiSummaryReady || meeting.emailSentToClient) {
        return;
      }

      const queueItemId = buildQueueItemId("meeting-report", client.id, meeting.id);
      if (hasDispatched(logs, queueItemId)) {
        return;
      }

      queue.push({
        id: queueItemId,
        ruleId: "meeting-report",
        clientId: client.id,
        clientName: client.name,
        audience: "Klijent + relevantni konsultanti",
        trigger: "Posle obrade transkripta",
        scheduledFor: meeting.endedAt,
        summary: `${client.name}: ${meeting.title} / izvestaj spreman za slanje`,
        relatedMeetingId: meeting.id,
      });
    });
  });

  return queue.sort(
    (left, right) =>
      new Date(left.scheduledFor).getTime() - new Date(right.scheduledFor).getTime(),
  );
}
