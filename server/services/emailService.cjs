const nodemailer = require('nodemailer');
// The path is now correct assuming both files are in the 'services' directory
const { 
    createBookingConfirmationTemplate, 
    createBookingNotificationTemplate,
    createBookingCancellationTemplate
} = require('./emailTemplates.js');

// 1. Create a "transporter"
let transporter;
const isEmailConfigured = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;

if (isEmailConfigured) {
    transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        secure: parseInt(process.env.EMAIL_PORT || '587', 10) === 465, // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });
    console.log("📧 Email service configured successfully.");
} else {
    console.warn("⚠️ Email service is not configured. Emails will not be sent. Please check your .env file.");
}

/**
 * Sends a confirmation email to the person who booked the event.
 * @param {object} details - The booking information.
 */
async function sendBookingConfirmation(details) {
    if (!isEmailConfigured) return;

    const mailOptions = {
        from: `"MyCalBook" <${process.env.EMAIL_USER}>`,
        to: details.booker_email,
        subject: `✅ Confirmed: ${details.eventType.title} with ${details.owner.username}`,
        html: createBookingConfirmationTemplate(details),
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Confirmation email sent to ${details.booker_email}: ${info.messageId}`);
        if (process.env.EMAIL_HOST && process.env.EMAIL_HOST.includes('ethereal.email')) {
            console.log(`📬 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        }
    } catch (error) {
        console.error(`❌ Error sending confirmation email to ${details.booker_email}:`, error);
    }
}

/**
 * Sends a notification email to the event owner.
 * @param {object} details - The booking information.
 */
async function sendBookingNotification(details) {
    if (!isEmailConfigured) return;

    const mailOptions = {
        from: `"MyCalBook" <${process.env.EMAIL_USER}>`,
        to: details.owner.email,
        subject: `🔔 New Booking: ${details.eventType.title} with ${details.booker_name}`,
        html: createBookingNotificationTemplate(details),
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Notification email sent to ${details.owner.email}: ${info.messageId}`);
        if (process.env.EMAIL_HOST && process.env.EMAIL_HOST.includes('ethereal.email')) {
            console.log(`📬 Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
        }
    } catch (error) {
        console.error(`❌ Error sending notification email to ${details.owner.email}:`, error);
    }
}

/**
 * Sends cancellation emails to both the booker and the event owner.
 * @param {object} details - The booking information.
 */
async function sendBookingCancellation(details) {
    if (!isEmailConfigured) return;

    // --- Email to Booker ---
    if (details.booker_email) {
        const bookerMailOptions = {
            from: `"MyCalBook" <${process.env.EMAIL_USER}>`,
            to: details.booker_email,
            subject: `❌ Cancelled: ${details.eventType.title} with ${details.owner.username}`,
            html: createBookingCancellationTemplate(details, 'booker'),
        };
        try {
            const info = await transporter.sendMail(bookerMailOptions);
            console.log(`✅ Cancellation email sent to booker ${details.booker_email}: ${info.messageId}`);
        } catch (error) {
            console.error(`❌ Error sending cancellation to booker ${details.booker_email}:`, error);
        }
    }

    // --- Email to Owner (if they have notifications enabled) ---
    if (details.owner.email_notifications) {
        const ownerMailOptions = {
            from: `"MyCalBook" <${process.env.EMAIL_USER}>`,
            to: details.owner.email,
            subject: `❌ You Cancelled: ${details.eventType.title} with ${details.booker_name}`,
            html: createBookingCancellationTemplate(details, 'owner'),
        };
        try {
            const info = await transporter.sendMail(ownerMailOptions);
            console.log(`✅ Cancellation notification sent to owner ${details.owner.email}: ${info.messageId}`);
        } catch (error) {
            console.error(`❌ Error sending cancellation to owner ${details.owner.email}:`, error);
        }
    }
}

module.exports = {
    sendBookingConfirmation,
    sendBookingNotification,
    sendBookingCancellation,
};