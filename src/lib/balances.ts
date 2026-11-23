// Account balances are always calculated from transactions, never stored (brief: Core concepts).

export type TransactionType = "expense" | "income" | "transfer" | "saving_deposit" | "saving_withdraw";

/** The fields of a transaction that move money between accounts. Amount is positive whole rupiah. */
export type MoneyMove = {
  type: TransactionType;
  amount: number;
  accountId: string;
  toAccountId: string | null;
};

/**
 * Starting balance + income − expenses ± transfers ± saving moves.
 * Transfers and saving moves take money out of accountId and put it into toAccountId;
 * when both are the same account (saving without moving money) the balance doesn't change.
 */
export function accountBalance(accountId: string, startingBalance: number, moves: readonly MoneyMove[]): number {
  let balance = startingBalance;
  for (const m of moves) {
    switch (m.type) {
      case "income":
        if (m.accountId === accountId) balance += m.amount;
        break;
      case "expense":
        if (m.accountId === accountId) balance -= m.amount;
        break;
      case "transfer":
      case "saving_deposit":
      case "saving_withdraw":
        if (m.accountId === accountId) balance -= m.amount;
        if (m.toAccountId === accountId) balance += m.amount;
        break;
    }
  }
  return balance;
}

/**
 * Money marked as saved that sits in this account: deposits land in toAccountId,
 * withdrawals take saved money out of accountId.
 */
export function savedInAccount(accountId: string, moves: readonly MoneyMove[]): number {
  let saved = 0;
  for (const m of moves) {
    if (m.type === "saving_deposit" && m.toAccountId === accountId) saved += m.amount;
    if (m.type === "saving_withdraw" && m.accountId === accountId) saved -= m.amount;
  }
  return saved;
}

/** Sum of balances, e.g. total balance or one group's total. */
export function sumBalances(items: readonly { balance: number }[]): number {
  return items.reduce((total, item) => total + item.balance, 0);
}
