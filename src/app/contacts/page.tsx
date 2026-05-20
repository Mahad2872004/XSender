import React from 'react';
import { Tag, UserPlus, Download, Trash2, X, MessageSquare, Clock, PlusCircle, Edit2 } from 'lucide-react';
import styles from './page.module.css';

export default function ContactsPage() {
  return (
    <div className={styles.contactsContainer}>
      
      {/* Main Panel - Contacts List */}
      <div className={styles.mainPanel}>
        <div className={styles.actionsBar}>
          <span className={styles.actionLabel}>ACTIONS</span>
          <button className={styles.actionBtn}><Tag size={16} /> Tag</button>
          <button className={styles.actionBtn}><UserPlus size={16} /> Assign</button>
          <button className={styles.actionBtn}><Download size={16} /> Export</button>
          <button className={`${styles.actionBtn} ${styles.actionBtnDelete}`}><Trash2 size={16} /> Delete</button>
        </div>

        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th} style={{ width: '48px', textAlign: 'center' }}>
                  <div className={styles.checkboxContainer}>
                    <input type="checkbox" className={styles.checkbox} />
                  </div>
                </th>
                <th className={styles.th}>NAME & PHONE</th>
                <th className={styles.th}>LAST CONTACTED</th>
                <th className={styles.th}>TAGS & SEGMENT</th>
              </tr>
            </thead>
            <tbody>
              {/* Row 1 */}
              <tr className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.checkboxContainer}>
                    <input type="checkbox" className={styles.checkbox} />
                  </div>
                </td>
                <td className={styles.td}>
                  <div className={styles.contactInfo}>
                    <img src="https://i.pravatar.cc/150?u=alex" alt="Alex Rivers" className={styles.avatar} />
                    <div className={styles.contactDetails}>
                      <span className={styles.contactName}>Alex Rivers</span>
                      <span className={styles.contactPhone}>+1 (555) 012-3456</span>
                    </div>
                  </div>
                </td>
                <td className={styles.td}>
                  <span className={styles.contactedTime}>2h ago</span>
                </td>
                <td className={styles.td}>
                  <div className={styles.tags}>
                    <div className={styles.tagsRow}>
                      <span className={`${styles.tag} ${styles.tagEnterprise}`}>ENTERPRISE</span>
                      <span className={`${styles.tag} ${styles.tagNeutral}`}>VIP</span>
                    </div>
                    <span className={styles.segmentText}>Retail Sector</span>
                  </div>
                </td>
              </tr>

              {/* Row 2 */}
              <tr className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.checkboxContainer}>
                    <input type="checkbox" className={styles.checkbox} />
                  </div>
                </td>
                <td className={styles.td}>
                  <div className={styles.contactInfo}>
                    <img src="https://i.pravatar.cc/150?u=elena" alt="Elena Gomez" className={styles.avatar} />
                    <div className={styles.contactDetails}>
                      <span className={styles.contactName}>Elena Gomez</span>
                      <span className={styles.contactPhone}>+44 7700 900123</span>
                    </div>
                  </div>
                </td>
                <td className={styles.td}>
                  <span className={styles.contactedTime}>Yesterday</span>
                </td>
                <td className={styles.td}>
                  <div className={styles.tags}>
                    <div className={styles.tagsRow}>
                      <span className={`${styles.tag} ${styles.tagInbound}`}>INBOUND</span>
                    </div>
                    <span className={styles.segmentText} style={{ color: '#0f766e' }}>SMB</span>
                  </div>
                </td>
              </tr>

              {/* Row 3 - Selected */}
              <tr className={`${styles.tr} ${styles.trSelected}`}>
                <td className={styles.td}>
                  <div className={styles.checkboxContainer}>
                    <input type="checkbox" className={styles.checkbox} checked readOnly />
                  </div>
                </td>
                <td className={styles.td}>
                  <div className={styles.contactInfo}>
                    <img src="https://i.pravatar.cc/150?u=marcus" alt="Marcus Chen" className={styles.avatar} />
                    <div className={styles.contactDetails}>
                      <span className={styles.contactName}>Marcus Chen</span>
                      <span className={styles.contactPhone}>+65 8123 4567</span>
                    </div>
                  </div>
                </td>
                <td className={styles.td}>
                  <span className={styles.contactedTime}>5 mins ago</span>
                </td>
                <td className={styles.td}>
                  <div className={styles.tags}>
                    <div className={styles.tagsRow}>
                      <span className={`${styles.tag} ${styles.tagWholesale}`}>WHOLESALE</span>
                      <span className={`${styles.tag} ${styles.tagNeutral}`}>HIGH VOL</span>
                    </div>
                    <span className={styles.segmentText} style={{ color: '#0369a1' }}>Asia-Pacific</span>
                  </div>
                </td>
              </tr>

              {/* Row 4 */}
              <tr className={styles.tr}>
                <td className={styles.td}>
                  <div className={styles.checkboxContainer}>
                    <input type="checkbox" className={styles.checkbox} />
                  </div>
                </td>
                <td className={styles.td}>
                  <div className={styles.contactInfo}>
                    <img src="https://i.pravatar.cc/150?u=sarah" alt="Sarah Jenkins" className={styles.avatar} />
                    <div className={styles.contactDetails}>
                      <span className={styles.contactName}>Sarah Jenkins</span>
                      <span className={styles.contactPhone}>+1 (415) 987-6543</span>
                    </div>
                  </div>
                </td>
                <td className={styles.td}>
                  <span className={styles.contactedTime}>3 days ago</span>
                </td>
                <td className={styles.td}>
                  <div className={styles.tags}>
                    <div className={styles.tagsRow}>
                      <span className={`${styles.tag} ${styles.tagOutreach}`}>OUTREACH</span>
                    </div>
                    <span className={styles.segmentText} style={{ color: '#475569' }}>Consulting</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className={styles.footer}>
          Showing 4 of 1,284 contacts
        </div>
      </div>

      {/* Details Panel - Right Side */}
      <div className={styles.detailsPanel}>
        <button className={styles.closeBtn} aria-label="Close">
          <X size={20} />
        </button>

        <div className={styles.detailsScrollArea}>
          <div className={styles.profileHeader}>
            <div className={styles.heroAvatarWrapper}>
              <div className={styles.heroAvatarRing}>
                <img src="https://i.pravatar.cc/150?u=marcus" alt="Marcus Chen" className={styles.heroAvatar} />
              </div>
              <div className={styles.scoreBadge}>98</div>
            </div>
            <span className={styles.heroName}>Marcus Chen</span>
            <span className={styles.heroPhone}>+65 8123 4567</span>
            <button className={styles.startChatBtn}>
              <MessageSquare size={18} /> Start Chat
            </button>
          </div>

          <div className={styles.tabs}>
            <div className={`${styles.tab} ${styles.active}`}>Overview</div>
            <div className={styles.tab}>Conversations</div>
            <div className={styles.tab}>Tasks</div>
            <div className={styles.tab}>Notes</div>
            <div className={styles.tab}>Activity</div>
          </div>

          <div className={styles.contentSection}>
            <div className={styles.infoCards}>
              <div className={styles.infoCard}>
                <span className={styles.infoLabel}>COMPANY</span>
                <span className={styles.infoValue}>Oceanic Logistics Ltd</span>
              </div>
              <div className={styles.infoCard}>
                <span className={styles.infoLabel}>POSITION</span>
                <span className={styles.infoValue}>Director of<br/>Operations</span>
              </div>
            </div>

            <div>
              <div className={styles.sectionTitle}>
                <Clock size={14} /> RECENT ACTIVITY
              </div>
              <div className={styles.timeline}>
                <div className={styles.timelineItem}>
                  <div className={`${styles.timelineDot} ${styles.timelineDotActive}`}></div>
                  <span className={styles.timelineText}>Proposal document opened</span>
                  <span className={styles.timelineTime}>Today, 2:14 PM</span>
                </div>
                <div className={styles.timelineItem}>
                  <div className={styles.timelineDot}></div>
                  <span className={styles.timelineText}>WhatsApp message received</span>
                  <span className={styles.timelineTime}>Yesterday, 10:45 AM</span>
                </div>
              </div>
            </div>

            <div>
              <div className={styles.sectionTitle} style={{ justifyContent: 'space-between' }}>
                <span>UPCOMING TASKS</span>
                <PlusCircle size={14} style={{ cursor: 'pointer' }} />
              </div>
              <div className={styles.taskCard}>
                <input type="checkbox" className={styles.checkbox} />
                <div className={styles.taskInfo}>
                  <span className={styles.taskTitle}>Follow up on Pricing</span>
                  <span className={styles.taskDue}>DUE TOMORROW</span>
                </div>
                <button className={styles.taskEditBtn}>
                  <Edit2 size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.fixedBottom}>
          <button className={styles.viewProfileBtn}>View Full Profile</button>
        </div>
      </div>

    </div>
  );
}
