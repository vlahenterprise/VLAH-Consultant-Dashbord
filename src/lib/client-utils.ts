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

export function getActionCompletionPercent(action: MeetingAction) {
  if (typeof action.completionPercent === "number") {
    return action.completionPercent;
  }

  return action.done ? 100 : 0;
}

export function getActionPriority(action: MeetingAction) {
  return action.priority ?? "Srednji";
}

export function getClientActionBoardStats(client: Client) {
  const actions = getClientAllActions(client);
  const completed = actions.filter((action) => action.done).length;
  const open = actions.length - completed;
  const shared = actions.filter((action) => action.sharedWithClient).length;
  const overdue = actions.filter((action) => isTaskOverdue(action)).length;

  return {
    total: actions.length,
    completed,
    open,
    shared,
    overdue,
    completionRate: actions.length
      ? Math.round((completed / actions.length) * 100)
      : 0,
  };
}

export function getClientMeetingBreakdown(client: Client) {
  const isBdp = client.programId === "bdp";

  if (isBdp) {
    return [
      {
        label: "3:1 monthly",
        count: client.meetings.filter((meeting) =>
          meeting.title.includes("3:1 Monthly"),
        ).length,
      },
      {
        label: "Operations 1:1",
        count: client.meetings.filter((meeting) =>
          meeting.title.includes("Operations"),
        ).length,
      },
      {
        label: "Finance 1:1",
        count: client.meetings.filter((meeting) =>
          meeting.title.includes("Finance"),
        ).length,
      },
      {
        label: "Leadership & HR 1:1",
        count: client.meetings.filter((meeting) =>
          meeting.title.includes("Leadership & HR"),
        ).length,
      },
    ];
  }

  return [
    {
      label: "Joint kickoff",
      count: client.meetings.filter((meeting) =>
        meeting.title.includes("Joint Kickoff"),
      ).length,
    },
    {
      label: "Profitability 1:1",
      count: client.meetings.filter((meeting) =>
        meeting.title.includes("Profitability"),
      ).length,
    },
    {
      label: "Organization 1:1",
      count: client.meetings.filter((meeting) =>
        meeting.title.includes("Organization"),
      ).length,
    },
  ];
}

export function getClientMeetingComplianceStats(client: Client) {
  const completedMeetings = client.meetings.filter(
    (meeting) => meeting.status !== "Zakazan",
  );

  return {
    held: completedMeetings.filter((meeting) => meeting.status === "Odrzan").length,
    followUp: completedMeetings.filter(
      (meeting) => meeting.status === "Potreban follow-up",
    ).length,
    scheduled: client.meetings.filter((meeting) => meeting.status === "Zakazan")
      .length,
    late: completedMeetings.filter((meeting) => !meeting.clientOnTime).length,
    overran: completedMeetings.filter((meeting) => meeting.overran).length,
    emailSent: completedMeetings.filter((meeting) => meeting.emailSentToClient)
      .length,
    aiReady: completedMeetings.filter((meeting) => meeting.aiSummaryReady).length,
  };
}
