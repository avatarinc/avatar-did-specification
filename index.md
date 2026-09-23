# did:avtr Method Specification

**Version:** 1.0

**Editor:** Amod Dange, Avatar Inc

**Contact:** did@avatar.me

**Latest version:** https://docs.avatar.me/specs/did-method-avtr/latest/

**Date:** September 2026

---

## Abstract

The `did:avtr` method is a Decentralized Identifier method for **biometric-rooted, self-sovereign
human identity**. It does not rely on a blockchain. It combines on-device cryptographic key material
**rooted in a live biometric** with a server-side resolution registry that stores only public DID
Documents, never biometric data or personal information.

The method provides **one accountable human per identity**, **biometric-rooted recovery**, and
**per-relying-party unlinkability**, and conforms to W3C DID Core.

## 1. Introduction

### 1.1 Overview

`did:avtr` consists of a **root key** derived on the holder's device, a persistent, resolvable
**`did:avtr` anchor** that belongs to exactly one enrolled human, a **Resolution Registry** that
holds the anchor's public DID Document, and Sybil resistance from a cryptographic key derived on the
holder's device from an **identity-anchor record**. Together these make the identity *a specific
accountable human* and make recovery possible.

### 1.2 Why a custom method

Ledger-based methods (`did:ethr`, `did:ion`) anchor to a ledger; key-only methods (`did:key`) are
neither updatable nor persistent; `did:web` identifies a domain, not a person. `did:avtr` occupies a
distinct spot: a **biometric-rooted, persistent anchor for a deduplicated human**. It identifies the
human holder and is not intended for issuers or services.

### 1.3 Conformance

