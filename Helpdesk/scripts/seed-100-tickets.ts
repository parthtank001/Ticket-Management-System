import { PrismaClient, Category, Priority, TicketStatus, SenderType } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

interface TicketSeedData {
  subject: string;
  studentName: string;
  studentEmail: string;
  category: Category | null;
  priority: Priority;
  status: TicketStatus;
  summary: string;
  aiDraftResponse?: string;
  daysAgo: number;
  minutesAgo: number;
  messages: {
    senderType: SenderType;
    senderEmail: string;
    body: string;
    isInternalNote?: boolean;
    minutesAfterCreated: number;
  }[];
}

const rawTickets: TicketSeedData[] = [
  // --- TECHNICAL QUESTIONS ---
  {
    subject: 'Cannot login to Canvas portal - Error 502 Bad Gateway',
    studentName: 'Emma Watson',
    studentEmail: 'emma.watson@student.edu',
    category: 'TECHNICAL_QUESTION',
    priority: 'URGENT',
    status: 'OPEN',
    summary: 'Student unable to access Canvas LMS before midterm due to 502 server gateway error.',
    aiDraftResponse: 'Hi Emma, we are currently experiencing intermittent Canvas server issues. Please clear your cache or use an incognito window.',
    daysAgo: 0,
    minutesAgo: 15,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'emma.watson@student.edu',
        body: 'I have my Biology midterm in 1 hour and whenever I try to log in to Canvas, I get a 502 Bad Gateway error on chrome. Please help ASAP!',
        minutesAfterCreated: 0,
      },
    ],
  },
  {
    subject: 'Duo 2FA Push notification not received on new phone',
    studentName: 'Liam Johnson',
    studentEmail: 'liam.johnson@student.edu',
    category: 'TECHNICAL_QUESTION',
    priority: 'HIGH',
    status: 'OPEN',
    summary: 'Student replaced smartphone and cannot receive Duo Mobile two-factor pushes.',
    aiDraftResponse: 'Hi Liam, we can issue a temporary bypass code or generate a reactivation link for your Duo Mobile app.',
    daysAgo: 0,
    minutesAgo: 45,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'liam.johnson@student.edu',
        body: 'I upgraded to an iPhone 16 yesterday and now the Duo 2FA app is not linked to my account. I cannot authenticate into any campus services.',
        minutesAfterCreated: 0,
      },
    ],
  },
  {
    subject: 'Eduroam Wi-Fi certificate expired on MacBook Air',
    studentName: 'Sophia Rodriguez',
    studentEmail: 'sophia.rodriguez@student.edu',
    category: 'TECHNICAL_QUESTION',
    priority: 'MEDIUM',
    status: 'RESOLVED',
    summary: 'Wi-Fi 802.1X certificate invalid on macOS device.',
    daysAgo: 1,
    minutesAgo: 120,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'sophia.rodriguez@student.edu',
        body: 'My MacBook stopped connecting to Eduroam in the science building. It says certificate validation failed.',
        minutesAfterCreated: 0,
      },
      {
        senderType: 'AGENT',
        senderEmail: 'agent@example.com',
        body: 'Hi Sophia, please download the updated Eduroam Configuration Assistant Tool (CAT) profile from cat.eduroam.org to trust the new campus root certificate.',
        minutesAfterCreated: 35,
      },
    ],
  },
  {
    subject: 'MATLAB license renewal error 0x80070005',
    studentName: 'Noah Patel',
    studentEmail: 'noah.patel@student.edu',
    category: 'TECHNICAL_QUESTION',
    priority: 'HIGH',
    status: 'OPEN',
    summary: 'MathWorks license manager permission denied on student workstation.',
    daysAgo: 1,
    minutesAgo: 300,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'noah.patel@student.edu',
        body: 'Whenever I open MATLAB 2026b for Engineering 201, it reports license error 0x80070005: Access Denied. My university account is active.',
        minutesAfterCreated: 0,
      },
    ],
  },
  {
    subject: 'Student email mailbox full - Cannot receive attachments',
    studentName: 'Olivia Chen',
    studentEmail: 'olivia.chen@student.edu',
    category: 'TECHNICAL_QUESTION',
    priority: 'MEDIUM',
    status: 'RESOLVED',
    summary: 'Exchange Online 50GB mailbox quota exceeded due to large video submissions.',
    daysAgo: 2,
    minutesAgo: 200,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'olivia.chen@student.edu',
        body: 'Professors are telling me my emails are bouncing back with error 5.2.2 Mailbox Quota Exceeded.',
        minutesAfterCreated: 0,
      },
      {
        senderType: 'AGENT',
        senderEmail: 'agent@example.com',
        body: 'Hi Olivia, we reviewed your mailbox and purged the deleted items recovery partition. You now have 38GB of free space.',
        minutesAfterCreated: 40,
      },
    ],
  },
  {
    subject: 'LockDown Browser crashes on startup during quiz',
    studentName: 'Ethan Kumar',
    studentEmail: 'ethan.kumar@student.edu',
    category: 'TECHNICAL_QUESTION',
    priority: 'URGENT',
    status: 'CLOSED',
    summary: 'Respondus LockDown Browser incompatibilities with background screen recording apps.',
    daysAgo: 3,
    minutesAgo: 100,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'ethan.kumar@student.edu',
        body: 'Respondus LockDown Browser immediately closes and flags error Code 102 when opening Math 104 quiz.',
        minutesAfterCreated: 0,
      },
      {
        senderType: 'AGENT',
        senderEmail: 'agent@example.com',
        body: 'Ethan, this occurs when software like Discord overlay or OBS is running in the background. Terminating those processes resolves the issue.',
        minutesAfterCreated: 25,
      },
    ],
  },
  {
    subject: 'Cisco AnyConnect VPN disconnected: Untrusted Certificate',
    studentName: 'Isabella Garcia',
    studentEmail: 'isabella.garcia@student.edu',
    category: 'TECHNICAL_QUESTION',
    priority: 'HIGH',
    status: 'OPEN',
    summary: 'Campus VPN gateway TLS certificate rejected by client machine.',
    daysAgo: 3,
    minutesAgo: 450,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'isabella.garcia@student.edu',
        body: 'I am doing remote research from home and Cisco AnyConnect says: "The VPN connection failed due to unsuccessful domain name resolution."',
        minutesAfterCreated: 0,
      },
    ],
  },
  {
    subject: 'GitHub Classroom repo 403 Forbidden permission error',
    studentName: 'Lucas Mueller',
    studentEmail: 'lucas.mueller@student.edu',
    category: 'TECHNICAL_QUESTION',
    priority: 'MEDIUM',
    status: 'OPEN',
    summary: 'OAuth token mismatch between university SSO and personal GitHub account.',
    daysAgo: 4,
    minutesAgo: 60,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'lucas.mueller@student.edu',
        body: 'When cloning my CS350 assignment repo, git says permission denied (publickey) / 403 Forbidden.',
        minutesAfterCreated: 0,
      },
    ],
  },
  {
    subject: 'Virtual Lab Remote Desktop Protocol (RDP) Black Screen',
    studentName: 'Mia Tanaka',
    studentEmail: 'mia.tanaka@student.edu',
    category: 'TECHNICAL_QUESTION',
    priority: 'LOW',
    status: 'CLOSED',
    summary: 'Virtual machine GPU display driver timeout during rendering.',
    daysAgo: 5,
    minutesAgo: 50,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'mia.tanaka@student.edu',
        body: 'The Architecture Virtual Machine host vlab-gpu-03 shows a black screen when connecting over Microsoft Remote Desktop.',
        minutesAfterCreated: 0,
      },
      {
        senderType: 'AGENT',
        senderEmail: 'agent@example.com',
        body: 'Hi Mia, we restarted the GPU cluster node vlab-gpu-03 and verified sessions are connecting smoothly.',
        minutesAfterCreated: 60,
      },
    ],
  },
  {
    subject: 'Campus PaperCut Printing Quota not syncing with Student ID Card',
    studentName: 'Alexander Wright',
    studentEmail: 'alexander.wright@student.edu',
    category: 'TECHNICAL_QUESTION',
    priority: 'MEDIUM',
    status: 'RESOLVED',
    summary: 'RFID card reader contactless badge unlinked from student print balance.',
    daysAgo: 6,
    minutesAgo: 180,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'alexander.wright@student.edu',
        body: 'I tapped my physical student ID card at the library printer and it showed $0.00 even though I topped up $20 online.',
        minutesAfterCreated: 0,
      },
      {
        senderType: 'AGENT',
        senderEmail: 'agent@example.com',
        body: 'Hi Alexander, we re-associated your card RFID serial number in the PaperCut directory. Your $20 balance is now available.',
        minutesAfterCreated: 30,
      },
    ],
  },
  {
    subject: 'Student Mobile App keeps crashing on splash screen iOS 18',
    studentName: 'Charlotte Davies',
    studentEmail: 'charlotte.davies@student.edu',
    category: 'TECHNICAL_QUESTION',
    priority: 'LOW',
    status: 'OPEN',
    summary: 'Mobile app crash related to push notification permission dialog on latest iOS.',
    daysAgo: 7,
    minutesAgo: 240,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'charlotte.davies@student.edu',
        body: 'The Campus Life app crashes immediately upon opening after the latest iOS update.',
        minutesAfterCreated: 0,
      },
    ],
  },
  {
    subject: 'Zoom SSO login redirects in an endless loop',
    studentName: 'Benjamin Kim',
    studentEmail: 'benjamin.kim@student.edu',
    category: 'TECHNICAL_QUESTION',
    priority: 'HIGH',
    status: 'RESOLVED',
    summary: 'SAML authentication cookie loop between Shibboleth and Zoom.',
    daysAgo: 8,
    minutesAgo: 100,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'benjamin.kim@student.edu',
        body: 'Trying to sign into university Zoom via SSO just keeps reloading the login page endlessly.',
        minutesAfterCreated: 0,
      },
      {
        senderType: 'AGENT',
        senderEmail: 'agent@example.com',
        body: 'Benjamin, clearing your browser third-party storage or logging in directly via university.zoom.us will clear the stale SAML token.',
        minutesAfterCreated: 20,
      },
    ],
  },
  {
    subject: 'PostgreSQL Database Connection Timeout on Cloud Lab Server',
    studentName: 'Amelia Rossi',
    studentEmail: 'amelia.rossi@student.edu',
    category: 'TECHNICAL_QUESTION',
    priority: 'HIGH',
    status: 'OPEN',
    summary: 'Database server port 5432 firewall block on guest network subnet.',
    daysAgo: 9,
    minutesAgo: 80,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'amelia.rossi@student.edu',
        body: 'My database class project server db.cs.univ.edu is rejecting TCP connections on port 5432 with ETIMEDOUT.',
        minutesAfterCreated: 0,
      },
    ],
  },
  {
    subject: 'Cannot reset forgotten portal password - Security questions fail',
    studentName: 'Daniel Hernandez',
    studentEmail: 'daniel.hernandez@student.edu',
    category: 'TECHNICAL_QUESTION',
    priority: 'URGENT',
    status: 'OPEN',
    summary: 'Account locked out after exceeding security answer limit.',
    daysAgo: 10,
    minutesAgo: 400,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'daniel.hernandez@student.edu',
        body: 'My password expired and the self-service reset says "Account temporarily locked for 24 hours". I need urgent access for homework submission.',
        minutesAfterCreated: 0,
      },
    ],
  },
  {
    subject: 'JupyterHub Notebook server 500 Internal Server Error',
    studentName: 'Harper Wilson',
    studentEmail: 'harper.wilson@student.edu',
    category: 'TECHNICAL_QUESTION',
    priority: 'MEDIUM',
    status: 'CLOSED',
    summary: 'Kubernetes pod disk space allocation full in student user volume.',
    daysAgo: 11,
    minutesAgo: 150,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'harper.wilson@student.edu',
        body: 'When starting my JupyterHub container for Data Science 101, it fails with HTTP 500 error.',
        minutesAfterCreated: 0,
      },
      {
        senderType: 'AGENT',
        senderEmail: 'agent@example.com',
        body: 'Hi Harper, your persistent volume quota had hit 100%. We cleaned up temp checkpoint files and restarted your pod.',
        minutesAfterCreated: 45,
      },
    ],
  },

  // --- REFUND REQUESTS ---
  {
    subject: 'Double charge on credit card for Spring 2026 tuition',
    studentName: 'Ava Taylor',
    studentEmail: 'ava.taylor@student.edu',
    category: 'REFUND_REQUEST',
    priority: 'URGENT',
    status: 'OPEN',
    summary: 'Stripe payment processor charged student twice ($4,250 x 2).',
    aiDraftResponse: 'Hi Ava, we see duplicate payment transaction IDs on your student ledger. We have triggered an immediate refund for the second transaction.',
    daysAgo: 0,
    minutesAgo: 30,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'ava.taylor@student.edu',
        body: 'I paid my Spring tuition of $4,250 yesterday through Nelnet/Stripe, but checking my bank statement shows two identical charges of $4,250. Please refund the duplicate!',
        minutesAfterCreated: 0,
      },
    ],
  },
  {
    subject: 'Refund request for dropped chemistry lab course (CHEM 102L)',
    studentName: 'Henry Martin',
    studentEmail: 'henry.martin@student.edu',
    category: 'REFUND_REQUEST',
    priority: 'HIGH',
    status: 'OPEN',
    summary: 'Lab fee reimbursement within the 100% add/drop refund window.',
    daysAgo: 1,
    minutesAgo: 60,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'henry.martin@student.edu',
        body: 'I dropped CHEM 102L on September 10 before the official add/drop deadline, but the $180 science lab fee is still listed on my student account statement.',
        minutesAfterCreated: 0,
      },
    ],
  },
  {
    subject: 'Parking permit cancellation and prorated semester refund',
    studentName: 'Evelyn Clark',
    studentEmail: 'evelyn.clark@student.edu',
    category: 'REFUND_REQUEST',
    priority: 'MEDIUM',
    status: 'RESOLVED',
    summary: 'Prorated reimbursement for unused North Garage annual pass.',
    daysAgo: 2,
    minutesAgo: 90,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'evelyn.clark@student.edu',
        body: 'I have surrendered my North Campus parking permit at the transportation office due to moving into dorms. Requesting my prorated refund.',
        minutesAfterCreated: 0,
      },
      {
        senderType: 'AGENT',
        senderEmail: 'agent@example.com',
        body: 'Hi Evelyn, your physical permit return has been recorded. A credit refund of $240 has been returned to your original payment method.',
        minutesAfterCreated: 50,
      },
    ],
  },
  {
    subject: 'Housing security deposit refund inquiry after checkout',
    studentName: 'Sebastian Lewis',
    studentEmail: 'sebastian.lewis@student.edu',
    category: 'REFUND_REQUEST',
    priority: 'MEDIUM',
    status: 'OPEN',
    summary: 'Inquiry regarding 30-day timeline for dormitory security deposit return.',
    daysAgo: 3,
    minutesAgo: 180,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'sebastian.lewis@student.edu',
        body: 'I moved out of Evergreen Hall three weeks ago and room inspection gave full clearance. When will the $500 deposit be direct deposited?',
        minutesAfterCreated: 0,
      },
    ],
  },
  {
    subject: 'Meal plan balance refund after medical withdrawal',
    studentName: 'Scarlett Walker',
    studentEmail: 'scarlett.walker@student.edu',
    category: 'REFUND_REQUEST',
    priority: 'HIGH',
    status: 'RESOLVED',
    summary: 'Special circumstance dietary/medical withdrawal meal plan credit.',
    daysAgo: 4,
    minutesAgo: 210,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'scarlett.walker@student.edu',
        body: 'Due to an approved medical leave, the Dean of Students office approved my dining contract cancellation. Requesting the remaining $1,420 dining dollars refund.',
        minutesAfterCreated: 0,
      },
      {
        senderType: 'AGENT',
        senderEmail: 'agent@example.com',
        body: 'Hi Scarlett, we have processed the medical waiver adjustment for your dining contract. $1,420 has been credited back to your bank account.',
        minutesAfterCreated: 90,
      },
    ],
  },
  {
    subject: 'Duplicate textbook order charged on campus bookstore portal',
    studentName: 'Jack Hall',
    studentEmail: 'jack.hall@student.edu',
    category: 'REFUND_REQUEST',
    priority: 'LOW',
    status: 'CLOSED',
    summary: 'Accidental double checkout of digital e-book access code.',
    daysAgo: 5,
    minutesAgo: 300,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'jack.hall@student.edu',
        body: 'I accidentally ordered two copies of Calculus Early Transcendentals on the bookstore site (Order #BK-99214). Need refund for one copy.',
        minutesAfterCreated: 0,
      },
      {
        senderType: 'AGENT',
        senderEmail: 'agent@example.com',
        body: 'Hi Jack, the duplicate e-book license has been cancelled and $85.50 has been refunded to your card.',
        minutesAfterCreated: 15,
      },
    ],
  },
  {
    subject: 'Late registration fee appeal and billing reversal',
    studentName: 'Luna Allen',
    studentEmail: 'luna.allen@student.edu',
    category: 'REFUND_REQUEST',
    priority: 'MEDIUM',
    status: 'OPEN',
    summary: 'Late fee charged during campus registrar portal outage.',
    daysAgo: 6,
    minutesAgo: 140,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'luna.allen@student.edu',
        body: 'I was assessed a $100 late registration fee, but I was unable to register on August 25 because the student portal was down for maintenance.',
        minutesAfterCreated: 0,
      },
    ],
  },
  {
    subject: 'Health insurance waiver fee refund - Private insurance verified',
    studentName: 'Owen Young',
    studentEmail: 'owen.young@student.edu',
    category: 'REFUND_REQUEST',
    priority: 'HIGH',
    status: 'RESOLVED',
    summary: 'Student health insurance fee removal following approved private insurance waiver.',
    daysAgo: 7,
    minutesAgo: 220,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'owen.young@student.edu',
        body: 'My health insurance waiver was approved by Gallagher Student Health on Sept 1, but the $1,250 charge is still on my Bursar bill.',
        minutesAfterCreated: 0,
      },
      {
        senderType: 'AGENT',
        senderEmail: 'agent@example.com',
        body: 'Hi Owen, your waiver was synced with the Bursar database today and the $1,250 charge has been completely credited.',
        minutesAfterCreated: 30,
      },
    ],
  },
  {
    subject: 'Graduation cap and gown duplicate fee refund',
    studentName: 'Chloe King',
    studentEmail: 'chloe.king@student.edu',
    category: 'REFUND_REQUEST',
    priority: 'LOW',
    status: 'CLOSED',
    summary: 'Commencement regalia ordering system duplicate transaction.',
    daysAgo: 8,
    minutesAgo: 310,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'chloe.king@student.edu',
        body: 'I was billed twice for my Bachelor commencement regalia package ($75 x 2).',
        minutesAfterCreated: 0,
      },
      {
        senderType: 'AGENT',
        senderEmail: 'agent@example.com',
        body: 'Hi Chloe, we cancelled the duplicate order and issued a $75 refund to your Visa card.',
        minutesAfterCreated: 10,
      },
    ],
  },
  {
    subject: 'Course cancellation refund for Advanced German (GER 301)',
    studentName: 'Wyatt Wright',
    studentEmail: 'wyatt.wright@student.edu',
    category: 'REFUND_REQUEST',
    priority: 'MEDIUM',
    status: 'OPEN',
    summary: 'Department cancelled section due to under-enrollment; requesting course fee refund.',
    daysAgo: 9,
    minutesAgo: 160,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'wyatt.wright@student.edu',
        body: 'The German department cancelled GER 301. The tuition credits have not yet refunded to my account.',
        minutesAfterCreated: 0,
      },
    ],
  },

  // --- GENERAL QUESTIONS ---
  {
    subject: 'When is the deadline to change grading to Pass/No Pass for Fall 2026?',
    studentName: 'Zoe Scott',
    studentEmail: 'zoe.scott@student.edu',
    category: 'GENERAL_QUESTION',
    priority: 'LOW',
    status: 'OPEN',
    summary: 'Student inquiring about academic calendar P/NP deadline.',
    aiDraftResponse: 'Hi Zoe, the deadline to elect Pass/No Pass grading for Fall 2026 is Friday, October 24 at 5:00 PM EST via the student registrar portal.',
    daysAgo: 0,
    minutesAgo: 20,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'zoe.scott@student.edu',
        body: 'Hi, I want to change one of my general education electives to Pass/No Pass. What is the official cutoff date for this semester?',
        minutesAfterCreated: 0,
      },
    ],
  },
  {
    subject: 'How to order an official digital transcript with university seal',
    studentName: 'Carter Green',
    studentEmail: 'carter.green@student.edu',
    category: 'GENERAL_QUESTION',
    priority: 'LOW',
    status: 'RESOLVED',
    summary: 'Transcript ordering instructions via Parchment exchange.',
    daysAgo: 1,
    minutesAgo: 80,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'carter.green@student.edu',
        body: 'I am applying for graduate school and need an official certified PDF transcript sent directly to admissions.',
        minutesAfterCreated: 0,
      },
      {
        senderType: 'AGENT',
        senderEmail: 'agent@example.com',
        body: 'Hi Carter, you can order official e-transcripts directly through Parchment by visiting the Registrar tab in your Student Center portal.',
        minutesAfterCreated: 15,
      },
    ],
  },
  {
    subject: 'Library private study room reservation guidelines and limits',
    studentName: 'Nora Adams',
    studentEmail: 'nora.adams@student.edu',
    category: 'GENERAL_QUESTION',
    priority: 'LOW',
    status: 'CLOSED',
    summary: 'Library group study room booking hours and key card access.',
    daysAgo: 2,
    minutesAgo: 110,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'nora.adams@student.edu',
        body: 'Can undergraduate students reserve the 4th floor study rooms for more than 3 consecutive hours for group projects?',
        minutesAfterCreated: 0,
      },
      {
        senderType: 'AGENT',
        senderEmail: 'agent@example.com',
        body: 'Hi Nora, study room reservations are limited to 3 hours per group per day to ensure equitable access. Extra time can be booked if rooms remain unoccupied.',
        minutesAfterCreated: 20,
      },
    ],
  },
  {
    subject: 'Academic advising appointment availability for declaring CS minor',
    studentName: 'Jayden Baker',
    studentEmail: 'jayden.baker@student.edu',
    category: 'GENERAL_QUESTION',
    priority: 'MEDIUM',
    status: 'OPEN',
    summary: 'Computer Science minor declaration requirements and advisor booking.',
    daysAgo: 2,
    minutesAgo: 320,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'jayden.baker@student.edu',
        body: 'I have completed CS101 and CS102 with an A. How do I book an appointment with an academic advisor to officially declare my CS minor?',
        minutesAfterCreated: 0,
      },
    ],
  },
  {
    subject: 'Campus health center flu shot clinic schedule and costs',
    studentName: 'Grace Gonzalez',
    studentEmail: 'grace.gonzalez@student.edu',
    category: 'GENERAL_QUESTION',
    priority: 'LOW',
    status: 'RESOLVED',
    summary: 'Annual campus immunization clinic details and student insurance coverage.',
    daysAgo: 3,
    minutesAgo: 50,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'grace.gonzalez@student.edu',
        body: 'Are walk-in flu vaccinations available at the Student Wellness Center this week, and is it free with our student ID?',
        minutesAfterCreated: 0,
      },
      {
        senderType: 'AGENT',
        senderEmail: 'agent@example.com',
        body: 'Hi Grace, flu shots are 100% free for all enrolled students at the Health Center from Monday through Thursday, 9 AM - 4 PM. No appointment needed!',
        minutesAfterCreated: 20,
      },
    ],
  },
  {
    subject: 'Dean’s Honor List eligibility requirements and certificate delivery',
    studentName: 'Leo Nelson',
    studentEmail: 'leo.nelson@student.edu',
    category: 'GENERAL_QUESTION',
    priority: 'LOW',
    status: 'CLOSED',
    summary: 'GPA threshold (3.75+) and credit minimum (12 credits) for Dean’s List.',
    daysAgo: 4,
    minutesAgo: 140,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'leo.nelson@student.edu',
        body: 'I earned a 3.85 GPA with 15 credits last semester. When will the Dean’s List designation appear on my academic transcript?',
        minutesAfterCreated: 0,
      },
      {
        senderType: 'AGENT',
        senderEmail: 'agent@example.com',
        body: 'Hi Leo, congratulations! Dean’s List notations are recorded on transcripts within 3 weeks of final grade posting.',
        minutesAfterCreated: 35,
      },
    ],
  },
  {
    subject: 'Lost and Found: Left blue hydro flask in Science Building Room 204',
    studentName: 'Stella Carter',
    studentEmail: 'stella.carter@student.edu',
    category: 'GENERAL_QUESTION',
    priority: 'LOW',
    status: 'OPEN',
    summary: 'Lost personal item inquiry at Campus Safety & Security desk.',
    daysAgo: 5,
    minutesAgo: 260,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'stella.carter@student.edu',
        body: 'I left a blue 32oz Hydro Flask with university stickers in Science Hall room 204 after Physics lecture. Has anyone turned it in?',
        minutesAfterCreated: 0,
      },
    ],
  },
  {
    subject: 'Gym and Recreation Center holiday operating hours',
    studentName: 'Julian Mitchell',
    studentEmail: 'julian.mitchell@student.edu',
    category: 'GENERAL_QUESTION',
    priority: 'LOW',
    status: 'RESOLVED',
    summary: 'Campus Recreation Center schedule over Labor Day weekend.',
    daysAgo: 6,
    minutesAgo: 340,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'julian.mitchell@student.edu',
        body: 'Will the student recreation center and pool be open on Monday during the holiday?',
        minutesAfterCreated: 0,
      },
      {
        senderType: 'AGENT',
        senderEmail: 'agent@example.com',
        body: 'Hi Julian, the Rec Center will operate on modified hours from 10 AM to 6 PM on the holiday.',
        minutesAfterCreated: 15,
      },
    ],
  },
  {
    subject: 'Study abroad scholarship application deadlines for Spring 2027',
    studentName: 'Victoria Perez',
    studentEmail: 'victoria.perez@student.edu',
    category: 'GENERAL_QUESTION',
    priority: 'MEDIUM',
    status: 'OPEN',
    summary: 'Global education financial grant eligibility and application dates.',
    daysAgo: 7,
    minutesAgo: 190,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'victoria.perez@student.edu',
        body: 'I am interested in applying for the Tokyo exchange program. Where can I find the Gilman and University Global Study scholarship deadlines?',
        minutesAfterCreated: 0,
      },
    ],
  },
  {
    subject: 'Campus Shuttle Bus GPS tracking app not updating real-time location',
    studentName: 'Eli Roberts',
    studentEmail: 'eli.roberts@student.edu',
    category: 'GENERAL_QUESTION',
    priority: 'MEDIUM',
    status: 'CLOSED',
    summary: 'TransLoc shuttle tracking telemetry integration refresh.',
    daysAgo: 8,
    minutesAgo: 290,
    messages: [
      {
        senderType: 'STUDENT',
        senderEmail: 'eli.roberts@student.edu',
        body: 'The Blue Line shuttle bus tracker in the app has been frozen at the North Station for the past 40 minutes.',
        minutesAfterCreated: 0,
      },
      {
        senderType: 'AGENT',
        senderEmail: 'agent@example.com',
        body: 'Hi Eli, transportation operations has restarted the onboard GPS transponder on shuttle #4. Real-time tracking is restored.',
        minutesAfterCreated: 18,
      },
    ],
  },
];

