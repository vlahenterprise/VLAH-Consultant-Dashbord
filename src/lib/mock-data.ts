import {
  Client,
  ClientPortalUser,
  NavigationItem,
  Program,
  StaffUser,
  TransferSuggestion,
  WorkspaceActor,
} from "@/lib/types";

export const programs: Program[] = [
  {
    id: "master-mind",
    name: "Master Mind",
    category: "Premium Advisory",
    modules: ["Profitabilnost", "Organizacija"],
    targetProfile:
      "Klijenti koji rade paralelno na profitabilnosti i organizaciji uz dva eksperta.",
    cadence:
      "Prvi zajednicki sastanak 60 min, zatim odvojeni 1:1 ciklusi po modulu do zavrsetka.",
    durationWeeks: 12,
    meetingTarget: "Norma je da prosek ne prelazi 4 sastanka po klijentu.",
    workflowNotes: [
      "Kickoff je zajednicki i na njemu su i profitability i organization ekspert.",
      "Posle kickoff-a rad se razdvaja po modulima do zavrsetka.",
      "Svaki sastanak ima Zoom zapis, dokumentaciju, Drive lokacije i email izvestaj.",
    ],
    phases: [
      {
        id: "joint-kickoff",
        title: "Zajednicki kickoff",
        durationWeeks: 1,
        outcome: "Oba eksperta mapiraju ciljeve, blokere i dogovaraju put rada.",
      },
      {
        id: "profit-track",
        title: "Profitabilnost track",
        durationWeeks: 5,
        outcome: "Analiza marzi, cash discipline i finansijskog fokusa.",
      },
      {
        id: "org-track",
        title: "Organizacija track",
        durationWeeks: 5,
        outcome: "Jasnije odgovornosti, ritmovi i organizacioni sistem.",
      },
      {
        id: "closeout",
        title: "Closeout",
        durationWeeks: 1,
        outcome: "Finalni review, preporuke i sledeci koraci.",
      },
    ],
  },
  {
    id: "bdp",
    name: "Business Development Program - BDP",
    category: "Program",
    modules: ["Operations", "Finance", "HR & Leadership"],
    targetProfile:
      "Klijenti kojima treba koordinisan rad tri eksperta kroz mesecni ciklus.",
    cadence:
      "Pocetak meseca 3:1 60 min sa sva tri eksperta, pa pojedinacni 1:1 follow-up sastanci krajem meseca.",
    durationWeeks: 16,
    meetingTarget: "Mesecni ciklus: jedan 3:1 i tri pojedinacna 1:1 sastanka.",
    workflowNotes: [
      "Operations, Finance i HR rade zajedno sa klijentom na mesecnom kickoff-u.",
      "Na kraju meseca svaki ekspert radi svoj 1:1 review i upisuje izvestaj.",
      "BDP ima zajednicku action listu za klijenta i email reminder-e za taskove.",
      "Izvestaj sastanka se pravi iz srpskog audio transkripta kroz tok za izvestaje.",
    ],
    phases: [
      {
        id: "monthly-kickoff",
        title: "Mesecni 3:1 kickoff",
        durationWeeks: 1,
        outcome: "Zajednicki pregled ciljeva, blokera i taskova za ceo mesec.",
      },
      {
        id: "ops-follow-up",
        title: "Operations follow-up",
        durationWeeks: 5,
        outcome: "Pracenje operativnog ritma, ownership-a i izvrsenja.",
      },
      {
        id: "finance-follow-up",
        title: "Finance follow-up",
        durationWeeks: 5,
        outcome: "Cash flow, profit fokus i finansijska disciplina.",
      },
      {
        id: "hr-follow-up",
        title: "HR & Leadership follow-up",
        durationWeeks: 5,
        outcome: "Tim, liderstvo, HR procesi i accountability.",
      },
    ],
  },
];

