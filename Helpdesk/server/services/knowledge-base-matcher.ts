import { Category, Priority } from '@helpdesk/core';
import { extractFirstName } from './ai';
import { checkEscalationTriggers } from './escalation-policy';

export interface KnowledgeBaseEvaluationResult {
  canAutoResolve: boolean;
  autoResolveReason?: string;
  resolutionAnswer?: string;
  category: Category;
  priority: Priority;
  summary: string;
}

/**
 * Heuristically evaluates an incoming inquiry against the knowledge base sections and escalation rules.
 * Used for deterministic evaluation, offline modes, tests, and heuristic fallback.
 */
export function evaluateKnowledgeBaseMatch(
  subject: string,
  body: string,
  studentName?: string
): KnowledgeBaseEvaluationResult {
  const content = `${subject} ${body}`.toLowerCase();
  const firstName = extractFirstName(studentName);

  // Check Escalation Triggers first
  const escalation = checkEscalationTriggers(content);
  if (escalation.isEscalated) {
    let category: Category = 'GENERAL_QUESTION';
    if (content.includes('refund') || content.includes('charge') || content.includes('billing')) {
      category = 'REFUND_REQUEST';
    } else if (content.includes('hacked') || content.includes('security') || content.includes('access')) {
      category = 'TECHNICAL_QUESTION';
    }

    return {
      canAutoResolve: false,
      autoResolveReason: escalation.reason,
      category,
      priority: 'HIGH',
      summary: `- Issue escalated for human review: ${escalation.reason}\n- Inquiry regarding "${subject.trim()}"`,
    };
  }

  // 1. Password Reset & Account Login (Section 1)
  if (
    (content.includes('forgot') && content.includes('password')) ||
    (content.includes('reset') && content.includes('password')) ||
    content.includes('password reset email') ||
    content.includes('how to reset password') ||
    content.includes('not receiving the password reset')
  ) {
    const isMissingEmail = content.includes('not receiving') || content.includes('did not receive') || content.includes('no email');
    let answerText = '';

    if (isMissingEmail) {
      answerText = `Hello ${firstName},

Thank you for reaching out to Code with Mosh Support.

If you are not receiving the password reset email, please check the following:
1. Ensure your registered email address was entered correctly.
2. Confirm whether your account was created using a different email address.
3. Check your spam, junk, or promotions folder.

If the email does not arrive within 10 minutes, please reply directly to this message and our support team will be happy to assist you further.

Best regards,
Code with Mosh Support`;
    } else {
      answerText = `Hello ${firstName},

Thank you for reaching out to Code with Mosh Support.

To reset your password, please follow these steps:
1. Navigate to the login page.
2. Click **Forgot Password**.
3. Enter your registered email address.
4. Follow the instructions sent in the password reset email.

If you do not see the email right away, please make sure to check your spam or promotions folder.

Best regards,
Code with Mosh Support`;
    }

    return {
      canAutoResolve: true,
      autoResolveReason: 'Resolved using Knowledge Base Section 1 (Account & Login Issues)',
      resolutionAnswer: answerText,
      category: 'TECHNICAL_QUESTION',
      priority: 'MEDIUM',
      summary: `- Student requested assistance with password reset\n- Automated resolution provided from Knowledge Base (Section 1)`,
    };
  }

  // 2. Course Transfer (Section 2)
  if (
    (content.includes('transfer') && (content.includes('course') || content.includes('account'))) ||
    content.includes('move course to another account')
  ) {
    const answerText = `Hello ${firstName},

Thank you for contacting Code with Mosh Support.

Regarding course transfers:
Courses are non-transferable and strictly tied to the original purchasing account.

If you made a purchase under an incorrect email address and wish to update the email associated with your account, please reply with your current email, new email, and receipt confirmation, and we will gladly help you.

Best regards,
Code with Mosh Support`;

    return {
      canAutoResolve: true,
      autoResolveReason: 'Resolved using Knowledge Base Section 2 (Course Access & Purchases - Transfer Policy)',
      resolutionAnswer: answerText,
      category: 'GENERAL_QUESTION',
      priority: 'LOW',
      summary: `- Student inquired about course transfer policy\n- Automated resolution provided from Knowledge Base (Section 2: Non-transferable)`,
    };
  }

  // 3. Missing Purchased Course (Section 2)
  if (
    (content.includes('purchased') || content.includes('bought')) &&
    (content.includes('cannot see') || content.includes('not showing') || content.includes('missing') || content.includes('where is my course'))
  ) {
    const answerText = `Hello ${firstName},

Thank you for reaching out to Code with Mosh Support.

If you recently purchased a course but cannot see it on your dashboard, please check the following:
1. **Email Account**: Ensure you are logged in with the exact email address used during purchase.
2. **Payment Processing**: Some payment methods take a few moments to process and confirm.
3. **Receipt Email**: Check your inbox for your order confirmation receipt.

If you have confirmed your receipt and are logged into the correct email but still do not see your course, please reply to this thread with your order receipt so we can verify your account.

Best regards,
Code with Mosh Support`;

    return {
      canAutoResolve: true,
      autoResolveReason: 'Resolved using Knowledge Base Section 2 (Course Access & Purchases)',
      resolutionAnswer: answerText,
      category: 'GENERAL_QUESTION',
      priority: 'MEDIUM',
      summary: `- Student inquired about course visibility post-purchase\n- Automated resolution provided from Knowledge Base (Section 2)`,
    };
  }

  // 4. Lifetime Access (Section 3)
  if (
    content.includes('lifetime access') ||
    content.includes('how long do i have access') ||
    content.includes('do courses expire')
  ) {
    const answerText = `Hello ${firstName},

Thank you for contacting Code with Mosh Support.

**Lifetime Access** on Code with Mosh includes:
- **One-time payment**: You pay once for the course.
- **Permanent access**: You keep access to the course materials indefinitely.
- **Free updates**: You receive all future updates released for that course.

Please note that lifetime access applies specifically to the individual course you purchased.

Best regards,
Code with Mosh Support`;

    return {
      canAutoResolve: true,
      autoResolveReason: 'Resolved using Knowledge Base Section 3 (Lifetime Access Policy)',
      resolutionAnswer: answerText,
      category: 'GENERAL_QUESTION',
      priority: 'LOW',
      summary: `- Student inquired regarding Lifetime Access terms\n- Automated resolution provided from Knowledge Base (Section 3)`,
    };
  }

  // 5. Refund Policy (<30 days / general inquiry) (Section 4)
  if (
    content.includes('refund policy') ||
    content.includes('money-back guarantee') ||
    content.includes('money back guarantee') ||
    content.includes('how do i request a refund') ||
    (content.includes('refund') && (content.includes('policy') || content.includes('terms') || content.includes('how to')))
  ) {
    const answerText = `Hello ${firstName},

Thank you for reaching out to Code with Mosh Support.

Here is our official **Refund Policy**:
- **30-Day Money-Back Guarantee**: Full refund if requested within 30 days of purchase.
- **Course Progress**: A partial refund is available if less than 80% of the course has been completed. No refunds are granted if 80% or more has been completed.
- **Turnaround**: Refunds are processed within 5–10 business days back to your original payment method.

**How to Request a Refund:**
1. Reply to this inquiry within 30 days of purchase.
2. Provide your order receipt or transaction ID.
3. Include the reason for your request.

Best regards,
Code with Mosh Support`;

    return {
      canAutoResolve: true,
      autoResolveReason: 'Resolved using Knowledge Base Section 4 (Refund Policy)',
      resolutionAnswer: answerText,
      category: 'REFUND_REQUEST',
      priority: 'MEDIUM',
      summary: `- Student inquired about refund policy and procedures\n- Automated resolution provided from Knowledge Base (Section 4)`,
    };
  }

  // 6. Certificates (Section 5)
  if (
    content.includes('certificate') ||
    content.includes('certifications') ||
    content.includes('get certificate') ||
    content.includes('accredited')
  ) {
    const answerText = `Hello ${firstName},

Thank you for contacting Code with Mosh Support.

Regarding course certificates:
- **Completion Certificate**: A Certificate of Completion is automatically issued once you complete 100% of a course.
- **Dashboard Access**: You can view and download your certificates anytime directly inside your student dashboard.
- Please note that these certificates recognize course completion and are not accredited university degrees.

Best regards,
Code with Mosh Support`;

    return {
      canAutoResolve: true,
      autoResolveReason: 'Resolved using Knowledge Base Section 5 (Certificates Policy)',
      resolutionAnswer: answerText,
      category: 'GENERAL_QUESTION',
      priority: 'LOW',
      summary: `- Student inquired regarding completion certificates\n- Automated resolution provided from Knowledge Base (Section 5)`,
    };
  }

  // 7. Video Download Policy (Section 6)
  if (
    (content.includes('download') && (content.includes('video') || content.includes('lecture') || content.includes('offline'))) ||
    content.includes('downloading content') ||
    content.includes('watch offline')
  ) {
    const answerText = `Hello ${firstName},

Thank you for reaching out to Code with Mosh Support.

Regarding downloading course materials:
- **Videos**: Course videos are streamed online through the platform; offline video downloads are not supported.
- **Source Code**: All accompanying source code, project files, and exercises are fully downloadable from the course dashboard.

Best regards,
Code with Mosh Support`;

    return {
      canAutoResolve: true,
      autoResolveReason: 'Resolved using Knowledge Base Section 6 (Downloading Content Policy)',
      resolutionAnswer: answerText,
      category: 'GENERAL_QUESTION',
      priority: 'LOW',
      summary: `- Student inquired regarding video downloading and offline access\n- Automated resolution provided from Knowledge Base (Section 6)`,
    };
  }

  // 8. Video Playback & Technical Troubleshooting (Section 7)
  if (
    (content.includes('video') && (content.includes('not playing') || content.includes('black screen') || content.includes('buffering') || content.includes('wont play') || content.includes('playback error'))) ||
    (content.includes('video') && (content.includes('quality') || content.includes('blurry') || content.includes('low quality')))
  ) {
    const answerText = `Hello ${firstName},

Thank you for reaching out to Code with Mosh Support.

For video playback or streaming quality issues, please try the following troubleshooting steps:
1. **Browser Cache**: Clear your browser cache and cookies, then restart your browser.
2. **Supported Browsers**: Ensure you are using the latest version of Google Chrome or Microsoft Edge.
3. **Extensions**: Temporarily disable browser extensions (such as ad blockers or script blockers) that might block video streams.
4. **Internet Connection**: Video streaming quality automatically adjusts based on your internet bandwidth. Ensure you have a stable, uninterrupted connection.

If you continue to experience playback issues after trying these steps, please reply with details on which course and lecture you are watching.

Best regards,
Code with Mosh Support`;

    return {
      canAutoResolve: true,
      autoResolveReason: 'Resolved using Knowledge Base Section 7 (Technical Issues - Video Troubleshooting)',
      resolutionAnswer: answerText,
      category: 'TECHNICAL_QUESTION',
      priority: 'MEDIUM',
      summary: `- Student reported video playback or quality issue\n- Automated resolution provided from Knowledge Base (Section 7: Video Troubleshooting)`,
    };
  }

  // 9. Coupon Codes (Section 8)
  if (
    content.includes('coupon') ||
    content.includes('promo code') ||
    content.includes('discount code')
  ) {
    const answerText = `Hello ${firstName},

Thank you for contacting Code with Mosh Support.

If your coupon or discount code is not applying, please note the following common reasons:
- **Expiration**: The coupon code may have expired.
- **Usage Limit**: The coupon may have already been used on a previous order.
- **Eligibility**: Some coupons apply only to specific courses or bundles.
- **One per Order**: Only one coupon code can be applied per purchase.

If you believe your coupon should be valid, please reply with the coupon code name and the course you are trying to purchase.

Best regards,
Code with Mosh Support`;

    return {
      canAutoResolve: true,
      autoResolveReason: 'Resolved using Knowledge Base Section 8 (Coupon Codes Policy)',
      resolutionAnswer: answerText,
      category: 'GENERAL_QUESTION',
      priority: 'LOW',
      summary: `- Student inquired regarding coupon code troubleshooting\n- Automated resolution provided from Knowledge Base (Section 8)`,
    };
  }

  // 10. Account Email Changes (Section 9)
  if (
    (content.includes('change') || content.includes('update')) &&
    (content.includes('email') || content.includes('email address'))
  ) {
    const answerText = `Hello ${firstName},

Thank you for reaching out to Code with Mosh Support.

To update the email address on your account, please reply directly to this ticket with:
1. Your current registered email address.
2. Your desired new email address.
3. A copy of an order receipt or transaction proof (if requested for security verification).

Our support team will process your email change promptly.

Best regards,
Code with Mosh Support`;

    return {
      canAutoResolve: true,
      autoResolveReason: 'Resolved using Knowledge Base Section 9 (Account Changes - Email Update)',
      resolutionAnswer: answerText,
      category: 'GENERAL_QUESTION',
      priority: 'MEDIUM',
      summary: `- Student requested guidance for changing account email address\n- Automated resolution provided from Knowledge Base (Section 9)`,
    };
  }

  // Default: Not matching a known KB auto-resolution section -> Keep OPEN for human staff
  let category: Category = 'GENERAL_QUESTION';
  let priority: Priority = 'MEDIUM';

  if (content.includes('refund') || content.includes('charge') || content.includes('billing')) {
    category = 'REFUND_REQUEST';
    priority = 'HIGH';
  } else if (content.includes('error') || content.includes('bug') || content.includes('403') || content.includes('404') || content.includes('500')) {
    category = 'TECHNICAL_QUESTION';
    priority = 'HIGH';
  }

  return {
    canAutoResolve: false,
    autoResolveReason: 'Query not covered by automated Knowledge Base policies or requires human review',
    category,
    priority,
    summary: `- Inquiry received regarding "${subject.trim()}"\n- Routed to human support agent queue`,
  };
}
