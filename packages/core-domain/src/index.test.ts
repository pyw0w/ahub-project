import assert from "node:assert/strict";
import test from "node:test";

import { assertCoreModelConsistency, type AccountLink, type Entitlement, type PaymentLedgerEntry, type Profile, type RewardDefinition, type Season, type SeasonProgression } from "./index.js";

const profile: Profile = {
  id: "profile_1",
  userId: "user_1",
  handle: "miner01",
  locale: "ru-RU",
  hardCurrencyBalance: 100n,
  softCurrencyBalance: 250n,
  createdAt: "2026-04-05T00:00:00.000Z",
  updatedAt: "2026-04-05T00:00:00.000Z"
};

const accountLinks: AccountLink[] = [
  {
    id: "link_1",
    userId: "user_1",
    provider: "gml",
    providerAccountId: "gml:player-1",
    status: "linked",
    linkedAt: "2026-04-05T00:00:00.000Z",
    revokedAt: null,
    createdAt: "2026-04-05T00:00:00.000Z",
    updatedAt: "2026-04-05T00:00:00.000Z"
  }
];

const season: Season = {
  id: "season_1",
  slug: "s1-founders",
  title: "Founders Season",
  status: "active",
  startsAt: "2026-04-05T00:00:00.000Z",
  endsAt: "2026-05-05T00:00:00.000Z",
  createdAt: "2026-04-05T00:00:00.000Z",
  updatedAt: "2026-04-05T00:00:00.000Z"
};

const progression: SeasonProgression = {
  id: "progression_1",
  seasonId: "season_1",
  profileId: "profile_1",
  xp: 250n,
  level: 3,
  lastGrantedRewardLevel: 2,
  updatedAt: "2026-04-05T00:00:00.000Z"
};

const rewards: RewardDefinition[] = [
  {
    id: "reward_1",
    seasonId: "season_1",
    level: 1,
    rewardType: "currency",
    entitlementSku: null,
    currencyAmount: 100n,
    payloadJson: null,
    createdAt: "2026-04-05T00:00:00.000Z"
  },
  {
    id: "reward_2",
    seasonId: "season_1",
    level: 2,
    rewardType: "entitlement",
    entitlementSku: "battle-pass:founders",
    currencyAmount: null,
    payloadJson: null,
    createdAt: "2026-04-05T00:00:00.000Z"
  }
];

const entitlements: Entitlement[] = [
  {
    id: "entitlement_1",
    profileId: "profile_1",
    sku: "battle-pass:founders",
    source: "purchase",
    status: "active",
    sourceLedgerEntryId: "ledger_1",
    validFrom: "2026-04-05T00:00:00.000Z",
    validUntil: null,
    grantedAt: "2026-04-05T00:00:00.000Z",
    revokedAt: null,
    createdAt: "2026-04-05T00:00:00.000Z",
    updatedAt: "2026-04-05T00:00:00.000Z"
  }
];

const ledgerEntries: PaymentLedgerEntry[] = [
  {
    id: "ledger_1",
    profileId: "profile_1",
    direction: "credit",
    sourceType: "payment",
    sourceRef: "payment:telegram:1",
    amountMinor: 999n,
    currency: "RUB",
    status: "posted",
    entitlementId: "entitlement_1",
    metadataJson: "{\"provider\":\"telegram\"}",
    occurredAt: "2026-04-05T00:00:00.000Z",
    createdAt: "2026-04-05T00:00:00.000Z"
  }
];

void test("assertCoreModelConsistency accepts a coherent aggregate", () => {
  assert.doesNotThrow(() => {
    assertCoreModelConsistency({
      profile,
      accountLinks,
      season,
      progression,
      rewards,
      entitlements,
      ledgerEntries
    });
  });
});

void test("assertCoreModelConsistency rejects duplicate active entitlements for a sku", () => {
  assert.throws(
    () =>
      assertCoreModelConsistency({
        profile,
        accountLinks,
        season,
        progression,
        rewards,
        entitlements: [
          ...entitlements,
          {
            ...entitlements[0],
            id: "entitlement_2"
          }
        ],
        ledgerEntries
      }),
    /only one active entitlement per sku is allowed/
  );
});

void test("assertCoreModelConsistency rejects refund entries with credit direction", () => {
  assert.throws(
    () =>
      assertCoreModelConsistency({
        profile,
        accountLinks,
        season,
        progression,
        rewards,
        entitlements,
        ledgerEntries: [
          ...ledgerEntries,
          {
            ...ledgerEntries[0],
            id: "ledger_2",
            sourceType: "refund",
            direction: "credit",
            entitlementId: null
          }
        ]
      }),
    /refund ledger entries must be debits/
  );
});

void test("assertCoreModelConsistency rejects duplicate provider links for one user", () => {
  assert.throws(
    () =>
      assertCoreModelConsistency({
        profile,
        accountLinks: [
          ...accountLinks,
          {
            ...accountLinks[0],
            id: "link_2",
            providerAccountId: "telegram:user-2"
          }
        ],
        season,
        progression,
        rewards,
        entitlements,
        ledgerEntries
      }),
    /only one account link per provider is allowed for a user/
  );
});

void test("assertCoreModelConsistency rejects season windows that collapse in UTC order", () => {
  assert.throws(
    () =>
      assertCoreModelConsistency({
        profile,
        accountLinks,
        season: {
          ...season,
          startsAt: "2026-04-05T12:00:00.000Z",
          endsAt: "2026-04-05T11:59:59.000Z"
        },
        progression,
        rewards,
        entitlements,
        ledgerEntries
      }),
    /season.startsAt must be earlier than season.endsAt/
  );
});

void test("assertCoreModelConsistency rejects duplicate ledger source keys", () => {
  assert.throws(
    () =>
      assertCoreModelConsistency({
        profile,
        accountLinks,
        season,
        progression,
        rewards,
        entitlements,
        ledgerEntries: [
          ...ledgerEntries,
          {
            ...ledgerEntries[0],
            id: "ledger_2"
          }
        ]
      }),
    /ledger entry source key must be unique within a ledger/
  );
});
