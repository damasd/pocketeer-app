import { describe, expect, it } from "vitest";
import { accountBalance, savedInAccount, sumBalances, type MoneyMove } from "./balances";

const BCA = "bca";
const GOPAY = "gopay";
const JAGO = "jago";
const PEGADAIAN = "pegadaian";

describe("accountBalance", () => {
  it("is the starting balance when there are no transactions", () => {
    expect(accountBalance(BCA, 0, [])).toBe(0);
    expect(accountBalance(BCA, 4205000, [])).toBe(4205000);
  });

  it("adds income and subtracts expenses for that account only", () => {
    const moves: MoneyMove[] = [
      { type: "income", amount: 10000000, accountId: BCA, toAccountId: null },
      { type: "expense", amount: 45000, accountId: BCA, toAccountId: null },
      { type: "expense", amount: 35000, accountId: GOPAY, toAccountId: null },
    ];
    expect(accountBalance(BCA, 0, moves)).toBe(9955000);
    expect(accountBalance(GOPAY, 0, moves)).toBe(-35000);
  });

  it("moves money on a transfer without changing the total", () => {
    const moves: MoneyMove[] = [{ type: "transfer", amount: 200000, accountId: BCA, toAccountId: GOPAY }];
    const bca = accountBalance(BCA, 1000000, moves);
    const gopay = accountBalance(GOPAY, 0, moves);
    expect(bca).toBe(800000);
    expect(gopay).toBe(200000);
    expect(bca + gopay).toBe(1000000);
  });

  it("moves money on a saving deposit to another account", () => {
    const moves: MoneyMove[] = [{ type: "saving_deposit", amount: 500000, accountId: BCA, toAccountId: PEGADAIAN }];
    expect(accountBalance(BCA, 1000000, moves)).toBe(500000);
    expect(accountBalance(PEGADAIAN, 0, moves)).toBe(500000);
  });

  it("leaves the balance alone when saving within the same account", () => {
    const moves: MoneyMove[] = [{ type: "saving_deposit", amount: 3000000, accountId: JAGO, toAccountId: JAGO }];
    expect(accountBalance(JAGO, 6150000, moves)).toBe(6150000);
  });

  it("moves money back on a saving withdrawal", () => {
    const moves: MoneyMove[] = [{ type: "saving_withdraw", amount: 250000, accountId: PEGADAIAN, toAccountId: BCA }];
    expect(accountBalance(PEGADAIAN, 2500000, moves)).toBe(2250000);
    expect(accountBalance(BCA, 0, moves)).toBe(250000);
  });
});

describe("savedInAccount", () => {
  it("counts deposits into the account, including same-account savings", () => {
    const moves: MoneyMove[] = [
      { type: "saving_deposit", amount: 3000000, accountId: JAGO, toAccountId: JAGO },
      { type: "saving_deposit", amount: 500000, accountId: BCA, toAccountId: PEGADAIAN },
    ];
    expect(savedInAccount(JAGO, moves)).toBe(3000000);
    expect(savedInAccount(PEGADAIAN, moves)).toBe(500000);
    expect(savedInAccount(BCA, moves)).toBe(0);
  });

  it("subtracts withdrawals from the account the saved money leaves", () => {
    const moves: MoneyMove[] = [
      { type: "saving_deposit", amount: 500000, accountId: BCA, toAccountId: PEGADAIAN },
      { type: "saving_withdraw", amount: 200000, accountId: PEGADAIAN, toAccountId: BCA },
    ];
    expect(savedInAccount(PEGADAIAN, moves)).toBe(300000);
  });

  it("ignores expenses, income and transfers", () => {
    const moves: MoneyMove[] = [
      { type: "income", amount: 100, accountId: JAGO, toAccountId: null },
      { type: "transfer", amount: 100, accountId: BCA, toAccountId: JAGO },
    ];
    expect(savedInAccount(JAGO, moves)).toBe(0);
  });
});

describe("sumBalances", () => {
  it("adds balances", () => {
    expect(sumBalances([{ balance: 4205000 }, { balance: 6150000 }, { balance: -35000 }])).toBe(10320000);
    expect(sumBalances([])).toBe(0);
  });
});