export const staffUsers: StaffUser[] = [
  {
    kind: "staff",
    id: "ana-jovanovic",
    name: "Ana Jovanovic",
    email: "ana@vlah.rs",
    title: "Profitability Consultant",
    role: "consultant",
    adminAddon: false,
    team: "Master Mind / BDP",
    focus: "Profitabilnost, finansijska disciplina i cash fokus",
    specialties: ["Profitability", "Finance"],
    nextAvailableSlot: "2026-04-03T11:30:00+02:00",
    activeClientIds: ["nikola-jovanovic", "milena-radic", "marija-ilic", "stefan-pavlov"],
    dashboard: {
      weeklyMeetings: 7,
      openActions: 8,
      pendingSummaries: 2,
      utilization: 86,
      clientSatisfaction: 94,
    },
  },
  {
    kind: "staff",
    id: "luka-petrovic",
    name: "Luka Petrovic",
    email: "luka@vlah.rs",
    title: "Organization Consultant",
    role: "consultant",
    adminAddon: true,
    team: "Master Mind / BDP",
    focus: "Organizacija, operations i management sistemi",
    specialties: ["Organization", "Operations"],
    nextAvailableSlot: "2026-04-04T09:00:00+02:00",
    activeClientIds: ["nikola-jovanovic", "marija-ilic"],
    dashboard: {
      weeklyMeetings: 6,
      openActions: 7,
      pendingSummaries: 3,
      utilization: 78,
      clientSatisfaction: 92,
    },
  },
  {
    kind: "staff",
    id: "jelena-kostic",
    name: "Jelena Kostic",
    email: "jelena@vlah.rs",
    title: "HR Consultant",
    role: "consultant",
    adminAddon: false,
    team: "BDP",
    focus: "HR procesi, leadership i accountability",
    specialties: ["HR", "HR & Leadership"],
    nextAvailableSlot: "2026-04-03T15:00:00+02:00",
    activeClientIds: ["marija-ilic", "stefan-pavlov"],
    dashboard: {
      weeklyMeetings: 5,
      openActions: 6,
      pendingSummaries: 1,
      utilization: 74,
      clientSatisfaction: 93,
    },
  },
  {
    kind: "staff",
    id: "marko-ristic",
    name: "Marko Ristic",
    email: "marko@vlah.rs",
    title: "Organization Consultant",
    role: "consultant",
    adminAddon: false,
    team: "Master Mind / BDP",
    focus: "Operations izvedba i organizacioni follow-up",
    specialties: ["Organization", "Operations"],
    nextAvailableSlot: "2026-04-05T10:00:00+02:00",
    activeClientIds: ["milena-radic", "stefan-pavlov"],
    dashboard: {
      weeklyMeetings: 4,
      openActions: 5,
      pendingSummaries: 1,
      utilization: 64,
      clientSatisfaction: 90,
    },
  },
  {
    kind: "staff",
    id: "milica-stankovic",
    name: "Milica Stankovic",
    email: "milica@vlah.rs",
    title: "Client Success Manager",
    role: "manager",
    adminAddon: false,
    team: "Client Success",
    focus: "Raspodela klijenata, kvalitet rada i kontrola normi po programu",
    specialties: ["Management"],
    nextAvailableSlot: "2026-04-02T16:00:00+02:00",
    activeClientIds: [],
    directReportIds: [
      "ana-jovanovic",
      "luka-petrovic",
      "jelena-kostic",
      "marko-ristic",
    ],
    dashboard: {
      weeklyMeetings: 9,
      openActions: 14,
      pendingSummaries: 4,
      utilization: 88,
      clientSatisfaction: 93,
    },
  },
  {
    kind: "staff",
    id: "ivana-markovic",
    name: "Ivana Markovic",
    email: "ivana@vlah.rs",
    title: "Operations Manager",
    role: "manager",
    adminAddon: true,
    team: "Operations Leadership",
    focus: "Program setup, access control i admin konfiguracija",
    specialties: ["Menadzment", "Administracija"],
    nextAvailableSlot: "2026-04-05T12:00:00+02:00",
    activeClientIds: [],
    directReportIds: [
      "ana-jovanovic",
      "luka-petrovic",
      "jelena-kostic",
      "marko-ristic",
    ],
    dashboard: {
      weeklyMeetings: 7,
      openActions: 9,
      pendingSummaries: 2,
      utilization: 72,
      clientSatisfaction: 95,
    },
  },
];

