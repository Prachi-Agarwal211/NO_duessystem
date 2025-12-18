'use client';

import SupportModal from './SupportModal';

export default function DepartmentSupportModal({ isOpen, onClose }) {
    return (
        <SupportModal
            isOpen={isOpen}
            onClose={onClose}
            title="Department Support"
            description="This feature is under development."
            buttonText="Close"
        />
    );
}