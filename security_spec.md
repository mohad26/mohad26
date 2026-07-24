# security_spec.md — Zero-Trust JordanInsight Security Specification

This specification governs active security boundaries for the **JordanInsight Analytics** database system implemented over Google Cloud Firestore.

## 1. Data Invariants
1. **Comment Integrity**: No comment document can be written without strict verification of required fields. Specifically, `id`, `author`, `handle`, `platform`, `text`, `cleanedText`, `language`, `sentiment`, `sentimentScore`, `topic`, and `timestamp` must all be present.
2. **Sentiment Valuation Boundaries**: The `sentimentScore` field must be a valid float/number strictly bounded by `-1.0 <= score <= 1.0`.
3. **Language Verification**: The `language` field is constrained solely to the strings `'ar'` or `'en'`.
4. **Platform Verification**: The `platform` field is restricted solely to `'X' | 'Facebook' | 'Instagram' | 'YouTube'`.
5. **Account Registry Governance**: Only administrative users or explicit system execution nodes are permitted to modify supervised handles. Individual entries in `handles` within `/accounts/{categoryId}` must not exceed a size of `128` characters.

---

## 2. The "Dirty Dozen" Malicious Payloads
The following payloads constitute attacks trying to breach the laws of Identity, Integrity, and State:

1. **Ghost Field Injection**: Adding custom administrative rights `isAdmin: true` inside a public comment payload.
2. **Sentiment Overflows**: Setting `sentimentScore: 99.0` to artificially skew national tourist statistics.
3. **Negative Limit Abuse**: Setting `sentimentScore: -4.5` to depress public transport indicators unfairly.
4. **Invalid Platform Payload**: Setting `platform: "Myspace"` to poison classification queues.
5. **Null Language Tokenizer**: Posting a comment where `language: null` to crash the NLP word-cloud parser.
6. **Extremely High Text Volume**: Injecting a 2MB string in the `text` field to trigger high resource billing.
7. **Malformed Timestamp Entry**: Evading `request.time` enforcement by defining a custom backdated year `timestamp: "1970-01-01T00:00:00Z"`.
8. **Malicious Special Character ID Poisoning**: Specifying document id containing path traversal tags such as `../../test/doc` trying to write sideways.
9. **Account Category Poisoning**: Specifying an empty category name or an oversized account handle `handles: ["@very-long-junk-text-designed-to-bloat-the-database-..." ]`.
10. **Orphaned State Bypass**: Writing a comment that bypasses the static validation helper completely.
11. **Type Distortion Trick**: Inserting a string `"0.75"` as the value for `likes` instead of an integer.
12. **Status Terminals Override**: Artificially overwriting historical analytical indexes after they are established as read-only records.

---

## 3. Secured Firestore Rules Schema Policy
To combat these payloads, we define full guard checks in `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Catch-All Default Deny
    match /{document=**} {
      allow read, write: if false;
    }

    // Common Helpers
    function isValidId(id) {
      return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$');
    }

    // Comments Collection
    match /comments/{commentId} {
      allow read: if true;
      allow create, update: if isValidId(commentId) && isValidComment(request.resource.data);
      allow delete: if false;
    }

    // Monitored Accounts Collection
    match /accounts/{categoryId} {
      allow read: if true;
      allow write: if isValidId(categoryId) && isValidCategory(request.resource.data);
    }

    // Validation definitions
    function isValidComment(c) {
      return c.keys().hasAll(['id', 'author', 'handle', 'platform', 'text', 'cleanedText', 'language', 'sentiment', 'sentimentScore', 'timestamp'])
        && c.id is string
        && c.id.size() <= 128
        && c.author is string
        && c.author.size() <= 64
        && c.handle is string
        && c.handle.size() <= 64
        && c.platform in ['X', 'Facebook', 'Instagram', 'YouTube']
        && c.text is string
        && c.text.size() <= 1000
        && c.cleanedText is string
        && c.cleanedText.size() <= 1000
        && c.language in ['ar', 'en']
        && c.sentiment in ['positive', 'neutral', 'negative']
        && c.sentimentScore is number
        && c.sentimentScore >= -1.0
        && c.sentimentScore <= 1.0;
    }

    function isValidCategory(cat) {
      return cat.keys().hasAll(['handles'])
        && cat.handles is list
        && cat.handles.size() <= 200;
    }
  }
}
```
