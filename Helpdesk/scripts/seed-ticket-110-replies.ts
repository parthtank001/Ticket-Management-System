import { PrismaClient, Category, Priority, TicketStatus } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

interface ReplyTurn {
  senderType: 'STUDENT' | 'AGENT';
  senderName: string;
  senderEmail: string;
  isInternalNote?: boolean;
  content: string;
}

const replies: ReplyTurn[] = [
  // --- TURN 1 (Customer / Olivia Chen) ---
  {
    senderType: 'STUDENT',
    senderName: 'Olivia Chen',
    senderEmail: 'olivia.chen@student.edu',
    content: `Hello Helpdesk Support Team,

I am writing back immediately regarding Ticket #110 because this mailbox quota issue has become critical for my academic standing.
Earlier today, my graduate research advisor, Dr. Jennifer Aris, notified me via Slack that her email containing our revised symposium draft was rejected.
The bounce-back notification specifically cited: "554 5.2.2 Mailbox Quota Exceeded - Destination mailbox storage limit exceeded."
I am currently in the middle of preparing my final Master's thesis presentation for next Tuesday, so missing incoming faculty correspondence is extremely stressful.
When I log into Outlook Web Access (OWA), the storage bar at the bottom left is displaying 49.8 GB used of 50.0 GB.
I tried deleting approximately 200 older emails from last semester, but the storage meter did not budge at all.
I also have several .zip files and video recordings from the Robotics Lab that professors sent over the past two weeks which I desperately need to receive.
Could you please inspect my account on the Exchange server side and let me know why deleting emails didn't free up quota?
Also, is there an emergency temporary quota extension (e.g. 5GB temporary buffer) while we clean up old items?
Please advise on the fastest procedure to get incoming email delivery unblocked today.

Thank you so much,
Olivia Chen
Department of Computer Science & Engineering
Student ID: #9842104`,
  },

  // --- TURN 2 (Support Agent / Alex Rivera) ---
  {
    senderType: 'AGENT',
    senderName: 'Alex Rivera (Tier-2 IT Specialist)',
    senderEmail: 'agent@example.com',
    content: `Hi Olivia,

Thank you for reaching out with those additional details. I completely understand how urgent this is with your thesis deadline approaching.
I have reviewed your Exchange Online account on our Microsoft 365 Admin Portal (Exchange Admin Center).
Here is an overview of what is happening under the hood:
1. University student accounts are allocated a standard 50 GB primary Exchange Online mailbox limit and a separate 1 TB OneDrive cloud repository.
2. When you delete messages in Outlook, they are initially moved to the "Deleted Items" folder, which still counts 100% against your 50 GB quota.
3. Furthermore, even after emptying "Deleted Items", items enter the hidden "Recoverable Items" folder (Exchange Dumpster) for 14 days under Single Item Recovery.
Because the Recoverable Items subtree is currently holding ~8.4 GB of deleted media attachments, your active quota is still calculating at 49.8 GB.
While University IT policies prevent us from permanently raising the base mailbox quota above 50 GB, we have several effective tools to resolve this immediately:
First, we can assist you in migrating large media files and dataset archives into your 1 TB OneDrive for Business cloud storage.
Second, I can run a server-side PowerShell command to force the Exchange Managed Folder Assistant to purge the unneeded Recoverable Items cache.
To get started safely:
Could you check if you have any raw .mp4 or .zip files in your "Deleted Items" or "Sent Items" folders that you can permanently purge?
Please review those folders and let me know once you've saved local copies or are ready for us to trigger the dumpster flush.

Best regards,
Alex Rivera
Senior Campus IT Systems Engineer
University Helpdesk & Cloud Services`,
  },

  // --- TURN 3 (Customer / Olivia Chen) ---
  {
    senderType: 'STUDENT',
    senderName: 'Olivia Chen',
    senderEmail: 'olivia.chen@student.edu',
    content: `Hi Alex,

Thank you for the prompt and thorough explanation! That makes complete sense why deleting emails didn't decrease the meter.
I went into Outlook Web App and checked the "Storage" breakdown under Settings > General > Storage:
- Inbox: 24.1 GB (mostly email chains containing high-resolution simulation diagrams)
- Sent Items: 16.2 GB (I sent multiple .tar.gz archives containing sensor telemetry data to my research cohort)
- Deleted Items: 7.1 GB (items I moved to trash earlier this morning)
- Recoverable Items: 2.4 GB
I have already backed up all the raw sensor telemetry files (.tar.gz) and robot simulation logs (.mp4) to an external SSD drive on my desk.
However, when I tried logging into my University OneDrive at https://onedrive.live.com/ using my student email, I received an authentication error.
The browser redirected to an error screen stating: "AADSTS50020: User account does not exist in tenant 'University Students'."
Is there a specific University portal login link or institutional Single Sign-On (SSO) URL for our 1 TB OneDrive storage?
Also, once I upload those archives to OneDrive, how do I permanently remove them from the Exchange "Recoverable Items" dumpster?
I want to make sure I don't accidentally wipe any important academic grading emails from the Registrar or Financial Aid office.
Looking forward to your guidance so I can get this storage below 25 GB today!

Warm regards,
Olivia Chen`,
  },

  // --- TURN 4 (Support Agent / Alex Rivera) ---
  {
    senderType: 'AGENT',
    senderName: 'Alex Rivera (Tier-2 IT Specialist)',
    senderEmail: 'agent@example.com',
    content: `Hi Olivia,

Great job backing up those raw sensor telemetry archives to your external SSD first—that gives us complete peace of mind.
Regarding the OneDrive login error (AADSTS50020):
The generic Microsoft login page sometimes defaults to personal consumer Microsoft accounts rather than our University Enterprise tenant.
Please access your institutional cloud storage using our dedicated single sign-on redirect URL:
👉 https://portal.office.com or https://university-my.sharepoint.com
Sign in using your full student email: olivia.chen@student.edu, and it will direct you to our Duo 2FA campus portal.
Once inside:
1. Click the 9-dot App Launcher in the top-left corner and select "OneDrive".
2. Create a folder named "Research-Archives-2026" and upload your .tar.gz and .mp4 simulation files directly there.
Regarding the Exchange Dumpster cleanup:
In Outlook Web App:
- Open the "Deleted Items" folder on the left panel.
- Right-click "Deleted Items" and click "Empty folder".
- At the top of the Deleted Items list, click the blue link: "Recover items deleted from this folder".
- In the popup window, select all unneeded video attachments and click "Purge Selected Items".
Please note that regular plain-text emails take up negligible space (usually < 50 KB), whereas video attachments take 100-500 MB each.
Focus specifically on removing attachments larger than 25 MB in Sent Items and Deleted Items.
Let me know as soon as you finish purging those items, and I will check the Exchange server metrics from our admin console.

Best regards,
Alex Rivera
Senior Campus IT Systems Engineer`,
  },

  // --- TURN 5 (Customer / Olivia Chen) ---
  {
    senderType: 'STUDENT',
    senderName: 'Olivia Chen',
    senderEmail: 'olivia.chen@student.edu',
    content: `Hi Alex,

Thank you! Logging in via https://portal.office.com worked like a charm with Duo 2FA.
I successfully created the "Research-Archives-2026" directory and began moving files over.
However, I encountered another unexpected hiccup when using the OneDrive Desktop Sync client on Windows 11:
When I drag a folder containing 18 GB of sensor data into the synced OneDrive folder, the system tray icon displays a red "X".
The error dialogue says: "Error 0x8004de40: There was a problem connecting to Microsoft OneDrive. Cloud sync paused."
I am currently connected to the campus eduroam Wi-Fi network inside the Engineering Building (Room 304).
Does the campus wireless network bandwidth throttling policy restrict simultaneous multi-gigabyte uploads over OneDrive?
Alternatively, should I be using the web browser drag-and-drop interface instead of the desktop synchronization client?
On the email side: I emptied my Deleted Items folder and purged 45 large items from the "Recover items deleted from this folder" list.
Outlook web still indicates 46.2 GB in use, so it dropped from 49.8 GB down to 46.2 GB, which is a positive start!
Could you check if the desktop sync error 0x8004de40 is known on campus Wi-Fi, and what is the best way to upload the remaining 15 GB?

Thanks again for your patience!
Olivia`,
  },

  // --- TURN 6 (Support Agent / Alex Rivera) ---
  {
    senderType: 'AGENT',
    senderName: 'Alex Rivera (Tier-2 IT Specialist)',
    senderEmail: 'agent@example.com',
    content: `Hi Olivia,

Thanks for the update! It is great to see the quota already dropping down to 46.2 GB.
Regarding OneDrive Sync Error 0x8004de40:
This specific error code indicates a stale TLS handshake token between the local OneDrive desktop client and the Microsoft Azure cloud endpoints.
It is not caused by eduroam bandwidth limits, but rather by cached authentication certificates after a campus network transition.
Here is the proven 2-minute fix to reset the desktop client:
1. Press Windows Key + R to open the Run dialogue box.
2. Paste the following command and hit Enter:
   %localappdata%\\Microsoft\\OneDrive\\onedrive.exe /reset
3. The OneDrive cloud icon in the taskbar will disappear and reappear after 60 seconds.
4. If it doesn't automatically restart, launch OneDrive from the Windows Start Menu.
5. In the OneDrive Settings > Network tab, verify that both Upload and Download rates are set to "Don't limit".
For large research batches (10 GB+), our Enterprise SharePoint/OneDrive tenant supports up to 250 GB per single file!
So once the sync client resets, it will easily push the 18 GB batch in the background while you work.
Meanwhile, I checked the Exchange server status for your mailbox:
I can see 46.2 GB active data. To accelerate the quota reclamation from your purged items, I will run a server-side maintenance task next.
Please run the reset command above and let me know if the sync icon turns to a blue cloud.

Best regards,
Alex Rivera
Senior Campus IT Systems Engineer`,
  },

  // --- TURN 7 (Customer / Olivia Chen) ---
  {
    senderType: 'STUDENT',
    senderName: 'Olivia Chen',
    senderEmail: 'olivia.chen@student.edu',
    content: `Hi Alex,

The command \`%localappdata%\\Microsoft\\OneDrive\\onedrive.exe /reset\` worked immediately!
The taskbar icon re-authenticated with my student account and all 18 GB of research archives have finished syncing to OneDrive with green checkmarks.
I also went into Outlook and deleted 80 older sent messages from 2025 that contained duplicate copies of those simulation videos.
I followed your steps to purge them from the "Recover items deleted from this folder" interface as well.
However, looking at the storage meter in Outlook Web App, the storage usage still displays 44.1 GB.
I expected it to drop by at least 15 GB since those video attachments were huge.
Is there an automated background indexing or dumpster retention hold on the Exchange server that delays space recovery?
I want to make sure the space is actually freed up so that incoming emails from the IEEE conference organizers and Dr. Aris don't get rejected.
Could you please run that server-side maintenance task you mentioned earlier to force the Exchange server to update the quota calculation?
I really appreciate how thorough and responsive you've been throughout this whole process.

Best regards,
Olivia Chen`,
  },

  // --- TURN 8 (Support Agent / Alex Rivera) ---
  {
    senderType: 'AGENT',
    senderName: 'Alex Rivera (Tier-2 IT Specialist)',
    senderEmail: 'agent@example.com',
    content: `Hi Olivia,

Fantastic news that the OneDrive reset solved the sync issue and your 18 GB of research data is safely backed up in the cloud!
To answer your question regarding the delay in space calculation:
Yes, Microsoft Exchange Online uses an asynchronous maintenance service called the "Managed Folder Assistant" (MFA).
By default, MFA runs on a rolling 7-day schedule across all university mailboxes to recalculate folder sizes and reclaim purged white-space.
I just connected to Exchange Online PowerShell via our admin console and executed the following administrative command for your account:
\`Start-ManagedFolderAssistant -Identity "olivia.chen@student.edu" -FullCrawl\`
I also ran:
\`Get-MailboxStatistics -Identity "olivia.chen@student.edu" | Select TotalItemSize, ItemCount, DeletedItemSize\`
The live server statistics now confirm:
- Total Active Item Size: 17.8 GB (down from 49.8 GB!)
- Active Item Count: 4,120 items
- Total Free Storage Available: 32.2 GB (out of 50.0 GB)
This means your mailbox is now completely healthy and operating at only ~35% capacity!
Any incoming messages with attachments will now be accepted by our mail gateway without any restrictions.
Please refresh your Outlook Web Access window, and you should see the storage meter updated to ~18 GB.
Let me know if the storage meter matches on your end!

Best regards,
Alex Rivera
Senior Campus IT Systems Engineer`,
  },

  // --- TURN 9 (Customer / Olivia Chen) ---
  {
    senderType: 'STUDENT',
    senderName: 'Olivia Chen',
    senderEmail: 'olivia.chen@student.edu',
    content: `Hi Alex,

Wow, what a relief! I just refreshed Outlook Web Access and the storage bar dropped down to 17.8 GB in green!
Thank you so much for triggering the Managed Folder Assistant command—that made a massive difference.
I have an important follow-up question regarding the emails that bounced while my mailbox was at 49.8 GB:
Over the past 48 hours, I was expecting two critical messages:
1. An official submission receipt from \`conferences@ieee-org.com\` regarding our IEEE Robotics & Automation paper.
2. An updated course grading rubric with an attached PDF from Professor Davis (\`advising@engineering.edu\`).
Will standard internet email servers automatically retry delivering those failed messages now that my mailbox has 32 GB of free space?
Or does a "554 5.2.2 Mailbox Quota Exceeded" error cause the sending mail server to permanently drop the message?
If they are not automatically redelivered, should I reach out to the senders directly and request that they resend their emails?
Also, is there any way for IT support to check the campus inbound mail gateway logs to see what was rejected?

Thank you again,
Olivia Chen`,
  },

  // --- TURN 10 (Support Agent / Alex Rivera) ---
  {
    senderType: 'AGENT',
    senderName: 'Alex Rivera (Tier-2 IT Specialist)',
    senderEmail: 'agent@example.com',
    content: `Hi Olivia,

That is a great technical question regarding how SMTP mail transfer agents (MTAs) handle quota rejections!
Here is how email retry standards (RFC 5321) work in practice:
1. Soft vs. Hard Bounce:
   - When our server responded with 5.2.2 (Mailbox full), most enterprise mail servers (like university systems and IEEE) treat this as a temporary recipient failure for the first 24-48 hours.
   - The sender's mail server typically queues the message in its outbound spool and retries delivery periodically (every 15 to 60 minutes).
2. If the Retry Window Expired:
   - If the sending server tried repeatedly for more than 48 hours, it eventually generates a final Non-Delivery Report (NDR) back to the sender and drops the message from its queue.
To be 100% certain of what happened:
I can run an Exchange Message Trace across our inbound perimeter gateway for all traffic addressed to \`olivia.chen@student.edu\` over the past 7 days.
The message trace log will show the exact sender IP, subject line, timestamp, and whether delivery succeeded, deferred, or failed.
I will pull those logs right away so we have concrete visibility into Dr. Davis and IEEE's communications.
I'll follow up in just a few minutes with the trace results.

Best regards,
Alex Rivera
Senior Campus IT Systems Engineer`,
  },

  // --- TURN 11 (Customer / Olivia Chen) ---
  {
    senderType: 'STUDENT',
    senderName: 'Olivia Chen',
    senderEmail: 'olivia.chen@student.edu',
    content: `Hi Alex,

That explanation is super helpful! I didn't know sending servers had a 48-hour retry queue.
To help you narrow down the Exchange Message Trace search filters:
- Sender 1: \`advising@engineering.edu\` or \`davis.j@engineering.edu\` (Subject likely contains "Midterm Rubric" or "ENGR 802 Syllabus")
- Sender 2: \`conferences@ieee-org.com\` or \`noreply@ieee-robotics.org\` (Subject likely contains "Paper #4401 Submission Confirmation")
- Approximate Date Range: September 19, 2026, 08:00 AM through September 21, 2026, 06:00 PM.
Having the exact timestamps and bounce status will be invaluable so I know whether I need to email Professor Davis and apologize for the technical glitch.
While you are running the trace, I also noticed one smaller issue on my laptop's Outlook desktop app:
When I open shared calendar invitations that contain attached meeting agendas, Outlook gives a message: "Cannot display attachment. Memory or resource limit reached."
Could this be related to cached Outlook files (.ost file) having old corrupted indices from when the mailbox was full?
Please let me know what you find in the message trace and how we might fix the calendar attachment cache!

Warmly,
Olivia`,
  },

  // --- TURN 12 (Support Agent / Alex Rivera) ---
  {
    senderType: 'AGENT',
    senderName: 'Alex Rivera (Tier-2 IT Specialist)',
    senderEmail: 'agent@example.com',
    content: `Hi Olivia,

I have completed the Exchange Message Trace on our Microsoft 365 Security & Compliance portal. Here are the findings:
📋 Message Trace Summary (Sep 19 - Sep 21):
1. Sender: \`davis.j@engineering.edu\`
   - Subject: "ENGR 802 - Revised Lab Rubric & Exam Study Guide" (Attachment: 14.2 MB PDF)
   - Status: Deferred on Sep 20 at 14:22 UTC (Status: 452 4.2.2).
   - Good news: The engineering department server kept retrying, and I can confirm it successfully delivered to your inbox today at 11:45 AM once we freed the quota!
2. Sender: \`conferences@ieee-org.com\`
   - Subject: "IEEE ICRA 2026 - Manuscript #4401 Acknowledgment"
   - Status: Failed permanently on Sep 19 at 09:15 UTC (Status: 554 5.2.2).
   - The IEEE system does not retry after 24 hours. Because it bounced on Sep 19, the author confirmation was sent back to Dr. Aris as the primary author.
Recommendation:
You can let Dr. Aris know your mailbox is fully clear, and ask her to forward the IEEE confirmation email to you.
Regarding your Outlook Desktop Calendar error ("Cannot display attachment. Memory or resource limit reached"):
Your intuition is spot on! When a mailbox hits 100% capacity, the local Offline Outlook Data File (.ost cache) becomes fragmented and fails to allocate buffer for calendar blob attachments.
I will outline the exact steps to rebuild your local .ost cache in my next message.

Best regards,
Alex Rivera
Senior Campus IT Systems Engineer`,
  },

  // --- TURN 13 (Customer / Olivia Chen) ---
  {
    senderType: 'STUDENT',
    senderName: 'Olivia Chen',
    senderEmail: 'olivia.chen@student.edu',
    content: `Hi Alex,

Thank you so much for checking the message trace! That was incredibly insightful.
I just checked my inbox and indeed found Professor Davis's rubric email that arrived at 11:45 AM!
I also sent a quick Slack message to Dr. Aris explaining the situation; she forwarded the IEEE manuscript confirmation to me right away, so all critical papers are accounted for!
Now that the core email delivery is 100% functional, I would love to fix the Outlook desktop client calendar attachment issue.
Currently, whenever I double-click an event on my Department Seminar calendar in Outlook desktop, the window takes 10 seconds to open, and any attached .docx or .pdf shows an error icon.
However, if I view the same calendar event in Outlook Web Access via Chrome, the attachment opens instantly and previews without any issue.
This confirms what you said about the local .ost data file on Windows being corrupted during the quota lockout.
Could you please share the step-by-step instructions to safely rebuild the .ost file on Windows 11 without losing my email signatures or customized view settings?

Thanks so much,
Olivia`,
  },

  // --- TURN 14 (Support Agent / Alex Rivera) ---
  {
    senderType: 'AGENT',
    senderName: 'Alex Rivera (Tier-2 IT Specialist)',
    senderEmail: 'agent@example.com',
    content: `Hi Olivia,

I am delighted to hear that Professor Davis's email arrived safely and that Dr. Aris forwarded the IEEE confirmation!
Here is the clean procedure to rebuild your Outlook .ost cache without losing email signatures, account profiles, or custom rules:
Since all your emails, folders, and calendar events are stored on the Microsoft 365 cloud server, deleting the local cache file (.ost) will simply cause Outlook to download a fresh, perfectly indexed copy.
Step-by-Step .OST Rebuild Guide:
1. Completely close the Microsoft Outlook desktop application (check Task Manager to ensure \`OUTLOOK.EXE\` is closed).
2. Press Windows Key + R to open the Run window.
3. Paste the following path and click OK:
   \`%localappdata%\\Microsoft\\Outlook\`
4. In the Explorer folder that opens, look for a file named \`olivia.chen@student.edu.ost\` (or similar .ost file).
5. Right-click the file and rename it to: \`olivia.chen@student.edu.ost.old\` (renaming rather than deleting acts as a safe backup).
6. Launch Microsoft Outlook normally from your Start Menu.
7. Outlook will display a status bar at the bottom: "Preparing Outlook for first use... Updating Inbox (0% to 100%)."
8. Allow 3 to 5 minutes for it to re-sync your mailbox headers and calendar index.
Once complete, your calendar attachments will open smoothly with zero latency!
Please give this a try and let me know how the calendar looks.

Best regards,
Alex Rivera
Senior Campus IT Systems Engineer`,
  },

  // --- TURN 15 (Customer / Olivia Chen) ---
  {
    senderType: 'STUDENT',
    senderName: 'Olivia Chen',
    senderEmail: 'olivia.chen@student.edu',
    content: `Hi Alex,

I followed your instructions: closed Outlook, navigated to \`%localappdata%\\Microsoft\\Outlook\`, renamed the file to \`.ost.old\`, and restarted Outlook.
It took about 3 minutes to rebuild the local cache, and it works flawlessly now!
All Department Seminar calendar attachments (.pdf and .docx) open instantaneously without any memory or resource warnings.
The overall Outlook desktop app feels noticeably faster when searching through older email threads as well.
Now that everything is working in prime condition, I want to proactively ensure I never run into a full mailbox situation again.
As a graduate researcher, I receive dozens of heavy scientific paper preprints and conference slide decks each week.
Could you recommend the best practice for setting up automated archiving or retention policies in Microsoft 365?
For example, is it possible to configure an automatic server rule that moves attachments older than 90 days directly into OneDrive or an Archive folder?
I would appreciate any recommendations or workflow tips you have for graduate students.

Thank you,
Olivia`,
  },

  // --- TURN 16 (Support Agent / Alex Rivera) ---
  {
    senderType: 'AGENT',
    senderName: 'Alex Rivera (Tier-2 IT Specialist)',
    senderEmail: 'agent@example.com',
    content: `Hi Olivia,

I am thrilled to hear the .ost rebuild completely resolved the calendar attachment performance and search indexing!
Setting up automated email hygiene is a fantastic practice, especially for graduate and doctoral researchers.
Here are the three best strategies for managing academic email volume long-term:
Strategy 1: Enable Online Archive Mailbox (Auto-Expanding)
- As a graduate student, you are eligible for an Exchange "Online Archive" folder, which provides an additional 50 GB dedicated secondary archive that doesn't count against your primary inbox quota.
- I have just provisioned the Online Archive feature for your account via our admin console. Within 2 hours, you will see an "In-Place Archive - Olivia Chen" folder appear in your Outlook navigation bar.
- You can drag older project folders directly there, and they remain searchable without consuming primary inbox quota.
Strategy 2: Automatic Outlook Web App Sweep & Archive Rules
1. In Outlook Web (https://portal.office.com > Outlook), click Settings (gear icon) > Mail > Rules.
2. Create a rule: "If message received is older than 90 days and has attachments > 10 MB, Move to Online Archive."
Strategy 3: OneDrive Cloud Attachments Workflow
- When sending simulation files or manuscripts to co-authors, use the "Share OneDrive Link" option instead of attaching raw files. This prevents 100+ MB files from accumulating in your "Sent Items" folder.
Let me know if you would like any assistance verifying your Online Archive once it appears!

Best regards,
Alex Rivera
Senior Campus IT Systems Engineer`,
  },

  // --- TURN 17 (Customer / Olivia Chen) ---
  {
    senderType: 'STUDENT',
    senderName: 'Olivia Chen',
    senderEmail: 'olivia.chen@student.edu',
    content: `Hi Alex,

The Online Archive feature is incredible! I can already see the "In-Place Archive - Olivia Chen" folder in my Outlook navigation tree!
I just set up the automated sweep rule for messages with attachments older than 90 days as you suggested.
I also tested the OneDrive "Share Link" workflow by sending my latest 45 MB robotics presentation to Dr. Aris via a OneDrive secure link instead of a raw attachment.
It saved 45 MB of quota in my Sent Items folder while allowing Dr. Aris to view and comment on the slides in real time.
I have one minor question regarding mobile devices:
I use the Microsoft Outlook app on my iPhone (iOS 18) to check student emails between classes.
Do server-side Exchange Inbox rules and the Online Archive folder also sync and function seamlessly on mobile?
Do I need to change any cache or background refresh settings in the iOS Outlook app to prevent it from storing gigabytes of offline data on my phone's internal storage?
Everything on the desktop and web versions is performing better than ever.

Best regards,
Olivia Chen`,
  },

  // --- TURN 18 (Support Agent / Alex Rivera) ---
  {
    senderType: 'AGENT',
    senderName: 'Alex Rivera (Tier-2 IT Specialist)',
    senderEmail: 'agent@example.com',
    content: `Hi Olivia,

Yes, absolutely! Because the rules you configured in Outlook Web App are executed server-side on Microsoft's cloud servers, they process incoming emails 24/7 regardless of whether your laptop or phone is turned on.
Regarding the iOS Outlook app and mobile storage management:
1. Online Archive on iOS:
   - In the iOS Outlook app, tap your profile circle in the top-left corner. Under your student account folders, you will find the "Online Archive" folder accessible on-demand with active internet connectivity.
2. Managing Local Storage on iPhone:
   - The Outlook mobile app is designed to be lightweight and only downloads recent message headers by default.
   - To ensure it doesn't cache unnecessary attachment data:
     - Open Outlook App > Settings (gear icon) > Preferences.
     - Under "Email", tap "Organize by Thread" -> Turn ON.
     - Under "Storage", tap "Clear Cache" if you ever need to reclaim phone storage space.
     - Verify that "Download Attachments Automatically" is set to "Off" (or Wi-Fi only).
This setup guarantees your iPhone keeps minimal local cache while giving you instant access to your entire academic archive.
You are now fully configured with best-in-class email architecture!

Best regards,
Alex Rivera
Senior Campus IT Systems Engineer`,
  },

  // --- TURN 19 (Customer / Olivia Chen) ---
  {
    senderType: 'STUDENT',
    senderName: 'Olivia Chen',
    senderEmail: 'olivia.chen@student.edu',
    content: `Hi Alex,

I just checked the settings on my iPhone's Outlook app, verified the Online Archive folder is visible, and confirmed automated attachment downloading is turned off.
Everything is working seamlessly across all three of my devices (Windows 11 desktop, MacBook Air, and iPhone).
My primary mailbox storage is sitting comfortably at 16.4 GB (out of 50.0 GB), my OneDrive has 18 GB of organized research archives, and all my faculty emails and calendar invites are arriving without delay.
I want to express my sincere appreciation for your exceptional support throughout this entire ticket.
You not only fixed the immediate mailbox full quota blocker, but also resolved my OneDrive sync issue, recovered the message trace logs for my conference papers, fixed the corrupted calendar cache, and provisioned the Online Archive to safeguard my future work.
This has been the best IT support experience I have ever had at the university.
I am all set to successfully submit my thesis and deliver my presentation on Tuesday!
You may go ahead and mark this ticket as RESOLVED.

Thank you so much once again!
Warmest regards,
Olivia Chen
Master of Science in Computer Science & Engineering
University Robotics Laboratory`,
  },

  // --- TURN 20 (Support Agent / Alex Rivera) ---
  {
    senderType: 'AGENT',
    senderName: 'Alex Rivera (Tier-2 IT Specialist)',
    senderEmail: 'agent@example.com',
    content: `Hi Olivia,

It has been an absolute pleasure assisting you! Thank you so much for your kind words and for being so proactive and diligent in following every step.
Here is the final summary of resolutions completed under Ticket #110:
============================================================
TICKET RESOLUTION SUMMARY (Ticket #110):
- Issue: Exchange Online Mailbox Quota Exceeded (49.8 GB / 50.0 GB) resulting in NDR 554 5.2.2 bounce-backs.
- Actions Taken:
  1. Assisted student in migrating 18 GB of research datasets (.tar.gz / .mp4) to University OneDrive for Business.
  2. Fixed local OneDrive Desktop Client TLS handshake synchronization error 0x8004de40 via client reset.
  3. Purged unneeded Exchange Dumpster / Single Item Recovery items and executed server-side Managed Folder Assistant crawl.
  4. Performed inbound Exchange Message Trace verifying delivered advising rubrics and notifying student of IEEE status.
  5. Resolved Outlook desktop calendar attachment memory corruption by rebuilding local .ost cache.
  6. Provisioned 50 GB In-Place Online Archive and established automated 90-day server-side attachment archiving rules.
  7. Verified mobile synchronization and storage settings on iOS Outlook client.
- Final Mailbox Storage: 16.4 GB used (33.6 GB free / ~33% utilization).
- Status: Fully resolved, all services operating at peak performance.
============================================================
Best of luck with your final Master's thesis presentation on Tuesday—you are going to do great!
If you ever need any technical assistance in the future, please don't hesitate to reach out to the University IT Helpdesk.

Best regards,
Alex Rivera
Senior Campus IT Systems Engineer
University Helpdesk & Cloud Services`,
  },
];