Conforms to [W3C DID Core v1.0](https://www.w3.org/TR/did-core/). RFC 2119 and RFC 8174 keywords
apply.

`did:avtr` is designed to implement the proposed [`human://` URI
scheme](https://entityschemes.org/). A `main` identifier's 32 bytes may be carried in a `human://`
URI in the scheme's base32 form; the scheme defines the two forms as equivalent on their decoded
bytes (scheme §8.1). This document does not yet claim conformance to that scheme. References of the
form "scheme §n" in this document point to that specification.

### 1.4 Terminology

- **Root key** — the holder's root key pair, derived on-device from the holder's verified identity
  and never stored (§5).
- **Controlling key** — the key pair (Ed25519) that controls the DID Document; unique to the anchor
  and re-derivable by the holder (§5).
- **Relying-party key** — a key presented to one relying party as a `did:key` (§5).
- **Anchor proof** — a proof, presented with a relying-party key, that an enrolled holder stands
  behind the key, without identifying the holder (§5).
- **Identity-anchor record** — a record of identity attributes signed by its issuer. A cryptographic
  key derived from it on the holder's device by a proprietary method is the **deduplication** input
  (Sybil resistance). The record never leaves the device. What the deduplication service receives is
  derived from the key and, by construction, cannot be traced to a specific person or to the record;
  it carries no biometric data and no personal information.
- **Enrollment** — establishing a holder's uniqueness with the deduplication service (§7.1 step 2):
  once per human, and permanent.
- **Registration** — creating an anchor (§7.1): assembling a DID Document and submitting it to the
  Registry. A holder registers again to obtain a new anchor after deactivating one (§7.4).
- **Resolution Registry** — the server-side registry of public `did:avtr` DID Documents; exposes a
  DIF Universal-Resolver-compatible driver.
- **Uniqueness credential** — a credential issued by the deduplication service attesting that its
  holder is enrolled exactly once on its network (§8). It names no holder and carries no
  identifier; the Registry verifies it against the deduplication service's published verification
  key.

## 2. DID Method Name

The method name is `avtr`, from Avatar. A conforming DID MUST begin with `did:avtr:` (lowercase).

## 3. The verifiable data registry

`did:avtr` does not use a blockchain. Its verifiable data registry is the **Resolution Registry**: a
server-side registry of public DID Documents, exposing a DIF Universal-Resolver-compatible driver
(§7.2). The Registry stores only what the controller publishes — public keys, service endpoints and
document metadata — and holds no biometric data, no identity-anchor record contents and no personal
information. Every document carries its controller's proof (§6.3), which the Registry verifies on
write and returns on read, so a resolver, a cache or a client verifies a document against the key
inside it and none of them relies on the Registry for its integrity.

Deduplication (§8) is not a function of the Registry. It is performed by a separate deduplication
service that receives no DID Document and no identifier, while the Registry receives no
deduplication value. The Registry verifies uniqueness credentials against the deduplication
service's published verification key and holds nothing else about that service.

The Registry answers only about an identifier the querier already holds. It offers no operation that
lists, searches or counts identifiers, and none that reports whether an identifier exists other than
resolution itself, which answers uniformly (§7.2).

## 4. DID Syntax — the identifier

The `did:avtr` method-specific identifier is an **opaque, randomly-generated** value created
on-device at registration and **decoupled from all key material** (NOT derived from any key or any
biometric input, and MUST NOT be computable from them). The binding to the holder's keys is
established by the registered DID Document (§6), not by the identifier's structure.

```
did:avtr:<network>:<multibase-encoded-identifier>
```

- `<network>` — OPTIONAL: `main` (default; MAY be omitted) | `test`. The two networks have separate
  Registries and separate deduplication services; an identifier is valid only on the network it
  names, and a `test` identifier MUST NOT be accepted where a `main` identifier is expected. Each
  network enforces the uniqueness property of §8 independently: a holder may be enrolled once on
  each.
- `<multibase-encoded-identifier>` — a
  [Multibase](https://datatracker.ietf.org/doc/html/draft-multiformats-multibase) base58-btc value
  (`z` prefix) encoding **32 bytes of CSPRNG output** (a non-cryptographic RNG MUST NOT be used).
  256 random bits give at least 128 bits of collision and second-preimage resistance, the minimum
  this method requires of an identifier (scheme §3.2).

### 4.1 ABNF

```abnf
did-avtr        = "did:avtr:" [ network ":" ] identifier
network         = "main" / "test"
identifier      = "z" 43*44base58-char   ; base58btc of exactly 32 bytes
base58-char     = %x31-39 / %x41-48 / %x4A-4E / %x50-5A / %x61-6B / %x6D-7A
```

### 4.2 Examples

```
did:avtr:zFTiwuzu99gqNuoExqSy5nrpg9Y1CChMRT9ZBVxQv3Vgr
did:avtr:main:zFTiwuzu99gqNuoExqSy5nrpg9Y1CChMRT9ZBVxQv3Vgr
did:avtr:test:zF11igsF5AtErcQkxqvUhayGVsykurrD52MKetmNvnpZ2
```

The same `main` identifier in the `human://` URI form (scheme §4.7, §8.1): the DID form encodes the
32 bytes in base58btc, the URI form in base32; the two are equivalent on the decoded bytes.

```
did:avtr:zFTiwuzu99gqNuoExqSy5nrpg9Y1CChMRT9ZBVxQv3Vgr
human://b23oclo3bfgisi4mrlrjg2vqkalakqwewm7wafepuq555m4rnfk3q
```

## 5. The key model

The **root key** is a key pair the holder derives on their own device from their verified identity
and never stores; the holder can derive it on any of their devices.

The DID Document is controlled by a **controlling key** that is unique to the anchor and that the
holder can re-derive on any device. It signs registration, updates and deactivation, and the
document lists its public half as the controlling verification method.

Relying parties never see the anchor unless the holder chooses to reveal it: each relying party is
presented a distinct key of its own, as a `did:key`. Which keys an implementation uses for which
operations is an implementation choice; the DID Document records only what the controller publishes.

A relying party may require, alongside such a key, an **anchor proof** that an enrolled holder
stands behind the key, without learning who. Anchor proofs are reserved for a later version of this
method.

## 6. DID Document

The `did:avtr` DID Document describes the **persistent anchor** — the key that controls the
document. **Relying-party keys are not enumerated here**; they are off-document `did:key`s (§5).

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/multikey/v1",
    "https://w3id.org/security/data-integrity/v2"
  ],
  "id": "did:avtr:zFTiwuzu99gqNuoExqSy5nrpg9Y1CChMRT9ZBVxQv3Vgr",
  "verificationMethod": [
    {
      "id": "did:avtr:zFTiwuzu99gqNuoExqSy5nrpg9Y1CChMRT9ZBVxQv3Vgr#control-1",
      "type": "Multikey",
      "controller": "did:avtr:zFTiwuzu99gqNuoExqSy5nrpg9Y1CChMRT9ZBVxQv3Vgr",
      "publicKeyMultibase": "z6Mkf5rGMoatrSj1f372GNPBvqi8m6xTA1JkCwEfcZ4ySmd3"
    }
  ],
  "capabilityInvocation":  ["did:avtr:zFTiwuzu99gqNuoExqSy5nrpg9Y1CChMRT9ZBVxQv3Vgr#control-1"],
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "verificationMethod": "did:avtr:zFTiwuzu99gqNuoExqSy5nrpg9Y1CChMRT9ZBVxQv3Vgr#control-1",
    "proofPurpose": "capabilityInvocation",
    "proofValue": "z3FXQjecWufY46yg5abdVZsXqLhxhueuSoZgNSARiKBk9czhSePTFehP8c3PGfb6a22gkfUKodSHKZFp9tmnkbSs4"
  }
}
```

### 6.1 Verification methods

Verification methods are of type `Multikey` (W3C Controlled Identifiers), and proofs use the Data
Integrity context (§6). The controlling key is an Ed25519 key, encoded in `publicKeyMultibase`
with the Ed25519 multicodec prefix; the root key's public half is never published. The document
lists it under `capabilityInvocation` only: it controls the document (§5); it is not an
authentication or assertion key, and the document therefore lists none.

### 6.2 Service endpoints

This method defines no service types. Service entries, where an implementation publishes them, are
governed by DID Core. Where an implementation publishes a service, its `serviceEndpoint` MUST be
identical for every holder; anything that selects a holder travels in the signed request body, never
in the URL.

### 6.3 Proof

Every DID Document carries a **Data Integrity proof**: a signature by the controlling key over the
document, under `proofPurpose: capabilityInvocation`, using the `eddsa-jcs-2022` cryptosuite or a
successor. The proof carries no `created` time (§10). The Registry MUST verify the proof before
storing a document and MUST return it, unaltered, with the document on every resolution. A resolver
MUST pass the proof through, and a client MUST verify it against the `#control-1` key in the
document it accompanies and MUST reject a document whose proof does not verify. A document therefore
proves its own integrity to any reader, whatever path delivered it; the Registry is a store, not a
party whose word is taken.

