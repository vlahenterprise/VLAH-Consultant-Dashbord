import { getConsultantById } from "@/lib/app-data";
import { AppData, Client, Meeting, MeetingAction, StaffUser } from "@/lib/types";

function toTime(input: string) {
  return new Date(input).getTime();
}

export function getClientNextMeeting(client: Client) {
  return [...client.meetings]
    .filter((meeting) => meeting.status === "Zakazan")
    .sort(
      (left, right) =>
        toTime(left.scheduledStartAt) - toTime(right.scheduledStartAt),
    )[0];
}

export function getClientLatestMeeting(client: Client) {
  return [...client.meetings]
    .filter((meeting) => meeting.status !== "Zakazan")
    .sort((left, right) => toTime(right.date) - toTime(left.date))[0];
}

export function getClientOpenActions(client: Client) {
  const source =
    client.sharedActionBoard.length > 0
      ? client.sharedActionBoard
      : client.meetings.flatMap((meeting) => meeting.actions);

  return source
    .filter((action) => !action.done)
    .sort((left, right) => toTime(left.dueDate) - toTime(right.dueDate));
}

export function getClientAllActions(client: Client) {
  if (client.sharedActionBoard.length > 0) {
    return client.sharedActionBoard;
  }

  return client.meetings.flatMap((meeting) => meeting.actions);
}

export function getClientAssignedExperts(data: AppData, client: Client) {
  return client.assignments
    .map((assignment) => ({
      assignment,
      consultant: getConsultantById(data, assignment.consultantId),
    }))
    .filter(
      (
        item,
      ): item is {
        assignment: Client["assignments"][number];
        consultant: StaffUser;
      } => Boolean(item.consultant),
    );
}

export function getClientMeetingLoad(client: Client) {
  const completed = client.meetings.filter(
    (meeting) => meeting.status !== "Zakazan",
  ).length;
  const scheduled = client.meetings.filter(
    (meeting) => meeting.status === "Zakazan",
  ).length;

  return {
    total: client.meetings.length,
    completed,
    scheduled,
  };
}

export function getClientOnTimeRate(client: Client) {
  const completedMeetings = client.meetings.filter(
    (meeting) => meeting.status !== "Zakazan",
  );

  if (!completedMeetings.length) {
    return 0;
  }

  const onTimeCount = completedMeetings.filter(
    (meeting) => meeting.clientOnTime,
  ).length;

  return Math.round((onTimeCount / completedMeetings.length) * 100);
}

export function getClientAiSummaryRate(client: Client) {
  const completedMeetings = client.meetings.filter(
    (meeting) => meeting.status !== "Zakazan",
  );

  if (!completedMeetings.length) {
    return 0;
  }

  const readyCount = completedMeetings.filter(
    (meeting) => meeting.aiSummaryReady,
  ).length;

  return Math.round((readyCount / completedMeetings.length) * 100);
}

export function getMeetingModulesLabel(meeting: Meeting) {
  return meeting.modules.join(" / ");
}

export function isTaskOverdue(action: MeetingAction) {
  return !action.done && toTime(action.dueDate) < Date.now();
}
