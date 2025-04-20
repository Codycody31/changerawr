// emails/password-reset.tsx
import * as React from 'react';
import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Heading,
    Text,
    Hr,
    Button
} from '@react-email/components';

interface PasswordResetEmailProps {
    resetLink: string;
    recipientName?: string;
    recipientEmail?: string;
    expiresInMinutes: number;
}

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
                                                                          resetLink,
                                                                          recipientName,
                                                                          recipientEmail,
                                                                          expiresInMinutes = 60
                                                                      }) => {
    // Create personalized greeting
    const getPersonalizedGreeting = () => {
        if (recipientName) {
            return `Hello ${recipientName},`;
        } else if (recipientEmail) {
            // Extract name from email as fallback (e.g., john.doe@example.com -> John)
            const possibleName = recipientEmail.split('@')[0].split('.')[0];
            const capitalizedName = possibleName.charAt(0).toUpperCase() + possibleName.slice(1);
            return `Hello ${capitalizedName},`;
        }
        return 'Hello,';
    };

    return (
        <Html>
            <Head>
                <title>Reset Your Password</title>
            </Head>
            <Body style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                backgroundColor: '#f6f9fc',
                margin: '0 auto',
                padding: '20px 0'
            }}>
                <Container style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                    maxWidth: '600px',
                    margin: '0 auto',
                    padding: '20px'
                }}>
                    <Section>
                        <Heading as="h1" style={{
                            color: '#333',
                            fontSize: '24px',
                            fontWeight: 'bold',
                            margin: '10px 0 20px',
                            textAlign: 'center'
                        }}>
                            Password Reset
                        </Heading>

                        {/* Personalized greeting */}
                        <Text style={{
                            color: '#333',
                            fontSize: '16px',
                            margin: '0 0 15px'
                        }}>
                            {getPersonalizedGreeting()}
                        </Text>

                        <Text style={{
                            color: '#333',
                            fontSize: '16px',
                            margin: '0 0 20px'
                        }}>
                            We received a request to reset your password. If you didn&apos;t make this request, you can safely ignore this email.
                        </Text>

                        <Text style={{
                            color: '#333',
                            fontSize: '16px',
                            margin: '0 0 20px'
                        }}>
                            To reset your password, click the button below:
                        </Text>

                        <Section style={{ textAlign: 'center', margin: '30px 0' }}>
                            <Button
                                href={resetLink}
                                style={{
                                    backgroundColor: '#0891b2',
                                    borderRadius: '4px',
                                    color: '#fff',
                                    fontSize: '16px',
                                    textDecoration: 'none',
                                    textAlign: 'center',
                                    display: 'inline-block',
                                    padding: '12px 20px'
                                }}
                            >
                                Reset Your Password
                            </Button>
                        </Section>

                        <Text style={{
                            color: '#666',
                            fontSize: '14px',
                            margin: '0 0 10px'
                        }}>
                            If the button doesn&apos;t work, copy and paste this link into your browser:
                        </Text>

                        <Text style={{
                            color: '#0891b2',
                            fontSize: '14px',
                            margin: '0 0 20px',
                            wordBreak: 'break-all'
                        }}>
                            {resetLink}
                        </Text>

                        <Text style={{
                            color: '#666',
                            fontSize: '14px',
                            margin: '0 0 10px'
                        }}>
                            This password reset link will expire in {expiresInMinutes} minutes.
                        </Text>

                        <Hr style={{ margin: '30px 0 20px' }} />

                        <Text style={{
                            color: '#999',
                            fontSize: '12px',
                            textAlign: 'center'
                        }}>
                            If you didn&apos;t request a password reset, no action is needed.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default PasswordResetEmail;