// Generate procedural realistic tickets up to 100
const firstNames = [
  'Liam', 'Emma', 'Noah', 'Olivia', 'Ethan', 'Sophia', 'Lucas', 'Isabella',
  'Mason', 'Mia', 'Oliver', 'Charlotte', 'Aiden', 'Amelia', 'Elijah', 'Harper',
  'James', 'Evelyn', 'Benjamin', 'Abigail', 'Alexander', 'Emily', 'Jackson', 'Ella',
  'Mateo', 'Avery', 'Daniel', 'Scarlett', 'Michael', 'Grace', 'Henry', 'Chloe',
  'Sebastian', 'Victoria', 'Jack', 'Riley', 'Owen', 'Aria', 'Samuel', 'Lily',
  'David', 'Aubrey', 'Joseph', 'Zoey', 'Carter', 'Hannah', 'Wyatt', 'Lillian',
  'John', 'Addison', 'Luke', 'Layla', 'Julian', 'Natalie', 'Dylan', 'Camila',
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas',
  'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White',
  'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young',
  'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker',
];

const realisticTopics = [
  // General Questions
  {
    category: 'GENERAL_QUESTION' as const,
    subjects: [
      'Graduation credit audit review for senior year',
      'How to request prerequisite waiver for Physics 202',
      'Campus parking pass renewal for commuter students',
      'Student disability accommodation letter submission process',
      'Career fair resume review and employer registration info',
      'Locker rental in engineering hall for fall semester',
      'Attendance policy regarding official university sports events',
      'How to audit an art history class without credit',
      'Commencement ticket allocation for guest family members',
      'Alumni mentoring network registration instructions',
      'Housing lottery priority number distribution date',
      'International student CPT/OPT work authorization seminar',
      'Dining hall allergy-safe food options and nutrition consultations',
      'Music practice room key access for non-music majors',
      'Dean of Students emergency student relief grant application',
      'Club sports registration and liability insurance waiver',
      'Writing Center tutoring session appointment booking',
      'Course syllabus archive lookup for transfer credits',
      'Overload credit petition for taking 19 credit units',
      'Campus safety escort service operating boundaries',
    ],
  },
  // Technical Questions
  {
    category: 'TECHNICAL_QUESTION' as const,
    subjects: [
      'SSO password reset link expired immediately upon receiving',
      'Canvas assignment submission button grayed out before deadline',
      'Cannot connect to lab virtual machine over SSH',
      'Blackboard gradebook not syncing with professor portal',
      'Microsoft Office 365 student subscription showing Unlicensed Product',
      'AutoCAD student license activation serial key rejected',
      'Campus Wi-Fi drops connection every 15 minutes in East Hall',
      'SolidWorks license server connection refused port 25734',
      'University portal showing blank white screen in Safari',
      'Cannot upload MP4 video file to Kaltura media space',
      'Linux lab desktop displaying kernel panic on boot',
      'Google Drive storage quota error on university workspace account',
      'Wolfram Mathematica license renewal activation key error',
      'Student ID badge barcode not scanning at dining hall turnstile',
      'Zoom room meeting audio echo and microphone permission error',
      'Two-factor authentication code SMS taking 20 minutes to arrive',
      'Cisco Webex Teams login error 401 Unauthorized',
      'Library search database proxy EZproxy timeout error',
      'Virtual reality lab headset tracking calibration failure',
      'Python Anaconda environment permissions error on shared server',
    ],
  },
  // Refund Requests
  {
    category: 'REFUND_REQUEST' as const,
    subjects: [
      'Duplicate charge for graduation application fee',
      'Student recreation fee refund after remote semester approval',
      'Tuition overpayment balance return via direct deposit',
      'Lab breakage fee dispute - Returned all glassware intact',
      'Late payment penalty waiver after bank ACH processing delay',
      'Campus store textbook return within 14-day return period',
      'Student health fee refund for students residing out of state',
      'Housing meal plan refund for remaining flex dollars',
      'Course drop tuition differential refund (15 vs 12 credits)',
      'Parking permit refund for student withdrawing from semester',
      'Financial aid scholarship credit not subtracted from total bill',
      'Emergency room health insurance reimbursement claim',
      'International student orientation fee waiver refund',
      'Duplicate diploma copy reorder refund',
      'Music department instrument rental deposit return',
      'Study abroad program cancellation deposit refund',
      'Science lab equipment deposit return verification',
      'Graduation cap & tassel duplicate order charge refund',
      'Overcharge on student health center prescription copay',
      'Dormitory mattress replacement fee dispute',
    ],
  },
];

