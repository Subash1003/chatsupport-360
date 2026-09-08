// Label a chat query as one of five classes. This is ROUTING, not authorization:
// the class only influences which context we retrieve. Whether a caller may see
// private data is decided entirely by the identity-scoped Qdrant filter in
// retrieval.service.js.
//
// Rules first (fast, deterministic, no token spend). If nothing matches and the
// LLM fallback is enabled, ask the model once; any failure → UNKNOWN.

import env from '../config/env.js';
import logger from '../config/logger.js';
import { neutralizeDelimiters } from '../utils/sanitize.js';
import { generateChatReply } from './llm.service.js';

export const CLASSES = [
  'CUSTOMER_SPECIFIC',
  'GENERAL_INFORMATION',
  'OFFER_OR_PROMOTION',
  'PRODUCT_OR_SERVICE',
  'UNKNOWN',
];

// Ordered — first match wins.
const RULES = [
  [
    'CUSTOMER_SPECIFIC',
    /\b(my|our|mine)\b[\s\S]{0,40}\b(project|projects|task|tasks|ticket|tickets|subscription|subscriptions|invoice|invoices|payment|payments|account|accounts|order|orders|deadline|delivery|deliverable|renewal|renew|detail|details|profile|plan|plans|hosting)\b/i,
  ],
  ['CUSTOMER_SPECIFIC', /\b(status|progress|update|eta)\b[\s\S]{0,25}\b(my|our)\b/i],
  [
    'CUSTOMER_SPECIFIC',
    /\bmy (account|details|detail|profile|name|email|info|information)\b|\bwhat(?:'s| is) my name\b|\bwho am i\b|\bour (project|team|account)\b|\bam i (subscribed|paying|due)\b|\bdo i have (any|an|open)\b|\bwhen (will|is) (it|my|our)\b|\bshow (me )?my\b/i,
  ],
  [
    // "offer" counts only as a NOUN — "do you offer X" is a service question, so
    // a bare /offer/ must not match here.
    'OFFER_OR_PROMOTION',
    /\b(discount|discounts|promo|promotion|promotions|deal|deals|coupon|coupons|voucher|rebate)\b|\b(any|current|latest|new|special|festive|seasonal|launch|introductory|ongoing|active|available|running)\s+offers?\b|\boffers?\s+(available|running|going on|right now|this month|for)\b|\bon offer\b|\b(%|percent)\s*off\b|\bsale\b/i,
  ],
  [
    'PRODUCT_OR_SERVICE',
    /\b(service|services|pricing|price|prices|cost|costs|how much|quote|rate card|package|packages|technolog(y|ies)|tech stack|framework|frameworks|do you (build|develop|offer|make|do|design|host)|can you build|staff aug\w*|retainer|engagement model|hire (a|your) team|website|web ?site|web design|redesign|e-?commerce|online store|woo ?commerce|wordpress|joomla|cms|hosting|host my|domain|seo|digital marketing|social media|mobile app|android|ios|logo|branding|graphic design)\b/i,
  ],
  [
    'GENERAL_INFORMATION',
    /\b(who are you|about (the )?company|where are (you|they)|located|location|head ?office|contact|reach you|business hours|working hours|process|how do you work|methodology|warranty|refund|cancellation|nda|intellectual property|\bip\b|payment terms|data protection|privacy|polic(y|ies)|\bsla\b|support hours|response time|get started|onboarding)\b/i,
  ],
];

function classifyByRules(message) {
  for (const [cls, pattern] of RULES) {
    if (pattern.test(message)) return cls;
  }
  return null;
}

const LLM_SYSTEM = `You classify a customer's chat message for a website design, web development and digital marketing company. Reply with EXACTLY one of these labels and nothing else:
CUSTOMER_SPECIFIC - about the sender's own account, projects, tasks, tickets, subscriptions, invoices, or their status/deadlines.
OFFER_OR_PROMOTION - about discounts, offers, promotions, deals, coupons.
PRODUCT_OR_SERVICE - about services offered, pricing in general, technologies, how to engage or hire.
GENERAL_INFORMATION - about the company itself, policies, process, contact, hours, warranty, legal.
UNKNOWN - none of the above, or unclear.`;

async function classifyByLlm(message) {
  try {
    const { reply } = await generateChatReply([
      { role: 'system', content: LLM_SYSTEM },
      { role: 'user', content: `<user_message>\n${neutralizeDelimiters(message)}\n</user_message>` },
    ]);
    const label = String(reply).toUpperCase().match(/[A-Z_]+/)?.[0];
    return CLASSES.includes(label) ? label : 'UNKNOWN';
  } catch (err) {
    logger.warn(
      { module: 'classifier', reason: err.code || err.message },
      '[classifier] llm fallback failed'
    );
    return 'UNKNOWN';
  }
}

export async function classifyQuery(message) {
  const text = String(message || '').trim();
  if (!text) return { class: 'UNKNOWN', method: 'default' };

  const ruled = classifyByRules(text);
  if (ruled) return { class: ruled, method: 'rule' };

  if (env.CLASSIFIER_LLM_FALLBACK && env.LLM_API_KEY) {
    return { class: await classifyByLlm(text), method: 'llm' };
  }

  return { class: 'UNKNOWN', method: 'default' };
}
