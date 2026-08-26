import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import {
  listPeople,
  insertPerson,
  updatePerson as persistPerson,
  deletePerson as removePersonRow,
  findPersonByName,
} from '../database/repositories/people';
import {
  listCategories,
  insertCategory,
  deleteCategory as removeCategoryRow,
  seedDefaultCategories,
} from '../database/repositories/categories';
import {
  listDues,
  insertDue,
  updateDue as persistDueRow,
  softDeleteDue,
  restoreDue,
} from '../database/repositories/dues';
import {
  listAllPayments,
  insertPayment,
  deletePayment as removePaymentRow,
} from '../database/repositories/payments';
import {
  listAllReturns,
  insertItemReturn,
  deleteItemReturn as removeReturnRow,
} from '../database/repositories/returns';
import { newId } from '../services/id';
import { validatePersonName } from '../services/validation';
import { computeMoneySummary } from '../models/money';
import { computeItemSummary } from '../models/items';
import { getDueStatusInfo, DueStatusInfo } from '../models/status';
import { resyncAllReminders } from '../notifications/scheduler';
import {
  ensureRuntimePermission,
  initializeNotificationHandler,
  requestPermissionIfNeeded,
} from '../notifications/permissions';
import { registerCatchUpTask, runReminderCatchUp } from '../notifications/catchUp';
import * as IntentLauncher from 'expo-intent-launcher';
import { getExtraFlag, setExtraFlag } from '../database/repositories/settings';
import { DEFAULT_CATEGORY_NAMES } from '../constants/categories';
import {
  Category,
  Due,
  ItemReturnRecord,
  NonQuantityReturnMark,
  Payment,
  Person,
  ReminderConfig,
} from '../types';
import { fail, ok, Result } from '../utils/result';
import { useSettings } from './SettingsContext';

export interface PersonDraftInput {
  name: string;
  note: string | null;
}

export interface DueEntityInput {
  personId: string;
  direction: Due['direction'];
  kind: Due['kind'];
  amountMinor: number | null;
  currencyCode: string | null;
  itemName: string | null;
  itemDescription: string | null;
  trackQuantity: boolean;
  quantity: number | null;
  categoryId: string | null;
  dueDate: number | null;
  note: string | null;
  reminderConfig: ReminderConfig | null;
}

export interface DataProviderValue {
  ready: boolean;
  people: Person[];
  peopleById: Map<string, Person>;
  dues: Due[];
  categories: Category[];
  categoriesById: Map<string, Category>;
  statusInfoById: Map<string, DueStatusInfo>;
  paymentsByDueId: Map<string, Payment[]>;
  returnsByDueId: Map<string, ItemReturnRecord[]>;
  paymentsFor: (dueId: string) => Payment[];
  returnsFor: (dueId: string) => ItemReturnRecord[];
  /** Rebuilds all scheduled notifications from current data. */
  refreshReminders: () => void;
  /** Requests permission if needed and rebuilds notifications. */
  enableNotificationsFlow: () => Promise<
    'granted' | 'denied' | 'undetermined' | 'unsupported'
  >;

  addPerson: (input: PersonDraftInput) => Promise<Result<Person>>;
  editPerson: (person: Person, input: PersonDraftInput) => Promise<Result<Person>>;
  removePerson: (person: Person) => Promise<void>;

  addCategory: (name: string) => Promise<Result<Category>>;
  removeCategory: (category: Category) => Promise<void>;

  createDue: (input: DueEntityInput) => Promise<Result<Due>>;
  saveDueEdits: (due: Due) => Promise<void>;
  setDueArchived: (due: Due, archived: boolean) => Promise<void>;
  setDueManuallySettled: (due: Due, settled: boolean) => Promise<void>;
  setDueReminder: (due: Due, config: ReminderConfig | null) => Promise<void>;
  deleteDue: (due: Due) => Promise<void>;
  undoDeleteDue: (dueId: string) => Promise<void>;

  addPayment: (
    due: Due,
    amountMinor: number,
    note: string | null,
    paidAt: number
  ) => Promise<Result<null>>;
  deletePayment: (payment: Payment) => Promise<void>;

  addQuantityReturn: (
    due: Due,
    quantity: number,
    note: string | null,
    returnedAt: number
  ) => Promise<Result<null>>;
  addStatusReturn: (
    due: Due,
    mark: NonQuantityReturnMark,
    note: string | null,
    returnedAt: number
  ) => Promise<Result<null>>;
  deleteItemReturnRecord: (record: ItemReturnRecord) => Promise<void>;

  reloadAll: () => Promise<void>;
}