When an update replaces the controlling key (§7.3), the new document carries **two proofs**: one by
the outgoing key, which authorizes the change and is verifiable by a reader who retained the
previous version, and one by the incoming key, verifiable against the document itself. A reader
holding the previous version MUST check both; a reader meeting the document for the first time
verifies the second.

## 7. DID Method Operations

### 7.1 Create (Register)

1. **Identity verification and root derivation** — the holder's identity is verified on-device
   (liveness REQUIRED for the biometric) and the **root key** is derived on-device.
2. **Enrollment** (§8) — the device proves to the **deduplication service** that the holder is
   enrolled exactly once, enrolling the holder if they are not, and obtains a uniqueness credential;
   it discloses no identifier to the service. The deduplication service never sees the Registry's
   data, and the Registry never sees the deduplication service's.
3. **DID construction** — generate the opaque random identifier (§4), independent of all keys.
4. **Controlling key and DID Document** — derive the controlling key (§5); assemble the document
   from the `id`, the controlling key as the sole verification method, and its control relationship
   (§6).
5. **Registration** — the device submits the DID Document, carrying its proof (§6.3), together with
   the uniqueness credential, to a Registry. The Registry verifies the proof against the document's
   own verification method, verifies the uniqueness credential against the deduplication service's
   published verification key, checks that the identifier is not already assigned, and stores the
   document. It receives **no deduplication value of any kind** and no identifier of the holder
   beyond the DID itself: no party to issuance is able to correlate the resulting identifier with
   another record of the person (scheme §3.2), and no value that identifies the person reaches or
   rests at any server.

### 7.2 Read (Resolve)

A Registry exposes a DIF Universal-Resolver-compatible driver: `GET /1.0/identifiers/{did}` returns
`{ didResolutionMetadata, didDocument, didDocumentMetadata }` on success, the document carrying its
proof (§6.3). A Registry serves one network; a resolver routes on the `network` segment and returns
`notFound`, in the one shape below, for an identifier of a network it does not serve. **Resolution
is open**: any party may resolve any `did:avtr`. What a holder discloses, and to whom, is decided in
the holder's application (§5, §10), never by the Registry.

