export default function SessionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-4">Session {params.id}</h1>
      <p className="text-gray-600">Session detail placeholder</p>
    </main>
  );
}

