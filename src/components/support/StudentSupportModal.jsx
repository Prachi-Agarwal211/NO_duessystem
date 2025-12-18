'use client';

import SupportModal from './SupportModal';

export default function StudentSupportModal({ isOpen, onClose }) {
    return (
        <SupportModal
            isOpen={isOpen}
            onClose={onClose}
            title="Student Support"
            description="This feature is under development."
            buttonText="Close"
        />
    );
}