**Metadata.** On success, `didDocumentMetadata` contains `versionId` only, a string the Registry
increments on every update (§7.3). It never contains `created` or `updated`, because they would date
a holder's registration and activity, and never `deactivated`, by the failure rule below.

`didResolutionMetadata` carries the standard fields, `contentType` and, on failure,
`error: "notFound"`, and two fields this method defines:

- `operator` — the identifier of the operator of the Registry that answered. In this version it is
  an HTTPS origin.
- `relianceBound` — the number of seconds after which the result MUST NOT be relied on without
  resolving again. It is a property of the network, identical for every identifier on it, and never
  varies by identifier.

**Every failure has one shape.** An identifier that was never assigned and one that was deactivated
(§7.4) return the **same response, byte-identical and timing-indistinguishable**: the generic
`notFound` of the resolver shape, with `didDocumentMetadata.deactivated` **never set**. This departs
deliberately from DID Resolution, which expects a deactivated DID to resolve with
`deactivated: true`. Whether an identifier was ever assigned, or has since been withdrawn, is a
fact about a person, and the Registry discloses none; any observable difference, in timing, error
code or rate limit, would disclose the same (scheme §6.5, §9.5). A generic client therefore cannot
learn that a DID was deactivated, which is the point.

### 7.3 Update

The controller re-derives the controlling key, modifies the document, attaches a proof by the
current controlling key (§6.3), and submits it to the Registry; the Registry verifies the proof
against the current document's key and increments `versionId`. An update MAY replace the controlling
key: the new document then carries proofs by both the outgoing and the incoming key (§6.3), the
Registry verifies both, and control passes by an unbroken chain that any retained reader can check.
A compromised root is addressed by §9. **Relying-party keys rotate freely off-document** and require
no Registry operation.

### 7.4 Deactivate and recovery

- **Deactivate** — the controller signs a deactivation and submits it to the Registry; subsequent
  resolution **fails in the one shape of §7.2**, indistinguishable from an identifier never
  assigned. Irreversible for that identifier. A relying party from which an identifier is withdrawn
  is given no successor and no means to determine whether one exists (scheme §10.4); the holder's
  enrollment is untouched (scheme §6.6: identifiers withdraw, enrollment never does).
- **Recovery (distinct)** — on device loss, the holder re-derives the controlling key on a new
  device (§5) and controls the document as before. Recovery requires **no Registry operation and no
  recovery credential**. **Nothing "recognizes" anyone**: recovery is a re-derivation, never an
  association — no server compares a deduplication value, marks an old anchor, or keeps a
  correspondence between before and after. Relying-party keys are re-established on the new device.

## 8. Sybil resistance

One accountable human per identity is this method's premise. Uniqueness is established once, at
enrollment (§7.1), by a **proprietary deduplication method** whose input is a cryptographic key
derived on the holder's device from the identity-anchor record (§1.4). The record never leaves the
device. What the deduplication service receives is derived from the key and, by construction, cannot
be traced to a specific person or to the record; it suffices to establish that the holder is
enrolled exactly once, and for nothing else. No server other than the deduplication service receives
any deduplication value, and no server receives biometric data, record contents or personal
information. The Registry does not deduplicate (§3). **Deduplication is global within a network**:
one enrollment per human across every relying party, never per relying party (scheme §3.3, Condition
1); the two networks are separate (§4).

## 9. Security Considerations

- **Key storage** — the root key and the controlling key are transient (re-derived when needed, never
  persisted); relying-party keys are kept in the device's secure hardware where available. The
  derivation is one-way.
- **Liveness** — liveness detection is REQUIRED on every root derivation (§7.1).
- **Root compromise** — the root's security rests on the derivation executing only within the
  holder's secure execution environment, from a live capture; an implementation MUST NOT expose the
  derivation to code outside that environment. Because a root can be derived again from the same
  identity, the remedy is deactivation (§7.4) and registration of a new anchor.
- **Identifier collision** — identifiers are 256 random bits (§4); the probability that two holders
  generate the same identifier is negligible, and a Registry refuses an identifier that is already
  assigned (§7.1).
- **No static secrets** — clients MUST NOT embed static shared secrets.
- **Replay** — signed operations submitted to the Registry include a nonce and a timestamp; neither is
  published.
