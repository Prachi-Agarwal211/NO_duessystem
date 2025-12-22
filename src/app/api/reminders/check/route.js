// API Route to check and send daily reminders
// This route will be called by middleware on every request
// and will automatically send reminders at 4 PM IST

import { NextResponse } from 'next/server';
import { checkAndSendReminder } from '@/lib/dailyReminder';

export async function GET() {
  try {
    const result = await checkAndSendReminder();
    
    return NextResponse.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('Error checking reminders:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Also support POST for manual testing
export async function POST() {
  try {
    const { sendDailyReminders } = await import('@/lib/dailyReminder');
    const result = await sendDailyReminders();
    
    return NextResponse.json({
      success: true,
      message: 'Manual reminder sent',
      ...result
    });
  } catch (error) {
    console.error('Error sending manual reminders:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}