export const clients: Client[] = [
  {
    id: "nikola-jovanovic",
    name: "Nikola Jovanovic",
    company: "FitLab Academy",
    email: "nikola@fitlab.rs",
    phone: "+381 64 200 1001",
    city: "Novi Sad",
    timezone: "Europe/Belgrade",
    startDate: "2026-02-17T09:00:00+01:00",
    status: "Aktivan",
    stage: "Profitabilnost i organizacija",
    riskLevel: "Nizak",
    monthlyGoal: "Podici profitabilnost prodaje i srediti ownership u timu.",
    notes:
      "Master Mind klijent sa dva paralelna toka rada. Kickoff je zajednicki, zatim se rad odvaja po modulima.",
    tags: ["Master Mind", "Profitabilnost", "Organizacija"],
    programId: "master-mind",
    consultantId: "ana-jovanovic",
    managerId: "milica-stankovic",
    programModules: ["Profitabilnost", "Organizacija"],
    meetingAverageTarget: 4,
    driveRootUrl: "https://drive.google.com/drive/folders/mastermind-nikola",
    assignments: [
      {
        consultantId: "ana-jovanovic",
        specialty: "Profitability Consultant",
        module: "Profitabilnost",
      },
      {
        consultantId: "luka-petrovic",
        specialty: "Organization Consultant",
        module: "Organizacija",
      },
    ],
    analytics: {
      healthScore: 88,
      actionCompletion: 74,
      meetingConsistency: 93,
      satisfactionScore: 95,
      revenueDelta: 18,
      milestoneProgress: 67,
    },
    revenueSnapshot: "3.4M RSD",
    nextMilestone: "Zakljucati sales ownership i uvesti org accountability ritam.",
    sharedActionBoard: [],
    documents: [
      {
        id: "doc-nikola-profit",
        name: "Profitability worksheet",
        type: "Spreadsheet",
        status: "Aktivan dokument",
        lastUpdated: "2026-03-25T16:00:00+01:00",
        owner: "Ana Jovanovic",
      },
      {
        id: "doc-nikola-org",
        name: "Organization map",
        type: "Workshop",
        status: "Deljeno sa klijentom",
        lastUpdated: "2026-03-27T14:10:00+01:00",
        owner: "Luka Petrovic",
      },
    ],
    resources: [
      {
        id: "res-nikola-finance",
        title: "Margin review template",
        category: "Template",
        lastShared: "2026-03-18T12:00:00+01:00",
      },
      {
        id: "res-nikola-org",
        title: "Weekly accountability agenda",
        category: "Worksheet",
        lastShared: "2026-03-25T13:15:00+01:00",
      },
    ],
    meetings: [
      {
        id: "meet-nikola-kickoff",
        title: "Master Mind joint kickoff",
        date: "2026-03-04T10:00:00+01:00",
        scheduledStartAt: "2026-03-04T10:00:00+01:00",
        actualStartAt: "2026-03-04T10:01:00+01:00",
        endedAt: "2026-03-04T11:00:00+01:00",
        durationMinutes: 59,
        type: "Zoom 60 min - zajednicki",
        modules: ["Profitabilnost", "Organizacija"],
        participants: ["Ana Jovanovic", "Luka Petrovic", "Nikola Jovanovic"],
        status: "Odrzan",
        clientOnTime: true,
        overran: false,
        emailSentToClient: true,
        aiSummaryReady: true,
        summary:
          "Zajednicki kickoff sa oba eksperta. Definisani su profit fokus, ownership i redosled daljih odvojenih 1:1 sastanaka.",
        transcriptPreview:
          "Na zajednickom kickoff-u prosli smo kroz profitabilnost i organizaciju. Dogovoreno je da Ana vodi finansijski fokus, a Luka ownership i ritam sastanaka. Klijent je dobio pregled narednih odvojenih susreta po modulu.",
        recording: {
          videoUrl: "#video-nikola-kickoff",
          audioUrl: "#audio-nikola-kickoff",
          driveFolderUrl:
            "https://drive.google.com/drive/folders/mastermind-nikola-kickoff",
          materialsUrl:
            "https://drive.google.com/drive/folders/mastermind-nikola-materials",
          recordingsUrl:
            "https://drive.google.com/drive/folders/mastermind-nikola-recordings",
        },
        actions: [
          {
            id: "act-nikola-1",
            title: "Poslati osnovne KPI brojke i marze po proizvodu",
            owner: "Klijent",
            dueDate: "2026-03-06T17:00:00+01:00",
            done: true,
            sharedWithClient: true,
            reminderBeforeDue: true,
            reminderWhenOverdue: true,
            reminderOnCreate: true,
          },
        ],
      },
      {
        id: "meet-nikola-profit",
        title: "Profitability 1:1",
        date: "2026-03-12T10:00:00+01:00",
        scheduledStartAt: "2026-03-12T10:00:00+01:00",
        actualStartAt: "2026-03-12T10:04:00+01:00",
        endedAt: "2026-03-12T11:08:00+01:00",
        durationMinutes: 64,
        type: "Zoom 1:1",
        modules: ["Profitabilnost"],
        participants: ["Ana Jovanovic", "Nikola Jovanovic"],
        status: "Odrzan",
        clientOnTime: false,
        overran: true,
        emailSentToClient: true,
        aiSummaryReady: true,
        summary:
          "Radjeno na marzama, cenama i prioritetima za poboljsanje profitabilnosti.",
        transcriptPreview:
          "Radili smo profitabilnost i marze po proizvodima. Dogovoreno je da klijent izbaci dva nerentabilna paketa i pripremi pregled troskova do narednog sastanka.",
        recording: {
          videoUrl: "#video-nikola-profit",
          audioUrl: "#audio-nikola-profit",
          driveFolderUrl:
            "https://drive.google.com/drive/folders/mastermind-nikola-profit",
          materialsUrl:
            "https://drive.google.com/drive/folders/mastermind-nikola-profit-materials",
          recordingsUrl:
            "https://drive.google.com/drive/folders/mastermind-nikola-profit-recordings",
        },
        actions: [
          {
            id: "act-nikola-2",
            title: "Izbaciti dva nerentabilna paketa",
            owner: "Klijent",
            dueDate: "2026-03-18T17:00:00+01:00",
            done: false,
            sharedWithClient: true,
            reminderBeforeDue: true,
            reminderWhenOverdue: true,
            reminderOnCreate: true,
          },
        ],
      },
      {
        id: "meet-nikola-org",
        title: "Organization 1:1",
        date: "2026-03-19T09:00:00+01:00",
        scheduledStartAt: "2026-03-19T09:00:00+01:00",
        actualStartAt: "2026-03-19T09:00:00+01:00",
        endedAt: "2026-03-19T10:00:00+01:00",
        durationMinutes: 60,
        type: "Zoom 1:1",
        modules: ["Organizacija"],
        participants: ["Luka Petrovic", "Nikola Jovanovic"],
        status: "Odrzan",
        clientOnTime: true,
        overran: false,
        emailSentToClient: true,
        aiSummaryReady: true,
        summary:
          "Razradjeni ownership, weekly check-in i odgovornosti po timskim ulogama.",
        transcriptPreview:
          "Na organization 1 na 1 sastanku radili smo ownership po funkcijama. Dogovoreno je da klijent uvede weekly leadership check-in i definise ko vodi follow-up zadatke.",
        recording: {
          videoUrl: "#video-nikola-org",
          audioUrl: "#audio-nikola-org",
          driveFolderUrl:
            "https://drive.google.com/drive/folders/mastermind-nikola-org",
          materialsUrl:
            "https://drive.google.com/drive/folders/mastermind-nikola-org-materials",
          recordingsUrl:
            "https://drive.google.com/drive/folders/mastermind-nikola-org-recordings",
        },
        actions: [
          {
            id: "act-nikola-3",
            title: "Uvesti weekly leadership check-in",
            owner: "Klijent",
            dueDate: "2026-03-24T12:00:00+01:00",
            done: false,
            sharedWithClient: true,
            reminderBeforeDue: true,
            reminderWhenOverdue: true,
            reminderOnCreate: true,
          },
        ],
      },
      {
        id: "meet-nikola-profit-next",
        title: "Profitability follow-up",
        date: "2026-04-03T10:00:00+02:00",
        scheduledStartAt: "2026-04-03T10:00:00+02:00",
        actualStartAt: "2026-04-03T10:00:00+02:00",
        endedAt: "2026-04-03T11:00:00+02:00",
        durationMinutes: 60,
        type: "Zoom 1:1",
        modules: ["Profitabilnost"],
        participants: ["Ana Jovanovic", "Nikola Jovanovic"],
        status: "Zakazan",
        clientOnTime: true,
        overran: false,
        emailSentToClient: false,
        aiSummaryReady: false,
        summary: "Sledeci review margina i profit discipline.",
        transcriptPreview: "",
        recording: {
          videoUrl: "#video-nikola-profit-next",
          audioUrl: "#audio-nikola-profit-next",
          driveFolderUrl:
            "https://drive.google.com/drive/folders/mastermind-nikola-april",
          materialsUrl:
            "https://drive.google.com/drive/folders/mastermind-nikola-april-materials",
          recordingsUrl:
            "https://drive.google.com/drive/folders/mastermind-nikola-april-recordings",
        },
        actions: [],
      },
    ],
  },
  {
    id: "milena-radic",
    name: "Milena Radic",
    company: "Atelier 21",
    email: "milena@atelier21.rs",
    phone: "+381 62 500 221",
    city: "Beograd",
    timezone: "Europe/Belgrade",
    startDate: "2026-03-18T12:00:00+01:00",
    status: "Onboarding",
    stage: "Joint kickoff + odvojeni moduli",
    riskLevel: "Srednji",
    monthlyGoal: "Srediti ownership i podici profitabilnost ponude.",
    notes:
      "Master Mind klijent u ranoj fazi. Potreban je dobar balans izmedju organization i profitability toka.",
    tags: ["Master Mind", "Profitabilnost", "Organizacija"],
    programId: "master-mind",
    consultantId: "ana-jovanovic",
    managerId: "ivana-markovic",
    programModules: ["Profitabilnost", "Organizacija"],
    meetingAverageTarget: 4,
    driveRootUrl: "https://drive.google.com/drive/folders/mastermind-milena",
    assignments: [
      {
        consultantId: "ana-jovanovic",
        specialty: "Profitability Consultant",
        module: "Profitabilnost",
      },
      {
        consultantId: "marko-ristic",
        specialty: "Organization Consultant",
        module: "Organizacija",
      },
    ],
    analytics: {
      healthScore: 69,
      actionCompletion: 41,
      meetingConsistency: 100,
      satisfactionScore: 90,
      revenueDelta: 0,
      milestoneProgress: 19,
    },
    revenueSnapshot: "1.8M RSD",
    nextMilestone: "Zajednicki kickoff pa odvojeni plan rada po modulima.",
    sharedActionBoard: [],
    documents: [
      {
        id: "doc-milena-brief",
        name: "Master Mind onboarding brief",
        type: "Brief",
        status: "Interni draft",
        lastUpdated: "2026-03-30T11:30:00+02:00",
        owner: "Ana Jovanovic",
      },
    ],
    resources: [
      {
        id: "res-milena-priority",
        title: "Priority reset worksheet",
        category: "Worksheet",
        lastShared: "2026-03-29T18:00:00+02:00",
      },
    ],
    meetings: [
      {
        id: "meet-milena-kickoff",
        title: "Master Mind joint kickoff",
        date: "2026-03-26T12:30:00+01:00",
        scheduledStartAt: "2026-03-26T12:30:00+01:00",
        actualStartAt: "2026-03-26T12:33:00+01:00",
        endedAt: "2026-03-26T13:34:00+01:00",
        durationMinutes: 61,
        type: "Zoom 60 min - zajednicki",
        modules: ["Profitabilnost", "Organizacija"],
        participants: ["Ana Jovanovic", "Marko Ristic", "Milena Radic"],
        status: "Odrzan",
        clientOnTime: false,
        overran: true,
        emailSentToClient: true,
        aiSummaryReady: true,
        summary:
          "Zajednicki kickoff za Master Mind sa profit i organization ekspertom.",
        transcriptPreview:
          "Na kickoff-u su zajedno bili profitability i organization eksperti. Dogovoreno je da se sledeci sastanci razdvoje po modulima, a klijent je dobio strukturu rada i drive folder.",
        recording: {
          videoUrl: "#video-milena-kickoff",
          audioUrl: "#audio-milena-kickoff",
          driveFolderUrl:
            "https://drive.google.com/drive/folders/mastermind-milena-kickoff",
          materialsUrl:
            "https://drive.google.com/drive/folders/mastermind-milena-materials",
          recordingsUrl:
            "https://drive.google.com/drive/folders/mastermind-milena-recordings",
        },
        actions: [
          {
            id: "act-milena-1",
            title: "Poslati pregled troskova i uloga u timu",
            owner: "Klijent",
            dueDate: "2026-03-31T18:00:00+02:00",
            done: false,
            sharedWithClient: true,
            reminderBeforeDue: true,
            reminderWhenOverdue: true,
            reminderOnCreate: true,
          },
        ],
      },
      {
        id: "meet-milena-org-next",
        title: "Organization 1:1",
        date: "2026-04-04T12:30:00+02:00",
        scheduledStartAt: "2026-04-04T12:30:00+02:00",
        actualStartAt: "2026-04-04T12:30:00+02:00",
        endedAt: "2026-04-04T13:30:00+02:00",
        durationMinutes: 60,
        type: "Zoom 1:1",
        modules: ["Organizacija"],
        participants: ["Marko Ristic", "Milena Radic"],
        status: "Zakazan",
        clientOnTime: true,
        overran: false,
        emailSentToClient: false,
        aiSummaryReady: false,
        summary: "Prvi odvojeni organization sastanak.",
        transcriptPreview: "",
        recording: {
          videoUrl: "#video-milena-org-next",
          audioUrl: "#audio-milena-org-next",
          driveFolderUrl:
            "https://drive.google.com/drive/folders/mastermind-milena-org",
          materialsUrl:
            "https://drive.google.com/drive/folders/mastermind-milena-org-materials",
          recordingsUrl:
            "https://drive.google.com/drive/folders/mastermind-milena-org-recordings",
        },
        actions: [],
      },
    ],
  },
  {
    id: "marija-ilic",
    name: "Marija Ilic",
    company: "Studio Forma",
    email: "marija@studioforma.rs",
    phone: "+381 63 300 440",
    city: "Beograd",
    timezone: "Europe/Belgrade",
    startDate: "2026-03-03T11:00:00+01:00",
    status: "Aktivan",
    stage: "Mesecni kickoff + individualni follow-up",
    riskLevel: "Srednji",
    monthlyGoal: "Uspostaviti BDP akcioni plan kroz operations, finance i HR tok.",
    notes:
      "BDP klijent sa zajednickim 3:1 kickoff-om i individualnim end-of-month sastancima po ekspertu.",
    tags: ["BDP", "Operations", "Finance", "HR & Leadership"],
    programId: "bdp",
    consultantId: "luka-petrovic",
    managerId: "milica-stankovic",
    programModules: ["Operations", "Finance", "HR & Leadership"],
    meetingAverageTarget: 4,
    driveRootUrl: "https://drive.google.com/drive/folders/bdp-marija",
    assignments: [
      {
        consultantId: "luka-petrovic",
        specialty: "Organization Consultant",
        module: "Operations",
      },
      {
        consultantId: "ana-jovanovic",
        specialty: "Profitability Consultant",
        module: "Finance",
      },
      {
        consultantId: "jelena-kostic",
        specialty: "HR Consultant",
        module: "HR & Leadership",
      },
    ],
    analytics: {
      healthScore: 72,
      actionCompletion: 58,
      meetingConsistency: 82,
      satisfactionScore: 88,
      revenueDelta: 9,
      milestoneProgress: 43,
    },
    revenueSnapshot: "5.1M RSD",
    nextMilestone:
      "Zatvoriti zajednicku action listu i poslati izvestaj posle sva tri individualna follow-up sastanka.",
    sharedActionBoard: [
      {
        id: "bdp-marija-task-1",
        title: "Uvesti weekly ops review sa project lead-ovima",
        owner: "Klijent",
        dueDate: "2026-04-04T18:00:00+02:00",
        done: false,
        sharedWithClient: true,
        reminderBeforeDue: true,
        reminderWhenOverdue: true,
        reminderOnCreate: true,
      },
      {
        id: "bdp-marija-task-2",
        title: "Poslati novi cash flow forecast",
        owner: "Klijent",
        dueDate: "2026-04-05T14:00:00+02:00",
        done: false,
        sharedWithClient: true,
        reminderBeforeDue: true,
        reminderWhenOverdue: true,
        reminderOnCreate: true,
      },
    ],
    documents: [
      {
        id: "doc-marija-bdp-board",
        name: "BDP action board",
        type: "Shared board",
        status: "Deljeno sa klijentom",
        lastUpdated: "2026-03-29T16:30:00+02:00",
        owner: "Milica Stankovic",
      },
      {
        id: "doc-marija-finance",
        name: "Finance review",
        type: "Spreadsheet",
        status: "U izradi",
        lastUpdated: "2026-03-28T15:25:00+01:00",
        owner: "Ana Jovanovic",
      },
    ],
    resources: [
      {
        id: "res-marija-delegation",
        title: "Delegation playbook",
        category: "Guide",
        lastShared: "2026-03-21T11:00:00+01:00",
      },
    ],
    meetings: [
      {
        id: "meet-marija-kickoff",
        title: "BDP monthly 3:1 kickoff",
        date: "2026-03-10T13:00:00+01:00",
        scheduledStartAt: "2026-03-10T13:00:00+01:00",
        actualStartAt: "2026-03-10T13:05:00+01:00",
        endedAt: "2026-03-10T14:08:00+01:00",
        durationMinutes: 63,
        type: "Zoom 3:1 - pocetak meseca",
        modules: ["Operations", "Finance", "HR & Leadership"],
        participants: [
          "Luka Petrovic",
          "Ana Jovanovic",
          "Jelena Kostic",
          "Marija Ilic",
        ],
        status: "Odrzan",
        clientOnTime: false,
        overran: true,
        emailSentToClient: true,
        aiSummaryReady: true,
        summary:
          "Zajednicki BDP kickoff sa sva tri eksperta. Napravljen je mesecni plan i otvorena zajednicka action lista.",
        transcriptPreview:
          "Na BDP 3 na 1 sastanku prosli smo Operations, Finance i HR. Dogovorene su mesecne akcije, otvorena je zajednicka action lista i definisani su pojedinacni kraj-meseca follow-up sastanci. Izvestaj ide klijentu odmah nakon sastanka.",
        recording: {
          videoUrl: "#video-marija-kickoff",
          audioUrl: "#audio-marija-kickoff",
          driveFolderUrl:
            "https://drive.google.com/drive/folders/bdp-marija-kickoff",
          materialsUrl:
            "https://drive.google.com/drive/folders/bdp-marija-materials",
          recordingsUrl:
            "https://drive.google.com/drive/folders/bdp-marija-recordings",
        },
        actions: [
          {
            id: "act-marija-kickoff-1",
            title: "Otvoriti zajednicku action listu i podeliti je sa klijentom",
            owner: "Konsultant",
            dueDate: "2026-03-10T18:00:00+01:00",
            done: true,
            sharedWithClient: true,
            reminderBeforeDue: false,
            reminderWhenOverdue: false,
            reminderOnCreate: true,
          },
        ],
      },
      {
        id: "meet-marija-finance",
        title: "Finance 1:1 review",
        date: "2026-03-28T14:00:00+02:00",
        scheduledStartAt: "2026-03-28T14:00:00+02:00",
        actualStartAt: "2026-03-28T14:00:00+02:00",
        endedAt: "2026-03-28T15:00:00+02:00",
        durationMinutes: 60,
        type: "Zoom 1:1 - kraj meseca",
        modules: ["Finance"],
        participants: ["Ana Jovanovic", "Marija Ilic"],
        status: "Odrzan",
        clientOnTime: true,
        overran: false,
        emailSentToClient: true,
        aiSummaryReady: true,
        summary:
          "Finance review sa fokusom na cash flow forecast i profitabilnost projekata.",
        transcriptPreview:
          "Na finance 1 na 1 sastanku radili smo cash flow i profitabilnost projekata. Dogovoreno je da klijent posalje novi forecast i zatvori troskove koji kasne.",
        recording: {
          videoUrl: "#video-marija-finance",
          audioUrl: "#audio-marija-finance",
          driveFolderUrl:
            "https://drive.google.com/drive/folders/bdp-marija-finance",
          materialsUrl:
            "https://drive.google.com/drive/folders/bdp-marija-finance-materials",
          recordingsUrl:
            "https://drive.google.com/drive/folders/bdp-marija-finance-recordings",
        },
        actions: [
          {
            id: "act-marija-finance-1",
            title: "Poslati novi cash flow forecast",
            owner: "Klijent",
            dueDate: "2026-04-05T14:00:00+02:00",
            done: false,
            sharedWithClient: true,
            reminderBeforeDue: true,
            reminderWhenOverdue: true,
            reminderOnCreate: true,
          },
        ],
      },
      {
        id: "meet-marija-ops-next",
        title: "Operations 1:1 review",
        date: "2026-04-02T15:00:00+02:00",
        scheduledStartAt: "2026-04-02T15:00:00+02:00",
        actualStartAt: "2026-04-02T15:00:00+02:00",
        endedAt: "2026-04-02T16:00:00+02:00",
        durationMinutes: 60,
        type: "Zoom 1:1 - kraj meseca",
        modules: ["Operations"],
        participants: ["Luka Petrovic", "Marija Ilic"],
        status: "Zakazan",
        clientOnTime: true,
        overran: false,
        emailSentToClient: false,
        aiSummaryReady: false,
        summary: "Operations review i zatvaranje taskova sa zajednicke action liste.",
        transcriptPreview: "",
        recording: {
          videoUrl: "#video-marija-ops-next",
          audioUrl: "#audio-marija-ops-next",
          driveFolderUrl:
            "https://drive.google.com/drive/folders/bdp-marija-ops",
          materialsUrl:
            "https://drive.google.com/drive/folders/bdp-marija-ops-materials",
          recordingsUrl:
            "https://drive.google.com/drive/folders/bdp-marija-ops-recordings",
        },
        actions: [],
      },
    ],
  },
  {
    id: "stefan-pavlov",
    name: "Stefan Pavlov",
    company: "Dental Pro Center",
    email: "stefan@dentalpro.rs",
    phone: "+381 65 888 2211",
    city: "Nis",
    timezone: "Europe/Belgrade",
    startDate: "2026-01-20T09:30:00+01:00",
    status: "Aktivan",
    stage: "BDP monthly cycle",
    riskLevel: "Visok",
    monthlyGoal: "Stabilizovati operations, cash disciplinu i HR ownership.",
    notes:
      "BDP klijent sa rizikom jer zajednicka action lista kasni i operations tok trazi jaci follow-up.",
    tags: ["BDP", "Operations", "Finance", "HR & Leadership"],
    programId: "bdp",
    consultantId: "marko-ristic",
    managerId: "ivana-markovic",
    programModules: ["Operations", "Finance", "HR & Leadership"],
    meetingAverageTarget: 4,
    driveRootUrl: "https://drive.google.com/drive/folders/bdp-stefan",
    assignments: [
      {
        consultantId: "marko-ristic",
        specialty: "Organization Consultant",
        module: "Operations",
      },
      {
        consultantId: "ana-jovanovic",
        specialty: "Profitability Consultant",
        module: "Finance",
      },
      {
        consultantId: "jelena-kostic",
        specialty: "HR Consultant",
        module: "HR & Leadership",
      },
    ],
    analytics: {
      healthScore: 54,
      actionCompletion: 38,
      meetingConsistency: 76,
      satisfactionScore: 79,
      revenueDelta: -4,
      milestoneProgress: 59,
    },
    revenueSnapshot: "2.6M RSD",
    nextMilestone:
      "Zatvoriti overdue tasks sa shared board-a i stabilizovati operations ownership.",
    sharedActionBoard: [
      {
        id: "bdp-stefan-task-1",
        title: "Delegirati update operations scorecard-a timu",
        owner: "Klijent",
        dueDate: "2026-03-22T17:00:00+01:00",
        done: false,
        sharedWithClient: true,
        reminderBeforeDue: true,
        reminderWhenOverdue: true,
        reminderOnCreate: true,
      },
      {
        id: "bdp-stefan-task-2",
        title: "Dostaviti HR ownership mapu",
        owner: "Klijent",
        dueDate: "2026-04-04T17:00:00+02:00",
        done: false,
        sharedWithClient: true,
        reminderBeforeDue: true,
        reminderWhenOverdue: true,
        reminderOnCreate: true,
      },
    ],
    documents: [
      {
        id: "doc-stefan-bdp-board",
        name: "BDP zajednicka action lista",
        type: "Action lista",
        status: "Kasni update",
        lastUpdated: "2026-03-22T10:00:00+01:00",
        owner: "Ivana Markovic",
      },
      {
        id: "doc-stefan-ops",
        name: "Operations scorecard",
        type: "Pregled",
        status: "Kasni update",
        lastUpdated: "2026-03-12T10:00:00+01:00",
        owner: "Marko Ristic",
      },
    ],
    resources: [
      {
        id: "res-stefan-ops",
        title: "Ops daily cadence template",
        category: "Template",
        lastShared: "2026-02-24T12:00:00+01:00",
      },
    ],
    meetings: [
      {
        id: "meet-stefan-kickoff",
        title: "BDP monthly 3:1 kickoff",
        date: "2026-03-03T09:00:00+01:00",
        scheduledStartAt: "2026-03-03T09:00:00+01:00",
        actualStartAt: "2026-03-03T09:07:00+01:00",
        endedAt: "2026-03-03T10:10:00+01:00",
        durationMinutes: 63,
        type: "Zoom 3:1 - pocetak meseca",
        modules: ["Operations", "Finance", "HR & Leadership"],
        participants: [
          "Marko Ristic",
          "Ana Jovanovic",
          "Jelena Kostic",
          "Stefan Pavlov",
        ],
        status: "Odrzan",
        clientOnTime: false,
        overran: true,
        emailSentToClient: true,
        aiSummaryReady: true,
        summary:
          "Mesecni BDP kickoff, otvorena zajednicka action lista i definisani pojedinacni review sastanci.",
        transcriptPreview:
          "Na 3 na 1 kickoff-u prosli smo operations, finance i HR. Stefan kasni sa ownership disciplinom pa smo otvorili task board, reminder pravila i termine za individualne review-e.",
        recording: {
          videoUrl: "#video-stefan-kickoff",
          audioUrl: "#audio-stefan-kickoff",
          driveFolderUrl:
            "https://drive.google.com/drive/folders/bdp-stefan-kickoff",
          materialsUrl:
            "https://drive.google.com/drive/folders/bdp-stefan-materials",
          recordingsUrl:
            "https://drive.google.com/drive/folders/bdp-stefan-recordings",
        },
        actions: [
          {
            id: "act-stefan-kickoff-1",
            title: "Podeliti izvestaj sastanka i otvoriti reminder tok",
            owner: "Konsultant",
            dueDate: "2026-03-03T17:00:00+01:00",
            done: true,
            sharedWithClient: true,
            reminderBeforeDue: false,
            reminderWhenOverdue: false,
            reminderOnCreate: true,
          },
        ],
      },
      {
        id: "meet-stefan-ops",
        title: "Operations 1:1 review",
        date: "2026-03-19T09:30:00+01:00",
        scheduledStartAt: "2026-03-19T09:30:00+01:00",
        actualStartAt: "2026-03-19T09:30:00+01:00",
        endedAt: "2026-03-19T10:32:00+01:00",
        durationMinutes: 62,
        type: "Zoom 1:1 - kraj meseca",
        modules: ["Operations"],
        participants: ["Marko Ristic", "Stefan Pavlov"],
        status: "Potreban follow-up",
        clientOnTime: true,
        overran: true,
        emailSentToClient: true,
        aiSummaryReady: true,
        summary:
          "Operations review sa fokusom na scorecard i vlasnistvo nad taskovima. Zajednicka action lista nije azurirana na vreme.",
        transcriptPreview:
          "Na operations review-u smo videli da scorecard nije azuriran i da taskovi kasne. Dogovoreno je da klijent delegira update timu i da reminder mailovi idu pre roka i kada task ode u overdue.",
        recording: {
          videoUrl: "#video-stefan-ops",
          audioUrl: "#audio-stefan-ops",
          driveFolderUrl:
            "https://drive.google.com/drive/folders/bdp-stefan-ops",
          materialsUrl:
            "https://drive.google.com/drive/folders/bdp-stefan-ops-materials",
          recordingsUrl:
            "https://drive.google.com/drive/folders/bdp-stefan-ops-recordings",
        },
        actions: [
          {
            id: "act-stefan-ops-1",
            title: "Delegirati update operations scorecard-a timu",
            owner: "Klijent",
            dueDate: "2026-03-22T17:00:00+01:00",
            done: false,
            sharedWithClient: true,
            reminderBeforeDue: true,
            reminderWhenOverdue: true,
            reminderOnCreate: true,
          },
        ],
      },
      {
        id: "meet-stefan-hr-next",
        title: "HR & Leadership 1:1 review",
        date: "2026-04-04T11:00:00+02:00",
        scheduledStartAt: "2026-04-04T11:00:00+02:00",
        actualStartAt: "2026-04-04T11:00:00+02:00",
        endedAt: "2026-04-04T12:00:00+02:00",
        durationMinutes: 60,
        type: "Zoom 1:1 - kraj meseca",
        modules: ["HR & Leadership"],
        participants: ["Jelena Kostic", "Stefan Pavlov"],
        status: "Zakazan",
        clientOnTime: true,
        overran: false,
        emailSentToClient: false,
        aiSummaryReady: false,
        summary: "HR review i leadership accountability.",
        transcriptPreview: "",
        recording: {
          videoUrl: "#video-stefan-hr-next",
          audioUrl: "#audio-stefan-hr-next",
          driveFolderUrl:
            "https://drive.google.com/drive/folders/bdp-stefan-hr",
          materialsUrl:
            "https://drive.google.com/drive/folders/bdp-stefan-hr-materials",
          recordingsUrl:
            "https://drive.google.com/drive/folders/bdp-stefan-hr-recordings",
        },
        actions: [],
      },
    ],
  },
];

