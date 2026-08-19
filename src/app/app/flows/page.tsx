import Link from 'next/link';
import { CircleDot, Pencil, Workflow } from 'lucide-react';
import { requireOnboarded } from '@/server/auth/session';
import { templatesForVertical } from '@/server/flow/templates';
import TemplateCard from './TemplateCard';
import styles from './flows.module.css';

export const metadata = { title: 'Flows · xSender' };

export default async function FlowsPage() {
  const ctx = await requireOnboarded();

  const { data: flows } = await ctx
    .table('flows')
    .select()
    .order('updated_at', { ascending: false })
    .limit(50);

  const templates = templatesForVertical(ctx.workspace.vertical);
  const existing = flows ?? [];

  return (
    <div className={styles.page}>
      <section>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>Your flows</h2>
            <p className={styles.sectionSub}>
              Each flow answers customers on its own. Published flows are live right now.
            </p>
          </div>
        </div>

        {existing.length === 0 ? (
          <div className={styles.emptyFlows}>
            <Workflow size={22} className={styles.emptyIcon} />
            <p className={styles.emptyTitle}>No flows yet</p>
            <p className={styles.emptyBody}>
              Start from a template below. Nothing goes live until you publish it.
            </p>
          </div>
        ) : (
          <div className={styles.flowGrid}>
            {existing.map((flow) => (
              <Link key={flow.id} href={`/flows/${flow.id}`} className={styles.flowCard}>
                <div className={styles.flowCardHead}>
                  <span className={styles.flowName}>{flow.name}</span>
                  <span
                    className={
                      flow.status === 'published' ? styles.badgeLive : styles.badgeDraft
                    }
                  >
                    <CircleDot size={10} />
                    {flow.status === 'published' ? 'Live' : 'Draft'}
                  </span>
                </div>
                {flow.description && (
                  <p className={styles.flowDescription}>{flow.description}</p>
                )}
                <span className={styles.flowEdit}>
                  <Pencil size={12} />
                  Open in builder
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className={styles.sectionHead}>
          <div>
            <h2 className={styles.sectionTitle}>Start from a template</h2>
            <p className={styles.sectionSub}>
              One engine, tuned per business. Installing gives you a draft you can edit
              before it answers anyone.
            </p>
          </div>
        </div>

        <div className={styles.templateGrid}>
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              id={template.id}
              name={template.name}
              tagline={template.tagline}
              description={template.description}
              replaces={template.replaces}
              recommended={template.verticals.includes(ctx.workspace.vertical)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
