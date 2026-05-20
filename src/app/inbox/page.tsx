import React from 'react';
import { Search, UserPlus, CheckCircle2, Phone, Smile, Send, Package, PhoneCall } from 'lucide-react';
import styles from './page.module.css';

export default function InboxPage() {
  return (
    <div className={styles.inboxContainer}>
      
      {/* Left Panel - Conversation List */}
      <div className={styles.leftPanel}>
        <div className={styles.searchWrapper}>
          <Search className={styles.searchIcon} size={18} />
          <input type="text" placeholder="Search conversations..." className={styles.searchInput} />
        </div>
        
        <div className={styles.filters}>
          <div className={`${styles.filterPill} ${styles.active}`}>All</div>
          <div className={styles.filterPill}>Open</div>
          <div className={styles.filterPill}>Pending</div>
          <div className={styles.filterPill}>Resolved</div>
        </div>
        
        <div className={styles.convList}>
          {/* Active Conversation */}
          <div className={`${styles.convCard} ${styles.active}`}>
            <div className={styles.avatarWrapper}>
              <img src="https://i.pravatar.cc/150?u=sarah" alt="Sarah Jenkins" className={styles.avatar} />
              <div className={styles.onlineIndicator}></div>
            </div>
            <div className={styles.convInfo}>
              <div className={styles.convHeader}>
                <span className={styles.convName}>Sarah Jenkins</span>
                <span className={styles.convTime}>10:45 AM</span>
              </div>
              <span className={styles.convPreview}>Can you confirm if the delivery will arriv...</span>
              <div className={styles.tags}>
                <span className={`${styles.tag} ${styles.tagVip}`}>VIP</span>
                <span className={styles.tagSales}>Sales</span>
              </div>
            </div>
          </div>
          
          {/* Other Conversation 1 */}
          <div className={styles.convCard}>
            <div className={styles.avatarWrapper}>
              <img src="https://i.pravatar.cc/150?u=marcus" alt="Marcus Chen" className={styles.avatar} />
            </div>
            <div className={styles.convInfo}>
              <div className={styles.convHeader}>
                <span className={styles.convName}>Marcus Chen</span>
                <span className={styles.convTime}>Yesterday</span>
              </div>
              <span className={styles.convPreview}>Great, thanks for the update!</span>
            </div>
            <div className={styles.unreadBadge}>2</div>
          </div>
          
          {/* Other Conversation 2 */}
          <div className={styles.convCard}>
            <div className={styles.avatarWrapper}>
              <div className={styles.avatar}>ED</div>
            </div>
            <div className={styles.convInfo}>
              <div className={styles.convHeader}>
                <span className={styles.convName}>Elena Duarte</span>
                <span className={styles.convTime}>Oct 12</span>
              </div>
              <span className={styles.convPreview}>I'm having trouble with the login again.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Middle Panel - Chat Area */}
      <div className={styles.middlePanel}>
        <div className={styles.chatHeader}>
          <div className={styles.chatUser}>
            <div className={styles.avatarWrapper}>
              <img src="https://i.pravatar.cc/150?u=sarah" alt="Sarah Jenkins" className={styles.avatar} />
            </div>
            <div className={styles.chatUserInfo}>
              <span className={styles.chatUserName}>
                Sarah Jenkins <CheckCircle2 className={styles.verified} size={16} />
              </span>
              <span className={styles.chatUserPhone}>+1 (555) 012-3456</span>
            </div>
          </div>
          <div className={styles.chatActions}>
            <button className={styles.assignBtn}>
              <UserPlus size={16} /> Assign
            </button>
            <button className={styles.resolveBtn}>
              <CheckCircle2 size={16} /> Resolve
            </button>
          </div>
        </div>
        
        <div className={styles.chatHistory}>
          <div className={styles.dateDivider}>
            <span className={styles.dateText}>TODAY</span>
          </div>
          
          <div className={`${styles.messageRow} ${styles.incoming}`}>
            <div className={styles.bubble}>
              Hi, I ordered the premium subscription yesterday but haven't received the activation link yet. Could you check on that?
            </div>
            <span className={styles.msgTime}>10:42 AM</span>
          </div>
          
          <div className={`${styles.messageRow} ${styles.outgoing}`}>
            <div className={styles.bubble}>
              Hello Sarah! Let me check your account immediately. One moment please while I access your records.
            </div>
            <span className={styles.msgTime}>10:44 AM <CheckCircle2 size={10} /></span>
          </div>
          
          <div className={`${styles.messageRow} ${styles.incoming}`}>
            <div className={styles.bubble}>
              Thank you! My order ID is #XS-88291.
            </div>
            <span className={styles.msgTime}>10:45 AM</span>
          </div>
          
          <div className={`${styles.messageRow} ${styles.outgoing}`}>
            <div className={styles.bubble}>
              Found it! It looks like there was a slight delay in the automation. I've manually triggered the activation now. You should see it in your inbox in 2 minutes.
            </div>
            <span className={styles.msgTime}>10:46 AM <CheckCircle2 size={10} /></span>
          </div>
        </div>
        
        <div className={styles.chatInput}>
          <button className={styles.iconBtn} aria-label="Attach file"><Plus size={20} /></button>
          <input type="text" placeholder="Type a message..." className={styles.inputField} />
          <button className={styles.iconBtn} aria-label="Add emoji"><Smile size={20} /></button>
          <button className={styles.sendBtn} aria-label="Send message"><Send size={18} /></button>
        </div>
      </div>

      {/* Right Panel - Contact Details */}
      <div className={styles.rightPanel}>
        <div className={styles.profileHero}>
          <img src="https://i.pravatar.cc/150?u=sarah" alt="Sarah Jenkins" className={styles.heroAvatar} />
          <span className={styles.heroName}>Sarah Jenkins</span>
          <span className={styles.heroPhone}>+1 (555) 012-3456</span>
          <div className={styles.heroTags}>
            <span className={`${styles.heroTag} ${styles.vip}`}>VIP CLIENT</span>
            <span className={styles.heroTag}>TECH SECTOR</span>
            <button className={styles.addTagBtn}>+</button>
          </div>
        </div>
        
        <div className={styles.tabs}>
          <div className={`${styles.tab} ${styles.active}`}>Details</div>
          <div className={styles.tab}>Activity</div>
          <div className={styles.tab}>Notes</div>
        </div>
        
        <div className={styles.detailsContent}>
          <div className={styles.detailGroup}>
            <span className={styles.detailLabel}>EMAIL ADDRESS</span>
            <span className={styles.detailValue}>sarah.j@enterprise.com</span>
          </div>
          
          <div className={styles.detailGroup}>
            <span className={styles.detailLabel}>ACCOUNT MANAGER</span>
            <div className={styles.managerRow}>
              <div className={styles.managerAvatar}>JD</div>
              <span className={styles.detailValue}>John Doe</span>
            </div>
          </div>
          
          <div className={styles.detailGroup}>
            <span className={styles.detailLabel}>LAST ORDER</span>
            <div className={styles.orderCard}>
              <div className={styles.orderHeader}>
                <span className={styles.orderId}>#XS-88291</span>
                <span className={styles.orderStatus}>Processing</span>
              </div>
              <span className={styles.orderDesc}>Premium SaaS Bundle (Annual)</span>
            </div>
          </div>
          
          <div className={styles.detailGroup}>
            <span className={styles.detailLabel}>RECENT ACTIVITY</span>
            <div className={styles.activityList}>
              <div className={styles.activityItem}>
                <div className={styles.activityIcon}>
                  <Package size={14} />
                </div>
                <div className={styles.activityInfo}>
                  <span className={styles.activityTitle}>Purchased Premium Bundle</span>
                  <span className={styles.activityTime}>2 hours ago</span>
                </div>
              </div>
              <div className={styles.activityItem}>
                <div className={`${styles.activityIcon} ${styles.call}`}>
                  <PhoneCall size={14} />
                </div>
                <div className={styles.activityInfo}>
                  <span className={styles.activityTitle}>Outbound call (12m)</span>
                  <span className={styles.activityTime}>Yesterday</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Inline Plus icon since it wasn't imported at the top
const Plus = ({ size = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12h14"/>
  </svg>
);
