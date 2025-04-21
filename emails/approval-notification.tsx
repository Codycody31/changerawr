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
    Button,
} from '@react-email/components';

interface ApprovalNotificationEmailProps {
    recipientName?: string;
    projectName: string;
    requestType: string;
    entryTitle?: string;
    adminName?: string;
    dashboardUrl: string;
}

export const ApprovalNotificationEmail: React.FC<ApprovalNotificationEmailProps> = ({
                                                                                        recipientName,
                                                                                        projectName,
                                                                                        requestType,
                                                                                        entryTitle,
                                                                                        adminName = 'An administrator',
                                                                                        dashboardUrl,
                                                                                    }) => {
    const displayRequestType = requestType.replace(/_/g, ' ').toLowerCase();

    return (
        <Html>
            <Head>
                <title>Your Request Has Been Approved</title>
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
                            Request Approved
                        </Heading>

                        <Text style={{
                            color: '#333',
                            fontSize: '16px',
                            margin: '0 0 15px'
                        }}>
                            Hello {recipientName || 'there'},
                        </Text>

                        <Text style={{
                            color: '#333',
                            fontSize: '16px',
                            margin: '0 0 20px'
                        }}>
                            Good news! Your request to {displayRequestType} {entryTitle
                            ? <>the entry <strong>&ldquo;{entryTitle}&rdquo;</strong> in</>
                            : <>for</>} <strong>{projectName}</strong> has been approved by {adminName}.
                        </Text>

                        <Section style={{ textAlign: 'center', margin: '30px 0' }}>
                            <Button
                                href={dashboardUrl}
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
                                View Dashboard
                            </Button>
                        </Section>

                        <Hr style={{ margin: '30px 0 20px' }} />

                        <Text style={{
                            color: '#999',
                            fontSize: '12px',
                            textAlign: 'center'
                        }}>
                            This is an automated notification from Changerawr. You received this email because you have notifications enabled in your account settings.
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default ApprovalNotificationEmail;