import { describe, expect, it } from 'vitest';
import type { OutboundPayload } from '@/lib/schemas/message';
import { adaptToCapabilities, matchNumberedChoice, type ChannelCapabilities } from './types';

const WHATSAPP: ChannelCapabilities = {
  buttons: true,
  maxButtons: 3,
  lists: true,
  media: true,
  location: true,
  templates: true,
  serviceWindow: true,
};

const MESSENGER: ChannelCapabilities = { ...WHATSAPP, lists: false, maxButtons: 3 };
const PLAIN_TEXT: ChannelCapabilities = { ...WHATSAPP, buttons: false, lists: false, maxButtons: 0 };

const buttons: OutboundPayload = {
  type: 'buttons',
  text: 'Delivery or pickup?',
  buttons: [
    { id: 'delivery', title: 'Delivery' },
    { id: 'pickup', title: 'Pickup' },
  ],
};

const list: OutboundPayload = {
  type: 'list',
  text: 'Pick a dish',
  buttonLabel: 'Menu',
  sections: [
    {
      title: 'Mains',
      rows: [
        { id: 'biryani', title: 'Beef Biryani' },
        { id: 'karahi', title: 'Chicken Karahi' },
      ],
    },
  ],
};

describe('adaptToCapabilities', () => {
  it('passes buttons through on a channel that supports them', () => {
    expect(adaptToCapabilities(buttons, WHATSAPP)).toEqual(buttons);
  });

  it('collapses buttons to a numbered prompt when unsupported', () => {
    const result = adaptToCapabilities(buttons, PLAIN_TEXT);
    expect(result.type).toBe('text');
    expect(result).toMatchObject({
      text: expect.stringContaining('1. Delivery'),
    });
  });

  it('collapses buttons that exceed the channel limit', () => {
    const many: OutboundPayload = {
      type: 'buttons',
      text: 'Pick one',
      buttons: [
        { id: 'a', title: 'A' },
        { id: 'b', title: 'B' },
        { id: 'c', title: 'C' },
      ],
    };
    expect(adaptToCapabilities(many, { ...WHATSAPP, maxButtons: 2 }).type).toBe('text');
  });

  it('downgrades a short list to buttons where lists are unsupported', () => {
    const result = adaptToCapabilities(list, MESSENGER);
    expect(result.type).toBe('buttons');
    expect(result).toMatchObject({
      buttons: [
        { id: 'biryani', title: 'Beef Biryani' },
        { id: 'karahi', title: 'Chicken Karahi' },
      ],
    });
  });

  it('falls back to a numbered prompt when a list is too long for buttons', () => {
    const long: OutboundPayload = {
      type: 'list',
      text: 'Pick a dish',
      buttonLabel: 'Menu',
      sections: [
        {
          rows: [
            { id: 'a', title: 'A' },
            { id: 'b', title: 'B' },
            { id: 'c', title: 'C' },
            { id: 'd', title: 'D' },
          ],
        },
      ],
    };
    expect(adaptToCapabilities(long, MESSENGER).type).toBe('text');
  });

  it('leaves plain text alone', () => {
    const text: OutboundPayload = { type: 'text', text: 'Hello' };
    expect(adaptToCapabilities(text, PLAIN_TEXT)).toEqual(text);
  });
});

describe('matchNumberedChoice', () => {
  const options = [
    { id: 'delivery', title: 'Delivery' },
    { id: 'pickup', title: 'Pickup' },
  ];

  it('resolves a positional number', () => {
    expect(matchNumberedChoice('2', options)).toBe('pickup');
  });

  it('resolves the option title, case-insensitively', () => {
    expect(matchNumberedChoice('  DELIVERY ', options)).toBe('delivery');
  });

  it('resolves the option id', () => {
    expect(matchNumberedChoice('pickup', options)).toBe('pickup');
  });

  it('rejects a number outside the range', () => {
    expect(matchNumberedChoice('5', options)).toBeNull();
  });

  it('rejects unrelated text', () => {
    expect(matchNumberedChoice('what time do you close', options)).toBeNull();
  });
});
