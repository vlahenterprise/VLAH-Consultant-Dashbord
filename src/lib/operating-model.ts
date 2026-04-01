import {
  EvidenceRequirement,
  IntakeField,
  ProgramPlaybook,
} from "@/lib/types";

export const meetingEvidenceRequirements: EvidenceRequirement[] = [
  {
    id: "attendance",
    title: "Prisustvo i punctuality",
    audience: "Interno + manager",
    description:
      "Za svaki sastanak cuvamo da li je klijent dosao na vreme, ko je bio prisutan, kada je sastanak stvarno krenuo i da li je kasnio.",
  },
  {
    id: "duration",
    title: "Trajanje i overrun",
    audience: "Interno",
    description:
      "Sistem belezi kada je sastanak zavrsen, ukupno trajanje i da li je sastanak probio planiranih 60 minuta.",
  },
  {
    id: "summary",
    title: "AI izvestaj sa sastanka",
    audience: "Interno + klijent",
    description:
      "Audio sa sastanka ide na transkript i OpenAI summary koji vraca kratko sta se pricalo, sta je dogovoreno i sta je sledece.",
  },
  {
    id: "materials",
    title: "Lokacija materijala i snimaka",
    audience: "Interno + klijent",
    description:
      "Na kartici sastanka cuva se link ka Drive folderu, dokumentaciji, audio/video snimku i svim pratecim fajlovima.",
  },
  {
    id: "actions",
    title: "Akcije i odgovornosti",
    audience: "Interno + klijent",
    description:
      "Svaki sastanak mora da ima dogovorene taskove sa prioritetom, procentom zavrsenja, due date-om i pravilima za slanje email podsetnika.",
  },
];

export const programPlaybooks: ProgramPlaybook[] = [
  {
    programId: "master-mind",
    title: "Master Mind operativni model",
    deliveryModel:
      "Klijent dobija dva eksperta: Profitability Consultant i Organization Consultant. Prvi sastanak je zajednicki 60 min, a posle toga se tok rada razdvaja po oblastima.",
    meetingFlow: [
      {
        id: "mm-joint",
        title: "Zajednicki kickoff",
        timing: "Start rada sa klijentom",
        owner: "Profitability + Organization Consultant",
        description:
          "Oba eksperta zajedno mapiraju cilj, prioritete i dogovaraju ritam rada sa klijentom.",
      },
      {
        id: "mm-profit",
        title: "1:1 Profitability tok",
        timing: "Nakon kickoff-a do zavrsetka",
        owner: "Profitability Consultant",
        description:
          "Rad na profitabilnosti, marzama, cash disciplini i finansijskom fokusu. Ukupan target je da prosek ne ide preko 4 sastanka po klijentu.",
      },
      {
        id: "mm-org",
        title: "1:1 Organization tok",
        timing: "Nakon kickoff-a do zavrsetka",
        owner: "Organization Consultant",
        description:
          "Rad na ownership-u, organizacionom sistemu, leadership ritmu i jasnim odgovornostima.",
      },
    ],
    staffResponsibilities: [
      "Konsultanti unose summary sa sastanka, akcije, kasnjenje, trajanje i prisutne.",
      "Administrator dodeljuje booking linkove i otvara pocetni kickoff setup.",
      "Manager vodi raspodelu klijenata i kontrolu norme sastanaka po konsultantu.",
    ],
    clientVisibility: [
      "Klijent vidi samo svoju karticu, svoje sastanke, svoje materijale i akcije koje su mu dodeljene.",
      "Klijent ne vidi druge klijente, interni portfolio ni admin konfiguraciju.",
    ],
    adminChecklist: [
      "Dodeliti oba eksperta po klijentu: profitabilnost i organizacija.",
      "Zakazati zajednicki kickoff i otvoriti drive strukturu.",
      "Obezbediti booking linkove i portal pristup klijentu.",
    ],
    meetingCapture: meetingEvidenceRequirements,
    automations: [
      {
        id: "mm-meeting-summary",
        title: "Meeting summary email",
        trigger: "Nakon obrade audio zapisa",
        audience: "Klijent + oba eksperta",
        outputs: [
          "Kratak summary sastanka",
          "Dogovorene akcije",
          "Link ka materijalima i snimcima",
        ],
      },
    ],
  },
  {
    programId: "bdp",
    title: "BDP operativni model",
    deliveryModel:
      "Klijent radi sa tri eksperta: Fractional Operations Manager, Finance Director i HR Fractional Director. Pocetak meseca je 3:1, a druga polovina meseca je rezervisana za tri pojedinacna 1:1 review-a.",
    meetingFlow: [
      {
        id: "bdp-monthly",
        title: "3:1 Monthly Operations / Finance / Leadership & HR Meeting",
        timing: "Prva polovina meseca",
        owner: "Operations + Finance + HR",
        description:
          "Zajednicki sastanak sa sva tri eksperta i klijentom gde se definisu prioriteti i jedinstvena akciona lista.",
      },
      {
        id: "bdp-ops",
        title: "1:1 Monthly Operations Meeting",
        timing: "Druga polovina meseca",
        owner: "Fractional Operations Manager",
        description:
          "Operations ekspert radi zaseban 1:1 review i unosi akcije iz svoje oblasti.",
      },
      {
        id: "bdp-fin",
        title: "1:1 Monthly Finance Meeting",
        timing: "Druga polovina meseca",
        owner: "Finance Director",
        description:
          "Finance ekspert zatvara finansijski review, cash flow fokus i sledece korake.",
      },
      {
        id: "bdp-hr",
        title: "1:1 Monthly Leadership & HR Meeting",
        timing: "Druga polovina meseca",
        owner: "HR Fractional Director",
        description:
          "HR/Leadership ekspert radi review leadership, accountability i HR procesa.",
      },
    ],
    staffResponsibilities: [
      "Sva tri eksperta upisuju taskove u jednu zajednicku action listu.",
      "Svaki ekspert popunjava svoj meeting report na osnovu transkripta i summary pipeline-a.",
      "Manager prati shared board, overdue zadatke i disciplinu izvrsenja kroz mesec.",
    ],
    clientVisibility: [
      "Klijent vidi shared action board, svoje sastanke, analytics i materijale.",
      "Klijent vidi samo taskove i dokumentaciju vezanu za svoj program.",
    ],
    adminChecklist: [
      "Uvesti klijente iz Excel batch-a sa 4 tipa sastanaka.",
      "Dodeliti tri eksperta i povezati shared action board.",
      "Postaviti email reminder pravila za task create, due date i overdue.",
    ],
    meetingCapture: meetingEvidenceRequirements,
    automations: [
      {
        id: "bdp-task-create",
        title: "Task create email",
        trigger: "Odmah kad se definise task",
        audience: "Klijent + task owner",
        outputs: [
          "Task naslov i prioritet",
          "Rok i link ka kartici",
          "Podsetnik da je task dodat na shared board",
        ],
      },
      {
        id: "bdp-task-reminders",
        title: "Due date + overdue reminders",
        trigger: "24h pre roka i na overdue",
        audience: "Owner + manager",
        outputs: [
          "Podsetnik na otvoren task",
          "Status procenta izvrsenja",
          "Escalation kad task kasni",
        ],
      },
      {
        id: "bdp-meeting-report",
        title: "Meeting report delivery",
        trigger: "Nakon transkripta i summary-ja",
        audience: "Klijent + relevantni ekspert",
        outputs: [
          "Summary sastanka",
          "Akcione stavke",
          "Linkovi ka snimku i dokumentaciji",
        ],
      },
    ],
  },
];