async function seedTicket110Replies() {
  console.log('🚀 Starting population of Ticket #110 with 20 realistic alternating replies...');

  // 1. Verify line count for each reply to guarantee every reply has at least 10 lines
  console.log('\n🔍 Verifying line counts for all 20 replies:');
  let allMeetCriteria = true;
  replies.forEach((reply, idx) => {
    const lines = reply.content.trim().split('\n');
    const lineCount = lines.length;
    const nonEmptyLineCount = lines.filter((l) => l.trim().length > 0).length;
    console.log(
      `  • Turn ${idx + 1} [${reply.senderType.padEnd(7)}] (${reply.senderName}): ${lineCount} total lines (${nonEmptyLineCount} non-empty lines)`
    );
    if (lineCount < 10) {
      console.error(`❌ Turn ${idx + 1} has only ${lineCount} lines (requirement is >= 10 lines)!`);
      allMeetCriteria = false;
    }
  });

  if (!allMeetCriteria) {
    throw new Error('Some replies do not meet the minimum 10 lines requirement.');
  }

  console.log('✅ All 20 replies strictly meet and exceed the >= 10 lines requirement!\n');

  // 2. Build full conversation body formatted with standard reply delimiters
  const initialInquiry = `Professors are telling me my emails are bouncing back with error 5.2.2 Mailbox Quota Exceeded. I am unable to receive any attachments or course updates.`;

  const conversationThreadBlocks = replies.map((reply) => {
    const headerPrefix = reply.isInternalNote ? 'INTERNAL NOTE' : `Reply from ${reply.senderType}`;
    return `--- [${headerPrefix}] (${reply.senderEmail}) ---\n${reply.content.trim()}`;
  });

  const fullTicketBody = [initialInquiry, ...conversationThreadBlocks].join('\n\n');

  // 3. Upsert Ticket #110
  const agentUser = await prisma.user.findFirst({
    where: { role: 'AGENT' },
  });

  const existingTicket110 = await prisma.ticket.findUnique({
    where: { id: 110 },
  });

  let updatedTicket;
  if (existingTicket110) {
    updatedTicket = await prisma.ticket.update({
      where: { id: 110 },
      data: {
        subject: 'Student email mailbox full - Cannot receive attachments',
        studentName: 'Olivia Chen',
        studentEmail: 'olivia.chen@student.edu',
        body: fullTicketBody,
        category: 'TECHNICAL_QUESTION',
        priority: 'HIGH',
        status: 'RESOLVED',
        summary: `• Initial Issue:
  - Olivia Chen's Exchange mailbox reached 49.8 GB (50 GB limit), causing critical 554 5.2.2 NDR bounce-backs for thesis symposium drafts and faculty communications.
• Conversation & Actions Taken:
  - 20-turn technical support dialogue resolving storage quotas, OneDrive 0x8004de40 sync error, Exchange Dumpster purge via Managed Folder Assistant, message tracing, and .ost calendar corruption.
  - Provisioned 50 GB Online Archive and automated 90-day server-side archiving policies.
• Current Status & Next Steps:
  - Mailbox healthy at 16.4 GB (33.6 GB free). Ticket resolved successfully.`,
        assignedAgentId: agentUser?.id || null,
        updatedAt: new Date(),
      },
      include: {
        assignedAgent: true,
      },
    });
  } else {
    updatedTicket = await prisma.ticket.create({
      data: {
        id: 110,
        subject: 'Student email mailbox full - Cannot receive attachments',
        studentName: 'Olivia Chen',
        studentEmail: 'olivia.chen@student.edu',
        body: fullTicketBody,
        category: 'TECHNICAL_QUESTION',
        priority: 'HIGH',
        status: 'RESOLVED',
        summary: `• Initial Issue:
  - Olivia Chen's Exchange mailbox reached 49.8 GB (50 GB limit), causing critical 554 5.2.2 NDR bounce-backs for thesis symposium drafts and faculty communications.
• Conversation & Actions Taken:
  - 20-turn technical support dialogue resolving storage quotas, OneDrive 0x8004de40 sync error, Exchange Dumpster purge via Managed Folder Assistant, message tracing, and .ost calendar corruption.
  - Provisioned 50 GB Online Archive and automated 90-day server-side archiving policies.
• Current Status & Next Steps:
  - Mailbox healthy at 16.4 GB (33.6 GB free). Ticket resolved successfully.`,
        assignedAgentId: agentUser?.id || null,
        createdAt: new Date(Date.now() - 48 * 3600 * 1000),
        updatedAt: new Date(),
      },
      include: {
        assignedAgent: true,
      },
    });
  }

  console.log('\n============================================================');
  console.log(`✅ SUCCESS! Ticket #${updatedTicket.id} populated with 20 alternating replies.`);
  console.log(`  • Subject: "${updatedTicket.subject}"`);
  console.log(`  • Customer: ${updatedTicket.studentName} (${updatedTicket.studentEmail})`);
  console.log(`  • Assigned Agent: ${updatedTicket.assignedAgent?.name || 'Assigned Agent'}`);
  console.log(`  • Total Conversation Length: ${fullTicketBody.length} characters`);
  console.log(`  • Number of Alternating Turns: ${replies.length} replies`);
  console.log('============================================================\n');
}

seedTicket110Replies()
  .catch((err) => {
    console.error('❌ Error seeding Ticket #110:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
