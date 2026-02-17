export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-3xl font-semibold">Honeybees Collective</h1>
      <p className="mt-2 text-lg text-gray-600">
        A Hive has been created for you.
      </p>
<p className="mt-2 text-sm text-gray-500">
  Supabase connected: {process.env.NEXT_PUBLIC_SUPABASE_URL ? "yes" : "no"}
</p>

      <div className="mt-8 rounded-2xl border p-6">
        <p className="text-gray-700">Web MVP in progress. 🐝</p>
      </div>
    </main>
  );
}