- **Registry equivocation** — every document carries its controller's proof (§6.3), so a forged or
  altered document fails verification for every reader, whichever server delivered it. A Registry
  can still withhold a document, which resolution reports in the one shape of §7.2, or serve a
  previous version, which a reader who retained a later `versionId` detects (§7.3).
- **Deduplication service** — Sybil resistance (§8) depends on the deduplication service refusing a
  second enrollment. A dishonest or compromised deduplication service can admit duplicates; it
  cannot identify any holder, because what it receives cannot be traced to a person or a record.
- **Reliance bound** — a resolution result is valid only until its `relianceBound` elapses (§7.2); a
  verifier acting after that point MUST resolve again.
- **Deactivation** — irreversible for the identifier (§7.4); a holder who deactivates in error
  registers a new anchor.
- **Quantum** — Ed25519 today; `Multikey` admits post-quantum key types without a change to the
  document shape.

## 10. Privacy Considerations

- **No personal or biometric data** in the DID Document or the Registry; the identifier is opaque
  random (§4).
- **Private by default** — an anchor is unguessable and is not presented to relying parties (§5),
  and the Registry cannot be enumerated or searched (§3), so assignment of an identifier makes no
  one discoverable.
- **The controlling key's public half is public** — anyone who resolves an anchor learns it. The key
  is specific to the anchor (§5) and signs nothing but the DID Document and operations on it, so
  it appears nowhere else and links the anchor to nothing — including to any other anchor of the
  same holder, past or future.
- **Resolution queries** — a party that resolves an anchor reveals to the Registry operator which
  anchor it is interested in, and from where. Implementations SHOULD resolve through a resolver of
  their own choosing, or a cache, rather than directly.
- **Unlinkability** — relying parties see **relying-party keys** (`did:key`), not the anchor (§5);
  the anchor is disclosed only by the holder's choice.
- **No mapping** — relying-party keys are established on the holder's device and are never
  registered anywhere, so no party holds a correspondence between an anchor and any key a relying
  party has seen.
- **Holder-chosen linkage** — a holder who discloses the anchor to two parties links themselves at
  those two parties. That linkage is the holder's decision; the method provides no other means of
  correlating a holder across relying parties.
- **Resolution failures are uniform** (§7.2), so no party learns from the Registry whether an
  identifier was ever assigned or has been deactivated.
- **No timestamps** — resolution metadata carries no `created` or `updated` time (§7.2), so
  resolving an anchor dates nothing about its holder.
- **Consent** — every operation on an anchor requires the holder's live biometric at that moment,
  and no server, issuer or Registry holds a key that can act for a holder; how a relying-party key
  is gated on the holder's device is the implementation's choice (§5). What a holder discloses is
  the holder's decision alone (§7.2), and withdrawal is unilateral and immediate (§7.4).
- **Inclusion** — the method accommodates any biometric modality and any issuer of identity-anchor
  records an implementation accepts. An implementation SHOULD accept enough of each that no person
  lacks a path to enrollment.

## 11. References

[W3C DID Core v1.0](https://www.w3.org/TR/did-core/) ·
[DID Resolution v0.3](https://w3c.github.io/did-resolution/) ·
[DIF Universal Resolver](https://dev.uniresolver.io/) ·
[Controlled Identifiers v1.0](https://www.w3.org/TR/cid-1.0/) (Multikey) ·
[Verifiable Credential Data Integrity 1.0](https://www.w3.org/TR/vc-data-integrity/) ·
[Data Integrity EdDSA Cryptosuites](https://www.w3.org/TR/vc-di-eddsa/) ·
[Multibase](https://datatracker.ietf.org/doc/html/draft-multiformats-multibase) ·
[Multicodec table](https://github.com/multiformats/multicodec/blob/master/table.csv) (Ed25519 public key prefix) ·
[RFC 2119](https://www.rfc-editor.org/rfc/rfc2119) · [RFC 8174](https://www.rfc-editor.org/rfc/rfc8174) ·
[RFC 4648](https://www.rfc-editor.org/rfc/rfc4648) (base32) ·
[The `human://` URI scheme](https://entityschemes.org/) (cited as "scheme §n").

---

© Avatar Inc. This specification may be reproduced and distributed, without modification, for the
purpose of building resolvers for, or reviewing, the method it describes.
