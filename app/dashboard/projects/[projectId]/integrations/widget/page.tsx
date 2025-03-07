import WidgetConfigContent from './widget-config'

interface WidgetConfigPageProps {
    params: Promise<{ projectId: string }>
}

export default async function WidgetConfigPage({params}: WidgetConfigPageProps) {
    return <WidgetConfigContent projectId={(await params).projectId}/>;
}