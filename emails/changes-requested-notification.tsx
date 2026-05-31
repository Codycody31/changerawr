import * as React from 'react';
import { Html, Head, Body, Container, Section, Text, Hr, Button } from '@react-email/components';

interface ChangesRequestedNotificationEmailProps {
    recipientName?: string;
    projectName: string;
    requestType: string;
    entryTitle?: string;
    adminName?: string;
    feedback: string;
    entryUrl: string;
    dashboardUrl: string;
}

function actionPhrase(requestType: string, entryTitle?: string, projectName?: string): React.ReactNode {
    const title = entryTitle ? <strong>&ldquo;{entryTitle}&rdquo;</strong> : null;
    const proj  = projectName ? <strong>{projectName}</strong> : null;
    switch (requestType) {
        case 'ALLOW_PUBLISH':
            return title ? <>publish {title} in {proj}</> : <>publish an entry in {proj}</>;
        case 'DELETE_ENTRY':
            return title ? <>delete {title} from {proj}</> : <>delete an entry from {proj}</>;
        case 'DELETE_PROJECT':
            return <>delete the project {proj}</>;
        case 'DELETE_TAG':
            return <>delete a tag from {proj}</>;
        case 'ALLOW_SCHEDULE':
            return title ? <>schedule {title} in {proj}</> : <>schedule an entry in {proj}</>;
        default:
            return <>{requestType.replace(/_/g, ' ').toLowerCase()} in {proj}</>;
    }
}

export const ChangesRequestedNotificationEmail: React.FC<ChangesRequestedNotificationEmailProps> = ({
    recipientName,
    projectName,
    requestType,
    entryTitle,
    adminName = 'An administrator',
    feedback,
    entryUrl,
    dashboardUrl,
}) => (
    <Html>
        <Head><title>Changes Requested</title></Head>
        <Body style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', backgroundColor: '#f6f9fc', margin: '0 auto', padding: '20px 0' }}>
            <Container style={{ backgroundColor: '#ffffff', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', maxWidth: '600px', margin: '0 auto', overflow: 'hidden', padding: '0' }}>

                {/* Accent bar */}
                <Section style={{ backgroundColor: '#f59e0b', padding: '4px 0' }} />

                <Section style={{ padding: '32px 32px 0' }}>
                    <Text style={{ color: '#1a1a1a', fontSize: '22px', fontWeight: '700', margin: '0 0 6px' }}>
                        Changes requested
                    </Text>
                    <Text style={{ color: '#6b7280', fontSize: '14px', margin: '0 0 24px' }}>
                        Your request needs some updates before it can be approved
                    </Text>
                </Section>

                <Section style={{ padding: '0 32px' }}>
                    <Text style={{ color: '#374151', fontSize: '15px', margin: '0 0 16px' }}>
                        Hi {recipientName || 'there'},
                    </Text>
                    <Text style={{ color: '#374151', fontSize: '15px', margin: '0 0 24px' }}>
                        {adminName} reviewed your request to {actionPhrase(requestType, entryTitle, projectName)} and is asking for some changes before it can be approved.
                    </Text>
                </Section>

                {/* Feedback block */}
                <Section style={{ padding: '0 32px 24px' }}>
                    <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fcd34d', borderLeft: '4px solid #f59e0b', borderRadius: '6px', padding: '14px 16px' }}>
                        <Text style={{ color: '#92400e', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                            Feedback from {adminName}
                        </Text>
                        <Text style={{ color: '#78350f', fontSize: '14px', lineHeight: '1.6', margin: '0', whiteSpace: 'pre-wrap' }}>
                            {feedback}
                        </Text>
                    </div>
                </Section>

                <Section style={{ padding: '0 32px 32px' }}>
                    <Text style={{ color: '#374151', fontSize: '15px', margin: '0 0 20px' }}>
                        Make the necessary changes and resubmit when ready.
                    </Text>
                    <div>
                        <Button href={entryUrl} style={{ backgroundColor: '#f59e0b', borderRadius: '6px', color: '#ffffff', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'inline-block', padding: '10px 20px', marginRight: '12px' }}>
                            Open entry
                        </Button>
                        <Button href={dashboardUrl} style={{ backgroundColor: '#f3f4f6', borderRadius: '6px', color: '#374151', fontSize: '14px', fontWeight: '600', textDecoration: 'none', display: 'inline-block', padding: '10px 20px' }}>
                            View Dashboard
                        </Button>
                    </div>
                </Section>

                <Hr style={{ margin: '0 32px 20px', borderColor: '#e5e7eb' }} />

                <Section style={{ padding: '0 32px 24px' }}>
                    <Text style={{ color: '#9ca3af', fontSize: '12px', margin: '0' }}>
                        This is an automated notification from Changerawr. You received this because notifications are enabled in your account settings.
                    </Text>
                </Section>
            </Container>
        </Body>
    </Html>
);

export default ChangesRequestedNotificationEmail;
