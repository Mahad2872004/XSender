import React from 'react';
import { Plus } from 'lucide-react';
import styles from './FloatingActionButton.module.css';

export default function FloatingActionButton() {
  return (
    <button className={styles.fab} aria-label="Add new">
      <Plus size={24} />
    </button>
  );
}
