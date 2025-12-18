'use client';
import { Clock, CheckCircle, MessageSquare, AlertCircle } from 'lucide-react';

export default function TicketList({ tickets, onSelect, loading }) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-gray-100 dark:bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-300 dark:border-white/10">
        <MessageSquare className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">No tickets found</h3>
        <p className="text-gray-500 text-sm">You haven't raised any support requests yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((ticket) => (
        <div 
          key={ticket.id}
          onClick={() => onSelect(ticket)}
          className="group p-4 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl hover:shadow-md transition-all cursor-pointer flex justify-between items-center"
        >
          <div className="flex gap-4 items-center">
            <div className={`p-2 rounded-full ${
              ticket.status === 'resolved' ? 'bg-green-100 text-green-600' : 
              ticket.status === 'closed' ? 'bg-gray-100 text-gray-600' :
              'bg-blue-100 text-blue-600'
            }`}>
              {ticket.status === 'resolved' ? <CheckCircle className="w-5 h-5" /> : 
               ticket.status === 'closed' ? <Clock className="w-5 h-5" /> :
               <AlertCircle className="w-5 h-5" />}
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">
                {ticket.subject}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                {ticket.message}
              </p>
              <div className="flex gap-2 mt-1 text-xs text-gray-400">
                <span>ID: #{ticket.ticket_number}</span>
                <span>•</span>
                <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
              ticket.priority === 'high' ? 'bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400' :
              'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-400'
            }`}>
              {ticket.priority} Priority
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}