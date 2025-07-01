const { format } = require('date-fns');

/**
 * Base email template with modern styling
 */
const createBaseTemplate = (content) => {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>MyCalBook</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            
            /* Reset styles */
            * { margin: 0; padding: 0; box-sizing: border-box; }
            
            /* Animations - limited email client support but progressive enhancement */
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); }
                50% { transform: scale(1.02); }
            }
            
            .animate-fade-in {
                animation: fadeIn 0.6s ease-out;
            }
            
            .animate-pulse {
                animation: pulse 2s infinite;
            }
        </style>
    </head>
    <body style="
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        line-height: 1.6;
        margin: 0;
        padding: 0;
        background-color: #f8fafc;
        color: #334155;
    ">
        <div style="
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        ">
            <!-- Header -->
            <div style="
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                padding: 40px 30px;
                text-align: center;
            ">
                <div style="
                    background-color: rgba(255, 255, 255, 0.2);
                    border-radius: 50%;
                    width: 80px;
                    height: 80px;
                    margin: 0 auto 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    backdrop-filter: blur(10px);
                " class="animate-pulse">
                    <span style="
                        font-size: 36px;
                        color: white;
                    ">📅</span>
                </div>
                <h1 style="
                    color: white;
                    font-size: 28px;
                    font-weight: 700;
                    margin: 0;
                    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                ">MyCalBook</h1>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px 30px;" class="animate-fade-in">
                ${content}
            </div>
            
            <!-- Footer -->
            <div style="
                background-color: #f1f5f9;
                padding: 30px;
                text-align: center;
                border-top: 1px solid #e2e8f0;
            ">
                <p style="
                    color: #64748b;
                    font-size: 14px;
                    margin: 0 0 10px;
                ">This email was sent by MyCalBook</p>
                <p style="
                    color: #94a3b8;
                    font-size: 12px;
                    margin: 0;
                ">© 2025 MyCalBook. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
};

/**
 * Creates a modern booking details card
 */
const createBookingDetailsCard = (details) => {
    const startTimeFormatted = format(new Date(details.startTime), 'h:mm a');
    const dateFormatted = format(new Date(details.startTime), 'EEEE, MMMM d, yyyy');
    const guestList = details.guests && details.guests.length > 0
        ? `
        <div style="
            display: flex;
            align-items: center;
            padding: 12px 0;
            border-bottom: 1px solid #f1f5f9;
        ">
            <div style="
                width: 40px;
                height: 40px;
                background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-right: 16px;
            ">
                <span style="color: white; font-size: 18px;">👥</span>
            </div>
            <div>
                <div style="font-weight: 600; color: #1e293b; font-size: 14px;">Guests</div>
                <div style="color: #64748b; font-size: 14px;">${details.guests.join(', ')}</div>
            </div>
        </div>
        ` : '';

    return `
    <div style="
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 16px;
        padding: 24px;
        margin: 24px 0;
        color: white;
        position: relative;
        overflow: hidden;
    ">
        <div style="
            position: absolute;
            top: -50%;
            right: -50%;
            width: 200px;
            height: 200px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 50%;
            pointer-events: none;
        "></div>
        
        <h3 style="
            font-size: 20px;
            font-weight: 700;
            margin: 0 0 16px;
            position: relative;
            z-index: 1;
        ">${details.eventType.title}</h3>
        
        <div style="position: relative; z-index: 1;">
            <div style="
                display: flex;
                align-items: center;
                margin-bottom: 12px;
            ">
                <span style="
                    font-size: 18px;
                    margin-right: 12px;
                ">📅</span>
                <span style="font-size: 16px; font-weight: 500;">${dateFormatted}</span>
            </div>
            
            <div style="
                display: flex;
                align-items: center;
                margin-bottom: 12px;
            ">
                <span style="
                    font-size: 18px;
                    margin-right: 12px;
                ">⏰</span>
                <span style="font-size: 16px; font-weight: 500;">${startTimeFormatted} (${details.duration} minutes)</span>
            </div>
            
            <div style="
                display: flex;
                align-items: center;
                margin-bottom: ${details.guests && details.guests.length > 0 ? '12px' : '0'};
            ">
                <span style="
                    font-size: 18px;
                    margin-right: 12px;
                ">📍</span>
                <span style="font-size: 16px; font-weight: 500;">${details.eventType.location}</span>
            </div>
            
            ${details.guests && details.guests.length > 0 ? `
            <div style="
                display: flex;
                align-items: center;
            ">
                <span style="
                    font-size: 18px;
                    margin-right: 12px;
                ">👥</span>
                <span style="font-size: 16px; font-weight: 500;">${details.guests.join(', ')}</span>
            </div>
            ` : ''}
        </div>
    </div>
    `;
};

