import React from 'react';
import { 
  PlusCircle, Edit2, Shield, CloudUpload, Link as LinkIcon, 
  Video, Phone, Plus, Send, Settings, UserCircle
} from 'lucide-react';
import styles from './page.module.css';

export default function AgentsPage() {
  return (
    <div className={styles.container}>
      
      {/* Left Column - Your Agents */}
      <div className={styles.leftCol}>
        <div className={styles.leftHeader}>
          <span className={styles.leftTitle}>YOUR AGENTS</span>
          <span className={styles.activeBadge}>4 ACTIVE</span>
        </div>
        
        <div className={styles.agentList}>
          {/* Agent 1 - Active */}
          <div className={`${styles.agentItem} ${styles.active}`}>
            <div className={styles.agentItemInfo}>
              <div className={`${styles.agentIcon} ${styles.sales}`}>S</div>
              <div className={styles.agentDetails}>
                <span className={styles.agentName}>Sales Assistant</span>
                <span className={styles.agentStatus}>Online</span>
              </div>
            </div>
            <div className={`${styles.toggleWrapper} ${styles.on}`}>
              <div className={styles.toggleKnob}></div>
            </div>
          </div>

          {/* Agent 2 - Paused */}
          <div className={styles.agentItem}>
            <div className={styles.agentItemInfo}>
              <div className={`${styles.agentIcon} ${styles.help}`}>H</div>
              <div className={styles.agentDetails}>
                <span className={styles.agentName}>HelpDesk Bot</span>
                <span className={`${styles.agentStatus} ${styles.paused}`}>Paused</span>
              </div>
            </div>
            <div className={styles.toggleWrapper}>
              <div className={styles.toggleKnob}></div>
            </div>
          </div>

          {/* Agent 3 - Online */}
          <div className={styles.agentItem}>
            <div className={styles.agentItemInfo}>
              <div className={`${styles.agentIcon} ${styles.lead}`}>L</div>
              <div className={styles.agentDetails}>
                <span className={styles.agentName}>Lead Gen Pro</span>
                <span className={styles.agentStatus}>Online</span>
              </div>
            </div>
            <div className={`${styles.toggleWrapper} ${styles.on}`}>
              <div className={styles.toggleKnob}></div>
            </div>
          </div>
        </div>

        <div className={styles.leftFooter}>
          <button className={styles.newAgentBtn}>
            <PlusCircle size={16} /> New Agent
          </button>
        </div>
      </div>

      {/* Middle Column - Configuration */}
      <div className={styles.middleCol}>
        <div className={styles.configScroll}>
          
          <div className={styles.configHeader}>
            <div className={styles.botLargeIcon}>
              <Settings size={32} />
              <button className={styles.editIconBtn}>
                <Edit2 size={12} />
              </button>
            </div>
            <div className={styles.configHeaderInfo}>
              <h2 className={styles.configTitle}>Sales Assistant</h2>
              <p className={styles.configDesc}>Configuring GPT-4o powered commerce specialist.</p>
              <div className={styles.configBadges}>
                <span className={styles.badge}>v2.4.0</span>
                <span className={`${styles.badge} ${styles.badgeOptimized}`}>OPTIMIZED</span>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <UserCircle className={styles.sectionIcon} size={18} /> Core Persona
            </div>
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label className={styles.label}>TONE & VOICE</label>
                <select className={styles.select} defaultValue="friendly">
                  <option value="friendly">Friendly & Approachable</option>
                  <option value="professional">Professional</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>LANGUAGE</label>
                <select className={styles.select} defaultValue="en">
                  <option value="en">English (US)</option>
                  <option value="es">Spanish</option>
                </select>
              </div>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <Shield className={styles.sectionIcon} size={18} /> Knowledge Base
            </div>
            <div className={styles.uploadBox}>
              <CloudUpload size={24} style={{ color: 'var(--text-secondary)' }} />
              <span className={styles.uploadTitle}>Upload PDF, DOCX, or CSV</span>
              <span className={styles.uploadSubtitle}>Knowledge cutoff: Feb 2024</span>
            </div>
            <div className={styles.crawlRow}>
              <input type="text" className={styles.crawlInput} placeholder="https://yourwebsite.com/docs" />
              <button className={styles.crawlBtn}>Crawl Site</button>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionTitle}>
              <Shield className={styles.sectionIcon} size={18} /> Escalation & Safety
            </div>
            <div className={styles.escalationBox}>
              <div className={styles.thresholdRow}>
                <div className={styles.thresholdInfo}>
                  <span className={styles.thresholdTitle}>Confidence Threshold</span>
                  <span className={styles.thresholdDesc}>Handover to human if confidence is below 60%</span>
                </div>
                <span className={styles.thresholdValue}>60%</span>
                <div className={styles.sliderTrack}>
                  <div className={styles.sliderFill} style={{ width: '60%' }}></div>
                  <div className={styles.sliderThumb} style={{ left: '60%' }}></div>
                </div>
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>FALLBACK MESSAGE</label>
                <textarea 
                  className={styles.textarea}
                  defaultValue="I'm sorry, I'm not sure about that. Let me connect you with a specialist."
                ></textarea>
              </div>
            </div>
          </div>

        </div>

        <div className={styles.configFooter}>
          <button className={styles.btnDiscard}>Discard Changes</button>
          <button className={styles.btnSave}>Save Configuration</button>
        </div>
      </div>

      {/* Right Column - Test Agent */}
      <div className={styles.rightCol}>
        <div className={styles.chatHeader}>
          <div className={styles.chatHeaderLeft}>
            <div className={styles.chatAvatar}>
              <Settings size={16} />
            </div>
            <div className={styles.chatTitleBox}>
              <span className={styles.chatTitle}>Test Agent</span>
              <span className={styles.chatStatus}>typing...</span>
            </div>
          </div>
          <div className={styles.chatIcons}>
            <Video size={16} />
            <Phone size={16} />
          </div>
        </div>

        <div className={styles.chatScroll}>
          <div className={styles.msgUser}>
            <span className={styles.msgText}>Hi, what is your refund policy for seasonal items?</span>
            <span className={styles.msgTime}>14:02</span>
          </div>

          <div className={styles.msgBot}>
            <span className={styles.msgText}>Our seasonal items can be returned within 30 days of purchase, provided they are in original packaging and unused.</span>
            <span className={styles.msgTime}>14:02</span>
          </div>

          <div className={styles.traceCard}>
            <div className={styles.traceHeader}>
              <span className={styles.traceTitle}>TRACE INSIGHTS</span>
              <span className={styles.traceConf}>94% Confidence</span>
            </div>
            <span className={styles.traceSource}>Source: Return_Policy_v2.pdf, Page 4</span>
            <div className={styles.traceBarBg}>
              <div className={styles.traceBarFill} style={{ width: '94%' }}></div>
            </div>
          </div>
        </div>

        <div className={styles.chatInputArea}>
          <Plus size={20} style={{ color: '#64748b' }} />
          <div className={styles.chatInputBox}>
            <input type="text" className={styles.chatInput} placeholder="Type a message to test..." />
          </div>
          <button className={styles.sendBtn}>
            <Send size={16} style={{ marginLeft: '-2px' }} />
          </button>
        </div>
      </div>

    </div>
  );
}
