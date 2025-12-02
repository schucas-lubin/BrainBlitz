import { notFound } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import SessionDetailClient from './SessionDetailClient';

type Session = {
  id: string;
  title: string;
  subject: string | null;
  raw_mmd: string | null;
};

async function getSession(id: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from('sessions')
    .select('id, title, subject, raw_mmd')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    return null;
  }

  return data as Session;
}

export default async function SessionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getSession(params.id);

  if (!session) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <Link
            href="/"
            className="text-blue-600 hover:text-blue-700 text-sm mb-4 inline-block"
          >
            ← Back to Sessions
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{session.title}</h1>
          {session.subject && (
            <span className="inline-block px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded">
              {session.subject}
            </span>
          )}
        </div>
      </div>

      <SessionDetailClient sessionId={session.id} rawMmd={session.raw_mmd} />
    </main>
  );
}
