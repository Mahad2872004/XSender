import React from 'react';
import { CheckCircle2, XCircle, Users, Send, UserSquare2, Webhook } from 'lucide-react';
import styles from './page.module.css';

export default function BillingPage() {
  return (
    <div className={styles.container}>
      
      {/* Hero Section */}
      <div className={styles.heroBox}>
        <div className={styles.heroLeft}>
          <div className={styles.heroTitleRow}>
            <h1 className={styles.heroTitle}>Growth Plan</h1>
            <span className={styles.heroBadge}>Renewal: Oct 24, 2024</span>
          </div>
          <p className={styles.heroDesc}>
            Your account is currently active. You are leveraging our high-volume WhatsApp Business API features with priority support.
          </p>
          <div className={styles.heroActions}>
            <button className={styles.btnChangePlan}>Change Plan</button>
            <button className={styles.btnViewInvoices}>View Invoices</button>
          </div>
        </div>

        <div className={styles.heroRight}>
          <div className={styles.spendRow}>
            <div className={styles.spendHeader}>
              <span>CURRENT SPEND</span>
              <span className={styles.spendVal}>$99.00 / $150.00</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: '66%' }}></div>
            </div>
          </div>

          <div className={styles.spendRow}>
            <div className={styles.spendHeader}>
              <span>DAYS REMAINING</span>
              <span className={styles.spendVal}>14 DAYS LEFT</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: '50%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className={styles.pricingGrid}>
        
        {/* Starter */}
        <div className={styles.priceCard}>
          <h2 className={styles.planName}>Starter</h2>
          <p className={styles.planDesc}>For individuals & small teams.</p>
          <div className={styles.priceBox}>
            <span className={styles.priceVal}>$29</span>
            <span className={styles.priceMo}>/mo</span>
          </div>
          
          <div className={styles.featuresList}>
            <div className={styles.featureItem}>
              <CheckCircle2 size={16} className={styles.featureIcon} /> 1,000 Active Contacts
            </div>
            <div className={styles.featureItem}>
              <CheckCircle2 size={16} className={styles.featureIcon} /> 5 Monthly Campaigns
            </div>
            <div className={`${styles.featureItem} ${styles.featureMissingText}`}>
              <XCircle size={16} className={styles.featureIconMissing} /> 1 Agent Only
            </div>
            <div className={`${styles.featureItem} ${styles.featureMissingText}`}>
              <XCircle size={16} className={styles.featureIconMissing} /> Community Support
            </div>
          </div>
          
          <button className={styles.btnDowngrade}>Downgrade</button>
        </div>

        {/* Growth - Active */}
        <div className={`${styles.priceCard} ${styles.active}`}>
          <div className={styles.currentPlanBadge}>CURRENT PLAN</div>
          <h2 className={styles.planName}>Growth</h2>
          <p className={styles.planDesc}>Best for scaling businesses.</p>
          <div className={styles.priceBox}>
            <span className={styles.priceVal}>$99</span>
            <span className={styles.priceMo}>/mo</span>
          </div>
          
          <div className={styles.featuresList}>
            <div className={styles.featureItem}>
              <CheckCircle2 size={16} className={styles.featureIcon} /> 10,000 Active Contacts
            </div>
            <div className={styles.featureItem}>
              <CheckCircle2 size={16} className={styles.featureIcon} /> Unlimited Campaigns
            </div>
            <div className={styles.featureItem}>
              <CheckCircle2 size={16} className={styles.featureIcon} /> 5 Team Agents
            </div>
            <div className={styles.featureItem}>
              <CheckCircle2 size={16} className={styles.featureIcon} /> Priority Support
            </div>
          </div>
          
          <button className={styles.btnActiveNow}>Active Now</button>
        </div>

        {/* Enterprise */}
        <div className={styles.priceCard}>
          <h2 className={styles.planName}>Enterprise</h2>
          <p className={styles.planDesc}>Complex high-volume needs.</p>
          <div className={styles.priceBox}>
            <span className={styles.planName} style={{ fontSize: '32px' }}>Custom</span>
          </div>
          
          <div className={styles.featuresList}>
            <div className={styles.featureItem}>
              <CheckCircle2 size={16} className={styles.featureIcon} /> Unlimited Contacts
            </div>
            <div className={styles.featureItem}>
              <CheckCircle2 size={16} className={styles.featureIcon} /> Custom API Integration
            </div>
            <div className={styles.featureItem}>
              <CheckCircle2 size={16} className={styles.featureIcon} /> Dedicated Account Manager
            </div>
            <div className={styles.featureItem}>
              <CheckCircle2 size={16} className={styles.featureIcon} /> 99.9% Uptime SLA
            </div>
          </div>
          
          <button className={styles.btnUpgrade}>Upgrade</button>
        </div>

      </div>

      {/* Usage Tracking */}
      <div>
        <div className={styles.sectionHeader} style={{ marginBottom: '24px' }}>
          <div>
            <h2 className={styles.sectionTitle}>Real-time Usage Tracking</h2>
          </div>
          <span className={styles.updateBadge}>Updated 5m ago</span>
        </div>

        <div className={styles.usageGrid}>
          {/* Active Contacts */}
          <div className={styles.usageCard}>
            <div className={styles.usageHeader}>
              Active Contacts
              <Users size={16} className={styles.usageIcon} />
            </div>
            <div className={styles.usageValueBox}>
              <span className={styles.usageVal}>4,209</span>
              <span className={styles.usageTotal}>/ 10k</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: '42%' }}></div>
            </div>
            <span className={`${styles.usageStatusText} ${styles.statusSafe}`}>Status: Safe</span>
          </div>

          {/* Campaigns Sent */}
          <div className={styles.usageCard}>
            <div className={styles.usageHeader}>
              Campaigns Sent
              <Send size={16} className={styles.usageIconWarn} />
            </div>
            <div className={styles.usageValueBox}>
              <span className={styles.usageVal}>28</span>
              <span className={styles.usageTotal}>/ 30</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: '93%', backgroundColor: '#facc15' }}></div>
            </div>
            <span className={`${styles.usageStatusText} ${styles.statusWarn}`}>Status: Near Limit</span>
          </div>

          {/* Team Agents */}
          <div className={styles.usageCard}>
            <div className={styles.usageHeader}>
              Team Agents
              <UserSquare2 size={16} className={styles.usageIcon} />
            </div>
            <div className={styles.usageValueBox}>
              <span className={styles.usageVal}>3</span>
              <span className={styles.usageTotal}>/ 5</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: '60%' }}></div>
            </div>
            <span className={`${styles.usageStatusText} ${styles.statusSafe}`}>Status: Safe</span>
          </div>

          {/* API Requests */}
          <div className={styles.usageCard}>
            <div className={styles.usageHeader}>
              API Requests
              <Webhook size={16} className={styles.usageIconDanger} />
            </div>
            <div className={styles.usageValueBox}>
              <span className={styles.usageVal}>52k</span>
              <span className={styles.usageTotal}>/ 50k</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: '100%', backgroundColor: 'var(--status-red)' }}></div>
            </div>
            <span className={`${styles.usageStatusText} ${styles.statusDanger}`}>Status: Exceeded</span>
          </div>
        </div>
      </div>

      {/* WhatsApp Conversation Charges */}
      <div>
        <div className={styles.sectionHeader} style={{ marginBottom: '24px' }}>
          <div>
            <h2 className={styles.sectionTitle}>WhatsApp Conversation Charges</h2>
            <p className={styles.sectionSubtitle}>Estimated costs per 24-hour conversation window by category and region.</p>
          </div>
          <button className={styles.btnDownload}>Download PDF Rate Card</button>
        </div>

        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>REGION / COUNTRY</th>
                <th className={styles.th}>MARKETING</th>
                <th className={styles.th}>UTILITY</th>
                <th className={styles.th}>AUTHENTICATION</th>
                <th className={styles.th}>SERVICE</th>
              </tr>
            </thead>
            <tbody>
              <tr className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.flagCell}>
                    <img src="https://flagcdn.com/w40/in.png" alt="India" className={styles.flag} />
                    India
                  </div>
                </td>
                <td className={styles.td}>$0.0099</td>
                <td className={styles.td}>$0.0042</td>
                <td className={styles.td}>$0.0012</td>
                <td className={styles.td}>$0.0035</td>
              </tr>
              <tr className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.flagCell}>
                    <img src="https://flagcdn.com/w40/br.png" alt="Brazil" className={styles.flag} />
                    Brazil
                  </div>
                </td>
                <td className={styles.td}>$0.0625</td>
                <td className={styles.td}>$0.0350</td>
                <td className={styles.td}>$0.0315</td>
                <td className={styles.td}>$0.0290</td>
              </tr>
              <tr className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.flagCell}>
                    <img src="https://flagcdn.com/w40/gb.png" alt="UK" className={styles.flag} />
                    United Kingdom
                  </div>
                </td>
                <td className={styles.td}>$0.0450</td>
                <td className={styles.td}>$0.0320</td>
                <td className={styles.td}>$0.0280</td>
                <td className={styles.td}>$0.0310</td>
              </tr>
              <tr className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.flagCell}>
                    <img src="https://flagcdn.com/w40/us.png" alt="USA" className={styles.flag} />
                    North America
                  </div>
                </td>
                <td className={styles.td}>$0.0150</td>
                <td className={styles.td}>$0.0125</td>
                <td className={styles.td}>$0.0110</td>
                <td className={styles.td}>$0.0080</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
