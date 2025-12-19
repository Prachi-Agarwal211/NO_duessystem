'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DepartmentSupportModal({ isOpen, onClose }) {
    const router = useRouter();
    
    useEffect(() => {
        if (isOpen) {
            router.push('/staff/support');
            onClose();
        }
    }, [isOpen, router, onClose]);
    
    return null;
}