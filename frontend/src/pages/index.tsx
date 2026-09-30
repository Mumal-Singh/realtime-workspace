import { useEffect } from 'react';
import { useRouter } from 'next/router';

// just bounces to login or the workspace list depending on whether we have a token -
// no real "landing page" needed for a take-home
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const hasToken = !!localStorage.getItem('accessToken');
    router.replace(hasToken ? '/workspaces' : '/login');
  }, [router]);

  return null;
}
