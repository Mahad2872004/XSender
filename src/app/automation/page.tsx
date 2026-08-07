import React from 'react';
import { 
  Zap, MessageSquare, GitBranch, User, Sparkles, Timer, XCircle, 
  CheckCircle2, CloudUpload, GripVertical, Trash2, X
} from 'lucide-react';
import styles from './page.module.css';

import Link from 'next/link';

export default function AutomationPage() {
  return (
    <div className={styles.automationContainer}>
      
      {/* Canvas Area */}
      <div className={styles.canvasArea}>
        
        {/* Floating Toolbar */}
        <div className={styles.floatingToolbar}>
          <button className={`${styles.toolBtn} ${styles.active}`}><Zap size={18} /></button>
          <button className={styles.toolBtn}><MessageSquare size={18} /></button>
          <button className={styles.toolBtn}><GitBranch size={18} /></button>
          <Link href="/automation/agents" className={styles.toolBtn}>
            <User size={18} />
          </Link>
          <button className={styles.toolBtn}><Sparkles size={18} /></button>
          <button className={styles.toolBtn}><Timer size={18} /></button>
          <button className={`${styles.toolBtn} ${styles.danger}`}><XCircle size={18} /></button>
        </div>

        {/* Bottom Status Bar */}
        <div className={styles.statusBar}>
          <div className={styles.statusItem}>
            <div className={styles.liveIndicator}></div>
            CANVAS LIVE
          </div>
          <div className={styles.statusDivider}></div>
          <div className={styles.statusItem}>
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
            Select (V)
          </div>
          <div className={styles.statusItem}>
            <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" fill="none" strokeWidth="2"><path d="M5 9l4-4 4 4M5 15l4 4 4-4"/></svg>
            Pan (Space)
          </div>
        </div>

        {/* Trigger Node */}
        <div className={`${styles.node} ${styles.nodeTrigger}`}>
          <div className={styles.nodeTriggerHeader}>
            <Zap size={12} fill="currentColor" /> TRIGGER
          </div>
          <div className={styles.nodeTriggerBody}>
            <span className={styles.nodeTriggerTitle}>New Message</span>
            <span className={styles.nodeTriggerDesc}>Triggers on inbound chat</span>
          </div>
        </div>

        {/* Connection Line */}
        <div className={styles.connectionLine}></div>

        {/* Send Message Node */}
        <div className={`${styles.node} ${styles.nodeMessage}`}>
          <div className={styles.nodeMessageHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MessageSquare size={12} /> SEND MESSAGE
            </div>
            <CheckCircle2 size={12} />
          </div>
          <div className={styles.nodeMessageBody}>
            <span className={styles.nodeMessageText}>
              "Hello! How can I help today?"
            </span>
            <div className={styles.nodeTags}>
              <span className={styles.nodeTag}>TEXT</span>
              <span className={styles.nodeTag}>MEDIA</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Drawer */}
      <div className={styles.settingsDrawer}>
        <div className={styles.drawerHeader}>
          <div className={styles.drawerTitleInfo}>
            <span className={styles.drawerTitle}>Node Settings</span>
            <span className={styles.drawerSubtitle}>Send Message Type</span>
          </div>
          <X className={styles.drawerClose} size={20} />
        </div>

        <div className={styles.drawerScroll}>
          {/* Message Content */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>MESSAGE CONTENT</span>
            <div className={styles.messageContentBox}>
              <div className={styles.formattingBar}>
                <span className={styles.formatIcon}>B</span>
                <span className={styles.formatIcon} style={{ fontStyle: 'italic' }}>I</span>
                <span className={styles.formatIcon}>🔗</span>
                <span className={styles.formatIcon}>@</span>
              </div>
              <textarea 
                className={styles.textArea} 
                defaultValue="Hello! How can I help today?"
              ></textarea>
              <span className={styles.charCount}>26/1024</span>
            </div>
          </div>

          {/* Media Attachment */}
          <div className={styles.section}>
            <span className={styles.sectionTitle}>MEDIA ATTACHMENT</span>
            <div className={styles.mediaBox}>
              <CloudUpload className={styles.mediaIcon} size={24} />
              <span className={styles.mediaTitle}>Upload Image or Video</span>
              <span className={styles.mediaSubtitle}>Max 16MB - PNG, JPG, MP4</span>
            </div>
          </div>

          {/* Buttons */}
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <span className={styles.sectionTitle}>BUTTONS (QUICK REPLY)</span>
              <span className={styles.addNewLink}>+ ADD NEW</span>
            </div>
            <div className={styles.buttonList}>
              <div className={styles.buttonItem}>
                <GripVertical className={styles.dragHandle} size={16} />
                <span className={styles.buttonText}>Pricing Info</span>
                <Trash2 className={styles.trashIcon} size={16} />
              </div>
              <div className={styles.buttonItem}>
                <GripVertical className={styles.dragHandle} size={16} />
                <span className={styles.buttonText}>Talk to Sales</span>
                <Trash2 className={styles.trashIcon} size={16} />
              </div>
            </div>
          </div>

          {/* Toggles */}
          <div className={styles.section}>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Wait for reply</span>
              <div className={`${styles.toggleWrapper} ${styles.on}`}>
                <div className={styles.toggleKnob}></div>
              </div>
            </div>
            <div className={styles.toggleRow}>
              <span className={styles.toggleLabel}>Track Clicks</span>
              <div className={styles.toggleWrapper}>
                <div className={styles.toggleKnob}></div>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.drawerFooter}>
          <button className={styles.applyBtn}>Apply Changes</button>
        </div>
      </div>
      
    </div>
  );
}
