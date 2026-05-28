// test-all-emails.js
require('dotenv').config();
const { 
  sendWelcomeEmail, 
  sendVerificationEmail, 
  sendPasswordResetEmail,
  sendPersonalizedEmail 
} = require('./services/mailer');

async function testAllEmails() {
  console.log('📧 Sending OFFICIAL/PROFESSIONAL test emails to chrismaina4433@gmail.com...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test user object
  const testUser = {
    email: 'chrismaina4433@gmail.com',
    fullName: 'Chris Maina',
    phone: '254712345678',
    homeJumuia: { name: 'St. Joseph Jumuia' }
  };

  // Test 1: Welcome Email (Official)
  console.log('1. Sending WELCOME email (official format)...');
  await sendWelcomeEmail(testUser, 'ZUCA-2024-001234');
  await delay(3000);

  // Test 2: Verification Email (Official)
  console.log('2. Sending VERIFICATION email (official format)...');
  await sendVerificationEmail(testUser, '123456');
  await delay(3000);

  // Test 3: Password Reset Email (Official)
  console.log('3. Sending PASSWORD RESET email (official format)...');
  await sendPasswordResetEmail(testUser.email, '789012');
  await delay(3000);

  // Test 4: Payment Receipt (Official - M-PESA style)
  console.log('4. Sending PAYMENT RECEIPT email (official format)...');
  await sendPersonalizedEmail(testUser, 'payment_receipt', 'Payment Confirmation', 'Your contribution has been received.', {
    amount: 2500,
    receiptNumber: 'ZUCA-RCPT-2024-001234',
    campaignTitle: 'Building Fund Drive 2024',
    payerName: 'Chris Maina',
    payerPhone: '254712345678',
    jumuiaName: 'St. Joseph Jumuia'
  });
  await delay(3000);

  // Test 5: Announcement (Official)
  console.log('5. Sending ANNOUNCEMENT email (official format)...');
  await sendPersonalizedEmail(testUser, 'announcement', 'End of Year Thanksgiving Mass', 
    `We are pleased to announce the End of Year Thanksgiving Mass scheduled for December 15th, 2024 at 10:00 AM at the University Chapel.

All members are cordially invited to attend this special celebration. Please arrive by 9:45 AM for seating.

For any inquiries, please contact the ZUCA administration.`);
  await delay(3000);

  // Test 6: Attendance Check-in Confirmation (Official)
  console.log('6. Sending ATTENDANCE CHECK-IN email (official format)...');
  await sendPersonalizedEmail(testUser, 'attendance_checkin', 'Check-in Confirmation: Weekly Bible Study',
    `Dear Chris Maina,

This is to confirm that you have been successfully checked in for "Weekly Bible Study".

Check-in Details:
- Meeting: Weekly Bible Study
- Time: Wednesday, December 4, 2024 at 3:30 PM
- Method: QR Code

Thank you for your attendance.

Zetech University Catholic Action (ZUCA)`,
    { sheetTitle: 'Weekly Bible Study', signTime: new Date(), signMethod: 'QR Code' });
  await delay(3000);

  // Test 7: Attendance Missed Notice (Official)
  console.log('7. Sending ATTENDANCE MISSED email (official format)...');
  await sendPersonalizedEmail(testUser, 'attendance_missed', 'Notice of Absence: Executive Meeting',
    `Dear Chris Maina,

This is to notify you that your attendance was not recorded for the following meeting:

Meeting: Executive Meeting
Date: Tuesday, December 3, 2024 at 9:00 AM
Location: ZUCA Conference Room

Please contact the meeting organizer to discuss any outstanding matters.

Zetech University Catholic Action (ZUCA)`,
    { sheetTitle: 'Executive Meeting', meetingDate: new Date() });
  await delay(3000);

  // Test 8: Meeting Reminder (Official)
  console.log('8. Sending MEETING REMINDER email (official format)...');
  await sendPersonalizedEmail(testUser, 'attendance_reminder', 'Meeting Reminder: General Assembly',
    `Dear Chris Maina,

This is a reminder for the upcoming General Assembly meeting.

Meeting Details:
- Title: General Assembly
- Date: Friday, December 6, 2024 at 2:00 PM
- Location: Main Hall

Your attendance is appreciated.

Zetech University Catholic Action (ZUCA)`,
    { sheetTitle: 'General Assembly' });
  await delay(3000);

  // Test 9: Pledge Approved (Official)
  console.log('9. Sending PLEDGE APPROVED email (official format)...');
  await sendPersonalizedEmail(testUser, 'pledge_approved', 'Pledge Confirmation',
    `Dear Chris Maina,

Your pledge has been reviewed and approved.

Pledge Details:
- Amount: KES 5,000
- Campaign: Building Fund Drive 2024

Thank you for your commitment to ZUCA.

Zetech University Catholic Action (ZUCA)`,
    { amount: 5000 });
  await delay(3000);

  // Test 10: Event Reminder (Official)
  console.log('10. Sending EVENT REMINDER email (official format)...');
  await sendPersonalizedEmail(testUser, 'event_reminder', 'Event Reminder: Charity Outreach',
    `Dear Chris Maina,

This is a reminder of the upcoming ZUCA Charity Outreach event.

Event Details:
- Event: Charity Outreach Program
- Date: Saturday, December 7, 2024
- Time: 8:00 AM - 4:00 PM
- Meeting Point: ZUCA Office

Please confirm your attendance.

Zetech University Catholic Action (ZUCA)`);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('✅ All 10 test emails sent to chrismaina4433@gmail.com!');
  console.log('📧 Please check the inbox (and spam folder)');
  console.log('\n📱 Also check for SMS messages if phone number is configured');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
testAllEmails().catch(console.error);