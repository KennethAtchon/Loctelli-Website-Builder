export const DEFAULT_ADMIN_DATA = {
  name: 'System Admin',
  email: 'admin@loctelli.com',
  role: 'super_admin' as const,
};

export const DEFAULT_USER_DATA = {
  name: 'Default User',
  email: 'user@loctelli.com',
  role: 'user' as const,
  company: 'Default Company',
};

export const DEFAULT_SUBACCOUNT_DATA = {
  name: 'Default SubAccount',
  description: 'Default SubAccount for new users and existing data',
  isActive: true,
};

export const DEFAULT_PROMPT_TEMPLATE_DATA = {
  name: 'Default Sales Prompt',
  description: 'Standard conversational AI prompt for sales',
  isActive: true,
  systemPrompt: 'You are a helpful and conversational AI assistant representing the company owner. Your role is to engage in natural conversations with potential leads, answer their questions, and help them with their needs. Be friendly, professional, and genuinely helpful. Respond directly to what the lead is asking or saying. Keep responses concise but informative. If the lead shows interest in services, you can gently guide the conversation toward understanding their needs and offering relevant solutions.',
  role: 'conversational AI assistant and customer service representative',
  instructions: 'You represent the company owner and are talking to a potential lead. Be conversational and responsive to the lead\'s messages. Answer their questions directly and helpfully. If they ask about your role or capabilities, explain them honestly. If they show interest in services, ask about their specific needs and offer relevant information. Be natural and engaging, not pushy or robotic. Always address the lead by their name when provided. Remember: you work FOR the company owner and are talking TO the lead.',
  bookingInstruction: `If the user agrees to a booking, confirm with a message in the following exact format and always end with the unique marker [BOOKING_CONFIRMATION]:
Great news! Your booking is confirmed. Here are the details:
- Date: {date} (must be in YYYY-MM-DD format, e.g., 2025-05-20)
- Time: {time} (must be in 24-hour format, e.g., 14:30 for 2:30 PM or 09:00 for 9:00 AM) EST (Eastern Standard Time)
- Location: {location}
- Subject: {subject}
Thank you for choosing us! [BOOKING_CONFIRMATION]

Replace the placeholders with the actual booking details. 
IMPORTANT: The date must be in YYYY-MM-DD format and time must be in 24-hour format (e.g., 14:30, 09:00). 
Do not include AM/PM, seconds, or timezone information. 
Do not use the [BOOKING_CONFIRMATION] marker unless a booking is truly confirmed.`,
  creativity: 7,
  temperature: 0.7,
};

export const DEFAULT_STRATEGY_DATA = {
  name: 'Default Sales Strategy',
  tag: 'general',
  tone: 'professional',
  aiInstructions: 'Engage leads professionally and helpfully. Ask qualifying questions to understand their needs.',
  objectionHandling: 'Listen to concerns and address them directly. Offer solutions that match their needs.',
  qualificationPriority: 'budget, timeline, decision_maker',
  creativity: 7,
  aiObjective: 'Qualify leads and guide them toward booking a consultation',
  disqualificationCriteria: 'Not interested, wrong contact, no budget',
  delayMin: 30,
  delayMax: 120,
};

export const DEFAULT_LEAD_DATA = {
  name: 'John Doe',
  email: 'john.doe@example.com',
  phone: '+1234567890',
  company: 'Example Corp',
  position: 'Manager',
  customId: 'LEAD001',
  status: 'lead',
  notes: 'Sample lead for testing purposes',
};