export const clientPortalUsers: ClientPortalUser[] = [
  {
    kind: "client",
    id: "portal-nikola",
    clientId: "nikola-jovanovic",
    name: "Nikola Jovanovic",
    email: "nikola@fitlab.rs",
    company: "FitLab Academy",
    portalLabel: "Portal klijenta",
  },
  {
    kind: "client",
    id: "portal-marija",
    clientId: "marija-ilic",
    name: "Marija Ilic",
    email: "marija@studioforma.rs",
    company: "Studio Forma",
    portalLabel: "Portal klijenta",
  },
  {
    kind: "client",
    id: "portal-stefan",
    clientId: "stefan-pavlov",
    name: "Stefan Pavlov",
    email: "stefan@dentalpro.rs",
    company: "Dental Pro Center",
    portalLabel: "Portal klijenta",
  },
];

export const transferSuggestions: TransferSuggestion[] = [
  {
    id: "transfer-stefan-ops",
    clientId: "stefan-pavlov",
    fromConsultantId: "marko-ristic",
    toConsultantId: "luka-petrovic",
    requestedBy: "milica-stankovic",
    status: "Hitno",
    reason:
      "Operations modul za BDP klijenta trazi jaci ritam i manager moze da prebaci ovog klijenta sa Marka na Luku.",
  },
  {
    id: "transfer-milena-org",
    clientId: "milena-radic",
    fromConsultantId: "marko-ristic",
    toConsultantId: "luka-petrovic",
    requestedBy: "ivana-markovic",
    status: "Predlog",
    reason:
      "Master Mind organization tok moze preci na Luku zbog kapaciteta i tempa rada sa klijentom.",
  },
];

