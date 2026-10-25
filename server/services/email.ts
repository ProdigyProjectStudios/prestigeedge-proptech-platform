import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { User, Property, Inquiry, PropertyViewing } from '@shared/schema';

// Email configuration interface
interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

// Email template types
type EmailTemplate = 
  | 'new-inquiry'
  | 'inquiry-response'
  | 'viewing-scheduled'
  | 'viewing-reminder'
  | 'viewing-cancelled'
  | 'new-message'
  | 'property-saved'
  | 'welcome';

interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private config: EmailConfig | null = null;
  private isConfigured: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Check if email credentials are configured
    if (
      process.env.SMTP_HOST &&
      process.env.SMTP_PORT &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
    ) {
      this.config = {
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        from: process.env.SMTP_FROM || 'PrestigeEdge <noreply@prestigeedge.com>',
      };

      this.transporter = nodemailer.createTransport({
        host: this.config.host,
        port: this.config.port,
        secure: this.config.secure,
        auth: this.config.auth,
      });

      this.isConfigured = true;
      console.log('[EmailService] Email service initialized successfully');
    } else {
      console.log('[EmailService] Email service not configured - missing SMTP credentials');
    }
  }

  // Send email method
  async sendEmail(data: EmailData): Promise<boolean> {
    if (!this.isConfigured || !this.transporter || !this.config) {
      console.log('[EmailService] Email not sent - service not configured');
      return false;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.config.from,
        to: data.to,
        subject: data.subject,
        html: data.html,
        text: data.text || this.stripHtml(data.html),
      });

      console.log('[EmailService] Email sent successfully:', info.messageId);
      return true;
    } catch (error) {
      console.error('[EmailService] Failed to send email:', error);
      return false;
    }
  }

  // Strip HTML tags for text version
  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '');
  }

  // Generate base email template
  private generateBaseTemplate(content: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>PrestigeEdge</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f4f4f4;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: #ffffff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          }
          .header {
            background: #000000;
            color: #FFD700;
            padding: 30px;
            text-align: center;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            letter-spacing: 2px;
          }
          .content {
            padding: 30px;
          }
          .button {
            display: inline-block;
            background: #FFD700;
            color: #000000;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 4px;
            font-weight: bold;
            margin: 20px 0;
          }
          .footer {
            background: #f8f8f8;
            padding: 20px;
            text-align: center;
            font-size: 14px;
            color: #666;
          }
          .property-card {
            border: 1px solid #ddd;
            border-radius: 4px;
            padding: 15px;
            margin: 15px 0;
            background: #f9f9f9;
          }
          .property-title {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .property-price {
            color: #FFD700;
            font-size: 20px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>PRESTIGEEDGE</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px;">Luxury Real Estate Excellence</p>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>© 2025 PrestigeEdge. All rights reserved.</p>
            <p>This is an automated message, please do not reply directly to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Email template methods
  async sendWelcomeEmail(user: User): Promise<boolean> {
    const content = `
      <h2>Welcome to PrestigeEdge, ${user.name}!</h2>
      <p>Thank you for joining our exclusive luxury real estate platform. We're excited to help you discover your dream property.</p>
      <p>As a ${user.role}, you now have access to:</p>
      <ul>
        <li>Browse our curated collection of luxury properties</li>
        <li>Save your favorite properties for later</li>
        <li>Submit inquiries directly to property agents</li>
        <li>Schedule property viewings</li>
        <li>Communicate with agents through our messaging system</li>
      </ul>
      <a href="${process.env.APP_URL || 'https://prestigeedge.com'}/dashboard" class="button">Visit Your Dashboard</a>
      <p>If you have any questions, feel free to reach out to our support team.</p>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to PrestigeEdge - Luxury Real Estate',
      html: this.generateBaseTemplate(content),
    });
  }

  async sendNewInquiryEmail(inquiry: Inquiry, property: Property, client: User, agent: User): Promise<boolean> {
    const content = `
      <h2>New Property Inquiry</h2>
      <p>Hi ${agent.name},</p>
      <p>You have received a new inquiry for one of your properties.</p>
      
      <div class="property-card">
        <div class="property-title">${property.title}</div>
        <div class="property-price">$${property.price.toLocaleString()}</div>
        <p>${property.location}</p>
      </div>
      
      <h3>Client Information:</h3>
      <p><strong>Name:</strong> ${client.name}</p>
      <p><strong>Email:</strong> ${client.email}</p>
      
      <h3>Message:</h3>
      <p style="background: #f9f9f9; padding: 15px; border-radius: 4px;">${inquiry.message}</p>
      
      <a href="${process.env.APP_URL || 'https://prestigeedge.com'}/dashboard?tab=inquiries" class="button">View Inquiry</a>
    `;

    return this.sendEmail({
      to: agent.email,
      subject: `New Inquiry: ${property.title}`,
      html: this.generateBaseTemplate(content),
    });
  }

  async sendInquiryResponseEmail(inquiry: Inquiry, property: Property, client: User, response: string): Promise<boolean> {
    const content = `
      <h2>Response to Your Property Inquiry</h2>
      <p>Hi ${client.name},</p>
      <p>The agent has responded to your inquiry about the following property:</p>
      
      <div class="property-card">
        <div class="property-title">${property.title}</div>
        <div class="property-price">$${property.price.toLocaleString()}</div>
        <p>${property.location}</p>
      </div>
      
      <h3>Agent's Response:</h3>
      <p style="background: #f9f9f9; padding: 15px; border-radius: 4px;">${response}</p>
      
      <a href="${process.env.APP_URL || 'https://prestigeedge.com'}/dashboard?tab=inquiries" class="button">View Response</a>
    `;

    return this.sendEmail({
      to: client.email,
      subject: `Response: ${property.title}`,
      html: this.generateBaseTemplate(content),
    });
  }

  async sendViewingScheduledEmail(viewing: PropertyViewing, property: Property, client: User): Promise<boolean> {
    const viewingDate = new Date(viewing.viewingDate);
    const formattedDate = viewingDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = viewingDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const content = `
      <h2>Property Viewing Confirmed</h2>
      <p>Hi ${client.name},</p>
      <p>Your property viewing has been successfully scheduled!</p>
      
      <div class="property-card">
        <div class="property-title">${property.title}</div>
        <div class="property-price">$${property.price.toLocaleString()}</div>
        <p>${property.location}</p>
      </div>
      
      <h3>Viewing Details:</h3>
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${formattedTime}</p>
      <p><strong>Location:</strong> ${property.address}</p>
      
      ${viewing.notes ? `<p><strong>Notes:</strong> ${viewing.notes}</p>` : ''}
      
      <p>An agent will meet you at the property. Please arrive 5-10 minutes early.</p>
      
      <a href="${process.env.APP_URL || 'https://prestigeedge.com'}/dashboard?tab=viewings" class="button">Manage Viewings</a>
    `;

    return this.sendEmail({
      to: client.email,
      subject: `Viewing Confirmed: ${property.title} - ${formattedDate}`,
      html: this.generateBaseTemplate(content),
    });
  }

  async sendViewingReminderEmail(viewing: PropertyViewing, property: Property, client: User): Promise<boolean> {
    const viewingDate = new Date(viewing.viewingDate);
    const formattedDate = viewingDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = viewingDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

    const content = `
      <h2>Property Viewing Reminder</h2>
      <p>Hi ${client.name},</p>
      <p>This is a reminder about your upcoming property viewing tomorrow.</p>
      
      <div class="property-card">
        <div class="property-title">${property.title}</div>
        <div class="property-price">$${property.price.toLocaleString()}</div>
        <p>${property.location}</p>
      </div>
      
      <h3>Viewing Details:</h3>
      <p><strong>Date:</strong> ${formattedDate}</p>
      <p><strong>Time:</strong> ${formattedTime}</p>
      <p><strong>Location:</strong> ${property.address}</p>
      
      <p>An agent will meet you at the property. Please arrive 5-10 minutes early.</p>
      
      <a href="${process.env.APP_URL || 'https://prestigeedge.com'}/dashboard?tab=viewings" class="button">View Details</a>
    `;

    return this.sendEmail({
      to: client.email,
      subject: `Reminder: Property Viewing Tomorrow - ${property.title}`,
      html: this.generateBaseTemplate(content),
    });
  }

  async sendViewingCancelledEmail(viewing: PropertyViewing, property: Property, client: User, reason?: string): Promise<boolean> {
    const content = `
      <h2>Property Viewing Cancelled</h2>
      <p>Hi ${client.name},</p>
      <p>We're sorry to inform you that your property viewing has been cancelled.</p>
      
      <div class="property-card">
        <div class="property-title">${property.title}</div>
        <div class="property-price">$${property.price.toLocaleString()}</div>
        <p>${property.location}</p>
      </div>
      
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      
      <p>You can schedule a new viewing at your convenience.</p>
      
      <a href="${process.env.APP_URL || 'https://prestigeedge.com'}/properties/${property.id}" class="button">Reschedule Viewing</a>
    `;

    return this.sendEmail({
      to: client.email,
      subject: `Viewing Cancelled: ${property.title}`,
      html: this.generateBaseTemplate(content),
    });
  }

  async sendNewMessageNotification(senderName: string, receiverEmail: string, subject: string, preview: string): Promise<boolean> {
    const content = `
      <h2>New Message Received</h2>
      <p>You have received a new message from ${senderName}.</p>
      
      <div style="background: #f9f9f9; padding: 20px; border-radius: 4px; margin: 20px 0;">
        <h3 style="margin-top: 0;">${subject}</h3>
        <p>${preview}${preview.length >= 200 ? '...' : ''}</p>
      </div>
      
      <a href="${process.env.APP_URL || 'https://prestigeedge.com'}/dashboard?tab=messages" class="button">Read Full Message</a>
    `;

    return this.sendEmail({
      to: receiverEmail,
      subject: `New Message: ${subject}`,
      html: this.generateBaseTemplate(content),
    });
  }

  async sendPropertySavedNotification(property: Property, client: User): Promise<boolean> {
    const content = `
      <h2>Property Saved</h2>
      <p>Hi ${client.name},</p>
      <p>You've successfully saved a property to your favorites!</p>
      
      <div class="property-card">
        <div class="property-title">${property.title}</div>
        <div class="property-price">$${property.price.toLocaleString()}</div>
        <p>${property.location}</p>
        <p>${property.beds} beds • ${property.baths} baths • ${property.sqft.toLocaleString()} sqft</p>
      </div>
      
      <p>You can view all your saved properties in your dashboard.</p>
      
      <a href="${process.env.APP_URL || 'https://prestigeedge.com'}/dashboard?tab=saved" class="button">View Saved Properties</a>
    `;

    return this.sendEmail({
      to: client.email,
      subject: `Property Saved: ${property.title}`,
      html: this.generateBaseTemplate(content),
    });
  }

  // Test email configuration
  async testEmailConfiguration(): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('[EmailService] Email configuration verified successfully');
      return true;
    } catch (error) {
      console.error('[EmailService] Email configuration test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();