'use client';

import { useState, useEffect } from 'react';
import OtpLoginForm from './OtpLoginForm';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export default function StudentAuthGuard({ children }) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    // Store the authenticated registration number to pass to children if needed
    const [regNo, setRegNo] = useState(null);

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            // We check session by making a lightweight call to check-status 
            // providing a dummy query param to bypass the "missing regNo" 400 error
            // Ideally we would have a dedicated /api/student/auth/me endpoint, 
            // but probing check-status is efficient enough given our changes.

            const res = await fetch('/api/check-status?registration_no=SESSION_CHECK', {
                cache: 'no-store'
            });

            // If we get 401/403, we are not authenticated
            if (res.status === 401 || res.status === 403) {
                setIsAuthenticated(false);
            } else {
                // If we get 200 (or even 400 for bad regNo), it means we passed the session middleware!
                // The check-status route returns 400 if regNo is missing, but only AFTER session check.
                // So any status OTHER than 401/403 means we have a valid session.
                setIsAuthenticated(true);
            }
        } catch (err) {
            console.error('Session check failed:', err);
            // Fail safe to login
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    const handleLoginSuccess = (registrationNo) => {
        setRegNo(registrationNo);
        setIsAuthenticated(true);
        // Redirect with reg param to auto-load status, forcing a reload to refresh cookies
        window.location.href = `${window.location.pathname}?reg=${registrationNo}`;
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <LoadingSpinner size="lg" message="Verifying session..." />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <OtpLoginForm onLoginSuccess={handleLoginSuccess} />;
    }

    // Render children if authenticated
    return (
        <>
            {children}
        </>
    );
}
