import React from 'react';
import { UserPlus, MoreVertical, CheckCircle, ArrowRight, Plus, ShoppingBag, Network, CreditCard } from 'lucide-react';
import styles from './page.module.css';

export default function SettingsPage() {
  return (
    <div className={styles.container}>
      
      {/* Tabs */}
      <div className={styles.tabs}>
        <div className={styles.tab}>General</div>
        <div className={`${styles.tab} ${styles.active}`}>Team</div>
        <div className={styles.tab}>Roles & Permissions</div>
        <div className={styles.tab}>Integrations</div>
        <div className={styles.tab}>WhatsApp Profile</div>
        <div className={styles.tab}>Notifications</div>
      </div>

      {/* Team Management */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleBox}>
            <h2 className={styles.sectionTitle}>Team Management</h2>
            <span className={styles.sectionSubtitle}>Manage your organization's members and their access levels.</span>
          </div>
          <button className={styles.inviteBtn}>
            <UserPlus size={16} /> Invite Member
          </button>
        </div>

        <div className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>MEMBER</th>
                <th className={styles.th}>ROLE</th>
                <th className={styles.th}>STATUS</th>
                <th className={styles.th}>LAST ACTIVE</th>
                <th className={styles.th} style={{ textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1 */}
              <tr className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.memberInfo}>
                    <img src="https://i.pravatar.cc/150?u=sarah" alt="Sarah Mitchell" className={styles.avatar} />
                    <div className={styles.memberDetails}>
                      <span className={styles.memberName}>Sarah Mitchell</span>
                      <span className={styles.memberEmail}>sarah.m@xsender.io</span>
                    </div>
                  </div>
                </td>
                <td className={styles.td}>
                  <span className={`${styles.roleBadge} ${styles.roleOwner}`}>Owner</span>
                </td>
                <td className={styles.td}>
                  <div className={styles.statusBox}>
                    <div className={`${styles.statusDot} ${styles.statusActive}`}></div>
                    Active
                  </div>
                </td>
                <td className={styles.td}>Online now</td>
                <td className={styles.td} style={{ textAlign: 'right' }}>
                  <MoreVertical size={18} className={styles.moreBtn} />
                </td>
              </tr>

              {/* Row 2 */}
              <tr className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.memberInfo}>
                    <img src="https://i.pravatar.cc/150?u=david" alt="David Chen" className={styles.avatar} />
                    <div className={styles.memberDetails}>
                      <span className={styles.memberName}>David Chen</span>
                      <span className={styles.memberEmail}>d.chen@xsender.io</span>
                    </div>
                  </div>
                </td>
                <td className={styles.td}>
                  <span className={`${styles.roleBadge} ${styles.roleAdmin}`}>Admin</span>
                </td>
                <td className={styles.td}>
                  <div className={styles.statusBox}>
                    <div className={`${styles.statusDot} ${styles.statusActive}`}></div>
                    Active
                  </div>
                </td>
                <td className={styles.td}>2 hours ago</td>
                <td className={styles.td} style={{ textAlign: 'right' }}>
                  <MoreVertical size={18} className={styles.moreBtn} />
                </td>
              </tr>

              {/* Row 3 */}
              <tr className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.memberInfo}>
                    <img src="https://i.pravatar.cc/150?u=elena" alt="Elena Rodriguez" className={styles.avatar} />
                    <div className={styles.memberDetails}>
                      <span className={styles.memberName}>Elena Rodriguez</span>
                      <span className={styles.memberEmail}>elena.r@xsender.io</span>
                    </div>
                  </div>
                </td>
                <td className={styles.td}>
                  <span className={`${styles.roleBadge} ${styles.roleManager}`}>Manager</span>
                </td>
                <td className={styles.td}>
                  <div className={`${styles.statusBox} ${styles.statusTextAway}`}>
                    <div className={`${styles.statusDot} ${styles.statusAway}`}></div>
                    Away
                  </div>
                </td>
                <td className={styles.td}>yesterday</td>
                <td className={styles.td} style={{ textAlign: 'right' }}>
                  <MoreVertical size={18} className={styles.moreBtn} />
                </td>
              </tr>

              {/* Row 4 */}
              <tr className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.memberInfo}>
                    <img src="https://i.pravatar.cc/150?u=marcus" alt="Marcus Thorne" className={styles.avatar} />
                    <div className={styles.memberDetails}>
                      <span className={styles.memberName}>Marcus Thorne</span>
                      <span className={styles.memberEmail}>m.thorne@xsender.io</span>
                    </div>
                  </div>
                </td>
                <td className={styles.td}>
                  <span className={`${styles.roleBadge} ${styles.roleAgent}`}>Agent</span>
                </td>
                <td className={styles.td}>
                  <div className={styles.statusBox}>
                    <div className={`${styles.statusDot} ${styles.statusActive}`}></div>
                    Active
                  </div>
                </td>
                <td className={styles.td}>5 mins ago</td>
                <td className={styles.td} style={{ textAlign: 'right' }}>
                  <MoreVertical size={18} className={styles.moreBtn} />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Connected Integrations */}
      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <div className={styles.sectionTitleBox}>
            <h2 className={styles.sectionTitle}>Connected Integrations</h2>
            <span className={styles.sectionSubtitle}>Seamlessly sync with your favorite platforms.</span>
          </div>
          <a href="#" className={styles.viewAllLink}>View All</a>
        </div>

        <div className={styles.grid}>
          {/* Card 1 - Shopify */}
          <div className={styles.integrationCard}>
            <div className={styles.cardHeader}>
              <div className={`${styles.iconBox} ${styles.iconShopify}`}>
                <ShoppingBag size={24} />
              </div>
              <CheckCircle size={20} className={styles.statusCheck} />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardTitle}>Shopify</span>
              <span className={styles.cardDesc}>Sync orders and customer tags automatically.</span>
            </div>
            <div className={styles.cardFooter}>
              Configure Settings <ArrowRight size={14} />
            </div>
          </div>

          {/* Card 2 - HubSpot */}
          <div className={styles.integrationCard}>
            <div className={styles.cardHeader}>
              <div className={`${styles.iconBox} ${styles.iconHubspot}`}>
                <Network size={24} />
              </div>
              <CheckCircle size={20} className={styles.statusCheck} />
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardTitle}>HubSpot</span>
              <span className={styles.cardDesc}>Map WhatsApp chats to CRM contact activities.</span>
            </div>
            <div className={styles.cardFooter}>
              Configure Settings <ArrowRight size={14} />
            </div>
          </div>

          {/* Card 3 - Stripe */}
          <div className={styles.integrationCard}>
            <div className={styles.cardHeader}>
              <div className={`${styles.iconBox} ${styles.iconStripe}`}>
                <CreditCard size={24} />
              </div>
              <span className={styles.inactivePill}>INACTIVE</span>
            </div>
            <div className={styles.cardContent}>
              <span className={styles.cardTitle}>Stripe</span>
              <span className={styles.cardDesc}>Generate checkout links directly in chat bubbles.</span>
            </div>
            <div className={`${styles.cardFooter} ${styles.cardFooterInactive}`}>
              Connect Account <ArrowRight size={14} />
            </div>
          </div>

          {/* Card 4 - Add New */}
          <div className={`${styles.integrationCard} ${styles.addNewCard}`}>
            <div className={styles.addIconBox}>
              <Plus size={24} />
            </div>
            <div className={styles.cardContent} style={{ alignItems: 'center', marginTop: '8px' }}>
              <span className={styles.cardTitle}>Add New</span>
              <span className={styles.cardDesc}>Explore our marketplace</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