export const clientIntakeFields: IntakeField[] = [
  {
    id: "client-name",
    label: "Ime klijenta",
    required: true,
    owner: "Admin",
    description: "Osnovni identitet klijenta za CRM karticu i client portal.",
  },
  {
    id: "company",
    label: "Kompanija",
    required: true,
    owner: "Admin",
    description: "Naziv firme pod kojim vodimo celu dokumentaciju i reporting.",
  },
  {
    id: "program",
    label: "Program",
    required: true,
    owner: "Manager/Admin",
    description: "Biramo da li klijent ulazi u Master Mind ili BDP tok.",
  },
  {
    id: "assignments",
    label: "Dodeljeni eksperti",
    required: true,
    owner: "Manager",
    description: "Za Master Mind oba eksperta, za BDP Operations, Finance i HR.",
  },
  {
    id: "meeting-schedule",
    label: "Pocetni meeting cadence",
    required: true,
    owner: "Admin",
    description: "Kickoff ili mesecni BDP raspored koji odmah ide na karticu klijenta.",
  },
  {
    id: "drive-root",
    label: "Drive root folder",
    required: true,
    owner: "Admin",
    description: "Mesto gde idu dokumentacija, materijali, audio i video snimci.",
  },
  {
    id: "portal-access",
    label: "Portal pristup",
    required: true,
    owner: "Admin",
    description: "Klijent dobija pristup samo svojoj kartici i svojim taskovima.",
  },
];

export const staffIntakeFields: IntakeField[] = [
  {
    id: "staff-name",
    label: "Ime zaposlenog",
    required: true,
    owner: "Admin",
    description: "Koristi se za workspace, role model i dodelu klijenata.",
  },
  {
    id: "role",
    label: "Uloga",
    required: true,
    owner: "Admin",
    description: "Consultant ili manager, sa opcionim admin add-on permission-om.",
  },
  {
    id: "discipline",
    label: "Konsultantska disciplina",
    required: true,
    owner: "Admin",
    description:
      "Profitability, Organization, Operations/Finance ili HR & Leadership profil.",
  },
  {
    id: "team",
    label: "Team i fokus",
    required: true,
    owner: "Manager/Admin",
    description: "Definise gde ulazi u operativnu strukturu i koje klijente moze da vodi.",
  },
];

export function getProgramPlaybook(programId: string) {
  return programPlaybooks.find((playbook) => playbook.programId === programId);
}
