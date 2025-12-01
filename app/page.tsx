'use client';

import Link from 'next/link';
import { useState } from 'react';

// TODO: Replace with real Supabase queries
interface Session {
  id: string;
  title: string;
  subject?: string;
  created_at: string;
}

// Mock data - will be replaced with Supabase queries
const mockSessions: Session[] = [
  {
    id: '1',
    title: 'Chemistry Basics',
    subject: 'Chemistry',
    created_at: new Date().toISOString(),
  },
  {
    id: '2',
    title: 'Calculus Derivatives',
    subject: 'Math',
    created_at: new Date().toISOString(),
  },
];

export default function Home() {
  const [sessions] = useState<Session[]>(mockSessions);

  return (
    <main className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">BrainBlitz Sessions</h1>
          <Link
            href="/sessions/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            New Session
          </Link>
        </div>

        {sessions.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <p className="text-gray-600 mb-4">No sessions yet</p>
            <Link
              href="/sessions/new"
              className="text-blue-600 hover:text-blue-700 underline"
            >
              Create your first session
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {sessions.map((session) => (
              <Link
                key={session.id}
                href={`/sessions/${session.id}`}
                className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-1">
                      {session.title}
                    </h2>
                    {session.subject && (
                      <span className="inline-block px-2 py-1 text-sm bg-gray-100 text-gray-700 rounded">
                        {session.subject}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(session.created_at).toLocaleDateString()}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
