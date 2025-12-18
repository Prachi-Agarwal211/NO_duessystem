'use client';

import SupportModal from './SupportModal';

export default function AdminSupportModal({ isOpen, onClose }) {
    return (
        <SupportModal
            isOpen={isOpen}
            onClose={onClose}
            title="Admin Support"
            description="This feature is under development."
            buttonText="Close"
        />
    );
}