const DataContext = createContext<DataProviderValue | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();
  const [ready, setReady] = useState(false);
  const [people, setPeople] = useState<Person[]>([]);
  const [dues, setDues] = useState<Due[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentsByDueId, setPaymentsByDueId] = useState<Map<string, Payment[]>>(new Map());
  const [returnsByDueId, setReturnsByDueId] = useState<Map<string, ItemReturnRecord[]>>(
    new Map()
  );

  const duesRef = useRef(dues);
  duesRef.current = dues;
  const peopleRef = useRef(people);
  peopleRef.current = people;
  const paymentsByDueIdRef = useRef(paymentsByDueId);
  paymentsByDueIdRef.current = paymentsByDueId;
  const returnsByDueIdRef = useRef(returnsByDueId);
  returnsByDueIdRef.current = returnsByDueId;
  const notificationsEnabledRef = useRef(settings.notificationsEnabled);
  notificationsEnabledRef.current = settings.notificationsEnabled;

  const refresh = useCallback(async (): Promise<void> => {
    const [nextPeople, nextCategories, nextDues, allPayments, allReturns] = await Promise.all([
      listPeople(),
      listCategories(),
      listDues(),
      listAllPayments(),
      listAllReturns(),
    ]);
    const paymentMap = new Map<string, Payment[]>();
    for (const p of allPayments) {
      const list = paymentMap.get(p.dueId);
      if (list) list.push(p);
      else paymentMap.set(p.dueId, [p]);
    }
    const returnMap = new Map<string, ItemReturnRecord[]>();
    for (const r of allReturns) {
      const list = returnMap.get(r.dueId);
      if (list) list.push(r);
      else returnMap.set(r.dueId, [r]);
    }
    setPeople(nextPeople);
    setCategories(nextCategories);
    setDues(nextDues);
    setPaymentsByDueId(paymentMap);
    setReturnsByDueId(returnMap);
  }, []);

  // --- Notification reconciliation -------------------------------------
  const resyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runResync = useCallback(async () => {
    const result = await resyncAllReminders(
      duesRef.current,
      new Map(peopleRef.current.map((p) => [p.id, p])),
      buildStatusMap(duesRef.current, paymentsByDueIdRef.current, returnsByDueIdRef.current),
      { notificationsEnabled: notificationsEnabledRef.current }
    );
    return result;
  }, []);

  const scheduleResync = useCallback(() => {
    if (resyncTimerRef.current) clearTimeout(resyncTimerRef.current);
    resyncTimerRef.current = setTimeout(() => {
      void runResync();
    }, 350);
  }, [runResync]);

  const refreshReminders = useCallback(() => {
    if (resyncTimerRef.current) clearTimeout(resyncTimerRef.current);
    void runResync();
  }, [runResync]);

  const enableNotificationsFlow = useCallback(async () => {
    const state = await requestPermissionIfNeeded();
    await runResync();
    return state;
  }, [runResync]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      initializeNotificationHandler();
      await seedDefaultCategories(DEFAULT_CATEGORY_NAMES);
      await refresh();
      if (!cancelled) setReady(true);

      // First-launch permission flow: ask for notifications, then offer the
      // one-tap battery exemption (aggressive OEM skins kill background
      // alarms otherwise). Both happen once, natively.
      const perm = await ensureRuntimePermission();
      if (perm === 'granted') {
        await runResync();
        await runReminderCatchUp();
        await registerCatchUpTask();
        try {
          const alreadyPrompted = await getExtraFlag('batteryDialogShown');
          if (!alreadyPrompted) {
            await IntentLauncher.startActivityAsync(
              IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
              { data: 'package:com.dues.app' }
            );
          }
          await setExtraFlag('batteryDialogShown', true);
        } catch {
          // Dialog unavailable (some tablets/Go devices) — Settings still offers it.
        }
      } else {
        scheduleResync();
        await registerCatchUpTask();
      }
    })().catch(() => {
      if (!cancelled) setReady(true);
    });

    // Reconcile notifications + deliver any missed reminders whenever the app
    // comes back to the foreground — covers OS permission changes and the
    // "swiped away on aggressive OEM" case.
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void runResync();
        void runReminderCatchUp();
      }
    });

    return () => {
      cancelled = true;
      appStateSub.remove();
      if (resyncTimerRef.current) clearTimeout(resyncTimerRef.current);
    };
  }, [refresh, scheduleResync, runResync]);

  // --- Derived lookups ---------------------------------------------------
  const peopleById = useMemo(
    () => new Map(people.map((p) => [p.id, p])),
    [people]
  );
  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );
  const statusInfoById = useMemo(
    () => buildStatusMap(dues, paymentsByDueId, returnsByDueId),
    [dues, paymentsByDueId, returnsByDueId]
  );

  const paymentsFor = useCallback(
    (dueId: string): Payment[] => paymentsByDueId.get(dueId) ?? [],
    [paymentsByDueId]
  );
  const returnsFor = useCallback(
    (dueId: string): ItemReturnRecord[] => returnsByDueId.get(dueId) ?? [],
    [returnsByDueId]
  );

  // --- People -------------------------------------------------------------
  const addPerson = useCallback(
    async ({ name, note }: PersonDraftInput): Promise<Result<Person>> => {
      const validated = validatePersonName(name);
      if (!validated.ok) return validated;
      const existing = await findPersonByName(validated.value);
      if (existing) return fail('A person with this name already exists');
      const now = Date.now();
      const person: Person = {
        id: newId(),
        name: validated.value,
        note,
        createdAt: now,
        updatedAt: now,
      };
      await insertPerson(person);
      await refresh();
      return ok(person);
    },
    [refresh]
  );

  const editPerson = useCallback(
    async (person: Person, { name, note }: PersonDraftInput): Promise<Result<Person>> => {
      const validated = validatePersonName(name);
      if (!validated.ok) return validated;
      const clash = await findPersonByName(validated.value, person.id);
      if (clash) return fail('A person with this name already exists');
      const updated: Person = {
        ...person,
        name: validated.value,
        note,
        updatedAt: Date.now(),
      };
      await persistPerson(updated);
      await refresh();
      return ok(updated);
    },
    [refresh]
  );

  const removePerson = useCallback(
    async (person: Person) => {
      await removePersonRow(person.id); // cascades to dues/payments/returns
      await refresh();
      scheduleResync();
    },
    [refresh, scheduleResync]
  );

  // --- Categories ----------------------------------------------------------
  const addCategory = useCallback(
    async (name: string): Promise<Result<Category>> => {
      const trimmed = name.trim();
      if (!trimmed) return fail('Enter a category name');
      const lower = trimmed.toLowerCase();
      if (categories.some((c) => c.name.toLowerCase() === lower)) {
        return fail('A category with this name already exists');
      }
      const created = await insertCategory(trimmed);
      await refresh();
      return ok(created);
    },
    [categories, refresh]
  );

  const removeCategory = useCallback(
    async (category: Category) => {
      await removeCategoryRow(category.id);
      await refresh();
    },
    [refresh]
  );

  // --- Dues ---------------------------------------------------------------
  const touchDue = useCallback(
    async (due: Due, mutate?: (d: Due) => Due) => {
      const next = mutate ? mutate(due) : due;
      await persistDueRow({ ...next, updatedAt: Date.now() });
      await refresh();
      scheduleResync();
    },
    [refresh, scheduleResync]
  );

  const createDue = useCallback(
    async (input: DueEntityInput): Promise<Result<Due>> => {
      if (!peopleRef.current.some((p) => p.id === input.personId)) {
        return fail('Select a person first');
      }
      const now = Date.now();
      const due: Due = {
        id: newId(),
        ...input,
        archived: false,
        manuallySettledAt: null,
        createdAt: now,
        updatedAt: now,
      };
      await insertDue(due);
      await refresh();
      scheduleResync();
      return ok(due);
    },
    [refresh, scheduleResync]
  );

  const saveDueEdits = useCallback(
    async (due: Due) => touchDue(due),
    [touchDue]
  );

  const setDueArchived = useCallback(
    async (due: Due, archived: boolean) =>
      touchDue(due, (d) => ({ ...d, archived })),
    [touchDue]
  );

  const setDueManuallySettled = useCallback(
    async (due: Due, settled: boolean) =>
      touchDue(due, (d) => ({ ...d, manuallySettledAt: settled ? Date.now() : null })),
    [touchDue]
  );

  const setDueReminder = useCallback(
    async (due: Due, config: ReminderConfig | null) =>
      touchDue(due, (d) => ({ ...d, reminderConfig: config })),
    [touchDue]
  );

  const deleteDue = useCallback(
    async (due: Due) => {
      await softDeleteDue(due.id);
      await refresh();
      scheduleResync();
    },
    [refresh, scheduleResync]
  );

  const undoDeleteDue = useCallback(
    async (dueId: string) => {
      await restoreDue(dueId);
      await refresh();
      scheduleResync();
    },
    [refresh, scheduleResync]
  );

  // --- Payments --------------------------------------------------------------
  const addPayment = useCallback(
    async (due: Due, amountMinor: number, note: string | null, paidAt: number): Promise<Result<null>> => {
      const existing = paymentsByDueIdRef.current.get(due.id) ?? [];
      const { remainingMinor } = computeMoneySummary(due, existing);
      if (!Number.isInteger(amountMinor) || amountMinor <= 0) return fail('Enter an amount');
      if (remainingMinor <= 0) return fail('This due is already fully paid');
      if (amountMinor > remainingMinor) return fail('Payment exceeds the remaining amount');
      const payment: Payment = {
        id: newId(),
        dueId: due.id,
        amountMinor,
        currencyCode: due.currencyCode ?? '',
        note,
        paidAt,
        createdAt: Date.now(),
      };
      await insertPayment(payment);
      await touchDue(due);
      return ok(null);
    },
    [touchDue]
  );

  const deletePayment = useCallback(
    async (payment: Payment) => {
      await removePaymentRow(payment.id);
      const parent = duesRef.current.find((d) => d.id === payment.dueId);
      if (parent) await touchDue(parent);
      else {
        await refresh();
        scheduleResync();
      }
    },
    [refresh, scheduleResync, touchDue]
  );

  // --- Item returns ------------------------------------------------------------
  const guardReturn = useCallback(
    (due: Due, quantity: number | null): string | null => {
      if (due.kind !== 'item') return 'Only items can be returned';
      if (!due.trackQuantity) return null;
      const summary = computeItemSummary(due, returnsByDueIdRef.current.get(due.id) ?? []);
      const remaining = summary.remainingQuantity ?? 0;
      if (quantity == null || !Number.isInteger(quantity) || quantity <= 0) {
        return 'Enter a quantity';
      }
      if (quantity > remaining) return 'Cannot return more than the remaining quantity';
      return null;
    },
    []
  );

  const addQuantityReturn = useCallback(
    async (due: Due, quantity: number, note: string | null, returnedAt: number): Promise<Result<null>> => {
      const error = guardReturn(due, quantity);
      if (error) return fail(error);
      const record: ItemReturnRecord = {
        id: newId(),
        dueId: due.id,
        kind: 'quantity',
        quantity,
        status: null,
        note,
        returnedAt,
        createdAt: Date.now(),
      };
      await insertItemReturn(record);
      await touchDue(due);
      return ok(null);
    },
    [guardReturn, touchDue]
  );

  const addStatusReturn = useCallback(
    async (due: Due, mark: NonQuantityReturnMark, note: string | null, returnedAt: number): Promise<Result<null>> => {
      const error = guardReturn(due, null);
      if (error) return fail(error);
      const record: ItemReturnRecord = {
        id: newId(),
        dueId: due.id,
        kind: 'status',
        quantity: null,
        status: mark,
        note,
        returnedAt,
        createdAt: Date.now(),
      };
      await insertItemReturn(record);
      await touchDue(due);
      return ok(null);
    },
    [guardReturn, touchDue]
  );

  const deleteItemReturnRecord = useCallback(
    async (record: ItemReturnRecord) => {
      await removeReturnRow(record.id);
      const parent = duesRef.current.find((d) => d.id === record.dueId);
      if (parent) await touchDue(parent);
      else {
        await refresh();
        scheduleResync();
      }
    },
    [refresh, scheduleResync, touchDue]
  );

  const reloadAll = useCallback(async () => {
    await refresh();
    scheduleResync();
  }, [refresh, scheduleResync]);

  const value = useMemo<DataProviderValue>(
    () => ({
      ready,
      people,
      peopleById,
      dues,
      categories,
      categoriesById,
      statusInfoById,
      paymentsByDueId,
      returnsByDueId,
      paymentsFor,
      returnsFor,
      refreshReminders,
      enableNotificationsFlow,
      addPerson,
      editPerson,
      removePerson,
      addCategory,
      removeCategory,
      createDue,
      saveDueEdits,
      setDueArchived,
      setDueManuallySettled,
      setDueReminder,
      deleteDue,
      undoDeleteDue,
      addPayment,
      deletePayment,
      addQuantityReturn,
      addStatusReturn,
      deleteItemReturnRecord,
      reloadAll,
    }),
    [
      ready,
      people,
      peopleById,
      dues,
      categories,
      categoriesById,
      statusInfoById,
      paymentsByDueId,
      returnsByDueId,
      paymentsFor,
      returnsFor,
      refreshReminders,
      enableNotificationsFlow,
      addPerson,
      editPerson,
      removePerson,
      addCategory,
      removeCategory,
      createDue,
      saveDueEdits,
      setDueArchived,
      setDueManuallySettled,
      setDueReminder,
      deleteDue,
      undoDeleteDue,
      addPayment,
      deletePayment,
      addQuantityReturn,
      addStatusReturn,
      deleteItemReturnRecord,
      reloadAll,
    ]
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function buildStatusMap(
  dues: Due[],
  paymentsByDueId: Map<string, Payment[]>,
  returnsByDueId: Map<string, ItemReturnRecord[]>
): Map<string, DueStatusInfo> {
  const map = new Map<string, DueStatusInfo>();
  for (const due of dues) {
    map.set(
      due.id,
      getDueStatusInfo(due, paymentsByDueId.get(due.id) ?? [], returnsByDueId.get(due.id) ?? [])
    );
  }
  return map;
}

export function useData(): DataProviderValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
