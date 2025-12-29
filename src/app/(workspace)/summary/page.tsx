export default function SummaryPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-10 space-y-4">
        <h1 className="text-3xl font-bold text-gray-800">Summary</h1>
        <p className="text-gray-600">
          Static summary placeholder aligned to the login theme. Add migration results or reports
          here when ready.
        </p>
        <div className="rounded-xl bg-gray-100 border border-gray-200 p-6 text-sm text-gray-700">
          <p className="font-semibold text-gray-800 mb-2">Overview</p>
          <p className="text-gray-600">No dynamic data is loaded in this preview.</p>
        </div>
      </div>
    </div>
  );
}