export const workspaceActors: WorkspaceActor[] = [
  ...staffUsers,
  ...clientPortalUsers,
];

export function getProgramById(programId: string) {
  return programs.find((program) => program.id === programId);
}

export function getConsultantById(consultantId: string) {
  return staffUsers.find((staff) => staff.id === consultantId);
}

export function getClientById(clientId: string) {
  return clients.find((client) => client.id === clientId);
}

export function getClientsForConsultant(consultantId: string) {
  return clients.filter((client) =>
    client.assignments.some((assignment) => assignment.consultantId === consultantId),
  );
}

export function getStaffUserById(staffId: string) {
  return staffUsers.find((staff) => staff.id === staffId);
}

export function getPortalUserById(actorId: string) {
  return clientPortalUsers.find((user) => user.id === actorId);
}

export function getWorkspaceActor(actorId: string) {
  return workspaceActors.find((actor) => actor.id === actorId);
}

export function getManagedConsultants(managerId: string) {
  const manager = getStaffUserById(managerId);
  if (!manager?.directReportIds?.length) {
    return [];
  }
  return manager.directReportIds
    .map((reportId) => getStaffUserById(reportId))
    .filter((staff): staff is StaffUser => Boolean(staff));
}

export function getVisibleClientsForActor(actor: WorkspaceActor) {
  if (actor.kind === "client") {
    const client = getClientById(actor.clientId);
    return client ? [client] : [];
  }

  if (actor.role === "manager") {
    const team = getManagedConsultants(actor.id);
    const consultantIds = team.map((item) => item.id);
    return clients.filter((client) =>
      client.assignments.some((assignment) =>
        consultantIds.includes(assignment.consultantId),
      ),
    );
  }

  return getClientsForConsultant(actor.id);
}

