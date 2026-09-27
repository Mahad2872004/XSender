import { requireOnboarded } from '@/server/auth/session';
import { inboxCounts, listConversations, loadThread } from '@/server/inbox/service';
import InboxClient from './InboxClient';

export const metadata = { title: 'Inbox · xSender' };

/**
 * The Unified Inbox, on real data.
 *
 * Which conversation is open lives in the URL so a staff member can send
 * someone a link to the exact thread, and a refresh does not lose their place.
 */
export default async function InboxPage(props: PageProps<'/app/inbox'>) {
  const searchParams = await props.searchParams;
  const ctx = await requireOnboarded();

  const filterParam = typeof searchParams.filter === 'string' ? searchParams.filter : 'all';
  const filter = (['all', 'needs_human', 'open', 'resolved'] as const).includes(
    filterParam as 'all'
  )
    ? (filterParam as 'all' | 'needs_human' | 'open' | 'resolved')
    : 'all';

  const [conversations, counts] = await Promise.all([
    listConversations(ctx, { filter }),
    inboxCounts(ctx),
  ]);

  // Default to whichever conversation is at the top, which after sorting is
  // the one most likely to need a person.
  const selectedId =
    typeof searchParams.c === 'string' ? searchParams.c : (conversations[0]?.id ?? null);

  const thread = selectedId ? await loadThread(ctx, selectedId) : null;

  return (
    <InboxClient
      workspaceId={ctx.workspaceId}
      conversations={conversations}
      counts={counts}
      filter={filter}
      selectedId={thread ? selectedId : null}
      thread={thread}
      canReply={ctx.hasRole('agent')}
    />
  );
}
