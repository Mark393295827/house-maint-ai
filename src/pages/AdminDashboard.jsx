import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = async () => {
        try {
            setLoading(true);
            const data = await api.getFeedbackEvents(50);
            setEvents(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading feedback data...</div>;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <header className="bg-white shadow sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <h1 className="text-xl font-bold text-gray-900">Admin Dashboard</h1>
                    <button
                        onClick={() => navigate('/')}
                        className="text-sm text-gray-600 hover:text-gray-900"
                    >
                        Back to App
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 py-8">
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                        <h2 className="text-lg font-semibold text-gray-900">User Feedback Events</h2>
                        <button
                            onClick={loadEvents}
                            className="text-primary text-sm hover:underline"
                        >
                            Refresh
                        </button>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 text-red-600 text-sm border-b border-red-100">
                            {error}
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-medium">
                                <tr>
                                    <th className="px-6 py-3">Timestamp</th>
                                    <th className="px-6 py-3">Type</th>
                                    <th className="px-6 py-3">Session ID</th>
                                    <th className="px-6 py-3">Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {events.map((event) => (
                                    <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                                            {new Date(event.timestamp).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${event.event_type.includes('rating') ? 'bg-blue-100 text-blue-800' :
                                                    event.event_type === 'view' ? 'bg-gray-100 text-gray-800' :
                                                        'bg-purple-100 text-purple-800'}`}>
                                                {event.event_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                            {event.session_id?.substring(0, 8)}...
                                        </td>
                                        <td className="px-6 py-4 text-gray-700">
                                            <pre className="text-xs bg-gray-50 p-2 rounded max-w-xs overflow-auto">
                                                {JSON.stringify(event.data, null, 2)}
                                            </pre>
                                        </td>
                                    </tr>
                                ))}
                                {events.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-gray-400">
                                            No feedback events found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;
