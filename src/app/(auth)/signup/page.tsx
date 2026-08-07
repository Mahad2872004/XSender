import Link from 'next/link';
import SignupForm from './SignupForm';
import styles from '../form.module.css';

export const metadata = { title: 'Create your workspace · xSender' };

export default function SignupPage() {
  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Create your workspace</h1>
        <p className={styles.subtitle}>
          Free to set up. You can build and test your first automation before connecting
          any channel.
        </p>
      </div>

      <SignupForm />

      <p className={styles.footer}>
        Already have an account?{' '}
        <Link href="/login" className={styles.footerLink}>
          Sign in
        </Link>
      </p>
    </>
  );
}
