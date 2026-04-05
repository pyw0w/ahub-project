const isIsoTimestamp = (value: string): boolean =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value);

const assert = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new Error(message);
  }
};

export type ExternalAccountProvider = "gml";

export type AccountLinkStatus =
  | "pending"
  | "linked"
  | "conflict"
  | "temporarily_unavailable"
  | "revoked";

export type AccountLinkFailureCode =
  | "external_account_already_linked"
  | "telegram_identity_claimed_by_another_user"
  | "gml_temporarily_unavailable";

export type TelegramIdentity = {
  id: string;
  telegramUserId: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  languageCode: string | null;
  lastAuthAt: string;
  createdAt: string;
  updatedAt: string;
};

export type ExternalAccount = {
  id: string;
  provider: ExternalAccountProvider;
  providerAccountId: string;
  displayName: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountLink = {
  id: string;
  userId: string;
  telegramIdentityId: string;
  externalAccountId: string | null;
  status: AccountLinkStatus;
  failureCode: AccountLinkFailureCode | null;
  failureMessage: string | null;
  requestedAt: string;
  linkedAt: string | null;
  resolvedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TelegramIdentityInput = {
  id: string;
  telegramUserId: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  languageCode: string | null;
  authAt: string;
};

export type ExternalAccountInput = {
  id: string;
  provider: ExternalAccountProvider;
  providerAccountId: string;
  displayName: string | null;
};

export const ACCOUNT_LINK_STATUS_TRANSITIONS: Record<AccountLinkStatus, AccountLinkStatus[]> = {
  pending: ["linked", "conflict", "temporarily_unavailable", "revoked"],
  linked: ["revoked"],
  conflict: ["pending", "revoked"],
  temporarily_unavailable: ["pending", "linked", "revoked"],
  revoked: ["pending"]
};

export class AccountLinkConflictError extends Error {
  readonly code:
    | "external_account_already_linked"
    | "telegram_identity_claimed_by_another_user";

  constructor(
    code:
      | "external_account_already_linked"
      | "telegram_identity_claimed_by_another_user",
    message: string
  ) {
    super(message);
    this.name = "AccountLinkConflictError";
    this.code = code;
  }
}

export class AccountLinkTransitionError extends Error {
  readonly fromStatus: AccountLinkStatus;
  readonly toStatus: AccountLinkStatus;

  constructor(fromStatus: AccountLinkStatus, toStatus: AccountLinkStatus) {
    super(`Cannot transition account link from ${fromStatus} to ${toStatus}`);
    this.name = "AccountLinkTransitionError";
    this.fromStatus = fromStatus;
    this.toStatus = toStatus;
  }
}

export const canTransitionAccountLinkStatus = (
  fromStatus: AccountLinkStatus,
  toStatus: AccountLinkStatus
): boolean => ACCOUNT_LINK_STATUS_TRANSITIONS[fromStatus].includes(toStatus);

export const assertAccountLinkTransition = (
  fromStatus: AccountLinkStatus,
  toStatus: AccountLinkStatus
): void => {
  if (!canTransitionAccountLinkStatus(fromStatus, toStatus)) {
    throw new AccountLinkTransitionError(fromStatus, toStatus);
  }
};

export const assertAccountLinkRecordConsistency = (accountLink: AccountLink): void => {
  assert(accountLink.userId.length > 0, "account link userId is required");
  assert(
    accountLink.telegramIdentityId.length > 0,
    "account link telegramIdentityId is required"
  );
  assert(isIsoTimestamp(accountLink.requestedAt), "account link requestedAt must be ISO-8601");

  if (accountLink.status === "linked") {
    assert(
      accountLink.externalAccountId !== null,
      "linked account link must reference an external account"
    );
    assert(accountLink.linkedAt !== null, "linked account link must have linkedAt");
  }

  if (accountLink.status === "temporarily_unavailable") {
    assert(
      accountLink.failureCode === "gml_temporarily_unavailable",
      "temporarily_unavailable account link must capture gml_temporarily_unavailable"
    );
  }

  if (accountLink.status === "conflict") {
    assert(accountLink.failureCode !== null, "conflict account link must have failureCode");
    assert(accountLink.resolvedAt !== null, "conflict account link must have resolvedAt");
  }

  if (accountLink.status === "revoked") {
    assert(accountLink.revokedAt !== null, "revoked account link must have revokedAt");
  }
};

export type AccountLinkRepository = {
  beginLink(input: {
    linkId: string;
    userId: string;
    telegramIdentity: TelegramIdentityInput;
    requestedAt: string;
  }): AccountLink;
  markTemporarilyUnavailable(input: {
    linkId: string;
    userId: string;
    telegramIdentity: TelegramIdentityInput;
    requestedAt: string;
    observedAt: string;
    failureMessage: string;
  }): AccountLink;
  completeLink(input: {
    linkId: string;
    userId: string;
    telegramIdentity: TelegramIdentityInput;
    externalAccount: ExternalAccountInput;
    requestedAt: string;
    linkedAt: string;
  }): AccountLink;
  getLinkById(linkId: string): AccountLink | undefined;
  listLinks(): AccountLink[];
};

const clone = <Value>(value: Value): Value => structuredClone(value);

const externalAccountKey = (provider: ExternalAccountProvider, providerAccountId: string): string =>
  `${provider}:${providerAccountId}`;

const isTelegramLinkActive = (status: AccountLinkStatus): boolean =>
  status === "pending" || status === "linked" || status === "temporarily_unavailable";

export const createInMemoryAccountLinkRepository = (): AccountLinkRepository => {
  const telegramIdentities = new Map<string, TelegramIdentity>();
  const telegramIdentityByUserId = new Map<string, string>();
  const externalAccounts = new Map<string, ExternalAccount>();
  const externalAccountByProviderRef = new Map<string, string>();
  const links = new Map<string, AccountLink>();
  const activeLinkByTelegramIdentityId = new Map<string, string>();
  const linkedAccountByExternalAccountId = new Map<string, string>();

  const upsertTelegramIdentity = (input: TelegramIdentityInput): TelegramIdentity => {
    const existingIdentityId = telegramIdentityByUserId.get(input.telegramUserId);

    if (existingIdentityId !== undefined) {
      const existing = telegramIdentities.get(existingIdentityId);

      if (existing === undefined) {
        throw new Error("telegram identity index is corrupted");
      }

      const updated: TelegramIdentity = {
        ...existing,
        username: input.username,
        firstName: input.firstName,
        lastName: input.lastName,
        languageCode: input.languageCode,
        lastAuthAt: input.authAt,
        updatedAt: input.authAt
      };

      telegramIdentities.set(updated.id, updated);

      return updated;
    }

    const created: TelegramIdentity = {
      id: input.id,
      telegramUserId: input.telegramUserId,
      username: input.username,
      firstName: input.firstName,
      lastName: input.lastName,
      languageCode: input.languageCode,
      lastAuthAt: input.authAt,
      createdAt: input.authAt,
      updatedAt: input.authAt
    };

    telegramIdentities.set(created.id, created);
    telegramIdentityByUserId.set(created.telegramUserId, created.id);

    return created;
  };

  const upsertExternalAccount = (input: ExternalAccountInput, observedAt: string): ExternalAccount => {
    const providerRef = externalAccountKey(input.provider, input.providerAccountId);
    const existingExternalAccountId = externalAccountByProviderRef.get(providerRef);

    if (existingExternalAccountId !== undefined) {
      const existing = externalAccounts.get(existingExternalAccountId);

      if (existing === undefined) {
        throw new Error("external account index is corrupted");
      }

      const updated: ExternalAccount = {
        ...existing,
        displayName: input.displayName,
        updatedAt: observedAt
      };

      externalAccounts.set(updated.id, updated);

      return updated;
    }

    const created: ExternalAccount = {
      id: input.id,
      provider: input.provider,
      providerAccountId: input.providerAccountId,
      displayName: input.displayName,
      createdAt: observedAt,
      updatedAt: observedAt
    };

    externalAccounts.set(created.id, created);
    externalAccountByProviderRef.set(providerRef, created.id);

    return created;
  };

  const getActiveLinkForTelegramIdentity = (
    telegramIdentityId: string
  ): AccountLink | undefined => {
    const linkId = activeLinkByTelegramIdentityId.get(telegramIdentityId);
    return linkId === undefined ? undefined : links.get(linkId);
  };

  const persistLink = (accountLink: AccountLink): AccountLink => {
    assertAccountLinkRecordConsistency(accountLink);
    links.set(accountLink.id, accountLink);

    if (isTelegramLinkActive(accountLink.status)) {
      activeLinkByTelegramIdentityId.set(accountLink.telegramIdentityId, accountLink.id);
    } else {
      activeLinkByTelegramIdentityId.delete(accountLink.telegramIdentityId);
    }

    if (accountLink.status === "linked" && accountLink.externalAccountId !== null) {
      linkedAccountByExternalAccountId.set(accountLink.externalAccountId, accountLink.id);
    } else if (accountLink.externalAccountId !== null) {
      linkedAccountByExternalAccountId.delete(accountLink.externalAccountId);
    }

    return accountLink;
  };

  const createPendingLink = (
    input: {
      linkId: string;
      userId: string;
      telegramIdentityId: string;
      requestedAt: string;
    }
  ): AccountLink =>
    persistLink({
      id: input.linkId,
      userId: input.userId,
      telegramIdentityId: input.telegramIdentityId,
      externalAccountId: null,
      status: "pending",
      failureCode: null,
      failureMessage: null,
      requestedAt: input.requestedAt,
      linkedAt: null,
      resolvedAt: null,
      revokedAt: null,
      createdAt: input.requestedAt,
      updatedAt: input.requestedAt
    });

  const ensureOwnedActiveLink = (
    input: {
      linkId: string;
      userId: string;
      telegramIdentityId: string;
      requestedAt: string;
    }
  ): AccountLink => {
    const existing = getActiveLinkForTelegramIdentity(input.telegramIdentityId);

    if (existing === undefined) {
      return createPendingLink(input);
    }

    if (existing.userId !== input.userId) {
      throw new AccountLinkConflictError(
        "telegram_identity_claimed_by_another_user",
        "Telegram identity is already being linked by another user"
      );
    }

    return existing;
  };

  return {
    beginLink(input) {
      const telegramIdentity = upsertTelegramIdentity(input.telegramIdentity);
      const activeLink = ensureOwnedActiveLink({
        linkId: input.linkId,
        userId: input.userId,
        telegramIdentityId: telegramIdentity.id,
        requestedAt: input.requestedAt
      });

      return clone(activeLink);
    },

    markTemporarilyUnavailable(input) {
      const telegramIdentity = upsertTelegramIdentity(input.telegramIdentity);
      const activeLink = ensureOwnedActiveLink({
        linkId: input.linkId,
        userId: input.userId,
        telegramIdentityId: telegramIdentity.id,
        requestedAt: input.requestedAt
      });

      if (activeLink.status !== "temporarily_unavailable") {
        assertAccountLinkTransition(activeLink.status, "temporarily_unavailable");
      }

      const updated = persistLink({
        ...activeLink,
        status: "temporarily_unavailable",
        failureCode: "gml_temporarily_unavailable",
        failureMessage: input.failureMessage,
        linkedAt: null,
        resolvedAt: input.observedAt,
        updatedAt: input.observedAt
      });

      return clone(updated);
    },

    completeLink(input) {
      const telegramIdentity = upsertTelegramIdentity(input.telegramIdentity);
      const externalAccount = upsertExternalAccount(input.externalAccount, input.linkedAt);
      const activeLink = ensureOwnedActiveLink({
        linkId: input.linkId,
        userId: input.userId,
        telegramIdentityId: telegramIdentity.id,
        requestedAt: input.requestedAt
      });
      const linkedExternalAccountId = linkedAccountByExternalAccountId.get(externalAccount.id);

      if (linkedExternalAccountId !== undefined) {
        const existingLinked = links.get(linkedExternalAccountId);

        if (existingLinked === undefined) {
          throw new Error("external account link index is corrupted");
        }

        if (existingLinked.userId !== input.userId) {
          assertAccountLinkTransition(activeLink.status, "conflict");

          persistLink({
            ...activeLink,
            externalAccountId: externalAccount.id,
            status: "conflict",
            failureCode: "external_account_already_linked",
            failureMessage: "External account is already linked to another user",
            linkedAt: null,
            resolvedAt: input.linkedAt,
            updatedAt: input.linkedAt
          });

          throw new AccountLinkConflictError(
            "external_account_already_linked",
            "External account is already linked to another user"
          );
        }

        return clone(existingLinked);
      }

      if (activeLink.status !== "linked") {
        assertAccountLinkTransition(activeLink.status, "linked");
      }

      const linked = persistLink({
        ...activeLink,
        externalAccountId: externalAccount.id,
        status: "linked",
        failureCode: null,
        failureMessage: null,
        linkedAt: input.linkedAt,
        resolvedAt: input.linkedAt,
        updatedAt: input.linkedAt
      });

      return clone(linked);
    },

    getLinkById(linkId) {
      const accountLink = links.get(linkId);
      return accountLink === undefined ? undefined : clone(accountLink);
    },

    listLinks() {
      return [...links.values()].map((accountLink) => clone(accountLink));
    }
  };
};
