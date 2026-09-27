import { requireOnboarded } from '@/server/auth/session';
import { loadRoiSummary, periodFor } from '@/server/roi/summary';
import RoiDashboard from './RoiDashboard';

export const metadata = { title: 'Dashboard · xSender' };

/**
 * The ROI dashboard is the dashboard.
 *
 * It replaced a set of hard-coded widgets — "1,234 conversations today", a
 * leaderboard of invented agents. Those looked like a product and told the owner
 * nothing; worse, a screen that shows fabricated numbers teaches people not to
 * trust the ones that are real.
 */
export default async function DashboardPage(props: PageProps<'/app'>) {
  const searchParams = await props.searchParams;
  const ctx = await requireOnboarded();

  const requested = Number(
    typeof searchParams.days === 'string' ? searchParams.days : '30'
  );
  const days = [7, 30, 90].includes(requested) ? requested : 30;

  const [summary, channels] = await Promise.all([
    loadRoiSummary(ctx, periodFor(days)),
    ctx
      .table('channels')
      .select<{ id: string }>('id')
      .eq('status', 'connected')
      .neq('type', 'simulator')
      .limit(1),
  ]);

  return (
    <RoiDashboard
      summary={summary}
      workspaceName={ctx.workspace.name}
      locale={ctx.workspace.locale}
      canEdit={ctx.hasRole('admin')}
      hasLiveChannel={(channels.data ?? []).length > 0}
    />
  );
}
