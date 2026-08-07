import React from 'react';
import { Download, Calendar, MessageSquare, CheckCircle, Eye, CornerUpLeft, TrendingUp, TrendingDown } from 'lucide-react';
import styles from './page.module.css';

export default function ReportsPage() {
  return (
    <div className={styles.container}>
      
      {/* Header Filters & Actions */}
      <div className={styles.header}>
        <div className={styles.filters}>
          <div className={`${styles.filterBtn} ${styles.active}`}>Last 7d</div>
          <div className={styles.filterBtn}>30d</div>
          <div className={styles.filterBtn}>90d</div>
          <div className={`${styles.filterBtn} ${styles.filterBtnCustom}`}>
            Custom <Calendar size={14} />
          </div>
        </div>
        <button className={styles.exportBtn}>
          <Download size={16} /> Export Report
        </button>
      </div>

      {/* KPI Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.iconBox} ${styles.iconMessages}`}>
              <MessageSquare size={20} />
            </div>
            <span className={`${styles.trend} ${styles.trendUp}`}>
              <TrendingUp size={14} /> +12.5%
            </span>
          </div>
          <div className={styles.statBody}>
            <span className={styles.statLabel}>TOTAL MESSAGES</span>
            <span className={styles.statValue}>482,910</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.iconBox} ${styles.iconDelivery}`}>
              <CheckCircle size={20} />
            </div>
            <span className={`${styles.trend} ${styles.trendUp}`}>
              <TrendingUp size={14} /> +0.4%
            </span>
          </div>
          <div className={styles.statBody}>
            <span className={styles.statLabel}>DELIVERY RATE</span>
            <span className={styles.statValue}>99.2%</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.iconBox} ${styles.iconRead}`}>
              <Eye size={20} />
            </div>
            <span className={`${styles.trend} ${styles.trendDown}`}>
              <TrendingDown size={14} /> -2.1%
            </span>
          </div>
          <div className={styles.statBody}>
            <span className={styles.statLabel}>READ RATE</span>
            <span className={styles.statValue}>84.5%</span>
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statHeader}>
            <div className={`${styles.iconBox} ${styles.iconReply}`}>
              <CornerUpLeft size={20} />
            </div>
            <span className={`${styles.trend} ${styles.trendUp}`}>
              <TrendingUp size={14} /> +5.8%
            </span>
          </div>
          <div className={styles.statBody}>
            <span className={styles.statLabel}>REPLY RATE</span>
            <span className={styles.statValue}>32.1%</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className={styles.chartsRow}>
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <span className={styles.chartTitle}>Message Flow Performance</span>
            <div className={styles.chartLegend}>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: 'var(--status-green)' }}></div> Sent
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: '#0f766e' }}></div> Delivered
              </div>
              <div className={styles.legendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: '#22c55e' }}></div> Read
              </div>
            </div>
          </div>
          <div className={styles.lineChartMock}>
            {/* SVG placeholder for line chart */}
            <svg viewBox="0 0 800 200" style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}>
              <path d="M0,150 C100,140 200,80 300,90 C400,100 500,40 600,50 C700,60 800,20 800,20" fill="none" stroke="var(--status-green)" strokeWidth="3" opacity="0.3" />
              <path d="M0,160 C100,150 200,90 300,100 C400,110 500,50 600,60 C700,70 800,30 800,30" fill="none" stroke="#0f766e" strokeWidth="3" opacity="0.6" />
              <path d="M0,180 C100,170 200,110 300,120 C400,130 500,80 600,90 C700,100 800,60 800,60" fill="none" stroke="#22c55e" strokeWidth="3" />
            </svg>
            <div className={styles.xAxis}>
              <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
            </div>
          </div>
        </div>

        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <span className={styles.chartTitle}>Conversation Types</span>
          </div>
          <div className={styles.donutContainer}>
            <div className={styles.donutMock}>
              <div className={styles.donutCenter}>
                <span className={styles.donutTotalLabel}>TOTAL</span>
                <span className={styles.donutTotalValue}>12.4k</span>
              </div>
            </div>
            
            <div className={styles.donutLegendGrid}>
              <div className={styles.donutLegendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: 'var(--status-green)' }}></div>
                <div className={styles.donutLegendText}>
                  <span className={styles.donutLegendLabel}>Marketing</span>
                  <span className={styles.donutLegendValue}>42%</span>
                </div>
              </div>
              <div className={styles.donutLegendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: '#0f766e' }}></div>
                <div className={styles.donutLegendText}>
                  <span className={styles.donutLegendLabel}>Utility</span>
                  <span className={styles.donutLegendValue}>28%</span>
                </div>
              </div>
              <div className={styles.donutLegendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: '#22c55e' }}></div>
                <div className={styles.donutLegendText}>
                  <span className={styles.donutLegendLabel}>Authentication</span>
                  <span className={styles.donutLegendValue}>18%</span>
                </div>
              </div>
              <div className={styles.donutLegendItem}>
                <div className={styles.legendDot} style={{ backgroundColor: '#f1f5f9' }}></div>
                <div className={styles.donutLegendText}>
                  <span className={styles.donutLegendLabel}>Service</span>
                  <span className={styles.donutLegendValue}>12%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tables Row */}
      <div className={styles.tablesRow}>
        <div className={styles.tableCard}>
          <div className={styles.tableCardHeader}>
            <span className={styles.chartTitle}>Top Campaign Performance</span>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>CAMPAIGN NAME</th>
                  <th className={styles.th}>SENT</th>
                  <th className={styles.th}>READ</th>
                  <th className={styles.th}>CTR</th>
                  <th className={styles.th}>COST</th>
                </tr>
              </thead>
              <tbody>
                <tr className={styles.tr}>
                  <td className={`${styles.td} ${styles.tdBold}`}>Summer Flash Sale</td>
                  <td className={styles.td}>45,000</td>
                  <td className={styles.td} style={{ color: 'var(--status-green)', fontWeight: 600 }}>88.2%</td>
                  <td className={styles.td}>12.4%</td>
                  <td className={styles.td}>$450.00</td>
                </tr>
                <tr className={styles.tr}>
                  <td className={`${styles.td} ${styles.tdBold}`}>Abandoned Cart v2</td>
                  <td className={styles.td}>12,400</td>
                  <td className={styles.td} style={{ color: 'var(--status-green)', fontWeight: 600 }}>92.1%</td>
                  <td className={styles.td}>24.8%</td>
                  <td className={styles.td}>$124.00</td>
                </tr>
                <tr className={styles.tr}>
                  <td className={`${styles.td} ${styles.tdBold}`}>New User Welcome</td>
                  <td className={styles.td}>8,200</td>
                  <td className={styles.td} style={{ color: 'var(--status-green)', fontWeight: 600 }}>94.5%</td>
                  <td className={styles.td}>18.2%</td>
                  <td className={styles.td}>$82.00</td>
                </tr>
                <tr className={styles.tr}>
                  <td className={`${styles.td} ${styles.tdBold}`}>Re-engagement Beta</td>
                  <td className={styles.td}>34,500</td>
                  <td className={styles.td} style={{ color: '#d97706', fontWeight: 600 }}>65.4%</td>
                  <td className={styles.td}>5.1%</td>
                  <td className={styles.td}>$345.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className={styles.tableCard}>
          <div className={styles.tableCardHeader}>
            <span className={styles.chartTitle}>Agent Performance</span>
          </div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>AGENT</th>
                  <th className={styles.th}>ASSIGNED</th>
                  <th className={styles.th}>RESOLVED</th>
                  <th className={styles.th}>AVG RESP</th>
                  <th className={styles.th}>CSAT</th>
                </tr>
              </thead>
              <tbody>
                <tr className={styles.tr}>
                  <td className={styles.td}>
                    <div className={styles.agentInfo}>
                      <div className={styles.agentAvatar} style={{ backgroundColor: '#ccfbf1', color: '#0f766e' }}>SM</div>
                      <span className={styles.agentName}>Sarah Miller</span>
                    </div>
                  </td>
                  <td className={styles.td}>142</td>
                  <td className={styles.td}>138</td>
                  <td className={styles.td}>4m 12s</td>
                  <td className={styles.td} style={{ color: 'var(--status-green)', fontWeight: 600 }}>4.8</td>
                </tr>
                <tr className={styles.tr}>
                  <td className={styles.td}>
                    <div className={styles.agentInfo}>
                      <div className={styles.agentAvatar} style={{ backgroundColor: '#dcfce7', color: '#166534' }}>JK</div>
                      <span className={styles.agentName}>James King</span>
                    </div>
                  </td>
                  <td className={styles.td}>128</td>
                  <td className={styles.td}>121</td>
                  <td className={styles.td}>8m 45s</td>
                  <td className={styles.td} style={{ color: 'var(--status-green)', fontWeight: 600 }}>4.5</td>
                </tr>
                <tr className={styles.tr}>
                  <td className={styles.td}>
                    <div className={styles.agentInfo}>
                      <div className={styles.agentAvatar} style={{ backgroundColor: '#e2e8f0', color: '#475569' }}>AL</div>
                      <span className={styles.agentName}>Anna Lopez</span>
                    </div>
                  </td>
                  <td className={styles.td}>156</td>
                  <td className={styles.td}>140</td>
                  <td className={styles.td}>12m 02s</td>
                  <td className={styles.td} style={{ color: '#d97706', fontWeight: 600 }}>4.1</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Heatmap Section */}
      <div className={styles.chartCard} style={{ marginBottom: '32px' }}>
        <div className={styles.heatmapHeader}>
          <div className={styles.heatmapTitleBox}>
            <span className={styles.chartTitle}>Message Density Heatmap</span>
            <span className={styles.heatmapSubtitle}>Activity peaks across days and hours</span>
          </div>
          <div className={styles.heatmapLegend}>
            LOW
            <div className={styles.heatmapBlocks}>
              <div className={styles.heatBlock} style={{ backgroundColor: '#f1f5f9' }}></div>
              <div className={styles.heatBlock} style={{ backgroundColor: '#d1fae5' }}></div>
              <div className={styles.heatBlock} style={{ backgroundColor: 'var(--status-green)' }}></div>
              <div className={styles.heatBlock} style={{ backgroundColor: '#0d5c46' }}></div>
            </div>
            HIGH
          </div>
        </div>
        <div className={styles.heatmapGrid}>
          {/* Generating a few rows of mocked heat cells */}
          {Array.from({ length: 75 }).map((_, i) => {
            // Randomly assign colors based on a pseudo-random distribution
            const rand = Math.random();
            let bg = '#f1f5f9'; // Low
            if (rand > 0.6) bg = '#d1fae5';
            if (rand > 0.8) bg = 'var(--status-green)';
            if (rand > 0.95) bg = '#0d5c46'; // High
            
            return <div key={i} className={styles.heatCell} style={{ backgroundColor: bg }}></div>;
          })}
        </div>
      </div>
      
    </div>
  );
}
