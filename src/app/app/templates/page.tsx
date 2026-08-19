'use client';

import React, { useState } from 'react';
import { Settings, X, ArrowLeft, Link as LinkIcon, Trash2, PlusCircle } from 'lucide-react';
import styles from './page.module.css';

export default function CatalogPage() {
  const [isModalOpen, setIsModalOpen] = useState(true); // Default open to match the image state

  return (
    <div className={styles.container}>
      
      {/* Background Page Elements */}
      <div className={styles.header}>
        <button className={styles.newBtn} onClick={() => setIsModalOpen(true)}>
          New Template
        </button>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <span>TEMPLATE NAME</span>
          <span>CATEGORY</span>
          <span>LANGUAGE</span>
          <span>STATUS</span>
          <span>ACTIONS</span>
        </div>
        <div className={styles.tableRow}>
          <span>order_confirmation_v2</span>
          <span>Utility</span>
          <span>English (US)</span>
          <span style={{ color: 'var(--status-green)', fontWeight: 600 }}>Approved</span>
          <span>⋮</span>
        </div>
        <div className={styles.tableRow}>
          <span>welcome_discount</span>
          <span>Marketing</span>
          <span>English (US)</span>
          <span style={{ color: '#d97706', fontWeight: 600 }}>Pending</span>
          <span>⋮</span>
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            
            {/* Modal Header */}
            <div className={styles.modalHeader}>
              <div className={styles.modalTitleSection}>
                <div className={styles.modalIcon}>
                  <Settings size={20} />
                </div>
                <div className={styles.modalTitleText}>
                  <span className={styles.modalTitle}>Edit Message Template</span>
                  <span className={styles.modalSubtitle}>Manage your WhatsApp Business API template components</span>
                </div>
              </div>
              <X className={styles.closeBtn} size={24} onClick={() => setIsModalOpen(false)} />
            </div>

            {/* Modal Body */}
            <div className={styles.modalBody}>
              
              {/* Left Panel - Live Preview */}
              <div className={styles.previewPanel}>
                <span className={styles.previewLabel}>LIVE PREVIEW</span>
                
                <div className={styles.phone}>
                  <div className={styles.phoneScreen}>
                    {/* Phone Header */}
                    <div className={styles.phoneHeader}>
                      <ArrowLeft size={18} />
                      <div className={styles.phoneAvatar}>XS</div>
                      <div className={styles.phoneTitle}>
                        <span className={styles.phoneName}>Xsender Support</span>
                        <span className={styles.phoneStatus}>Online</span>
                      </div>
                    </div>
                    
                    {/* Phone Body */}
                    <div className={styles.phoneBody}>
                      <div className={styles.messageBubble}>
                        <div className={styles.messageText}>
                          Hello <span className={styles.variable}>{'{{1}}'}</span>, thank you for your order! Your tracking number is <span className={styles.variable}>{'{{2}}'}</span>.
                        </div>
                        <span className={styles.messageTime}>12:45 PM</span>
                      </div>
                      
                      <div className={styles.whatsappButton}>
                        <LinkIcon size={14} /> Track Order
                      </div>
                      <div className={styles.whatsappButton}>
                        <MessageSquareIcon size={14} /> Contact Support
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Panel - Form */}
              <div className={styles.formPanel}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>TEMPLATE NAME</label>
                    <input type="text" className={styles.input} defaultValue="order_confirmation_v2" />
                  </div>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>CATEGORY</label>
                    <select className={styles.select} defaultValue="Utility">
                      <option value="Utility">Utility</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Authentication">Authentication</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup} style={{ flex: 0.5 }}>
                    <label className={styles.label}>LANGUAGE</label>
                    <select className={styles.select} defaultValue="English (US)">
                      <option value="English (US)">English (US)</option>
                      <option value="Spanish">Spanish</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <div className={styles.headerRow}>
                    <label className={styles.label}>MESSAGE BODY</label>
                    <span className={styles.insertVarLink}>
                      <PlusCircle size={14} /> Insert Variable
                    </span>
                  </div>
                  <textarea 
                    className={styles.textarea}
                    defaultValue="Hello {{1}}, thank you for your order! Your tracking number is {{2}}."
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label}>SAMPLE VALUES</label>
                  <div className={styles.sampleValuesBox}>
                    <div className={styles.sampleRow}>
                      <span className={styles.sampleVar}>{'{{1}}'}</span>
                      <input type="text" className={styles.sampleInput} placeholder="e.g. John Doe" />
                    </div>
                    <div className={styles.sampleRow}>
                      <span className={styles.sampleVar}>{'{{2}}'}</span>
                      <input type="text" className={styles.sampleInput} placeholder="e.g. TRK77210" />
                    </div>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <div className={styles.headerRow}>
                    <label className={styles.label}>INTERACTIVE BUTTONS</label>
                    <button className={styles.addBtn}>+ Add Button</button>
                  </div>
                  <div className={styles.buttonList}>
                    <div className={styles.buttonItem}>
                      <LinkIcon className={styles.buttonIcon} size={18} />
                      <div className={styles.buttonDetails}>
                        <span className={styles.buttonType}>Call to Action</span>
                        <span className={styles.buttonText}>Track Order</span>
                      </div>
                      <Trash2 className={styles.trashIcon} size={16} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className={styles.modalFooter}>
              <button className={styles.btnDraft} onClick={() => setIsModalOpen(false)}>Save Draft</button>
              <button className={styles.btnSubmit}>Submit for Approval</button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

// Inline simple icon for Contact Support since it wasn't imported
const MessageSquareIcon = ({ size = 24 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);
