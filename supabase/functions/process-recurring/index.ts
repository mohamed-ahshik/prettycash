import { createClient } from 'npm:@supabase/supabase-js@2';
import {
  formatLocalDate,
  getDueDate,
  getLocalDateTimeParts,
  isNotificationWindow,
  normalizeTimeZone,
} from '../_shared/recurrence.ts';

const NOTIFICATION_HOUR = 9;
const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface RecurringRow {
  id: string;
  user_id: string;
  name: string;
  type: 'expense' | 'income';
  amount: number;
  category_id: string | null;
  icon: string | null;
  day_of_month: number;
  created_at: string;
}

interface PushTokenRow {
  expo_push_token: string;
}

interface PushTicket {
  status: 'ok' | 'error';
  details?: { error?: string };
}

function monthName(date: string): string {
  const [year, month] = date.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    timeZone: 'UTC',
  });
}

function pushBody(item: RecurringRow, occurrenceDate: string): string {
  const [, , day] = occurrenceDate.split('-').map(Number);
  return `${monthName(occurrenceDate)} has ${day} days. Add ${item.name} on ${monthName(
    occurrenceDate,
  )} ${day} or skip this month.`;
}

async function sendPush(
  admin: ReturnType<typeof createClient>,
  tokens: string[],
  item: RecurringRow,
  occurrenceDate: string,
  occurrenceId: string,
): Promise<{ sent: boolean; invalidTokens: string[] }> {
  if (!tokens.length) return { sent: false, invalidTokens: [] };

  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(
      tokens.map((token) => ({
        to: token,
        title: 'Recurring date needs confirmation',
        body: pushBody(item, occurrenceDate),
        sound: 'default',
        data: {
          type: 'recurring_occurrence',
          occurrenceId,
        },
      })),
    ),
  });

  if (!response.ok) return { sent: false, invalidTokens: [] };

  const json = (await response.json()) as { data?: PushTicket[] };
  const invalidTokens: string[] = [];
  (json.data ?? []).forEach((ticket, index) => {
    if (ticket.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
      invalidTokens.push(tokens[index]);
    }
  });

  if (invalidTokens.length) {
    await admin.from('push_tokens').delete().in('expo_push_token', invalidTokens);
  }

  return { sent: true, invalidTokens };
}

Deno.serve(async (request) => {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret || request.headers.get('x-cron-secret') !== cronSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const [{ data: profiles, error: profilesError }, { data: items, error: itemsError }] =
    await Promise.all([
      admin.from('profiles').select('user_id, timezone'),
      admin
        .from('recurring_items')
        .select('id, user_id, name, type, amount, category_id, icon, day_of_month, created_at')
        .eq('active', true),
    ]);

  if (profilesError || itemsError) {
    return Response.json(
      { error: profilesError?.message ?? itemsError?.message ?? 'Failed to load recurring items' },
      { status: 500 },
    );
  }

  const timezones = new Map<string, string>(
    (profiles ?? []).map((profile) => [
      profile.user_id,
      normalizeTimeZone(profile.timezone),
    ]),
  );

  const now = new Date();
  const result = { posted: 0, pending: 0, pushed: 0, failed: 0 };

  for (const item of (items ?? []) as RecurringRow[]) {
    try {
      const timeZone = timezones.get(item.user_id) ?? 'UTC';
      const local = getLocalDateTimeParts(now, timeZone);
      const created = getLocalDateTimeParts(new Date(item.created_at), timeZone);
      const due = getDueDate(local.year, local.month, item.day_of_month);
      const dueDate = formatLocalDate(due);
      const createdDate = formatLocalDate(created);

      if (createdDate > dueDate) continue;

      if (due.ambiguous) {
        const isLastDay = local.day === due.lastDay;
        if (!isLastDay || !isNotificationWindow(local, NOTIFICATION_HOUR)) continue;

        const { data, error } = await admin.rpc('create_pending_recurring_occurrence', {
          p_recurring_item_id: item.id,
          p_occurrence_date: dueDate,
        });
        if (error) throw error;

        const occurrence = data?.[0] as
          | {
              occurrence_id: string;
              inserted: boolean;
              status: string;
              notification_sent_at: string | null;
            }
          | undefined;

        if (!occurrence || occurrence.status !== 'pending' || occurrence.notification_sent_at) {
          continue;
        }

        result.pending += 1;

        const { data: tokens } = await admin
          .from('push_tokens')
          .select('expo_push_token')
          .eq('user_id', item.user_id);

        const push = await sendPush(
          admin,
          ((tokens ?? []) as PushTokenRow[]).map((token) => token.expo_push_token),
          item,
          dueDate,
          occurrence.occurrence_id,
        );

        if (push.sent) {
          await admin
            .from('recurring_occurrences')
            .update({ notification_sent_at: new Date().toISOString() })
            .eq('id', occurrence.occurrence_id);
          result.pushed += 1;
        }
      } else if (local.day >= due.day) {
        const { error } = await admin.rpc('post_recurring_occurrence', {
          p_recurring_item_id: item.id,
          p_occurrence_date: dueDate,
        });
        if (error) throw error;
        result.posted += 1;
      }
    } catch {
      result.failed += 1;
    }
  }

  return Response.json(result);
});
