"use client";

import { createStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";

export type AccountGroup = "spending" | "saving";
export type AccountColour = "black" | "lime" | "white" | "grey";

export type Account = {
  id: string;
  name: string;
  accountNumber: string | null;
  group: AccountGroup;
  colour: AccountColour;
  sortOrder: number;
  startingBalance: number;
  archived: boolean;
};

export type AccountInput = Pick<Account, "name" | "accountNumber" | "group" | "colour" | "startingBalance">;

export const ACCOUNT_NAME_MAX = 24;

type Row = {
  id: string;
  name: string;
  account_number: string | null;
  account_group: AccountGroup;
  colour: AccountColour;
  sort_order: number;
  starting_balance: number;
  archived: boolean;
};

const COLUMNS = "id, name, account_number, account_group, colour, sort_order, starting_balance, archived";

function fromRow(r: Row): Account {
  return {
    id: r.id,
    name: r.name,
    accountNumber: r.account_number,
    group: r.account_group,
    colour: r.colour,
    sortOrder: r.sort_order,
    startingBalance: Number(r.starting_balance),
    archived: r.archived,
  };
}

function toRow(input: AccountInput) {
  const digits = (input.accountNumber ?? "").replace(/\D/g, "").slice(0, 20);
  return {
    name: input.name.trim().slice(0, ACCOUNT_NAME_MAX),
    account_number: digits || null,
    account_group: input.group,
    colour: input.colour,
    starting_balance: input.startingBalance,
  };
}

const store = createStore<Account[]>(async () => {
  const { data, error } = await supabase()
    .from("accounts")
    .select(COLUMNS)
    .order("sort_order")
    .order("created_at");
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}, "accounts");

export const useAccounts = store.use;
export const resetAccounts = store.reset;

function friendly(e: { message?: string; code?: string }) {
  if (e.code === "23505") return new Error("You already have an account with that name.");
  return new Error(e.message ?? "Could not save the account");
}

export async function createAccount(input: AccountInput, sortOrder: number): Promise<Account> {
  const { data, error } = await supabase()
    .from("accounts")
    .insert({ ...toRow(input), sort_order: sortOrder })
    .select(COLUMNS)
    .single();
  if (error) throw friendly(error);
  const account = fromRow(data as Row);
  store.update((list) => [...list, account]);
  return account;
}

async function patchAccount(id: string, patch: Record<string, unknown>): Promise<Account> {
  const { data, error } = await supabase().from("accounts").update(patch).eq("id", id).select(COLUMNS).single();
  if (error) throw friendly(error);
  const account = fromRow(data as Row);
  store.update((list) => list.map((a) => (a.id === id ? account : a)));
  return account;
}

export function saveAccount(id: string, input: AccountInput) {
  return patchAccount(id, toRow(input));
}

export function setAccountArchived(id: string, archived: boolean) {
  return patchAccount(id, { archived });
}