/**
 * Creates the booking confirmation email template
 */
const createBookingConfirmationTemplate = (details) => {
    const content = `
        <div style="text-align: center; margin-bottom: 32px;">
            <div style="
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                border-radius: 50%;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 10px 25px -5px rgba(16, 185, 129, 0.3);
            " class="animate-pulse">
                <span style="color: white; font-size: 36px;">✓</span>
            </div>
            <h2 style="
                color: #1e293b;
                font-size: 32px;
                font-weight: 700;
                margin: 0 0 8px;
            ">Booking Confirmed!</h2>
            <p style="
                color: #64748b;
                font-size: 18px;
                margin: 0;
            ">Your appointment is all set</p>
        </div>
        
        <div style="
            background-color: #f8fafc;
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            border-left: 4px solid #10b981;
        ">
            <p style="
                font-size: 16px;
                color: #334155;
                margin: 0 0 8px;
            ">Hello <strong style="color: #1e293b;">${details.booker_name}</strong>,</p>
            <p style="
                font-size: 16px;
                color: #64748b;
                margin: 0;
                line-height: 1.5;
            ">Your booking with <strong style="color: #1e293b;">${details.owner.username}</strong> has been confirmed. We've added it to your calendar and sent you all the details below.</p>
        </div>
        
        ${createBookingDetailsCard(details)}
        
        <div style="
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            margin: 24px 0;
        ">
            <p style="
                color: white;
                font-size: 16px;
                font-weight: 600;
                margin: 0 0 8px;
            ">Need to make changes?</p>
            <p style="
                color: rgba(255, 255, 255, 0.9);
                font-size: 14px;
                margin: 0;
            ">Contact ${details.owner.username} directly or manage your booking through MyCalBook</p>
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
            <p style="
                color: #64748b;
                font-size: 16px;
                margin: 0;
            ">Thank you for using MyCalBook! 🚀</p>
        </div>
    `;
    
    return createBaseTemplate(content);
};

/**
 * Creates the booking notification email template (for event owner)
 */
const createBookingNotificationTemplate = (details) => {
    const content = `
        <div style="text-align: center; margin-bottom: 32px;">
            <div style="
                width: 80px;
                height: 80px;
                background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                border-radius: 50%;
                margin: 0 auto 20px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 10px 25px -5px rgba(59, 130, 246, 0.3);
            " class="animate-pulse">
                <span style="color: white; font-size: 36px;">🔔</span>
            </div>
            <h2 style="
                color: #1e293b;
                font-size: 32px;
                font-weight: 700;
                margin: 0 0 8px;
            ">New Booking!</h2>
            <p style="
                color: #64748b;
                font-size: 18px;
                margin: 0;
            ">Someone just scheduled time with you</p>
        </div>
        
        <div style="
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            border-radius: 12px;
            padding: 24px;
            margin: 24px 0;
            border-left: 4px solid #3b82f6;
        ">
            <p style="
                font-size: 16px;
                color: #334155;
                margin: 0 0 8px;
            ">Hello <strong style="color: #1e293b;">${details.owner.username}</strong>,</p>
            <p style="
                font-size: 16px;
                color: #64748b;
                margin: 0;
                line-height: 1.5;
            ">A new event has been scheduled on your calendar by <strong style="color: #1e293b;">${details.booker_name}</strong>. The booking details are below:</p>
        </div>
        
        ${createBookingDetailsCard(details)}
        
        <div style="
            background-color: #f8fafc;
            border-radius: 12px;
            padding: 20px;
            border: 2px dashed #cbd5e1;
            text-align: center;
            margin: 24px 0;
        ">
            <div style="
                width: 48px;
                height: 48px;
                background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
                border-radius: 12px;
                margin: 0 auto 12px;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <span style="color: white; font-size: 24px;">👤</span>
            </div>
            <p style="
                color: #374151;
                font-size: 16px;
                font-weight: 600;
                margin: 0 0 4px;
            ">Booked by: ${details.booker_name}</p>
            <p style="
                color: #6b7280;
                font-size: 14px;
                margin: 0;
            ">${details.booker_email}</p>
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
            <p style="
                color: #64748b;
                font-size: 16px;
                margin: 0;
            ">The event has been automatically added to your calendar 📅</p>
        </div>
    `;
    
    return createBaseTemplate(content);
};

module.exports = {
    createBookingConfirmationTemplate,
    createBookingNotificationTemplate,
};