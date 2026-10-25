import { describe, it, expect } from 'vitest';
import {
  formatEmailBodyToHtml,
  extractCleanSenderName,
  parseSpintax,
  resolveGenericFallback,
} from '@/lib/email/sender';

describe('Generic Fallback Resolver for Missing Names & Companies', () => {
  it('falls back to "there" when name is missing or unclear', () => {
    const template = 'Hi {{name}}, wanted to connect.';
    expect(resolveGenericFallback(template, { email: 'test@example.com', name: null })).toBe(
      'Hi there, wanted to connect.'
    );
    expect(resolveGenericFallback(template, { email: 'test@example.com', name: '—' })).toBe(
      'Hi there, wanted to connect.'
    );
    expect(resolveGenericFallback(template, { email: 'test@example.com', name: 'unknown' })).toBe(
      'Hi there, wanted to connect.'
    );
  });

  it('falls back to "your team" when company is missing or public webmail', () => {
    const template = 'Saw what {{company}} is building.';
    expect(resolveGenericFallback(template, { email: 'test@gmail.com', company: null })).toBe(
      'Saw what your team is building.'
    );
    expect(resolveGenericFallback(template, { email: 'test@gmail.com', company: 'gmail' })).toBe(
      'Saw what your team is building.'
    );
    expect(resolveGenericFallback(template, { email: 'test@example.com', company: '—' })).toBe(
      'Saw what your team is building.'
    );
  });

  it('uses specific names and companies when they are clear', () => {
    const template = 'Hi {{name}}, saw what {{company}} is building.';
    expect(
      resolveGenericFallback(template, {
        email: 'alex@stripe.com',
        name: 'Alex Turner',
        company: 'Stripe',
      })
    ).toBe('Hi Alex Turner, saw what Stripe is building.');
  });
});

describe('Spintax Anti-Spam Variation Resolver', () => {
  it('resolves simple spintax options randomly', () => {
    const raw = '{Hi|Hello|Hey} there!';
    const result = parseSpintax(raw);
    expect(['Hi there!', 'Hello there!', 'Hey there!']).toContain(result);
  });

  it('supports multiple spintax blocks in a single text', () => {
    const raw = '{Hi|Hey} {John|Alex}, {welcome|glad to meet you}!';
    const result = parseSpintax(raw);
    expect(result).toMatch(/^(Hi|Hey) (John|Alex), (welcome|glad to meet you)!$/);
  });

  it('supports nested spintax variations', () => {
    const raw = '{Hi {there|friend}|Hello}!';
    const result = parseSpintax(raw);
    expect(['Hi there!', 'Hi friend!', 'Hello!']).toContain(result);
  });

  it('does not corrupt merge variables or non-spintax braces without pipe', () => {
    const raw = '{Hi|Hello} {{name}}, your balance is {amount}.';
    const result = parseSpintax(raw);
    expect(result).toMatch(/^(Hi|Hello) {{name}}, your balance is {amount}\.$/);
  });
});

describe('Sender Display Name Extractor', () => {
  it('strips parenthesized email address from channel name', () => {
    expect(extractCleanSenderName('Mohammad Zaid (mohd98zaid@gmail.com)', 'mohd98zaid@gmail.com')).toBe('Mohammad Zaid');
    expect(extractCleanSenderName('Zaid (mohd.zaid.cs@gmail.com)', 'mohd.zaid.cs@gmail.com')).toBe('Zaid');
  });

  it('keeps clean sender name as is', () => {
    expect(extractCleanSenderName('Mohammad Zaid', 'mohd98zaid@gmail.com')).toBe('Mohammad Zaid');
  });

  it('falls back to username if channel name is just the email address', () => {
    expect(extractCleanSenderName('mohd98zaid@gmail.com', 'mohd98zaid@gmail.com')).toBe('mohd98zaid');
  });
});

describe('Email Body HTML & Hyperlink Formatter', () => {
  it('converts markdown links [Text](URL) into clickable HTML anchor tags', () => {
    const raw = 'Connect with me: [LinkedIn](https://linkedin.com/in/mohd98zaid) | [GitHub](https://github.com/mohd98zaid)';
    const html = formatEmailBodyToHtml(raw);

    expect(html).toContain('<a href="https://linkedin.com/in/mohd98zaid"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('>LinkedIn</a>');
    expect(html).toContain('<a href="https://github.com/mohd98zaid"');
    expect(html).toContain('>GitHub</a>');
  });

  it('automatically converts raw standalone URLs into clickable links', () => {
    const raw = 'Check my portfolio at https://zaid.dev for recent projects.';
    const html = formatEmailBodyToHtml(raw);

    expect(html).toContain('<a href="https://zaid.dev"');
    expect(html).toContain('>https://zaid.dev</a>');
  });

  it('converts newlines into clean paragraph formatting', () => {
    const raw = 'Paragraph 1\n\nParagraph 2 line 1\nParagraph 2 line 2';
    const html = formatEmailBodyToHtml(raw);

    expect(html).toContain('<p style=');
    expect(html).toContain('Paragraph 1</p>');
    expect(html).toContain('Paragraph 2 line 1<br />Paragraph 2 line 2</p>');
  });
});
