import { describe, it, expect } from 'vitest';
import { formatEmailBodyToHtml, extractCleanSenderName } from '@/lib/email/sender';

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
