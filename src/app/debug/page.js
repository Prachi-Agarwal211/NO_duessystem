'use client';

import { useState, useEffect } from 'react';

export default function DebugPage() {
    const [env, setEnv] = useState(null);
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchDebugData() {
            try {
                setLoading(true);
                // 1. Check Env
                const envRes = await fetch('/api/debug/env');
                const envData = await envRes.json();
                setEnv(envData);

                // 2. Check Config
                const configRes = await fetch('/api/public/config?type=all');
                const configData = await configRes.json();
                setConfig(configData);

            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchDebugData();
    }, []);

    if (loading) return <div className="p-10">Loading diagnostics...</div>;
    if (error) return <div className="p-10 text-red-500">Error: {error}</div>;

    return (
        <div className="p-10 font-mono text-sm">
            <h1 className="text-2xl font-bold mb-6">System Diagnostics</h1>

            <section className="mb-10">
                <h2 className="text-xl font-semibold mb-4 bg-gray-100 p-2">1. Server Environment</h2>
                <pre className="p-4 bg-black text-green-400 rounded overflow-auto">
                    {JSON.stringify(env, null, 2)}
                </pre>
                <p className="mt-2 text-gray-500 italic">
                    If SERVICE_ROLE_KEY is false, database fetches will fail on Vercel.
                </p>
            </section>

            <section className="mb-10">
                <h2 className="text-xl font-semibold mb-4 bg-gray-100 p-2">2. Config API Response (/api/public/config)</h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                        <p className="font-bold">Success Status:</p>
                        <p className={config?.success ? 'text-green-600' : 'text-red-600'}>
                            {config?.success ? 'TRUE' : 'FALSE'}
                        </p>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                        <p className="font-bold">Data Count:</p>
                        <p>Schools: {config?.data?.schools?.length || 0}</p>
                        <p>Courses: {config?.data?.courses?.length || 0}</p>
                        <p>Branches: {config?.data?.branches?.length || 0}</p>
                    </div>
                </div>
                <pre className="p-4 bg-gray-900 text-white rounded overflow-auto max-h-[400px]">
                    {JSON.stringify(config, null, 2)}
                </pre>
            </section>

            <div className="text-center text-xs text-gray-400">
                Generated at: {new Date().toLocaleString()}
            </div>
        </div>
    );
}
