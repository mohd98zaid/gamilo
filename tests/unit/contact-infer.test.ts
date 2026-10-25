import { describe, it, expect } from 'vitest';
import { inferContactDetails } from '@/lib/email/contact-infer';

describe('Automatic Contact Name & Company Detection', () => {
  it('infers human name and company from standard corporate email', () => {
    const result = inferContactDetails('alex.turner@stripe.com');
    expect(result.name).toBe('Alex Turner');
    expect(result.company).toBe('Stripe');
  });

  it('infers name from username with underscore or dash', () => {
    const result1 = inferContactDetails('sarah_lee@airbnb.com');
    expect(result1.name).toBe('Sarah Lee');
    expect(result1.company).toBe('Airbnb');

    const result2 = inferContactDetails('elon-musk@tesla.com');
    expect(result2.name).toBe('Elon Musk');
    expect(result2.company).toBe('Tesla');
  });

  it('infers name from single token or number-embedded username and ignores generic public email domain', () => {
    const result = inferContactDetails('mohd98zaid@gmail.com');
    expect(result.name).toBe('Mohd Zaid');
    expect(result.company).toBeUndefined(); // Gmail is generic, so company should not be "Gmail"
  });

  it('detects role-based and department emails gracefully', () => {
    const hiring = inferContactDetails('hiring@figma.com');
    expect(hiring.name).toBe('Hiring Team');
    expect(hiring.company).toBe('Figma');

    const support = inferContactDetails('support@netflix.com');
    expect(support.name).toBe('Support Team');
    expect(support.company).toBe('Netflix');

    const contact = inferContactDetails('contact@anthropic.ai');
    expect(contact.name).toBe('Team');
    expect(contact.company).toBe('Anthropic');
  });

  it('preserves explicitly supplied name and company when present', () => {
    const result = inferContactDetails('user@unknown.com', 'Custom Name', 'Custom Org');
    expect(result.name).toBe('Custom Name');
    expect(result.company).toBe('Custom Org');
  });

  it('handles country-code and secondary domains like .co.uk', () => {
    const result = inferContactDetails('john.smith@bbc.co.uk');
    expect(result.name).toBe('John Smith');
    expect(result.company).toBe('BBC');
  });
});
