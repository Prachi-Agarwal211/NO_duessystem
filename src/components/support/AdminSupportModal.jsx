'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AdminSupportModal({ isOpen, onClose }) {
    const router = useRouter();
    
    useEffect(() => {
        if (isOpen) {
            router.push('/admin/support');
            onClose();
        }
    }, [isOpen, router, onClose]);
    
    return null;
}