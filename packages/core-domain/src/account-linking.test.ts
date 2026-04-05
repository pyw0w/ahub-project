import assert from "node:assert/strict";
import test from "node:test";

import {
  AccountLinkConflictError,
  AccountLinkTransitionError,
  assertAccountLinkTransition,
  createInMemoryAccountLinkRepository
} from "./account-linking.js";

const telegramIdentity = (telegramUserId: string, authAt: string) => ({
  id: `telegram_identity:${telegramUserId}`,
  telegramUserId,
  username: `user_${telegramUserId}`,
  firstName: "Miner",
  lastName: null,
  languageCode: "ru",
  authAt
});

void test("account link repository keeps duplicate begin/complete calls idempotent for the same user", () => {
  const repository = createInMemoryAccountLinkRepository();
  const pending = repository.beginLink({
    linkId: "link_1",
    userId: "user_1",
    telegramIdentity: telegramIdentity("42", "2026-04-05T00:00:00.000Z"),
    requestedAt: "2026-04-05T00:00:00.000Z"
  });
  const linked = repository.completeLink({
    linkId: "link_1",
    userId: "user_1",
    telegramIdentity: telegramIdentity("42", "2026-04-05T00:00:10.000Z"),
    externalAccount: {
      id: "external_1",
      provider: "gml",
      providerAccountId: "gml:42",
      displayName: "Miner42"
    },
    requestedAt: "2026-04-05T00:00:00.000Z",
    linkedAt: "2026-04-05T00:00:10.000Z"
  });
  const duplicated = repository.completeLink({
    linkId: "link_2",
    userId: "user_1",
    telegramIdentity: telegramIdentity("42", "2026-04-05T00:00:20.000Z"),
    externalAccount: {
      id: "external_2",
      provider: "gml",
      providerAccountId: "gml:42",
      displayName: "Miner42"
    },
    requestedAt: "2026-04-05T00:00:20.000Z",
    linkedAt: "2026-04-05T00:00:20.000Z"
  });

  assert.equal(pending.status, "pending");
  assert.equal(linked.status, "linked");
  assert.equal(duplicated.id, linked.id);
  assert.equal(duplicated.externalAccountId, linked.externalAccountId);
  assert.equal(repository.listLinks().length, 1);
});

void test("account link repository records temporarily unavailable as a resumable state", () => {
  const repository = createInMemoryAccountLinkRepository();
  const unavailable = repository.markTemporarilyUnavailable({
    linkId: "link_1",
    userId: "user_1",
    telegramIdentity: telegramIdentity("42", "2026-04-05T00:00:00.000Z"),
    requestedAt: "2026-04-05T00:00:00.000Z",
    observedAt: "2026-04-05T00:00:30.000Z",
    failureMessage: "GML launcher timeout"
  });
  const linked = repository.completeLink({
    linkId: "link_1",
    userId: "user_1",
    telegramIdentity: telegramIdentity("42", "2026-04-05T00:01:00.000Z"),
    externalAccount: {
      id: "external_1",
      provider: "gml",
      providerAccountId: "gml:42",
      displayName: "Miner42"
    },
    requestedAt: "2026-04-05T00:00:00.000Z",
    linkedAt: "2026-04-05T00:01:00.000Z"
  });

  assert.equal(unavailable.status, "temporarily_unavailable");
  assert.equal(unavailable.failureCode, "gml_temporarily_unavailable");
  assert.equal(linked.status, "linked");
  assert.equal(linked.failureCode, null);
});

void test("account link repository marks a contender row as conflict when external account is already linked elsewhere", () => {
  const repository = createInMemoryAccountLinkRepository();

  repository.completeLink({
    linkId: "link_1",
    userId: "user_1",
    telegramIdentity: telegramIdentity("42", "2026-04-05T00:00:00.000Z"),
    externalAccount: {
      id: "external_1",
      provider: "gml",
      providerAccountId: "gml:42",
      displayName: "Miner42"
    },
    requestedAt: "2026-04-05T00:00:00.000Z",
    linkedAt: "2026-04-05T00:00:10.000Z"
  });

  assert.throws(
    () =>
      repository.completeLink({
        linkId: "link_2",
        userId: "user_2",
        telegramIdentity: telegramIdentity("84", "2026-04-05T00:01:00.000Z"),
        externalAccount: {
          id: "external_2",
          provider: "gml",
          providerAccountId: "gml:42",
          displayName: "Miner42"
        },
        requestedAt: "2026-04-05T00:01:00.000Z",
        linkedAt: "2026-04-05T00:01:10.000Z"
      }),
    (error: unknown) =>
      error instanceof AccountLinkConflictError &&
      error.code === "external_account_already_linked"
  );

  const contender = repository.getLinkById("link_2");

  assert.ok(contender);
  assert.equal(contender.status, "conflict");
  assert.equal(contender.failureCode, "external_account_already_linked");
});

void test("account link transitions reject invalid regressions from linked back to pending", () => {
  assert.throws(
    () => assertAccountLinkTransition("linked", "pending"),
    (error: unknown) =>
      error instanceof AccountLinkTransitionError &&
      error.fromStatus === "linked" &&
      error.toStatus === "pending"
  );
});
