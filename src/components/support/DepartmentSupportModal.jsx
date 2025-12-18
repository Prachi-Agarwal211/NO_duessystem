'use client';

export default function DepartmentSupportModal({ isOpen, onClose }) {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Department Support</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6">This feature is under development.</p>
                <button
                    onClick={onClose}
                    className="w-full py-2 bg-blue4-600 text-white rounded-lg hover:bg-blue-700"
                >
                    Close
                </button>
            </div>
        </div>
    );
}