export const DEFAULT_INTEGRATION_TEMPLATES = [
  {
    name: 'GoHighLevel',
    displayName: 'GoHighLevel CRM',
    description: 'Connect your GoHighLevel account to sync contacts, leads, and bookings',
    category: 'CRM',
    icon: 'gohighlevel',
    isActive: true,
    configSchema: {
      type: 'object',
      properties: {
        apiKey: {
          type: 'string',
          title: 'API Key',
          description: 'Your GoHighLevel API key'
        },
        locationId: {
          type: 'string',
          title: 'Location ID (Subaccount)',
          description: 'Your GoHighLevel location/subaccount ID. This is used to identify which GHL subaccount this integration belongs to.'
        },
        calendarId: {
          type: 'string',
          title: 'Calendar ID',
          description: 'Calendar ID for booking integration'
        },
        webhookUrl: {
          type: 'string',
          title: 'Webhook URL',
          description: 'Webhook URL for real-time updates'
        }
      },
      required: ['apiKey', 'locationId']
    },
    setupInstructions: `## GoHighLevel Setup Instructions

1. **Get Your API Key**
   - Log into your GoHighLevel account
   - Go to Settings > API
   - Generate a new API key
   - Copy the API key

2. **Find Your Location ID (Subaccount)**
   - Go to Settings > Locations
   - Copy the Location ID for your primary location/subaccount
   - This ID is used to match webhook events to the correct user in Loctelli

3. **Optional: Calendar ID**
   - Go to Calendar settings
   - Copy the Calendar ID if you want booking integration

4. **Configure Webhooks**
   - Set up webhooks in GoHighLevel to point to your Loctelli webhook endpoint`,
    apiVersion: 'v1',
  },
  {
    name: 'FacebookAds',
    displayName: 'Facebook Advertising',
    description: 'Connect your Facebook Ads account to track campaigns and leads',
    category: 'Advertising',
    icon: 'facebook',
    isActive: true,
    configSchema: {
      type: 'object',
      properties: {
        accessToken: {
          type: 'string',
          title: 'Access Token',
          description: 'Facebook App access token'
        },
        adAccountId: {
          type: 'string',
          title: 'Ad Account ID',
          description: 'Facebook Ad Account ID'
        },
        pageId: {
          type: 'string',
          title: 'Page ID',
          description: 'Facebook Page ID for messaging'
        }
      },
      required: ['accessToken', 'adAccountId']
    },
    setupInstructions: `## Facebook Ads Setup Instructions

1. **Create Facebook App**
   - Go to developers.facebook.com
   - Create a new app or use existing one
   - Add Facebook Login and Marketing API permissions

2. **Get Access Token**
   - Generate a user access token with required permissions
   - Ensure it has ads_management and pages_read_engagement permissions

3. **Find Ad Account ID**
   - Go to Facebook Ads Manager
   - Copy your Ad Account ID from the URL or settings

4. **Optional: Page ID**
   - If you want messaging integration, add your Facebook Page ID`,
    apiVersion: 'v18.0',
  },
  {
    name: 'GoogleAnalytics',
    displayName: 'Google Analytics',
    description: 'Connect your Google Analytics account to track website performance',
    category: 'Analytics',
    icon: 'google-analytics',
    isActive: true,
    configSchema: {
      type: 'object',
      properties: {
        serviceAccountKey: {
          type: 'string',
          title: 'Service Account Key',
          description: 'Google Service Account JSON key'
        },
        propertyId: {
          type: 'string',
          title: 'Property ID',
          description: 'Google Analytics Property ID'
        }
      },
      required: ['serviceAccountKey', 'propertyId']
    },
    setupInstructions: `## Google Analytics Setup Instructions

1. **Create Service Account**
   - Go to Google Cloud Console
   - Create a new project or select existing one
   - Enable Google Analytics API
   - Create a service account and download JSON key

2. **Grant Permissions**
   - Add the service account email to your Google Analytics property
   - Grant "Viewer" or "Editor" permissions

3. **Find Property ID**
   - In Google Analytics, go to Admin
   - Copy the Property ID (format: GA4-XXXXXXXXX)

4. **Upload Service Account Key**
   - Copy the entire JSON content from your service account key file`,
    apiVersion: 'v1beta',
  },
]; 