import { describe, expect, it } from 'vitest';
import { repositoryUrlForUpload } from '../src/privacy/url.js';

describe('repository URL sanitizer', () => {
  it.each([
    ['NAT64 loopback', 'http://[64:ff9b::7f00:1]/repo.git'],
    ['6to4 loopback', 'https://[2002:7f00:1::]/repo.git'],
    ['Teredo embedded private host', 'https://[2001:0000:7f00:0001:0000:0000:0000:0001]/repo.git']
  ])('omits backend-private HTTP repository remotes: %s', (_label, remote) => {
    // Given: a Git remote URL that is syntactically HTTP(S) but resolves to a backend-private host class.
    // When: the CLI prepares a public-safe repository URL for upload.
    const sanitized = repositoryUrlForUpload(remote);

    // Then: the URL is omitted before ingest instead of relying on a late backend rejection.
    expect(sanitized).toBeNull();
  });

  it('keeps public HTTP repository URLs while removing credentials', () => {
    // Given: a public HTTP(S) repository URL that includes user info.
    const remote = 'https://token:secret@gitlab.example/group/repo.git';

    // When: the CLI prepares the URL for a public-safe draft.
    const sanitized = repositoryUrlForUpload(remote);

    // Then: the host/path survive but credentials do not.
    expect(sanitized).toBe('https://gitlab.example/group/repo.git');
  });
});
