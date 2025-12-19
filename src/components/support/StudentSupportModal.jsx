'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function StudentSupportModal({ isOpen, onClose }) {
    const router = useRouter();
    
    useEffect(() => {
        if (isOpen) {
            router.push('/student/support');
            onClose();
        }
    }, [isOpen, router, onClose]);
    
    return null;
}