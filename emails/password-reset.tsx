import * as React from 'react';
import {
    Html,
    Head,
    Body,
    Container,
    Section,
    Row,
    Column,
    Heading,
    Text,
    Hr,
    Button
} from '@react-email/components';
import {MailWarning} from "lucide-react";

interface PasswordResetEmailProps {
    resetLink: string;
    recipientName?: string;
    recipientEmail: string;
    expiresInMinutes: number;
}

export const PasswordResetEmail: React.FC<PasswordResetEmailProps> = ({
                                                                          resetLink,
                                                                          recipientName,
                                                                          recipientEmail,
                                                                          expiresInMinutes = 60
                                                                      }) => {
    // Create personalized greeting for user
    const getPersonalizedGreeting = () => {
        if (recipientName) {
            return `Hello ${recipientName},`;
        } else {
            // Extract name from email as fallback (e.g., john.doe@example.com -> John)
            const possibleName = recipientEmail.split('@')[0].split('.')[0];
            const capitalizedName = possibleName.charAt(0).toUpperCase() + possibleName.slice(1);
            return `Hello ${capitalizedName},`;
        }
    };

    // Branding Styles
    const colors = {
        primary: '#0891b2',
        success: '#16a34a',
        text: '#334155',
        mutedText: '#64748b',
        background: '#f8fafc',
        card: '#ffffff',
        border: '#e2e8f0',
        buttonText: '#ffffff'
    };

    return (
        <Html>
            <Head>
                <title>Reset Your Password</title>
            </Head>
            <Body style={{
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                backgroundColor: colors.background,
                margin: '0 auto',
                padding: '40px 20px'
            }}>
                <Container style={{
                    maxWidth: '600px',
                    margin: '0 auto',
                }}>
                    {/* Header with logo/brand */}
                    <Section style={{ textAlign: 'center', marginBottom: '20px' }}>
                        <Heading as="h1" style={{
                            color: colors.primary,
                            fontSize: '28px',
                            fontWeight: 'bold',
                            margin: '0'
                        }}>
                            Changerawr
                        </Heading>
                    </Section>

                    {/* Main card */}
                    <Section style={{
                        backgroundColor: colors.card,
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.05)',
                        overflow: 'hidden',
                        border: `1px solid ${colors.border}`,
                        borderTop: `4px solid ${colors.primary}`
                    }}>
                        {/* Card top with icon */}
                        <Section style={{
                            textAlign: 'center',
                            padding: '30px 40px 0'
                        }}>
                            <Row>
                                <Column>
                                    {/* Circle with envelope icon */}
                                    <div style={{
                                        width: '80px',
                                        height: '80px',
                                        margin: '0 auto 20px',
                                        backgroundColor: '#e0f2fe', // Light blue bg
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {/* Email icon */}
                                        <MailWarning height={40} width={40} />
                                    </div>

                                    <Heading as="h2" style={{
                                        color: colors.text,
                                        fontSize: '24px',
                                        fontWeight: 'bold',
                                        margin: '0 0 15px',
                                        textAlign: 'center'
                                    }}>
                                        Reset Your Password
                                    </Heading>
                                </Column>
                            </Row>
                        </Section>

                        {/* Card content */}
                        <Section style={{ padding: '0 40px 30px' }}>
                            {/* Personalized greeting */}
                            <Text style={{
                                color: colors.text,
                                fontSize: '16px',
                                lineHeight: '24px',
                                margin: '0 0 15px'
                            }}>
                                {getPersonalizedGreeting()}
                            </Text>

                            <Text style={{
                                color: colors.text,
                                fontSize: '16px',
                                lineHeight: '24px',
                                margin: '0 0 20px'
                            }}>
                                We received a request to reset your password. Use the button below to set a new password. This link is only valid for the next {expiresInMinutes} minutes.
                            </Text>

                            {/* Button in a separate section */}
                            <Section style={{ textAlign: 'center', margin: '30px 0' }}>
                                <Button
                                    href={resetLink}
                                    style={{
                                        backgroundColor: colors.primary,
                                        borderRadius: '6px',
                                        color: colors.buttonText,
                                        fontSize: '16px',
                                        fontWeight: 'bold',
                                        textDecoration: 'none',
                                        textAlign: 'center',
                                        display: 'inline-block',
                                        padding: '12px 30px',
                                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                                    }}
                                >
                                    Reset Password
                                </Button>
                            </Section>

                            <Text style={{
                                color: colors.mutedText,
                                fontSize: '14px',
                                margin: '30px 0 10px'
                            }}>
                                If the button doesn&apos;t work, copy and paste this link into your browser:
                            </Text>

                            <Text style={{
                                color: colors.primary,
                                fontSize: '14px',
                                margin: '0 0 30px',
                                wordBreak: 'break-all'
                            }}>
                                {resetLink}
                            </Text>

                            <Hr style={{
                                borderColor: colors.border,
                                borderWidth: '1px',
                                margin: '25px 0'
                            }} />

                            <Text style={{
                                color: colors.mutedText,
                                fontSize: '14px',
                                margin: '0'
                            }}>
                                If you didn&apos;t request a password reset, you can safely ignore this email. Someone may have entered your email address by accident.
                            </Text>
                        </Section>
                    </Section>

                    {/* Footer */}
                    <Section style={{
                        textAlign: 'center',
                        margin: '20px 0 0',
                        color: colors.mutedText,
                        fontSize: '12px'
                    }}>
                        <Text>
                            © {new Date().getFullYear()} Changerawr. All rights reserved.
                        </Text>
                        <Text style={{ margin: '10px 0' }}>
                            This email was sent to {recipientEmail}
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default PasswordResetEmail;