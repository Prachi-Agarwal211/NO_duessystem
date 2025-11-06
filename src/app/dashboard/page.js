"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

// Helper function to format the time difference
function formatDuration(start, end) {
  if (!start || !end) return "-";
  
  const diff = new Date(end) - new Date(start);
  if (diff < 0) return "-";

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

// Status Badge Component
const StatusBadge = ({ status }) => {
  const baseClasses = "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold";
  const colors = {
    Approved: "bg-green-600/80 text-green-100",
    Rejected: "bg-red-600/80 text-red-100",
    Pending: "bg-yellow-600/80 text-yellow-100",
  };
  return <span className={`${baseClasses} ${colors[status] || colors.Pending}`}>{status}</span>;
};

export default function DashboardPage() {
  const router = useRouter();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeAppId, setActiveAppId] = useState(null);

  useEffect(() => {
    const checkSessionAndFetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace("/login");
        return;
      }

      try {
        const response = await fetch("/api/admin");
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || `Error ${response.status}`);
        }
        const data = await response.json();
        setApps(data.applications || []);
      } catch (err) {
        setError(err.message);
        console.error("Failed to fetch dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };
    checkSessionAndFetchData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center">Loading Admin Dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-dvh flex items-center justify-center">
        <div className="glass rounded-2xl p-8 text-center text-red-300">
          <h2 className="text-xl font-bold">Access Denied</h2>
          <p className="mt-2">{error}. You might not have admin privileges.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0a0a0a] text-white p-4 sm:p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <button
            onClick={async () => { await supabase.auth.signOut(); router.replace("/login"); }}
            className="btn-ghost"
          >
            Logout
          </button>
        </div>
        
        <div className="space-y-4">
          {apps.length === 0 ? (
            <div className="glass rounded-xl p-8 text-center text-zinc-400">
              No applications have been submitted yet.
            </div>
          ) : (
            apps.map((app) => (
              <div key={app.id} className="glass rounded-xl overflow-hidden">
                {/* Application Header */}
                <div
                  className="p-4 cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setActiveAppId(activeAppId === app.id ? null : app.id)}
                >
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center">
                    <div>
                      <div className="text-xs text-zinc-400">Student Name</div>
                      <div className="font-semibold">{app.student_name}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">Registration No</div>
                      <div className="font-medium">{app.registration_no}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-400">Submitted</div>
                      <div>{new Date(app.created_at).toLocaleDateString()}</div>
                    </div>
                    <div className="flex justify-end">
                      <button className="btn-ghost text-sm">
                        {activeAppId === app.id ? "Hide Details" : "View Details"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Collapsible Details Panel */}
                {activeAppId === app.id && (
                  <div className="bg-black/20 p-4 border-t border-white/10">
                    {/* Student Data */}
                    <h3 className="font-semibold mb-2 text-zinc-200">Submitted Application Data</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-2 text-sm mb-6 bg-white/5 p-4 rounded-lg">
                        <div><strong className="text-zinc-400">Parent:</strong> {app.parent_name}</div>
                        <div><strong className="text-zinc-400">Session:</strong> {app.session_range}</div>
                        <div><strong className="text-zinc-400">Contact:</strong> {app.contact_no}</div>
                        <div><strong className="text-zinc-400">Course:</strong> {app.course}</div>
                        <div><strong className="text-zinc-400">Branch:</strong> {app.branch}</div>
                        <div><strong className="text-zinc-400">School:</strong> {app.school}</div>
                    </div>
                    
                    {/* Department Status Table */}
                    <h3 className="font-semibold mb-2 text-zinc-200">Department Status</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm text-left">
                        <thead className="text-zinc-400">
                          <tr>
                            <th className="p-2">Department</th>
                            <th className="p-2">Status</th>
                            <th className="p-2">Time Taken</th>
                            <th className="p-2">Reason for Rejection</th>
                          </tr>
                        </thead>
                        <tbody>
                          {app.no_dues_status
                            .sort((a, b) => a.department.localeCompare(b.department))
                            .map((status) => (
                              <tr key={status.department} className="border-t border-white/10">
                                <td className="p-2 font-medium">{status.department}</td>
                                <td className="p-2"><StatusBadge status={status.status} /></td>
                                <td className="p-2">
                                  {status.status !== "Pending" ? formatDuration(app.created_at, status.updated_at) : "N/A"}
                                </td>
                                <td className="p-2 text-red-300">{status.rejection_reason || "N/A"}</td>
                              </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}