import { describe, expect, it } from 'vitest';
import { parseRequiredRedactedDraftFields } from '../src/draft/redacted-draft-fields.js';

describe('redacted draft field parser', () => {
  it('rejects missing required redacted public fields with an explicit error', () => {
    // Given: a redacted public field payload missing required draft construction fields.
    const redacted = {
      title: 'Draft title',
      summary: 'Draft summary',
      user_note: null,
      outcome: ['Created draft'],
      timeline: [{ order: 1, title: 'Created' }],
      changed_areas: ['Application code'],
      tags: []
    };

    // When / Then: draft construction fails at the boundary instead of trusting undefined fields.
    expect(() => parseRequiredRedactedDraftFields(redacted)).toThrow(
      'Redacted public draft fields missing project.'
    );
  });
});
