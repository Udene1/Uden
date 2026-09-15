# Uden desktop versioning and update strategy

## Versioning

Uden desktop uses Semantic Versioning: `MAJOR.MINOR.PATCH`.

- `MAJOR`: breaking changes to the desktop/runtime contract or supported upgrade path.
- `MINOR`: backwards-compatible product capabilities.
- `PATCH`: backwards-compatible fixes, security fixes, and packaging/runtime corrections.
- Pre-release builds use SemVer prerelease identifiers, for example `0.2.0-beta.1`.

The application version, Git tag, release metadata, and native artifacts must describe the same release. CI must reject a release when these disagree.

## Release identity

Every public desktop release is immutable and is identified by a tag such as `v0.2.0` plus the commit SHA that produced it. Release assets are never replaced in-place.

The release pipeline should:

1. validate the version;
2. build every supported platform/architecture;
3. verify the artifacts and their architecture;
4. generate checksums and updater signatures;
5. create a draft GitHub release with all assets;
6. publish only after all required verification succeeds;
7. publish/update the Uden download manifest from that exact release.

GitHub immutable releases are preferred so published tags and assets cannot later be modified.

## Release channels

Uden has three desktop channels:

- `stable`: normal production users;
- `beta`: opt-in early users and internal validation;
- `nightly`: development builds, not promised stable.

A release can promote from beta to stable without rebuilding the binary. The exact tested artifact should be promoted.

## Update mechanism

Native Uden uses the Tauri updater for in-app updates. The updater endpoint is architecture-aware and receives the current version, OS target, and architecture. The server returns no update when the installed version is current, or a signed update manifest when a newer compatible build exists.

Update artifacts are cryptographically signed. The client must verify the signature before installation. HTTPS is mandatory for production update endpoints.

The update manifest contains:

- version;
- release channel;
- release notes;
- publication date;
- artifact URL;
- cryptographic signature;
- minimum supported version, when required;
- optional rollout information.

## Rollouts

Do not send a new release to 100% of users immediately by default.

Stable releases should support staged rollout percentages, for example:

`5% -> 25% -> 50% -> 100%`

The rollout decision is deterministic per installation so a user does not randomly move between cohorts. The updater service can increase or pause the rollout without rebuilding the binary.

For a severe regression or security incident, the release can be paused immediately. A known-good previous version remains available for rollback. Rollback must be an explicit signed release; the updater must not install arbitrary unsigned binaries.

## Compatibility and forced updates

Normal product releases are optional updates. Security or protocol-breaking releases may declare a minimum supported version. Clients below that version must update before starting incompatible work, while preserving enough connectivity to retrieve the update metadata.

The desktop client must never silently replace an installed version with an unverified artifact.

## Direct downloads

`uden.icu/download` is driven by verified release metadata rather than hardcoded binary filenames. It detects platform and architecture and recommends the matching artifact, while exposing an `Other downloads` section for manual selection.

The download manifest must only reference releases that have passed the distribution workflow. It should expose stable URLs for the current artifact and immutable URLs for historical releases.

## Microsoft Store

The Microsoft Store remains a separate distribution channel. Store releases follow the same application version but may have Store-specific submission/review timing. Store publication must never cause the direct-download channel to point at an unverified artifact.

## Security requirements

- HTTPS for update and download metadata.
- Signed updater artifacts.
- Checksums for direct-download artifacts.
- Immutable release tags/assets where supported.
- No mutable `latest.exe` binary that can be silently overwritten.
- Release metadata tied to an exact commit and artifact digest.
- CI verification before promotion.
