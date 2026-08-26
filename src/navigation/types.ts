import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  Home: undefined;
  Dues: { filter?: string } | undefined;
  People: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  DueDetails: { dueId: string };
  DueForm: { mode: 'add'; presetPersonId?: string } | { mode: 'edit'; dueId: string };
  PersonDetails: { personId: string };
  PersonForm: { mode: 'add' } | { mode: 'edit'; personId: string };
  Categories: undefined;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
