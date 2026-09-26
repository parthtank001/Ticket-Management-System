import { describe, it, expect } from 'vitest';
import {
  loadKnowledgeBaseContent,
  checkEscalationTriggers,
  evaluateKnowledgeBaseMatch,
} from '../../../server/services/knowledge-base';

describe('Knowledge Base Auto-Resolution Service Unit Tests', () => {
  describe('loadKnowledgeBaseContent', () => {
    it('loads the markdown knowledge base document from disk', () => {
      const content = loadKnowledgeBaseContent();
      expect(content).toBeDefined();
      expect(content.length).toBeGreaterThan(100);
      expect(content).toContain('Account & Login Issues');
      expect(content).toContain('Refund Policy');
      expect(content).toContain('Escalation Rules');
    });
  });

  describe('checkEscalationTriggers (Section 10 Escalation Rules)', () => {
    it('escalates inquiries mentioning lawyers or legal action', () => {
      const res1 = checkEscalationTriggers('I will contact my lawyer if this is not resolved');
      expect(res1.isEscalated).toBe(true);
      expect(res1.reason).toContain('legal action');

      const res2 = checkEscalationTriggers('I am going to sue your company for this glitch');
      expect(res2.isEscalated).toBe(true);
    });

    it('escalates refund requests outside the 30-day guarantee window', () => {
      const res1 = checkEscalationTriggers('I bought this course 2 months ago and want a refund');
      expect(res1.isEscalated).toBe(true);
      expect(res1.reason).toContain('outside the standard 30-day guarantee window');

      const res2 = checkEscalationTriggers('I purchased 60 days ago and need my money back');
      expect(res2.isEscalated).toBe(true);
    });

    it('escalates chargebacks and payment dispute threats', () => {
      const res = checkEscalationTriggers('I am filing a chargeback with my credit card bank');
      expect(res.isEscalated).toBe(true);
      expect(res.reason).toContain('chargeback or payment dispute');
    });

    it('escalates account security concerns and hacked accounts', () => {
      const res1 = checkEscalationTriggers('My account was hacked and someone logged in');
      expect(res1.isEscalated).toBe(true);
      expect(res1.reason).toContain('account security');

      const res2 = checkEscalationTriggers('There is unauthorized access on my student account');
      expect(res2.isEscalated).toBe(true);
    });

    it('does not escalate standard inquiries', () => {
      const res = checkEscalationTriggers('How do I reset my password?');
      expect(res.isEscalated).toBe(false);
    });
  });

  describe('evaluateKnowledgeBaseMatch Auto-Resolution Scenarios', () => {
    it('auto-resolves password reset inquiries (Section 1)', () => {
      const result = evaluateKnowledgeBaseMatch(
        'Forgot my password',
        'I forgot my account password. How can I reset it?',
        'John Smith'
      );

      expect(result.canAutoResolve).toBe(true);
      expect(result.category).toBe('TECHNICAL_QUESTION');
      expect(result.resolutionAnswer).toContain('Hello John,');
      expect(result.resolutionAnswer).toContain('Forgot Password');
      expect(result.resolutionAnswer).toContain('registered email address');
      expect(result.resolutionAnswer).toContain('spam or promotions folder');
    });

    it('auto-resolves missing password reset email inquiries (Section 1)', () => {
      const result = evaluateKnowledgeBaseMatch(
        'Password reset email not receiving',
        'I clicked forgot password but am not receiving the password reset email.',
        'Alice Johnson'
      );

      expect(result.canAutoResolve).toBe(true);
      expect(result.resolutionAnswer).toContain('Hello Alice,');
      expect(result.resolutionAnswer).toContain('registered email address was entered correctly');
      expect(result.resolutionAnswer).toContain('spam, junk, or promotions folder');
    });

    it('auto-resolves missing purchased course inquiries (Section 2)', () => {
      const result = evaluateKnowledgeBaseMatch(
        'Purchased course missing',
        'I purchased a course yesterday but cannot see it on my dashboard.',
        'Samantha Reed'
      );

      expect(result.canAutoResolve).toBe(true);
      expect(result.category).toBe('GENERAL_QUESTION');
      expect(result.resolutionAnswer).toContain('Hello Samantha,');
      expect(result.resolutionAnswer).toContain('logged in with the exact email address');
      expect(result.resolutionAnswer).toContain('Receipt Email');
    });

    it('auto-resolves course transfer inquiries (Section 2)', () => {
      const result = evaluateKnowledgeBaseMatch(
        'Transfer course to another account',
        'Can I transfer my React course to my second account?',
        'David Miller'
      );

      expect(result.canAutoResolve).toBe(true);
      expect(result.resolutionAnswer).toContain('Hello David,');
      expect(result.resolutionAnswer).toContain('Courses are non-transferable');
    });

    it('auto-resolves Lifetime Access inquiries (Section 3)', () => {
      const result = evaluateKnowledgeBaseMatch(
        'What does lifetime access mean?',
        'If I purchase the Python course, what does lifetime access include?',
        'Emma Watson'
      );

      expect(result.canAutoResolve).toBe(true);
      expect(result.resolutionAnswer).toContain('Hello Emma,');
      expect(result.resolutionAnswer).toContain('You pay once for the course');
      expect(result.resolutionAnswer).toContain('Permanent access');
      expect(result.resolutionAnswer).toContain('Free updates');
    });

    it('auto-resolves standard refund policy inquiries within 30 days (Section 4)', () => {
      const result = evaluateKnowledgeBaseMatch(
        'What is your refund policy?',
        'How does your money-back guarantee work and how do I request a refund?',
        'Lucas Vance'
      );

      expect(result.canAutoResolve).toBe(true);
      expect(result.category).toBe('REFUND_REQUEST');
      expect(result.resolutionAnswer).toContain('Hello Lucas,');
      expect(result.resolutionAnswer).toContain('30-Day Money-Back Guarantee');
      expect(result.resolutionAnswer).toContain('80%');
      expect(result.resolutionAnswer).toContain('5–10 business days');
    });

    it('auto-resolves certificate inquiries (Section 5)', () => {
      const result = evaluateKnowledgeBaseMatch(
        'Do you provide course certificates?',
        'Will I get a certificate when I finish the JavaScript course?',
        'Sophia Clark'
      );

      expect(result.canAutoResolve).toBe(true);
      expect(result.resolutionAnswer).toContain('Hello Sophia,');
      expect(result.resolutionAnswer).toContain('Certificate of Completion is automatically issued');
      expect(result.resolutionAnswer).toContain('student dashboard');
    });

    it('auto-resolves video download inquiries (Section 6)', () => {
      const result = evaluateKnowledgeBaseMatch(
        'Can I download videos to watch offline?',
        'I want to download course videos to my laptop for offline viewing.',
        'Marcus Aurelius'
      );

      expect(result.canAutoResolve).toBe(true);
      expect(result.resolutionAnswer).toContain('Hello Marcus,');
      expect(result.resolutionAnswer).toContain('Course videos are streamed online');
      expect(result.resolutionAnswer).toContain('offline video downloads are not supported');
      expect(result.resolutionAnswer).toContain('Source Code');
    });

    it('auto-resolves video playback and streaming quality issues (Section 7)', () => {
      const result = evaluateKnowledgeBaseMatch(
        'Video is not playing',
        'The video player shows a black screen and buffering error in my browser.',
        'Chloe Decker'
      );

      expect(result.canAutoResolve).toBe(true);
      expect(result.category).toBe('TECHNICAL_QUESTION');
      expect(result.resolutionAnswer).toContain('Hello Chloe,');
      expect(result.resolutionAnswer).toContain('Clear your browser cache');
      expect(result.resolutionAnswer).toContain('Chrome or Microsoft Edge');
      expect(result.resolutionAnswer).toContain('disable browser extensions');
    });

    it('auto-resolves coupon code issues (Section 8)', () => {
      const result = evaluateKnowledgeBaseMatch(
        'Coupon code not working',
        'My discount promo code gives an error at checkout.',
        'Elena Gilbert'
      );

      expect(result.canAutoResolve).toBe(true);
      expect(result.resolutionAnswer).toContain('Hello Elena,');
      expect(result.resolutionAnswer).toContain('coupon code may have expired');
      expect(result.resolutionAnswer).toContain('Only one coupon code can be applied');
    });

    it('auto-resolves email change inquiries (Section 9)', () => {
      const result = evaluateKnowledgeBaseMatch(
        'How to change my email address',
        'I need to update the email address on my student profile.',
        'Daniel Jackson'
      );

      expect(result.canAutoResolve).toBe(true);
      expect(result.resolutionAnswer).toContain('Hello Daniel,');
      expect(result.resolutionAnswer).toContain('current registered email');
      expect(result.resolutionAnswer).toContain('new email address');
      expect(result.resolutionAnswer).toContain('order receipt');
    });

    it('strictly escalates legal action inquiries without auto-resolving (Section 10)', () => {
      const result = evaluateKnowledgeBaseMatch(
        'Legal action regarding refund',
        'I will have my lawyer sue you in court if you do not reply immediately.',
        'Victor Von Doom'
      );

      expect(result.canAutoResolve).toBe(false);
      expect(result.autoResolveReason).toContain('legal action');
      expect(result.resolutionAnswer).toBeUndefined();
    });

    it('strictly escalates out-of-window refund requests without auto-resolving (Section 10)', () => {
      const result = evaluateKnowledgeBaseMatch(
        'Refund request for course bought months ago',
        'I bought this course 2 months ago and want a refund now.',
        'Bruce Wayne'
      );

      expect(result.canAutoResolve).toBe(false);
      expect(result.autoResolveReason).toContain('outside the standard 30-day guarantee window');
    });

    it('routes unknown queries to human agents with canAutoResolve = false', () => {
      const result = evaluateKnowledgeBaseMatch(
        'Custom corporate partnership inquiry',
        'Does your company offer bespoke B2B enterprise coaching for 500 engineers?',
        'Tony Stark'
      );

      expect(result.canAutoResolve).toBe(false);
      expect(result.resolutionAnswer).toBeUndefined();
    });

    it('consistently signs off with Code with Mosh Support and addresses customer by first name across all KB topics', () => {
      const testQueries = [
        { subject: 'Forgot password', body: 'How do I reset my password?', name: 'Alice Cooper' },
        { subject: 'Transfer course', body: 'Can I transfer course to another account?', name: 'Bob Vance' },
        { subject: 'Missing course', body: 'I purchased a course but cannot see it on my dashboard', name: 'Charlie Day' },
        { subject: 'Lifetime access', body: 'What does lifetime access mean?', name: 'Diana Prince' },
        { subject: 'Refund policy', body: 'What is your refund policy?', name: 'Evan Wright' },
        { subject: 'Certificates', body: 'Do you provide certificates upon completion?', name: 'Fiona Gallagher' },
        { subject: 'Download videos', body: 'Can I download videos to watch offline?', name: 'George Clark' },
        { subject: 'Video playback', body: 'The video is not playing in my browser', name: 'Hannah Abbott' },
        { subject: 'Coupon code', body: 'My coupon code is not working', name: 'Ian Malcolm' },
        { subject: 'Change email', body: 'How do I change my email address?', name: 'Julia Roberts' },
      ];

      for (const query of testQueries) {
        const res = evaluateKnowledgeBaseMatch(query.subject, query.body, query.name);
        expect(res.canAutoResolve).toBe(true);
        expect(res.resolutionAnswer).toBeDefined();
        const firstName = query.name.split(' ')[0];
        expect(res.resolutionAnswer).toContain(`Hello ${firstName},`);
        expect(res.resolutionAnswer).not.toContain(query.name.split(' ')[1]);
        expect(res.resolutionAnswer).toContain('Best regards,\nCode with Mosh Support');
      }
    });
  });
});
