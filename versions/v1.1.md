# did:avtr Method Specification

**Version:** 1.1

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
**`did:avtr` DID** that belongs to exactly one enrolled human, a **Resolution Registry** that
holds its public DID Document, and Sybil resistance from a cryptographic key derived on the
holder's device from an **identity-anchor record**. Together these make the identity *a specific
accountable human* and make recovery possible.

### 1.2 Why a custom method

Ledger-based methods (`did:ethr`, `did:ion`) anchor to a ledger; key-only methods (`did:key`) are
neither updatable nor persistent; `did:web` identifies a domain, not a person. `did:avtr` occupies a
distinct spot: a **biometric-rooted, persistent DID for a deduplicated human**. It identifies the
human holder and is not intended for issuers or services.

### 1.3 Conformance

Conforms to [W3C DID Core v1.0](https://www.w3.org/TR/did-core/). RFC 2119 and RFC 8174 keywords
apply.

`did:avtr` is designed to implement the proposed [`human://` URI
scheme](https://entityschemes.org/). A `main` identifier's bytes may be carried in a `human://`
URI in the scheme's base32 form; the scheme defines the two forms as equivalent on their decoded
bytes (scheme §8.1). This document does not yet claim conformance to that scheme. References of the
form "scheme §n" in this document point to that specification.

### 1.4 Terminology

- **Root key** — the holder's root key pair, derived on-device from the holder's verified identity
  and never stored (§5).
- **Controlling key** — the key pair (Ed25519) that controls the DID Document; unique to the DID,
  carried in the identifier (§4), and re-derivable by the holder (§5).
- **Relying-party key** — a key presented to one relying party as a `did:key` (§5).
- **Identity-anchor record** — a record of identity attributes signed by its issuer. A cryptographic
  key derived from it on the holder's device by a proprietary method is the **deduplication** input
  (Sybil resistance). The record never leaves the device. What the deduplication service receives is
  derived from the key and, by construction, cannot be traced to a specific person or to the record;
  it carries no biometric data and no personal information.
- **Enrollment** — establishing a holder's uniqueness with the deduplication service (§7.1 step 4):
  once per human, and permanent.
- **Registration** — creating a DID (§7.1): assembling a DID Document and submitting it to the
  Registry. A holder registers again to obtain a new DID after deactivating one (§7.4).
- **Resolution Registry** — the server-side registry of public `did:avtr` DID Documents; exposes a
  DIF Universal-Resolver-compatible driver.
- **Registration token** — a single-use token issued by the deduplication service to an enrolled
  holder for one registration (§8.1). It names no holder and carries no deduplication value; it is
  bound to the DID and the controlling key it authorizes, and the Registry verifies it against the
  deduplication service's published verification keys (§3.2).

## 2. DID Method Name

The method name is `avtr`, from Avatar. A conforming DID MUST begin with `did:avtr:` (lowercase).

## 3. The verifiable data registry

`did:avtr` does not use a blockchain. Its verifiable data registry is the **Resolution Registry**: a
server-side registry of public DID Documents, exposing a DIF Universal-Resolver-compatible driver
(§7.2). The Registry stores only what the controller publishes — public keys, service endpoints and
document metadata — and holds no biometric data, no identity-anchor record contents and no personal
information. Every document carries its controller's proof (§6.3), which the Registry verifies on
write and returns on read. The proof establishes that a document is consistent with the key it
names; what a reader can verify without relying on the Registry, and what it cannot, is stated in
§3.1.

Deduplication (§8) is not a function of the Registry. It is performed by a separate deduplication
service that receives no DID Document and no identifier, while the Registry receives no
deduplication value. The Registry verifies registration tokens (§8.1) against the deduplication
service's published verification keys and holds nothing else about that service.

The Registry answers only about an identifier the querier already holds. It offers no operation that
lists, searches or counts identifiers, and none that reports on an identifier other than resolution
of that identifier (§7.2).

### 3.1 What a reader relies on the Registry for

- **First contact is bound by the identifier, not by the Registry.** The identifier carries the
  controlling public key (§4, §4.3). A reader resolves the DID, obtains the document from the
  network's Registry over TLS at the origin the discovery document names (§3.2), and verifies that
  the document's controlling verification method carries exactly the key in the DID it holds. A
  Registry that substitutes the document or its key fails that check for every reader, however the
  reader came by the identifier. The Registry adds nothing to the binding: it is the channel, and
  the identifier is the authority.
- **Signed artifacts bind on their own.** An artifact signed under the controlling key verifies only
  against that key. A reader holding any such artifact of the holder detects a substituted document
  by the failure of that verification.
- **Every later change is verifiable.** The controlling key never changes (§5, §7.3), so every
  update carries a proof by the key the reader already holds. A Registry cannot alter a document a
  reader has retained without that proof failing, and a reader who retains `versionId` detects a
  rollback (§7.3, §9).
- **The holder verifies the binding itself.** The holder can re-derive the controlling key on any
  device (§5) and compare it with the served document, so a substituted document is detected by its
  own controller.

### 3.2 Registry discovery

Each network (§4) has one Registry and one deduplication service. Their HTTPS origins are published
in the method's **discovery document**, served from the same origin as this specification:

```
https://docs.avatar.me/specs/did-method-avtr/registries.json
```

```json
{
  "main": { "registry": "https://…", "deduplication": "https://…", "keys": "https://…" },
  "test": { "registry": "https://…", "deduplication": "https://…", "keys": "https://…" }
}
```

A resolver MUST obtain a network's Registry origin from the discovery document and MUST NOT accept
a document for an identifier of that network from any other origin. `keys` is the URL at which the
network's deduplication service publishes the verification keys for its registration tokens as a
JSON Web Key Set (RFC 7517), each key identified by `kid`; the Registry verifies tokens against that
set (§8.1). The discovery document changes only with a new version of this specification.

## 4. DID Syntax — the identifier

The `did:avtr` method-specific identifier is **self-certifying**: 66 bytes, being **32 random
bytes** followed by the **controlling public key** as the DID Document publishes it (the
`Multikey` value of §6.1, multicodec prefix included), encoded together as one base58btc string.
The random part is created on-device at registration from a CSPRNG and is **decoupled from all key
material** (NOT derived from any key or any biometric input, and MUST NOT be computable from them);
the key part is the DID's controlling key (§5), which never changes. A reader therefore holds,
in the identifier itself, the key that every document of the DID must carry (§4.3).

The identifier space is the set of all values of the form in §4.1, and every identifier in it is at
all times in one of two states: **inactive** or **active**. Registration (§7.1) moves an identifier from
inactive to active; deactivation (§7.4) moves it back, permanently. Resolution reports the state
(§7.2): an active identifier resolves to its document, and an inactive one resolves with
`deactivated: true` and no document. The method has no notion of an identifier that does not exist,
and an identifier that was withdrawn is in the same state, and answers in the same way, as one that
was never activated.

```
did:avtr:<network>:<multibase-encoded-identifier>
```

- `<network>` — REQUIRED: `main` | `test`. A string without a network segment is not a `did:avtr`
  DID and resolves with `error: "invalidDid"` (§7.2). The two networks have separate Registries and
  separate deduplication services (§3.2); an identifier is valid only on the network it names, and
  a `test` identifier MUST NOT be accepted where a `main` identifier is expected. Each network
  enforces the uniqueness property of §8 independently: a holder may be enrolled once on each.
- `<multibase-encoded-identifier>` — a
  [Multibase](https://datatracker.ietf.org/doc/html/draft-multiformats-multibase) base58-btc value
  (`z` prefix) encoding **32 bytes of CSPRNG output** (a non-cryptographic RNG MUST NOT be used)
  followed by the **34-byte `Multikey` value of the controlling key** (§6.1). The 256 random bits
  give at least 128 bits of collision and second-preimage resistance, the minimum this method
  requires of an identifier (scheme §3.2); the key part adds the binding of §4.3.

### 4.1 ABNF

```abnf
did-avtr        = "did:avtr:" network ":" identifier
network         = "main" / "test"
identifier      = "z" 89*91base58-char   ; base58btc of exactly 66 bytes:
                                         ; 32 random bytes ‖ 34-byte Multikey controlling key
base58-char     = %x31-39 / %x41-48 / %x4A-4E / %x50-5A / %x61-6B / %x6D-7A
```

### 4.2 Examples

```
did:avtr:main:z2SgtXTJjRd2tUix14qjK3ySYFMUbFwCXf1FbUE1EXsZcFck6mZyegKHCuC6E9Zoq4PCvHnvbrbr5MU6ZdWNQJZtLYpy
did:avtr:test:z2Q2Jn9LjZFx7xrByF1tasnyRNXiJzWwDsTbTLjgUph4hNSSZZaJ5WRVqZ1nj2GNF7LcNAG6sYH4A3oBZo3hsbtErtMn
```

The same `main` identifier in the `human://` URI form (scheme §4.7, §8.1): the DID form encodes the
66 bytes in base58btc, the URI form in base32; the two are equivalent on the decoded bytes, and the
URI form carries the controlling key exactly as the DID form does.

```
did:avtr:main:z2SgtXTJjRd2tUix14qjK3ySYFMUbFwCXf1FbUE1EXsZcFck6mZyegKHCuC6E9Zoq4PCvHnvbrbr5MU6ZdWNQJZtLYpy
human://b23oclo3bfgisi4mrlrjg2vqkalakqwewm7wafepuq555m4rnfk362aijl6nbuwk53z2v3ammyboxjpkyf7czqpdzbaos3vsedloqyl4eei
```

### 4.3 The identifier certifies its own key

The key part of the identifier (§4) is the controlling key, so a DID Document is bound to its
identifier by content, not by anyone's word. A Registry MUST refuse to register a document whose
controlling verification method does not carry, in `publicKeyMultibase`, exactly the key part of
the document's `id`. A resolver MUST make the same check on every document it obtains and MUST
report a document that fails it as a failure of the binding, never as the DID's document. A
reader who holds a `did:avtr` DID therefore verifies the first document it ever sees for that
DID without relying on the Registry (§3.1), and there is no form of the identifier that lacks
the key: the `human://` form carries the same bytes (§4.2). This is the self-certifying form the
scheme requires of every identifier (scheme §3.2).

The identifier discloses nothing that resolution does not already publish: the controlling public
key is public (§10), and the random part is unguessable, so a DID cannot be discovered; a party
holds one only because the holder disclosed it (§3, §5, §10).

## 5. The key model

The **root key** is a key pair the holder derives on their own device from their verified identity
and never stores; the holder can derive it on any of their devices.

The DID Document is controlled by a **controlling key** that is unique to the DID, is never
replaced for that DID, and that the holder can re-derive on any device. It signs registration,
updates and deactivation; the document lists its public half as the controlling verification
method, and the identifier carries the same public half (§4).

How an implementation derives the root key and the controlling key is outside this method, as key
generation is outside every DID method. This method depends on two properties only: the controlling
key is unique to its DID, and the holder can re-derive it on any device from the same verified
identity.

Relying parties never see the DID unless the holder chooses to reveal it: each relying party is
presented a distinct key of its own, as a `did:key`. Which keys an implementation uses for which
operations is an implementation choice; the DID Document records only what the controller publishes.

## 6. DID Document

The `did:avtr` DID Document describes one thing: **the key that controls it**. **Relying-party keys are not enumerated here**; they are off-document `did:key`s (§5).

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://w3id.org/security/multikey/v1",
    "https://w3id.org/security/data-integrity/v2"
  ],
  "id": "did:avtr:main:z2SgtXTJjRd2tUix14qjK3ySYFMUbFwCXf1FbUE1EXsZcFck6mZyegKHCuC6E9Zoq4PCvHnvbrbr5MU6ZdWNQJZtLYpy",
  "verificationMethod": [
    {
      "id": "did:avtr:main:z2SgtXTJjRd2tUix14qjK3ySYFMUbFwCXf1FbUE1EXsZcFck6mZyegKHCuC6E9Zoq4PCvHnvbrbr5MU6ZdWNQJZtLYpy#control-1",
      "type": "Multikey",
      "controller": "did:avtr:main:z2SgtXTJjRd2tUix14qjK3ySYFMUbFwCXf1FbUE1EXsZcFck6mZyegKHCuC6E9Zoq4PCvHnvbrbr5MU6ZdWNQJZtLYpy",
      "publicKeyMultibase": "z6Mkf5rGMoatrSj1f372GNPBvqi8m6xTA1JkCwEfcZ4ySmd3"
    }
  ],
  "capabilityInvocation":  ["did:avtr:main:z2SgtXTJjRd2tUix14qjK3ySYFMUbFwCXf1FbUE1EXsZcFck6mZyegKHCuC6E9Zoq4PCvHnvbrbr5MU6ZdWNQJZtLYpy#control-1"],
  "proof": {
    "type": "DataIntegrityProof",
    "cryptosuite": "eddsa-jcs-2022",
    "verificationMethod": "did:avtr:main:z2SgtXTJjRd2tUix14qjK3ySYFMUbFwCXf1FbUE1EXsZcFck6mZyegKHCuC6E9Zoq4PCvHnvbrbr5MU6ZdWNQJZtLYpy#control-1",
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
party whose word is taken. The controlling key is never replaced for a DID (§5, §7.3), so every
version of a document is signed by the same key, and a reader who holds that key from the
identifier itself (§4.3) or from any previous version verifies every later one against it.

## 7. DID Method Operations

### 7.1 Create (Register)

1. **Identity verification and root derivation** — the holder's identity is verified on-device
   (liveness REQUIRED for the biometric) and the **root key** is derived on-device.
2. **Controlling key** — generate the 32 random bytes of the identifier (§4), independent of all
   keys, and derive the DID's controlling key (§5).
3. **DID construction and DID Document** — form the identifier from the random bytes and the
   controlling public key (§4); assemble the document from the `id`, the controlling key as the sole
   verification method, and its control relationship (§6).
4. **Enrollment and registration token** (§8) — the device proves to the **deduplication service**
   that the holder is enrolled exactly once, enrolling the holder if they are not, and obtains a
   registration token (§8.1) bound to the DID and the controlling key of step 3; the service does
   not see which DID or key it authorizes, and the device discloses no identifier to it. The
   deduplication service never sees the Registry's data, and the Registry never sees the
   deduplication service's.
5. **Registration** — the device submits the DID Document, carrying its proof (§6.3), together with
   the registration token, to the network's Registry (§3.2). The Registry verifies the proof against
   the document's own verification method, verifies that the controlling key matches the identifier
   (§4.3), verifies the token against the deduplication service's published keys and against the
   submitted DID and controlling key (§8.1), checks that the identifier has never been activated
   (§7.2), and stores the document. It receives **no deduplication
   value of any kind** and no identifier of the holder beyond the DID itself: no party to
   registration is able to correlate the resulting identifier with another record of the person
   (scheme §3.2), and no value that identifies the person reaches or rests at any server.

### 7.2 Read (Resolve)

A Registry exposes a DIF Universal-Resolver-compatible driver: `GET /1.0/identifiers/{did}` returns
`{ didResolutionMetadata, didDocument, didDocumentMetadata }` on success, the document carrying its
proof (§6.3). A Registry serves one network; a resolver routes on the `network` segment (§3.2) and
returns `notFound` for an identifier of a network it does not serve. **Resolution is open**: any
party may resolve any `did:avtr`. What a holder discloses, and to whom, is decided in the holder's
application (§5, §10), never by the Registry.

**Metadata.** For an active identifier, `didDocumentMetadata` contains `versionId` only, a string
the Registry increments on every update (§7.3). It never contains `created` or `updated`, because
they would date a holder's registration and activity. For an inactive identifier (§4) it contains
`deactivated: true` and nothing else, `didDocument` is empty and `didResolutionMetadata` carries no
error: the resolution succeeded and reported the identifier's state, as DID Core requires of a
deactivated DID.

`didResolutionMetadata` carries the standard fields, `contentType` and, on failure, `error`:
`invalidDid` for a string that is not a `did:avtr` DID (§4), and `notFound` only for an identifier
of a network the Registry does not serve. An identifier of the Registry's own network never fails to
resolve: it is active or inactive (§4). The metadata also carries two fields this method defines:

- `operator` — the identifier of the operator of the Registry that answered. In this version it is
  an HTTPS origin, equal to the origin the discovery document names for the network (§3.2).
- `relianceBound` — the number of seconds after which the result MUST NOT be relied on without
  resolving again. It is a property of the network, identical for every identifier on it, and never
  varies by identifier.

**Resolution reports state, never history.** Every inactive identifier, withdrawn or never
activated, returns the same response, byte-identical and on the same code path, because the
Registry holds no document for either and consults nothing else to answer (scheme §6.5). A querier
learns whether the identifier it presented is active now, which is what resolution is for, and
nothing about whether it was ever active. The Registry retains no document, no key and no time for a
withdrawn identifier. For the sole purpose of never activating an identifier twice (§7.4), it keeps
a keyed digest of every identifier it has ever activated, consulted at registration and never at
resolution.

### 7.3 Update

The controller re-derives the controlling key, modifies the document, attaches a proof by the
controlling key (§6.3), and submits it to the Registry; the Registry verifies the proof against the
current document's key and increments `versionId`. The controlling key itself is never replaced: it
is unique to the DID (§5), and a compromised root is addressed by deactivation and a new DID
(§9). **Relying-party keys rotate freely off-document** and require no Registry operation.

### 7.4 Deactivate and recovery

- **Deactivate** — the controller signs a deactivation and submits it to the Registry; the Registry
  discards the document and the identifier returns to the inactive state (§4), so subsequent
  resolution answers exactly as for an identifier never activated (§7.2). Irreversible for that
  identifier: the Registry never activates it again (scheme §6.6). A relying party from which an
  identifier is withdrawn is given no successor and no means to determine whether one exists
  (scheme §10.4); the holder's enrollment is untouched (scheme §6.6: identifiers withdraw,
  enrollment never does).
- **Recovery (distinct)** — on device loss, the holder re-derives the controlling key on a new
  device (§5) and controls the document as before. Recovery requires **no Registry operation and no
  recovery credential**. **Nothing "recognizes" anyone**: recovery is a re-derivation, never an
  association — no server compares a deduplication value, marks an old DID, or keeps a
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

This specification relies on the deduplication method's properties, not on its construction; the
properties are the subject of independent evaluation under the evidence rules of the `human://`
scheme (scheme §3.4), against which this document does not yet claim conformance (§1.3). The
registration token below is what carries uniqueness from the deduplication service to the Registry
without carrying anything else.

### 8.1 Registration token

- **Issuance.** Within the enrollment session, the device computes
  `m = SHA-256("avtr:register:v1" ‖ network ‖ did ‖ controlling public key)` and obtains from the
  deduplication service a signature over `m` under RFC 9474 (RSABSSA-SHA384-PSS-Deterministic,
  modulus of at least 2048 bits): the service signs without seeing `m`, and therefore learns neither
  the DID nor the key it authorizes. It issues a token only to a holder whose enrollment it has just
  established or confirmed with a live biometric, and SHOULD issue at most one token per enrollment
  session.
- **Format.** `{ "kid": "<key id>", "sig": "<base64url signature>" }`, submitted with the DID
  Document (§7.1 step 5). `kid` names a key in the service's published set (§3.2).
- **Verification.** The Registry recomputes `m` from the submitted document's `id` and controlling
  verification method and verifies `sig` as an RSA-PSS signature (SHA-384, salt length 48) under
  the named key. A token that does not verify over the submitted document is refused.
- **Proof of possession.** The document's proof (§6.3) is made by the controlling key bound in `m`;
  a token is of no use to a party without that key.
- **Single use.** A token binds one DID. The Registry refuses an identifier that has ever been
  activated (§7.1), so a token replayed for its own DID has no effect, and a token cannot verify for
  any other DID. Tokens carry no expiry and need none.
- **What each party learns.** The deduplication service learns only how many tokens it issued. The
  Registry learns that an enrolled holder registered this DID, and nothing about which holder.
- **DIDs per human.** This method does not limit the number of DIDs an enrolled human
  registers over time; it guarantees that every DID belongs to exactly one enrolled human.

## 9. Security Considerations

- **Key storage** — the root key and the controlling key are transient (re-derived when needed, never
  persisted); relying-party keys are kept in the device's secure hardware where available. The
  derivation is one-way.
- **Liveness** — liveness detection is REQUIRED on every root derivation (§7.1).
- **Root compromise** — the root's security rests on the derivation executing only within the
  holder's secure execution environment, from a live capture; an implementation MUST NOT expose the
  derivation to code outside that environment. Because a root can be derived again from the same
  identity, the remedy is deactivation (§7.4) and registration of a new DID.
- **Identifier collision** — identifiers are 256 random bits (§4); the probability that two holders
  generate the same identifier is negligible, and a Registry refuses an identifier that has ever
  been activated (§7.1).
- **No static secrets** — clients MUST NOT embed static shared secrets.
- **Replay** — signed operations submitted to the Registry include a nonce and a timestamp; neither is
  published.
- **Registry equivocation** — every document carries its controller's proof (§6.3), so an altered
  document fails verification for every reader, whichever server delivered it, because every reader
  holds the document's key in the identifier itself (§4.3); a substituted first document fails on
  first contact, and no reader relies on the Registry for the binding (§3.1). A Registry can still
  withhold a document, which resolution then reports as inactive, or serve a previous version,
  which a reader who retained a later `versionId` detects (§7.3).
- **Deduplication service** — Sybil resistance (§8) depends on the deduplication service refusing a
  second enrollment. A dishonest or compromised deduplication service can admit duplicates, or issue
  registration tokens to parties it did not enroll; it cannot identify any holder, because what it
  receives cannot be traced to a person or a record, and it never sees which DID a token registers.
- **Registration tokens** — bound to one DID and one controlling key, verified over the submitted
  document, and of no use without the key (§8.1); a stolen token registers nothing.
- **Reliance bound** — a resolution result is valid only until its `relianceBound` elapses (§7.2); a
  verifier acting after that point MUST resolve again.
- **Deactivation** — irreversible for the identifier (§7.4); a holder who deactivates in error
  registers a new DID.
- **Quantum** — Ed25519 today; `Multikey` admits post-quantum key types without a change to the
  document shape.

## 10. Privacy Considerations

- **No personal or biometric data** in the DID Document or the Registry; the identifier is opaque
  random (§4).
- **Private by default** — a DID is unguessable and is not presented to relying parties (§5),
  and the Registry cannot be enumerated or searched (§3), so assignment of an identifier makes no
  one discoverable.
- **The controlling key's public half is public** — it is part of the identifier (§4), so anyone who
  holds or resolves a DID has it. The key is specific to the DID (§5) and signs nothing but the DID Document and operations on it, so
  it appears nowhere else and links the DID to nothing — including to any other DID of the
  same holder, past or future.
- **Resolution queries** — a party that resolves a DID reveals to the Registry operator which
  DID it is interested in, and from where. Implementations SHOULD resolve through a resolver of
  their own choosing, or a cache, rather than directly.
- **Unlinkability** — relying parties see **relying-party keys** (`did:key`), not the DID (§5);
  the DID is disclosed only by the holder's choice.
- **No mapping** — relying-party keys are established on the holder's device and are never
  registered anywhere, so no party holds a correspondence between a DID and any key a relying
  party has seen.
- **Holder-chosen linkage** — a holder who discloses the DID to two parties links themselves at
  those two parties. That linkage is the holder's decision; the method provides no other means of
  correlating a holder across relying parties.
- **Resolution reports state, never history** — an identifier that was withdrawn and one that was
  never activated are in the same state and answer identically (§4, §7.2), so no party learns from
  the Registry whether an identifier was ever active, and the Registry keeps nothing about a
  withdrawn identifier beyond what prevents its reactivation.
- **No party to registration holds a link** — the deduplication service issues the registration
  token without seeing the DID or key it authorizes, and the Registry receives a token that names no
  holder (§8.1), so neither can connect an enrollment to a DID.
- **No timestamps** — resolution metadata carries no `created` or `updated` time (§7.2), so
  resolving a DID dates nothing about its holder.
- **Consent** — every operation on a DID requires the holder's live biometric at that moment,
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
[RFC 9474](https://www.rfc-editor.org/rfc/rfc9474) (registration tokens) ·
[RFC 8017](https://www.rfc-editor.org/rfc/rfc8017) (RSA-PSS) ·
[RFC 7517](https://www.rfc-editor.org/rfc/rfc7517) (JSON Web Key) ·
[The `human://` URI scheme](https://entityschemes.org/) (cited as "scheme §n").

---

© Avatar Inc. This specification may be reproduced and distributed, without modification, for the
purpose of building resolvers for, or reviewing, the method it describes.
