export type AccountLinkProvider = "gml" | "telegram" | "email";

export type AccountLinkStatus = "pending" | "linked" | "revoked";

export type SeasonStatus = "draft" | "scheduled" | "active" | "completed" | "archived";

export type ProgressionKind = "mission" | "streak" | "purchase" | "admin_grant";

export type RewardType = "currency" | "cosmetic" | "entitlement";

export type EntitlementSource =
  | "purchase"
  | "reward"
  | "admin_grant"
  | "support_compensation";

export type EntitlementStatus = "pending" | "active" | "expired" | "revoked";

export type LedgerDirection = "credit" | "debit";

export type LedgerSourceType = "payment" | "reward" | "admin_adjustment" | "refund";

export type LedgerEntryStatus = "pending" | "posted" | "reversed";

export type UserAccount = {
  id: string;
  externalRef: string;
  createdAt: string;
  updatedAt: string;
};

export type Profile = {
  id: string;
  userId: string;
  handle: string;
  locale: string;
  hardCurrencyBalance: bigint;
  softCurrencyBalance: bigint;
  createdAt: string;
  updatedAt: string;
};

export type AccountLink = {
  id: string;
  userId: string;
  provider: AccountLinkProvider;
  providerAccountId: string;
  status: AccountLinkStatus;
  linkedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Season = {
  id: string;
  slug: string;
  title: string;
  status: SeasonStatus;
  startsAt: string;
  endsAt: string;
  createdAt: string;
  updatedAt: string;
};

export type SeasonProgression = {
  id: string;
  seasonId: string;
  profileId: string;
  xp: bigint;
  level: number;
  lastGrantedRewardLevel: number;
  updatedAt: string;
};

export type RewardDefinition = {
  id: string;
  seasonId: string;
  level: number;
  rewardType: RewardType;
  entitlementSku: string | null;
  currencyAmount: bigint | null;
  payloadJson: string | null;
  createdAt: string;
};

export type Entitlement = {
  id: string;
  profileId: string;
  sku: string;
  source: EntitlementSource;
  status: EntitlementStatus;
  sourceLedgerEntryId: string | null;
  validFrom: string;
  validUntil: string | null;
  grantedAt: string;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentLedgerEntry = {
  id: string;
  profileId: string;
  direction: LedgerDirection;
  sourceType: LedgerSourceType;
  sourceRef: string;
  amountMinor: bigint;
  currency: string;
  status: LedgerEntryStatus;
  entitlementId: string | null;
  metadataJson: string | null;
  occurredAt: string;
  createdAt: string;
};

const isIsoTimestamp = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value);

const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

export const assertCoreModelConsistency = (input: {
  profile: Profile;
  accountLinks: AccountLink[];
  season: Season;
  progression: SeasonProgression;
  rewards: RewardDefinition[];
  entitlements: Entitlement[];
  ledgerEntries: PaymentLedgerEntry[];
}): void => {
  const { accountLinks, entitlements, ledgerEntries, profile, progression, rewards, season } = input;

  assert(profile.userId.length > 0, "profile.user_id is required");
  assert(profile.handle.length >= 3, "profile.handle must be at least 3 characters");
  assert(profile.hardCurrencyBalance >= 0n, "profile.hard_currency_balance cannot be negative");
  assert(profile.softCurrencyBalance >= 0n, "profile.soft_currency_balance cannot be negative");

  const accountLinkSlots = new Set<string>();

  for (const accountLink of accountLinks) {
    assert(accountLink.userId === profile.userId, "account link must belong to the same user");
    assert(accountLink.providerAccountId.length > 0, "account link provider account id is required");
    const accountLinkSlot = `${accountLink.userId}:${accountLink.provider}`;
    assert(
      !accountLinkSlots.has(accountLinkSlot),
      "only one account link per provider is allowed for a user"
    );
    accountLinkSlots.add(accountLinkSlot);

    if (accountLink.status === "linked") {
      assert(accountLink.linkedAt !== null, "linked account link must have linkedAt");
    }

    if (accountLink.status === "revoked") {
      assert(accountLink.revokedAt !== null, "revoked account link must have revokedAt");
    }
  }

  assert(season.slug.length > 0, "season.slug is required");
  assert(season.startsAt < season.endsAt, "season.startsAt must be earlier than season.endsAt");

  if (season.status === "active") {
    assert(isIsoTimestamp(season.startsAt), "season.startsAt must be ISO-8601");
    assert(isIsoTimestamp(season.endsAt), "season.endsAt must be ISO-8601");
  }

  assert(progression.seasonId === season.id, "progression must reference the same season");
  assert(progression.profileId === profile.id, "progression must reference the same profile");
  assert(progression.xp >= 0n, "progression.xp cannot be negative");
  assert(progression.level >= 0, "progression.level cannot be negative");
  assert(
    progression.lastGrantedRewardLevel <= progression.level,
    "progression.lastGrantedRewardLevel cannot exceed progression.level"
  );

  const rewardLevels = new Set<number>();

  for (const reward of rewards) {
    assert(reward.seasonId === season.id, "reward must reference the same season");
    assert(reward.level > 0, "reward.level must be positive");
    assert(!rewardLevels.has(reward.level), "reward.level must be unique within a season");
    rewardLevels.add(reward.level);

    if (reward.rewardType === "entitlement") {
      assert(reward.entitlementSku !== null, "entitlement reward must define entitlementSku");
    }

    if (reward.rewardType === "currency") {
      assert(
        reward.currencyAmount !== null && reward.currencyAmount > 0n,
        "currency reward must define a positive currencyAmount"
      );
    }
  }

  const activeEntitlementBySku = new Set<string>();
  const ledgerEntryIds = new Set(ledgerEntries.map((entry) => entry.id));
  const entitlementIds = new Set<string>();

  for (const entitlement of entitlements) {
    assert(entitlement.profileId === profile.id, "entitlement must reference the same profile");
    assert(entitlement.sku.length > 0, "entitlement.sku is required");
    assert(entitlement.validUntil === null || entitlement.validFrom < entitlement.validUntil, "entitlement validity window is invalid");

    if (entitlement.status === "active") {
      assert(!activeEntitlementBySku.has(entitlement.sku), "only one active entitlement per sku is allowed");
      activeEntitlementBySku.add(entitlement.sku);
    }

    if (entitlement.source === "purchase") {
      assert(
        entitlement.sourceLedgerEntryId !== null,
        "purchase entitlement must reference the source ledger entry"
      );
    }

    if (entitlement.sourceLedgerEntryId !== null) {
      assert(
        ledgerEntryIds.has(entitlement.sourceLedgerEntryId),
        "entitlement source ledger entry must exist"
      );
    }

    entitlementIds.add(entitlement.id);
  }

  for (const entry of ledgerEntries) {
    assert(entry.profileId === profile.id, "ledger entry must reference the same profile");
    assert(entry.amountMinor > 0n, "ledger entry amountMinor must be positive");
    assert(/^[A-Z]{3}$/.test(entry.currency), "ledger entry currency must be ISO-4217");
    assert(entry.sourceRef.length > 0, "ledger entry sourceRef is required");

    if (entry.entitlementId !== null) {
      assert(entitlementIds.has(entry.entitlementId), "ledger entry entitlement must exist");
    }

    if (entry.sourceType === "payment") {
      assert(entry.direction === "credit", "payment ledger entries must be credits");
    }

    if (entry.sourceType === "refund") {
      assert(entry.direction === "debit", "refund ledger entries must be debits");
    }
  }
};

export const coreStorageMigrationName = "0001_core_domain_baseline.sql";
