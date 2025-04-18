// emails/changelog.tsx - Update existing file

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
    Markdown,
    Link
} from '@react-email/components';

interface Entry {
    id: string;
    title: string;
    content: string;
    version?: string | null;
    publishedAt?: Date | null;
    tags?: { id: string; name: string }[];
}

interface ChangelogEmailProps {
    projectName: string;
    entries: Entry[];
    isDigest?: boolean;
    unsubscribeUrl?: string;
}

export const ChangelogEmail: React.FC<ChangelogEmailProps> = ({
                                                                  projectName,
                                                                  entries,
                                                                  isDigest = false,
                                                                  unsubscribeUrl
                                                              }) => {
    const title = isDigest
        ? `${projectName} - Latest Changelog Updates`
        : `${projectName} - ${entries[0]?.title || 'Changelog Update'}`;

    return (
        <Html>
            <Head>
                <title>{title}</title>
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
                            {projectName} Changelog
                        </Heading>
                        <Text style={{
                            color: '#666',
                            fontSize: '16px',
                            margin: '0 0 20px',
                            textAlign: 'center'
                        }}>
                            {isDigest ? 'Recent updates to our product' : 'New update to our product'}
                        </Text>
                        <Hr style={{ margin: '20px 0' }} />
                    </Section>

                    {entries.map((entry, index) => (
                        <Section key={entry.id} style={{
                            padding: '10px 0',
                            borderBottom: index < entries.length - 1 ? '1px solid #eaeaea' : 'none',
                            marginBottom: '20px'
                        }}>
                            <Row>
                                <Column>
                                    <Heading as="h2" style={{
                                        fontSize: '18px',
                                        fontWeight: 'bold',
                                        margin: '10px 0'
                                    }}>
                                        {entry.title}
                                        {entry.version && (
                                            <Text style={{
                                                color: '#666',
                                                fontSize: '14px',
                                                fontWeight: 'normal',
                                                display: 'inline',
                                                marginLeft: '10px'
                                            }}>
                                                {entry.version}
                                            </Text>
                                        )}
                                    </Heading>

                                    {entry.tags && entry.tags.length > 0 && (
                                        <Row style={{ marginBottom: '10px' }}>
                                            {entry.tags.map(tag => (
                                                <Text key={tag.id} style={{
                                                    backgroundColor: '#f1f5f9',
                                                    borderRadius: '4px',
                                                    color: '#475569',
                                                    display: 'inline-block',
                                                    fontSize: '12px',
                                                    fontWeight: 'normal',
                                                    margin: '0 4px 4px 0',
                                                    padding: '2px 6px'
                                                }}>
                                                    {tag.name}
                                                </Text>
                                            ))}
                                        </Row>
                                    )}

                                    <Markdown
                                        markdownCustomStyles={{
                                            p: {
                                                color: '#333',
                                                fontSize: '14px',
                                                lineHeight: '24px',
                                                margin: '10px 0',
                                                whiteSpace: 'pre-wrap',
                                            },
                                        }}
                                        markdownContainerStyles={{
                                            padding: '0',
                                        }}
                                    >
                                        {entry.content}
                                    </Markdown>

                                    {entry.publishedAt && (
                                        <Text style={{
                                            color: '#999',
                                            fontSize: '12px',
                                            margin: '10px 0'
                                        }}>
                                            Published: {new Date(entry.publishedAt).toLocaleDateString()}
                                        </Text>
                                    )}
                                </Column>
                            </Row>
                        </Section>
                    ))}

                    <Section style={{ marginTop: '30px' }}>
                        <Hr style={{ margin: '0 0 20px' }} />
                        <Text style={{
                            color: '#999',
                            fontSize: '12px',
                            textAlign: 'center'
                        }}>
                            You received this email because you&apos;re subscribed to changelog updates for {projectName}.
                            {unsubscribeUrl && (
                                <>
                                    <br />
                                    <Link
                                        href={unsubscribeUrl}
                                        style={{
                                            color: '#666',
                                            textDecoration: 'underline',
                                        }}
                                    >
                                        Unsubscribe from these notifications
                                    </Link>
                                </>
                            )}
                        </Text>
                    </Section>
                </Container>
            </Body>
        </Html>
    );
};

export default ChangelogEmail;