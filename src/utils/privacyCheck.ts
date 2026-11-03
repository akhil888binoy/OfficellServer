export type PrivacyIssue = 'email' | 'phone' | 'exact_date';

const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const numericDatePattern = /\b(?:0?[1-9]|[12]\d|3[01])[/.\-](?:0?[1-9]|1[0-2])[/.\-](?:19|20)?\d{2}\b/;
const monthDatePattern = /\b(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?\b/i;
const phoneCandidatePattern = /(?<!\w)(?:\+?\d[\s().-]*){10,15}(?!\w)/g;

export const findBlockingPrivacyIssues = (content: string): PrivacyIssue[] => {
    const issues: PrivacyIssue[] = [];
    if (emailPattern.test(content)) issues.push('email');
    if ([...content.matchAll(phoneCandidatePattern)].some(match => {
        const digits = match[0].replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
    })) issues.push('phone');
    if (numericDatePattern.test(content) || monthDatePattern.test(content)) issues.push('exact_date');
    return issues;
};
