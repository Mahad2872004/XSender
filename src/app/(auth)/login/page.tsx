import Link from 'next/link';
import LoginForm from './LoginForm';
import styles from '../form.module.css';

export const metadata = { title: 'Sign in · xSender' };

export default async function LoginPage(props: PageProps<'/login'>) {
  const searchParams = await props.searchParams;
  const next = typeof searchParams.next === 'string' ? searchParams.next : '/';

  return (
    <>
      <div className={styles.header}>
        <h1 className={styles.title}>Welcome back</h1>
        <p className={styles.subtitle}>Sign in to your xSender workspace.</p>
      </div>

      <LoginForm next={next} />

      <p className={styles.footer}>
        New here?{' '}
        <Link href="/signup" className={styles.footerLink}>
          Create an account
        </Link>
      </p>
    </>
  );
}