export function getClientUserForClient(clientId: string) {
  return clientPortalUsers.find((user) => user.clientId === clientId);
}

export function canAccessAdmin(actor: WorkspaceActor) {
  return actor.kind === "staff" && actor.adminAddon;
}

export function canTransferClients(actor: WorkspaceActor) {
  return actor.kind === "staff" && actor.role === "manager";
}

export function getNavigationForActor(actor: WorkspaceActor): NavigationItem[] {
  if (actor.kind === "client") {
    return [
      { group: "work", label: "Pregled", href: `/workspace/${actor.id}` },
      {
        group: "work",
        label: "Sastanci",
        href: `/workspace/${actor.id}/meetings`,
      },
      {
        group: "personal",
        label: "Analitika",
        href: `/workspace/${actor.id}/analytics`,
      },
      {
        group: "personal",
        label: "Materijali",
        href: `/workspace/${actor.id}/resources`,
      },
    ];
  }

  const items: NavigationItem[] = [
    { group: "work", label: "Pregled", href: `/workspace/${actor.id}` },
    {
      group: "work",
      label: "Klijenti",
      href: `/workspace/${actor.id}/clients`,
      badge: String(getVisibleClientsForActor(actor).length),
    },
    {
      group: "work",
      label: "Analitika",
      href: `/workspace/${actor.id}/analytics`,
    },
    {
      group: "personal",
      label: "Programi",
      href: `/workspace/${actor.id}/programs`,
      badge: String(programs.length),
    },
  ];

  if (actor.role === "manager") {
    items.push({
      group: "personal",
      label: "Tim",
      href: `/workspace/${actor.id}/team`,
      badge: String(getManagedConsultants(actor.id).length),
    });
  }

  if (actor.adminAddon) {
    items.push({
      group: "admin",
      label: "Setup",
      href: `/workspace/${actor.id}/admin`,
      badge: "ADD-ON",
    });
  }

  return items;
}
