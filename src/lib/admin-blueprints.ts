import {
  ImportBlueprint,
  IntegrationBlueprint,
  MeetingTemplate,
  ReminderRule,
} from "@/lib/types";

export const integrationBlueprints: IntegrationBlueprint[] = [
  {
    id: "zoom",
    title: "Zoom",
    category: "Sastanci",
    description:
      "Preuzimanje meeting metadata, recording linkova i webhook signala za zakazane/odrzane sastanke.",
    envKeys: [
      "ZOOM_ACCOUNT_ID",
      "ZOOM_CLIENT_ID",
      "ZOOM_CLIENT_SECRET",
      "ZOOM_WEBHOOK_SECRET_TOKEN",
    ],
    pulls: [
      "Zakazani sastanci i join URL",
      "Cloud recording metadata",
      "Prisustvo i trajanje sastanka",
    ],
    pushes: [
      "Automatsko sync-ovanje meeting statusa",
      "Povezivanje recording/audio linkova na karticu klijenta",
    ],
    nextStep:
      "Dodati Server-to-Server OAuth app i webhook endpoint za meeting/recording event-ove.",
  },
  {
    id: "thinkific",
    title: "Thinkific",
    category: "Programi",
    description:
      "Sync korisnika, enrollments i course progress-a kada klijenti koriste edukativni deo programa.",
    envKeys: ["THINKIFIC_API_KEY", "THINKIFIC_SUBDOMAIN"],
    pulls: [
      "Korisnici i enrolment status",
      "Progress kroz proizvode i kurseve",
      "Webhook signal za user/product promene",
    ],
    pushes: [
      "Mapiranje programa na Thinkific proizvode",
      "Vidljivost course progress-a na client portalu",
    ],
    nextStep:
      "Povezati public/data API i definisati kako se Master Mind i BDP proizvodi mapiraju na klijente.",
  },
  {
    id: "optiverse",
    title: "Optiverse",
    category: "Operativa",
    description:
      "Veza sa spoljnim operativnim sistemom za profil klijenta, milestone signal i handoff podatke koji pomazu ekspertima.",
    envKeys: ["OPTIVERSE_API_BASE_URL", "OPTIVERSE_API_TOKEN"],
    pulls: [
      "Profil klijenta i eksterni ID",
      "Operativni milestone i health signal",
      "Hand-off podaci koje CS unosi van aplikacije",
    ],
    pushes: [
      "Povezivanje Optiverse profila na karticu klijenta",
      "Brzi sync operativnih signala u consultant hub",
    ],
    nextStep:
      "Dodati mapiranje Optiverse profila po klijentu i jedan manual sync endpoint za osvezavanje signala.",
  },
  {
    id: "drive",
    title: "Google Drive",
    category: "Storage",
    description:
      "Centralni folderi za materijale, snimke i zavrsne izvestaje po klijentu i sastanku.",
    envKeys: [
      "GOOGLE_DRIVE_CLIENT_EMAIL",
      "GOOGLE_DRIVE_PRIVATE_KEY",
      "GOOGLE_DRIVE_ROOT_FOLDER_ID",
    ],
    pulls: [
      "Folder URL po klijentu",
      "Meeting recording lokacije",
      "Materijali i dokumentacija",
    ],
    pushes: [
      "Automatsko kreiranje client foldera",
      "Linkovanje dokumenata na meeting i resource kartice",
    ],
    nextStep:
      "Dodati service account i root folder iz kog se granaju client i meeting folderi.",
  },
  {
    id: "openai",
    title: "OpenAI",
    category: "AI",
    description:
      "Transkript srpskog audio fajla i generisanje strukturisanog izvestaja, akcija i rizik signala.",
    envKeys: ["OPENAI_API_KEY"],
    pulls: [
      "Transkript i izvestaj iz audija",
      "Predlog akcija i follow-up-a",
      "Rizici i blockers iz razgovora",
    ],
    pushes: [
      "Auto-popuna izvestaja sa sastanka",
      "Kratak izvestaj za klijenta i internu bazu",
    ],
    nextStep:
      "Povezati upload audio fajla i background obradu za sastanke posle Zoom recording sync-a.",
  },
  {
    id: "email",
    title: "Email delivery",
    category: "Automation",
    description:
      "Slanje reminder-a, task notifikacija i meeting report email-ova zaposlenima i klijentima.",
    envKeys: ["RESEND_API_KEY", "EMAIL_FROM"],
    pulls: [
      "Delivery status i bounce signal",
      "Istorija poslatih task reminder-a",
      "Log meeting report email-ova",
    ],
    pushes: [
      "Email kad se kreira task",
      "Reminder pre roka i na overdue",
      "Izvestaj sastanka ka klijentu posle sastanka",
    ],
    nextStep:
      "Dodati provider i templating za task, reminder i email izvestaje.",
  },
];

