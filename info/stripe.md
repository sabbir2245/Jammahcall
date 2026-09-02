Stripe Identity RN guide
get striipe identity sandbox documantation . all codes . to implement in react native app .
Read 12 web pages
Stripe Identity Sandbox Documentation for React Native
Here's a complete implementation guide for integrating Stripe Identity in a React Native app using sandbox/test mode.

Prerequisites & Setup
Before you begin:

Enable Stripe Identity in your Stripe Dashboard 

Use test mode API keys (sk_test_...) for sandbox testing 

Install the official SDK :

bash
yarn add @stripe/stripe-identity-react-native
# or
npm install @stripe/stripe-identity-react-native
iOS - Camera Permissions & Pod Install :

Add NSCameraUsageDescription to your Info.plist:

xml
<key>NSCameraUsageDescription</key>
<string>This app uses the camera to take a picture of your identity documents.</string>
Then run:

bash
cd ios && pod install
Android - Material Theme :

Ensure your app's theme in AndroidManifest.xml inherits from a Material theme:

xml
<application android:theme="@style/Theme.MaterialComponents.DayNight">
Server-Side Setup (Create Verification Session)
Your backend needs to create a VerificationSession and return an ephemeral key to the client .

javascript
// server.js (Node.js)
const stripe = require('stripe')('sk_test_YOUR_SECRET_KEY');

// Route handler for /create-verification-session
app.post('/create-verification-session', async (req, res) => {
  try {
    // Create the VerificationSession (sandbox mode)
    const verificationSession = await stripe.identity.verificationSessions.create({
      type: 'document', // or 'id_number'
      provided_details: {
        email: req.user.email, // or any identifier
      },
      metadata: {
        user_id: req.user.id,
      },
    });

    // Create ephemeral key (scoped to this session)
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { verification_session: verificationSession.id },
      { apiVersion: '2026-06-24.dahlia' } // use latest stable version [citation:9]
    );

    // Return only these to the client
    res.json({
      sessionId: verificationSession.id,
      ephemeralKeySecret: ephemeralKey.secret,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
Important: Never expose your secret API key in client-side code. All sensitive operations must occur on your server .

Client-Side Implementation (React Native)
Use the useStripeIdentity hook to integrate the identity verification flow .

tsx
// HomeScreen.tsx
import React, { useCallback } from 'react';
import { ActivityIndicator, Button, View } from 'react-native';
import { useStripeIdentity } from '@stripe/stripe-identity-react-native';
import logo from './assets/logo.png'; // optional: your brand logo

const fetchVerificationSessionParams = async () => {
  try {
    const response = await fetch(
      'https://your-server.com/create-verification-session',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include auth token if required
          Authorization: `Bearer ${userAuthToken}`,
        },
        body: JSON.stringify({ userId: 'user_123' }),
      }
    );
    const data = await response.json();
    return data; // { sessionId, ephemeralKeySecret }
  } catch (error) {
    console.error('Failed to fetch verification session:', error);
    return {};
  }
};

function HomeScreen() {
  const fetchOptions = async () => {
    const response = await fetchVerificationSessionParams();
    return {
      sessionId: response.sessionId,
      ephemeralKeySecret: response.ephemeralKeySecret,
      brandLogo: Image.resolveAssetSource(logo), // optional
    };
  };

  const { status, present, loading } = useStripeIdentity(fetchOptions);

  const handlePress = useCallback(() => {
    present();
  }, [present]);

  const renderButton = useCallback(() => {
    if (loading) {
      return <ActivityIndicator />;
    }
    return <Button title="Verify Identity" onPress={handlePress} />;
  }, [loading, handlePress]);

  // Handle verification results
  React.useEffect(() => {
    if (status === 'verified') {
      console.log('✅ Identity verification successful!');
      // Proceed with user onboarding, etc.
    } else if (status === 'failed') {
      console.error('❌ Identity verification failed.');
    } else if (status === 'canceled') {
      console.warn('User canceled verification.');
    }
  }, [status]);

  return <View>{renderButton()}</View>;
}

export default HomeScreen;
Handling Verification Events
Monitor the status returned by useStripeIdentity :

Status	Description
loading	Initializing SDK
requires_input	User needs to provide documents
verifying	Verification in progress
verified	✅ Verification successful
failed	❌ Verification failed
canceled	User canceled the flow
Testing in Sandbox Mode
Test with sandbox keys (sk_test_...) :

Use test mode in Stripe Dashboard

Verification sessions won't incur real charges

You can test with sample IDs (Stripe provides test documents)

Webhook Integration (for production):
Set up webhook endpoints to receive verification result events :

identity.verification_session.verified

identity.verification_session.requires_input

identity.verification_session.canceled

identity.verification_session.failed

Alternative Approach: WebView-based
For simpler use cases, you can use the WebView-based library react-native-stripe-identity :

bash
npm install react-native-stripe-identity
jsx
import StripeIdentity from 'react-native-stripe-identity';

<StripeIdentity
  redirectUrl="https://verify.stripe.com/start#YOUR_VERIFICATION_TOKEN"
  refreshUrl="https://your-app.com/refresh"
  onSuccess={({ verificationIntentId }) => {
    console.log('✅ Success! Intent ID:', verificationIntentId);
  }}
  onRefresh={() => {
    console.log('🔄 Refresh requested');
  }}
/>
Note: This is an unofficial community package. Use the official @stripe/stripe-identity-react-native SDK for production apps .

Resource References
Stripe Identity React Native SDK on GitHub

Official Stripe Identity Documentation 

Example App Repository

This response is AI-generated, for reference only.