async function seedTickets() {
  console.log('🚀 Starting generation of 100 realistic tickets in PostgreSQL database...');

  // 1. Fetch available support agents to assign
  const agents = await prisma.user.findMany({
    where: { role: 'AGENT' },
  });

  const agentId = agents.length > 0 ? agents[0].id : null;

  // Clear existing tickets first to guarantee a clean 100-ticket benchmark dataset
  console.log('🧹 Clearing old test tickets...');
  await prisma.ticketMessage.deleteMany({});
  await prisma.ticket.deleteMany({});

  const allTicketsToInsert: TicketSeedData[] = [...rawTickets];

  let topicCounter = 0;

  // Generate remaining tickets up to 100
  while (allTicketsToInsert.length < 100) {
    const fName = firstNames[(allTicketsToInsert.length * 3 + 7) % firstNames.length];
    const lName = lastNames[(allTicketsToInsert.length * 5 + 11) % lastNames.length];
    const studentName = `${fName} ${lName}`;
    const studentEmail = `${fName.toLowerCase()}.${lName.toLowerCase()}@student.edu`;

    const topicGroup = realisticTopics[topicCounter % realisticTopics.length];
    const subjectList = topicGroup.subjects;
    const subject = subjectList[topicCounter % subjectList.length];

    const statuses: TicketStatus[] = ['OPEN', 'OPEN', 'RESOLVED', 'CLOSED'];
    const status = statuses[allTicketsToInsert.length % statuses.length];

    const priorities: Priority[] = ['LOW', 'MEDIUM', 'MEDIUM', 'HIGH', 'URGENT'];
    const priority = priorities[allTicketsToInsert.length % priorities.length];

    const category = allTicketsToInsert.length % 15 === 0 ? null : topicGroup.category;

    const daysAgo = Math.floor((allTicketsToInsert.length * 1.5) % 30);
    const minutesAgo = Math.floor((allTicketsToInsert.length * 23) % 1440);

    allTicketsToInsert.push({
      subject: `${subject} [#${allTicketsToInsert.length + 1}]`,
      studentName,
      studentEmail,
      category,
      priority,
      status,
      summary: `Automated issue summary for ${studentName} regarding ${subject.toLowerCase()}.`,
      daysAgo,
      minutesAgo,
      messages: [
        {
          senderType: 'STUDENT',
          senderEmail: studentEmail,
          body: `Hello Support Team,\n\nI am contacting you regarding ${subject.toLowerCase()}. Please assist me with the necessary steps to resolve this inquiry.\n\nThank you,\n${studentName}`,
          minutesAfterCreated: 0,
        },
        ...(status !== 'OPEN'
          ? [
              {
                senderType: 'AGENT' as SenderType,
                senderEmail: 'agent@example.com',
                body: `Hi ${fName},\n\nWe have reviewed your request regarding ${subject.toLowerCase()}. The appropriate adjustments have been applied to your student file.\n\nPlease let us know if you need anything else!\n\nBest regards,\nHelpdesk Support Team`,
                minutesAfterCreated: 45,
              },
            ]
          : []),
      ],
    });

    topicCounter++;
  }

  console.log(`📝 Inserting ${allTicketsToInsert.length} tickets into database...`);

  let insertedCount = 0;
  for (const tData of allTicketsToInsert) {
    const createdAtDate = new Date();
    createdAtDate.setDate(createdAtDate.getDate() - tData.daysAgo);
    createdAtDate.setMinutes(createdAtDate.getMinutes() - tData.minutesAgo);

    const ticket = await prisma.ticket.create({
      data: {
        subject: tData.subject,
        studentName: tData.studentName,
        studentEmail: tData.studentEmail,
        category: tData.category,
        priority: tData.priority,
        status: tData.status,
        summary: tData.summary,
        aiDraftResponse: tData.aiDraftResponse || null,
        assignedAgentId: tData.status !== 'OPEN' ? agentId : (insertedCount % 3 === 0 ? agentId : null),
        createdAt: createdAtDate,
        updatedAt: createdAtDate,
      },
    });

    for (const msg of tData.messages) {
      const msgDate = new Date(createdAtDate.getTime() + msg.minutesAfterCreated * 60000);
      await prisma.ticketMessage.create({
        data: {
          ticketId: ticket.id,
          senderType: msg.senderType,
          senderEmail: msg.senderEmail,
          body: msg.body,
          isInternalNote: msg.isInternalNote || false,
          createdAt: msgDate,
        },
      });
    }

    insertedCount++;
  }

  console.log(`✅ Successfully seeded ${insertedCount} diverse, realistic tickets!`);
}

seedTickets()
  .catch((e) => {
    console.error('❌ Error during ticket seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