export const meetingTemplates: MeetingTemplate[] = [
  {
    id: "mastermind-joint-kickoff",
    programId: "master-mind",
    title: "Joint Kickoff Meeting",
    type: "Zoom 60 min - zajednicki",
    durationMinutes: 60,
    timingWindow: "Prva nedelja rada sa klijentom",
    modules: ["Profitabilnost", "Organizacija"],
    participants: [
      "Klijent",
      "Profitability Consultant",
      "Organization Consultant",
    ],
    notes: [
      "Oba eksperta otvaraju cilj rada i mapiraju prioritete.",
      "Posle ovog sastanka tok se razdvaja po oblastima.",
    ],
  },
  {
    id: "mastermind-profitability-followup",
    programId: "master-mind",
    title: "1:1 Profitability Meeting",
    type: "Zoom 1:1",
    durationMinutes: 60,
    timingWindow: "Naredne nedelje posle kickoff-a",
    modules: ["Profitabilnost"],
    participants: ["Klijent", "Profitability Consultant"],
    notes: [
      "Fokus na marzama, cash disciplini i profitabilnosti.",
      "Do 2-8 sastanaka po klijentu, norma prosek do 4.",
    ],
  },
  {
    id: "mastermind-organization-followup",
    programId: "master-mind",
    title: "1:1 Organization Meeting",
    type: "Zoom 1:1",
    durationMinutes: 60,
    timingWindow: "Naredne nedelje posle kickoff-a",
    modules: ["Organizacija"],
    participants: ["Klijent", "Organization Consultant"],
    notes: [
      "Fokus na ownership-u, strukturi i organizacionom sistemu.",
      "Posle svakog sastanka ide izvestaj, drive link i evidencija.",
    ],
  },
  {
    id: "bdp-monthly-kickoff",
    programId: "bdp",
    title: "3:1 Monthly Operations / Finance / Leadership & HR Meeting",
    type: "Zoom 3:1 - pocetak meseca",
    durationMinutes: 60,
    timingWindow: "Prva polovina meseca",
    modules: ["Operations", "Finance", "HR & Leadership"],
    participants: [
      "Klijent",
      "Fractional Operations Manager",
      "Finance Director",
      "HR Fractional Director",
    ],
    notes: [
      "Zajednicki monthly sync na pocetku meseca.",
      "Definise se jedinstvena akciona lista i prioriteti za ceo mesec.",
    ],
  },
  {
    id: "bdp-operations-review",
    programId: "bdp",
    title: "1:1 Monthly Operations Meeting",
    type: "Zoom 1:1 - kraj meseca",
    durationMinutes: 60,
    timingWindow: "Druga polovina meseca",
    modules: ["Operations"],
    participants: ["Klijent", "Fractional Operations Manager"],
    notes: [
      "Jedan ekspert radi 1:1 review po svojoj oblasti.",
      "Summary ide iz transkripta i upisuje se na karticu klijenta.",
    ],
  },
  {
    id: "bdp-finance-review",
    programId: "bdp",
    title: "1:1 Monthly Finance Meeting",
    type: "Zoom 1:1 - kraj meseca",
    durationMinutes: 60,
    timingWindow: "Druga polovina meseca",
    modules: ["Finance"],
    participants: ["Klijent", "Finance Director"],
    notes: [
      "Pokriva cash flow, profit fokus i finansijsku disciplinu.",
      "Akcije se upisuju u zajednicku action listu koju vidi i klijent.",
    ],
  },
  {
    id: "bdp-hr-review",
    programId: "bdp",
    title: "1:1 Monthly Leadership & HR Meeting",
    type: "Zoom 1:1 - kraj meseca",
    durationMinutes: 60,
    timingWindow: "Druga polovina meseca",
    modules: ["HR & Leadership"],
    participants: ["Klijent", "HR Fractional Director"],
    notes: [
      "Pokriva leadership, accountability i HR procese.",
      "Email reminder-i i follow-up taskovi idu iz jedinstvene action liste.",
    ],
  },
];

export const reminderRules: ReminderRule[] = [
  {
    id: "task-create",
    label: "Task created",
    trigger: "Odmah po kreiranju",
    audience: "Klijent + odgovorni konsultant",
    description:
      "Salje email sa task naslovom, prioritetom, rokom i linkom na karticu klijenta.",
  },
  {
    id: "task-before-due",
    label: "Due date reminder",
    trigger: "24h pre roka",
    audience: "Nosilac zadatka",
    description:
      "Podseca na task pre isteka roka i prikazuje procenat zavrsenja.",
  },
  {
    id: "task-overdue",
    label: "Overdue reminder",
    trigger: "Na dan probijenog roka",
    audience: "Nosilac + manager",
    description:
      "Escalation email kad task ostane nezavrsen posle due date-a.",
  },
  {
    id: "meeting-report",
    label: "Meeting report",
    trigger: "Posle obrade transkripta",
    audience: "Klijent + relevantni konsultanti",
    description:
      "Salje strukturisan izvestaj sastanka, dogovorene akcije i linkove ka materijalima.",
  },
];

export const importBlueprints: ImportBlueprint[] = [
  {
    id: "bdp-excel-import",
    title: "BDP Excel import",
    formats: [".xlsx", ".xls", ".csv"],
    columns: [
      "Client Name",
      "Company",
      "Email",
      "City",
      "3:1 Monthly Operations / Finance / Leadership & HR Meeting",
      "1:1 Monthly Operations Meeting",
      "1:1 Monthly Finance Meeting",
      "1:1 Monthly Leadership & HR Meeting",
    ],
    notes: [
      "Ako klijent ne postoji, kreira se onboarding kartica i portal pristup.",
      "Ako klijent postoji, import dodaje nove sastanke bez dupliranja istog termina.",
      "Za BDP se auto-dodeljuju Operations, Finance i HR eksperti po default pravilima.",
    ],
  },
];

export function getMeetingTemplatesForProgram(programId: string) {
  return meetingTemplates.filter((template) => template.programId === programId);
}
