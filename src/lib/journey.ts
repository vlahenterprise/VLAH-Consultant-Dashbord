import { Client, JourneyStep, Program } from "@/lib/types";

function addDays(input: Date, days: number) {
  const result = new Date(input);
  result.setDate(result.getDate() + days);
  return result;
}

function addWeeks(input: Date, weeks: number) {
  return addDays(input, weeks * 7);
}

function toIsoDate(input: Date) {
  return input.toISOString();
}

export function generateJourney(
  client: Client,
  program: Program,
  referenceDate = new Date(),
) {
  const start = new Date(client.startDate);
  let cursor = new Date(start);

  return program.phases.map<JourneyStep>((phase) => {
    const phaseStart = new Date(cursor);
    const phaseEnd = addDays(addWeeks(phaseStart, phase.durationWeeks), -1);

    let status: JourneyStep["status"] = "Predstoji";

    if (referenceDate > phaseEnd) {
      status = "Zavrseno";
    } else if (referenceDate >= phaseStart && referenceDate <= phaseEnd) {
      status = "U toku";
    }

    cursor = addDays(phaseEnd, 1);

    return {
      id: `${client.id}-${phase.id}`,
      title: phase.title,
      outcome: phase.outcome,
      startDate: toIsoDate(phaseStart),
      endDate: toIsoDate(phaseEnd),
      status,
    };
  });
}
