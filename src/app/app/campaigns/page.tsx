import React from 'react';
import { Check, Megaphone, Bell, ShieldAlert, ArrowLeft, ExternalLink, Mic, ArrowRight } from 'lucide-react';
import styles from './page.module.css';

export default function CampaignsPage() {
  return (
    <div className={styles.container}>
      
      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>Create Campaign</h1>
        <span className={styles.draftBadge}>DRAFT SAVED</span>
      </div>

      {/* Stepper */}
      <div className={styles.stepper}>
        <div className={`${styles.step} ${styles.stepCompleted}`}>
          <div className={styles.stepCircle}><Check size={18} /></div>
          <div className={styles.stepInfo}>
            <span className={styles.stepSubtitle}>STEP 1</span>
            <span className={styles.stepTitle}>Audience</span>
          </div>
        </div>
        <div className={`${styles.stepLine} ${styles.stepLineCompleted}`}></div>
        
        <div className={`${styles.step} ${styles.stepActive}`}>
          <div className={styles.stepCircle}>2</div>
          <div className={styles.stepInfo}>
            <span className={styles.stepSubtitle}>STEP 2</span>
            <span className={styles.stepTitle}>Template</span>
          </div>
        </div>
        <div className={styles.stepLine}></div>
        
        <div className={styles.step}>
          <div className={styles.stepCircle}>3</div>
        </div>
        <div className={styles.stepLine}></div>
        
        <div className={styles.step}>
          <div className={styles.stepCircle}>4</div>
        </div>
        <div className={styles.stepLine}></div>
        
        <div className={styles.step}>
          <div className={styles.stepCircle}>5</div>
        </div>
      </div>

      {/* Content Area */}
      <div className={styles.content}>
        
        {/* Left Column - Templates List */}
        <div className={styles.templatesSection}>
          <div className={styles.templatesHeader}>
            <h2 className={styles.templatesTitle}>Select Template</h2>
            <div className={styles.filterPills}>
              <div className={`${styles.filterPill} ${styles.active}`}>All</div>
              <div className={styles.filterPill}>Marketing</div>
              <div className={styles.filterPill}>Utility</div>
              <div className={styles.filterPill}>Auth</div>
            </div>
          </div>

          <div className={styles.templatesList}>
            {/* Card 1 - Selected */}
            <div className={`${styles.templateCard} ${styles.selected}`}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleWrapper}>
                  <div className={`${styles.iconBox} ${styles.iconMarketing}`}>
                    <Megaphone size={16} />
                  </div>
                  <div className={styles.cardTitleInfo}>
                    <span className={styles.cardTitle}>Seasonal Flash Sale</span>
                    <span className={`${styles.cardCategory} ${styles.catMarketing}`}>MARKETING</span>
                  </div>
                </div>
                <span className={`${styles.statusBadge} ${styles.statusApproved}`}>APPROVED</span>
              </div>
              <div className={styles.cardBody}>
                Hi {'{{name}}'}! 👋 Our summer collection is finally here. Enjoy a special {'{{discount}}'}% discount just for you...
              </div>
              <div className={styles.cardFooter}>
                <span>Last used: 2 days ago</span>
                <span className={styles.selectedBadge}>Selected <Check size={14} /></span>
              </div>
            </div>

            {/* Card 2 */}
            <div className={styles.templateCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleWrapper}>
                  <div className={`${styles.iconBox} ${styles.iconUtility}`}>
                    <Bell size={16} />
                  </div>
                  <div className={styles.cardTitleInfo}>
                    <span className={styles.cardTitle}>Appointment Reminder</span>
                    <span className={`${styles.cardCategory} ${styles.catUtility}`}>UTILITY</span>
                  </div>
                </div>
                <span className={`${styles.statusBadge} ${styles.statusPending}`}>PENDING</span>
              </div>
              <div className={styles.cardBody}>
                Hello {'{{name}}'}, this is a reminder for your upcoming booking on {'{{date}}'} at {'{{time}}'}...
              </div>
              <div className={styles.cardFooter}>
                <span>Created: Oct 12, 2023</span>
                <ArrowRight size={14} style={{ color: '#94a3b8' }} />
              </div>
            </div>

            {/* Card 3 */}
            <div className={styles.templateCard}>
              <div className={styles.cardHeader}>
                <div className={styles.cardTitleWrapper}>
                  <div className={`${styles.iconBox} ${styles.iconAuth}`}>
                    <ShieldAlert size={16} />
                  </div>
                  <div className={styles.cardTitleInfo}>
                    <span className={styles.cardTitle}>OTP Verification</span>
                    <span className={`${styles.cardCategory} ${styles.catAuth}`}>AUTH</span>
                  </div>
                </div>
                <span className={`${styles.statusBadge} ${styles.statusRejected}`}>REJECTED</span>
              </div>
              <div className={styles.cardBody}>
                Your Xsender verification code is {'{{otp}}'}. Do not share this with anyone...
              </div>
              <div className={styles.cardFooter}>
                <span>Last used: 1 month ago</span>
                <ArrowRight size={14} style={{ color: '#94a3b8' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Phone Preview */}
        <div className={styles.previewSection}>
          <div className={styles.phone}>
            <div className={styles.phoneScreen}>
              {/* WhatsApp Header */}
              <div className={styles.phoneHeader}>
                <ArrowLeft size={18} />
                <div className={styles.phoneAvatar}>XS</div>
                <div className={styles.phoneTitle}>
                  <span className={styles.phoneName}>Xsender Store</span>
                  <span className={styles.phoneStatus}>Online</span>
                </div>
              </div>
              
              {/* Chat Body */}
              <div className={styles.phoneBody}>
                <span className={styles.phoneDate}>Today</span>
                
                <div className={styles.messageBubble}>
                  <div className={styles.messageImage}>
                    <span className={styles.imageTitle}>SUMMER</span>
                    <span className={styles.imageSubtitle}>PROMOTION</span>
                  </div>
                  <div className={styles.messageText}>
                    Hi <span className={styles.variable}>{'{{name}}'}</span>! 👋<br/><br/>
                    Our summer collection is finally here. Enjoy a special <span className={styles.variable}>{'{{discount}}'}%</span> discount just for you. Use code SUMMER24 at checkout.
                  </div>
                  <span className={styles.messageTime}>12:45 PM</span>
                  <div className={styles.messageButton}>
                    <ExternalLink size={14} /> Shop Now
                  </div>
                </div>
              </div>
              
              {/* Chat Input */}
              <div className={styles.phoneInputArea}>
                <div className={styles.phoneInput}></div>
                <div className={styles.phoneMic}><Mic size={16} /></div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            <button className={styles.btnPrev}>
              <ArrowLeft size={18} /> Previous
            </button>
            <button className={styles.btnNext}>
              Next: Personalize <ArrowRight size={18} />
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
